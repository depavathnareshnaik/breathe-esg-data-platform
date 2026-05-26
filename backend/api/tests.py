import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from rest_framework.test import APIClient
from api.models import Tenant, UserProfile, IngestionBatch, IngestionRow, NormalizedRecord, ValidationIssue, AuditLog
from api.services.ingestion import parse_csv_batch
from api.services.normalization import normalize_row
from api.services.audit import track_and_save_record

class ESGIngestionTests(TestCase):
    def setUp(self):
        # Set up test tenant and user
        self.tenant = Tenant.objects.create(name="Test Corp")
        self.user = User.objects.create_user(username="analyst_test", password="Password123!")
        self.profile = UserProfile.objects.create(user=self.user, tenant=self.tenant, role="ANALYST")
        
        self.sap_csv = (
            "TransactionID,PostingDate,GLAccount,Description,Quantity,Unit\n"
            "TXN-001,2026-04-10,600100,Diesel Fuel Purchase,1200.5,L\n"
        )
        self.utility_csv = (
            "AccountNumber,BillingPeriodStart,BillingPeriodEnd,Usage_kWh\n"
            "ACCT-992,2026-04-01,2026-04-30,4200.5\n"
        )
        self.travel_csv = (
            "BookingID,TravelDate,Mode,Distance_miles,HotelNights,SupplierName\n"
            "TRV-001,2026-05-02,Flight,1000,,United\n"
            "TRV-002,2026-05-03,Hotel,,3,Hilton\n"
        )

    def test_sap_ingestion_and_normalization(self):
        batch = IngestionBatch.objects.create(
            tenant=self.tenant,
            source_type="SAP",
            file_name="sap_export.csv",
            raw_content=self.sap_csv,
            uploaded_by=self.user
        )
        
        # Parse raw CSV rows
        rows = parse_csv_batch(batch)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].raw_data['TransactionID'], 'TXN-001')
        self.assertEqual(rows[0].raw_data['Quantity'], '1200.5')
        
        # Normalize parsed row
        record = normalize_row(rows[0])
        
        # Verify normalization schema mapping
        self.assertEqual(record.tenant, self.tenant)
        self.assertEqual(record.scope, 1)
        self.assertEqual(record.category, 'FUEL_COMBUSTION')
        self.assertEqual(record.activity_type, 'DIESEL')
        self.assertEqual(record.quantity, Decimal('1200.500000'))
        self.assertEqual(record.normalized_unit, 'LITER')
        self.assertEqual(record.date, datetime.date(2026, 4, 10))
        self.assertEqual(record.confidence, Decimal('0.95'))
        self.assertEqual(record.status, 'NORMALIZED')
        
        # Emissions calculation verification: 1200.5 * 2.68 = 3217.34
        self.assertEqual(record.co2e_emissions, Decimal('3217.340000'))

    def test_utility_ingestion_and_normalization(self):
        batch = IngestionBatch.objects.create(
            tenant=self.tenant,
            source_type="UTILITY",
            file_name="utility.csv",
            raw_content=self.utility_csv,
            uploaded_by=self.user
        )
        
        rows = parse_csv_batch(batch)
        record = normalize_row(rows[0])
        
        self.assertEqual(record.scope, 2)
        self.assertEqual(record.category, 'ELECTRICITY')
        self.assertEqual(record.activity_type, 'GRID_ELECTRICITY')
        self.assertEqual(record.quantity, Decimal('4200.500000'))
        self.assertEqual(record.normalized_unit, 'KWH')
        self.assertEqual(record.date, datetime.date(2026, 4, 30))
        self.assertEqual(record.confidence, Decimal('1.00'))
        
        # Emissions calculation verification: 4200.5 * 0.38 = 1596.19
        self.assertEqual(record.co2e_emissions, Decimal('1596.190000'))

    def test_travel_flight_and_hotel(self):
        batch = IngestionBatch.objects.create(
            tenant=self.tenant,
            source_type="TRAVEL",
            file_name="travel.csv",
            raw_content=self.travel_csv,
            uploaded_by=self.user
        )
        
        rows = parse_csv_batch(batch)
        self.assertEqual(len(rows), 2)
        
        # 1. Flight conversion
        rec_flight = normalize_row(rows[0])
        self.assertEqual(rec_flight.scope, 3)
        self.assertEqual(rec_flight.category, 'BUSINESS_TRAVEL')
        self.assertEqual(rec_flight.activity_type, 'FLIGHT')
        # Miles to km conversion: 1000 * 1.60934 = 1609.34
        self.assertAlmostEqual(rec_flight.quantity, Decimal('1609.340000'))
        self.assertEqual(rec_flight.normalized_unit, 'KM')
        
        # 2. Hotel
        rec_hotel = normalize_row(rows[1])
        self.assertEqual(rec_hotel.scope, 3)
        self.assertEqual(rec_hotel.category, 'BUSINESS_TRAVEL')
        self.assertEqual(rec_hotel.activity_type, 'HOTEL')
        self.assertEqual(rec_hotel.quantity, Decimal('3'))
        self.assertEqual(rec_hotel.normalized_unit, 'ROOM_NIGHT')
        # 3 nights * 15.0 = 45.0 kg CO2e
        self.assertEqual(rec_hotel.co2e_emissions, Decimal('45.000000'))

    def test_validation_quality_rules(self):
        # 1. Negative quantity
        bad_sap = (
            "TransactionID,PostingDate,GLAccount,Description,Quantity,Unit\n"
            "TXN-ERR,2026-04-10,600100,Diesel Fuel,-100,L\n"
        )
        batch = IngestionBatch.objects.create(
            tenant=self.tenant,
            source_type="SAP",
            file_name="bad_sap.csv",
            raw_content=bad_sap,
            uploaded_by=self.user
        )
        rows = parse_csv_batch(batch)
        record = normalize_row(rows[0])
        
        self.assertEqual(record.status, 'FLAGGED')
        issues = record.validation_issues.all()
        self.assertTrue(issues.filter(rule_name='NEGATIVE_CONSUMPTION').exists())
        
        # 2. Future dated activity
        future_date = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
        future_sap = (
            "TransactionID,PostingDate,GLAccount,Description,Quantity,Unit\n"
            f"TXN-ERR2,{future_date},600100,Diesel Fuel,100,L\n"
        )
        batch2 = IngestionBatch.objects.create(
            tenant=self.tenant,
            source_type="SAP",
            file_name="future_sap.csv",
            raw_content=future_sap,
            uploaded_by=self.user
        )
        rows2 = parse_csv_batch(batch2)
        record2 = normalize_row(rows2[0])
        
        self.assertEqual(record2.status, 'FLAGGED')
        self.assertTrue(record2.validation_issues.filter(rule_name='INVALID_DATE').exists())

    def test_suspicious_spike_detection(self):
        # Seed 3 approved records with normal quantities (e.g., 100 kWh)
        for i in range(3):
            NormalizedRecord.objects.create(
                tenant=self.tenant,
                scope=2,
                category='ELECTRICITY',
                activity_type='GRID_ELECTRICITY',
                quantity=Decimal('100.0'),
                normalized_unit='KWH',
                source_unit='kWh',
                date=datetime.date(2026, 4, 1 + i),
                confidence=Decimal('1.0'),
                status='APPROVED'
            )
            
        # Ingest a record with 1500 kWh (15x normal, which is > 10x median of 100)
        spike_csv = (
            "AccountNumber,BillingPeriodStart,BillingPeriodEnd,Usage_kWh\n"
            "ACCT-992,2026-04-01,2026-04-30,1500\n"
        )
        batch = IngestionBatch.objects.create(
            tenant=self.tenant,
            source_type="UTILITY",
            file_name="spike.csv",
            raw_content=spike_csv,
            uploaded_by=self.user
        )
        rows = parse_csv_batch(batch)
        record = normalize_row(rows[0])
        
        self.assertEqual(record.status, 'FLAGGED')
        self.assertTrue(record.validation_issues.filter(rule_name='SUSPICIOUS_SPIKE').exists())

    def test_audit_logs_and_immutability(self):
        # 1. Start with a FLAGGED record (negative quantity)
        batch = IngestionBatch.objects.create(
            tenant=self.tenant,
            source_type="UTILITY",
            file_name="audit_test.csv",
            raw_content="AccountNumber,BillingPeriodStart,BillingPeriodEnd,Usage_kWh\nACCT-992,2026-04-01,2026-04-30,-200\n",
            uploaded_by=self.user
        )
        rows = parse_csv_batch(batch)
        record = normalize_row(rows[0])
        self.assertEqual(record.status, 'FLAGGED')
        
        # Edit the record to correct the quantity to positive 200
        updated = track_and_save_record(
            record=record,
            changed_by=self.user,
            reason="Corrected billing entry manual typo",
            updated_fields={'quantity': Decimal('200')}
        )
        
        # Verify status transitions to NORMALIZED (issue cleared)
        self.assertEqual(updated.status, 'NORMALIZED')
        self.assertEqual(updated.co2e_emissions, Decimal('76.000000')) # 200 * 0.38
        
        # Verify Audit Log entry
        logs = AuditLog.objects.filter(record=updated)
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs[0].changed_by, self.user)
        self.assertEqual(Decimal(logs[0].old_values['quantity']), Decimal('-200'))
        self.assertEqual(Decimal(logs[0].new_values['quantity']), Decimal('200'))
        self.assertEqual(logs[0].reason, "Corrected billing entry manual typo")
        
        # 2. Lock approved records (Transition status to APPROVED)
        updated.status = 'APPROVED'
        updated.save()
        
        # Attempting to edit should throw PermissionDenied
        with self.assertRaises(PermissionDenied):
            track_and_save_record(
                record=updated,
                changed_by=self.user,
                reason="Attempt to alter locked record",
                updated_fields={'quantity': Decimal('300')}
            )
