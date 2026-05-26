import datetime
from decimal import Decimal
from django.core.exceptions import PermissionDenied
from api.models import AuditLog, NormalizedRecord, ValidationIssue

def check_immutability(record: NormalizedRecord):
    """
    Enforces write-lock on APPROVED records.
    """
    if record.status == 'APPROVED':
        raise PermissionDenied("This record is APPROVED and locked. It is immutable.")

def serialize_val(v):
    """Serialize values consistently to JSON-safe forms."""
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return str(v)
    return v

def track_and_save_record(record: NormalizedRecord, changed_by, reason: str, updated_fields: dict) -> NormalizedRecord:
    """
    Validates immutability, tracks field updates, creates AuditLog, re-runs validations, and saves.
    """
    check_immutability(record)
    
    if not reason or not reason.strip():
        raise ValueError("A reason is required to modify this record.")
        
    old_values = {}
    new_values = {}
    
    has_changes = False
    for field, new_val in updated_fields.items():
        if hasattr(record, field):
            old_val = getattr(record, field)
            
            old_val_s = serialize_val(old_val)
            new_val_s = serialize_val(new_val)
            
            if old_val_s != new_val_s:
                old_values[field] = old_val_s
                new_values[field] = new_val_s
                setattr(record, field, new_val)
                has_changes = True
                
    if has_changes:
        # Recalculate emissions based on updated quantity
        from api.services.normalization import EMISSION_FACTORS
        factor = EMISSION_FACTORS.get(record.activity_type, Decimal('0.00'))
        record.co2e_emissions = record.quantity * factor
        
        # Clear previous validation issues and re-validate
        record.validation_issues.all().delete()
        
        issues = []
        if not record.source_unit:
            issues.append(('MISSING_VALUE', 'Source unit is missing.'))
        if record.quantity == Decimal('0'):
            issues.append(('MISSING_VALUE', 'Consumption quantity value is missing.'))
        if record.quantity < Decimal('0'):
            issues.append(('NEGATIVE_CONSUMPTION', f"Negative consumption detected: {record.quantity}."))
        if record.date > datetime.date.today():
            issues.append(('INVALID_DATE', f"Future-dated activity detected: {record.date}."))
            
        # Recreate issues
        for rule_name, message in issues:
            ValidationIssue.objects.create(
                record=record,
                rule_name=rule_name,
                message=message,
                severity='ERROR'
            )
            
        if issues:
            record.status = 'FLAGGED'
        else:
            record.status = 'NORMALIZED'
            
        record.save()
        
        # Record changes in the AuditLog ledger
        AuditLog.objects.create(
            tenant=record.tenant,
            record=record,
            changed_by=changed_by,
            old_values=old_values,
            new_values=new_values,
            reason=reason
        )
        
    return record
