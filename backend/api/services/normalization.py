import datetime
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from api.models import IngestionRow, NormalizedRecord, ValidationIssue

# Emission factors (kg CO2e per normalized unit)
EMISSION_FACTORS = {
    'DIESEL': Decimal('2.68'),        # kg CO2e / Liter
    'GRID_ELECTRICITY': Decimal('0.38'), # kg CO2e / kWh
    'FLIGHT': Decimal('0.12'),        # kg CO2e / km
    'HOTEL': Decimal('15.00'),        # kg CO2e / room night
}

# Hardcoded fallback limits for spike detection when history is insufficient
FALLBACK_SPIKE_LIMITS = {
    'FUEL_COMBUSTION': Decimal('100000'),  # Liters
    'ELECTRICITY': Decimal('500000'),      # kWh
    'BUSINESS_TRAVEL': Decimal('50000'),   # km
}

def parse_date(date_str):
    """Attempt to parse date string with common enterprise CSV formats."""
    if not date_str:
        return None
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

def normalize_row(row: IngestionRow) -> NormalizedRecord:
    """
    Normalizes a raw IngestionRow into a NormalizedRecord.
    Runs validators and saves issues.
    """
    batch = row.batch
    data = row.raw_data
    tenant = batch.tenant
    source_type = batch.source_type
    
    # Initialize variables for canonical schema
    scope = 3
    category = ''
    activity_type = ''
    quantity = Decimal('0')
    normalized_unit = ''
    source_unit = ''
    date_val = None
    confidence = Decimal('1.00')
    
    issues = []
    
    # Source mapping logic
    if source_type == 'SAP':
        # SAP Export columns: TransactionID, PostingDate, GLAccount, Description, Quantity, Unit
        category = 'FUEL_COMBUSTION'
        scope = 1
        source_unit = data.get('Unit', '')
        
        desc = data.get('Description', '').upper()
        if 'DIESEL' in desc:
            activity_type = 'DIESEL'
            normalized_unit = 'LITER'
        elif 'OIL' in desc or 'FUEL' in desc:
            activity_type = 'DIESEL' # default diesel factor for fuel
            normalized_unit = 'LITER'
        else:
            activity_type = 'DIESEL'
            normalized_unit = 'LITER'
            
        confidence = Decimal('0.95') # SAP transactional ledger is high confidence but description-inferred
        
        # Quantity parsing
        qty_str = data.get('Quantity', '')
        try:
            quantity = Decimal(qty_str) if qty_str else Decimal('0')
        except (InvalidOperation, ValueError):
            issues.append({
                'rule_name': 'INVALID_DECIMAL',
                'message': f"Could not parse quantity '{qty_str}' as decimal.",
                'severity': 'ERROR'
            })
            
        # Date parsing
        date_str = data.get('PostingDate', '')
        date_val = parse_date(date_str)
        if not date_val:
            issues.append({
                'rule_name': 'INVALID_DATE',
                'message': f"Could not parse date '{date_str}'. Use YYYY-MM-DD or MM/DD/YYYY.",
                'severity': 'ERROR'
            })
            
    elif source_type == 'UTILITY':
        # Utility Portal export columns: AccountNumber, BillingPeriodStart, BillingPeriodEnd, Usage_kWh
        category = 'ELECTRICITY'
        scope = 2
        activity_type = 'GRID_ELECTRICITY'
        normalized_unit = 'KWH'
        source_unit = 'kWh'
        confidence = Decimal('1.00') # Direct utility meter readings have absolute confidence
        
        # Quantity parsing
        qty_str = data.get('Usage_kWh', '')
        try:
            quantity = Decimal(qty_str) if qty_str else Decimal('0')
        except (InvalidOperation, ValueError):
            issues.append({
                'rule_name': 'INVALID_DECIMAL',
                'message': f"Could not parse usage '{qty_str}' as decimal.",
                'severity': 'ERROR'
            })
            
        # Date parsing
        date_str = data.get('BillingPeriodEnd', '')
        date_val = parse_date(date_str)
        if not date_val:
            issues.append({
                'rule_name': 'INVALID_DATE',
                'message': f"Could not parse billing period end date '{date_str}'.",
                'severity': 'ERROR'
            })
            
    elif source_type == 'TRAVEL':
        # Travel platform CSV columns: BookingID, TravelDate, Mode, Distance_miles, HotelNights, SupplierName
        category = 'BUSINESS_TRAVEL'
        scope = 3
        confidence = Decimal('0.85') # Travel agent exports have moderate confidence
        
        mode = data.get('Mode', '').capitalize()
        if mode == 'Flight':
            activity_type = 'FLIGHT'
            normalized_unit = 'KM'
            source_unit = 'miles'
            
            qty_str = data.get('Distance_miles', '')
            try:
                # Convert miles to km (1.60934)
                miles = Decimal(qty_str) if qty_str else Decimal('0')
                quantity = miles * Decimal('1.60934')
            except (InvalidOperation, ValueError):
                issues.append({
                    'rule_name': 'INVALID_DECIMAL',
                    'message': f"Could not parse distance '{qty_str}' as decimal.",
                    'severity': 'ERROR'
                })
        elif mode == 'Hotel':
            activity_type = 'HOTEL'
            normalized_unit = 'ROOM_NIGHT'
            source_unit = 'nights'
            confidence = Decimal('0.90') # Hotel night reports are reliable
            
            qty_str = data.get('HotelNights', '')
            try:
                quantity = Decimal(qty_str) if qty_str else Decimal('0')
            except (InvalidOperation, ValueError):
                issues.append({
                    'rule_name': 'INVALID_DECIMAL',
                    'message': f"Could not parse hotel nights '{qty_str}' as decimal.",
                    'severity': 'ERROR'
                })
        else:
            activity_type = 'UNKNOWN'
            normalized_unit = 'UNKNOWN'
            source_unit = data.get('Mode', 'unknown')
            qty_str = data.get('Distance_miles', data.get('HotelNights', '0'))
            try:
                quantity = Decimal(qty_str) if qty_str else Decimal('0')
            except (InvalidOperation, ValueError):
                quantity = Decimal('0')
            issues.append({
                'rule_name': 'UNKNOWN_ACTIVITY_MODE',
                'message': f"Travel mode '{mode}' is unsupported. Defaulting to scope 3.",
                'severity': 'WARNING'
            })
            
        # Date parsing
        date_str = data.get('TravelDate', '')
        date_val = parse_date(date_str)
        if not date_val:
            issues.append({
                'rule_name': 'INVALID_DATE',
                'message': f"Could not parse travel date '{date_str}'.",
                'severity': 'ERROR'
            })
            
    else:
        issues.append({
            'rule_name': 'UNKNOWN_SOURCE_TYPE',
            'message': f"Ingestion batch source type '{source_type}' is unrecognized.",
            'severity': 'ERROR'
        })
        date_val = timezone.now().date()
    
    # Pre-validation adjustments
    if date_val is None:
        date_val = timezone.now().date()
        
    # Create the NormalizedRecord (unsaved first)
    record = NormalizedRecord(
        tenant=tenant,
        source_row=row,
        scope=scope,
        category=category,
        activity_type=activity_type,
        quantity=quantity,
        normalized_unit=normalized_unit,
        source_unit=source_unit,
        date=date_val,
        confidence=confidence,
        status='PENDING'
    )
    
    # Calculate emissions if basic details are OK
    factor = EMISSION_FACTORS.get(activity_type, Decimal('0.00'))
    record.co2e_emissions = record.quantity * factor
    
    # Save the record so it has an ID for ValidationIssue FKs
    record.save()
    
    # Run Core validation rules
    # 1. Missing Values
    if not source_unit:
        issues.append({
            'rule_name': 'MISSING_VALUE',
            'message': 'Source unit is missing.',
            'severity': 'ERROR'
        })
    if record.quantity == Decimal('0'):
        # Log error or warning depending on if it was just zero or empty
        raw_qty = data.get('Quantity', data.get('Usage_kWh', data.get('Distance_miles', data.get('HotelNights', ''))))
        if not raw_qty:
            issues.append({
                'rule_name': 'MISSING_VALUE',
                'message': 'Consumption quantity value is missing.',
                'severity': 'ERROR'
            })
            
    # 2. Negative Consumption
    if record.quantity < Decimal('0'):
        issues.append({
            'rule_name': 'NEGATIVE_CONSUMPTION',
            'message': f"Negative consumption detected: {record.quantity}.",
            'severity': 'ERROR'
        })
        
    # 3. Invalid Date (future check)
    if record.date > timezone.now().date():
        issues.append({
            'rule_name': 'INVALID_DATE',
            'message': f"Future-dated activity detected: {record.date}.",
            'severity': 'ERROR'
        })
        
    # 4. Unknown Units Mapping
    if record.normalized_unit == 'UNKNOWN' or not record.normalized_unit:
        issues.append({
            'rule_name': 'UNKNOWN_UNIT',
            'message': f"Source unit '{record.source_unit}' could not be normalized.",
            'severity': 'ERROR'
        })
        
    # 5. Suspicious Spike Check
    # Check approved history first
    history_qs = NormalizedRecord.objects.filter(
        tenant=tenant,
        category=category,
        status='APPROVED'
    )
    if history_qs.count() >= 3:
        # Simple median calculation in Python to avoid raw DB functions dependencies
        quantities = sorted(list(history_qs.values_list('quantity', flat=True)))
        n = len(quantities)
        if n % 2 == 1:
            median_qty = Decimal(str(quantities[n // 2]))
        else:
            median_qty = (Decimal(str(quantities[n // 2 - 1])) + Decimal(str(quantities[n // 2]))) / 2
            
        if record.quantity > 10 * median_qty:
            issues.append({
                'rule_name': 'SUSPICIOUS_SPIKE',
                'message': f"Suspicious spike: Quantity {record.quantity} exceeds 10x median approved history ({median_qty:.2f}).",
                'severity': 'WARNING'
            })
    else:
        # Fallback to hardcoded limits
        limit = FALLBACK_SPIKE_LIMITS.get(category, Decimal('1000000'))
        if record.quantity > limit:
            issues.append({
                'rule_name': 'SUSPICIOUS_SPIKE',
                'message': f"Suspicious spike: Quantity {record.quantity} exceeds default limit of {limit}.",
                'severity': 'WARNING'
            })
            
    # Create database objects for validation issues
    has_errors = False
    for issue_data in issues:
        ValidationIssue.objects.create(
            record=record,
            rule_name=issue_data['rule_name'],
            message=issue_data['message'],
            severity=issue_data['severity']
        )
        if issue_data['severity'] == 'ERROR':
            has_errors = True
            
    # Transition status
    if issues:
        record.status = 'FLAGGED'
    else:
        record.status = 'NORMALIZED'
        
    record.save()
    
    # Update source row status
    row.status = 'NORMALIZED' if record.status == 'NORMALIZED' else 'FLAGGED'
    row.save()
    
    return record
