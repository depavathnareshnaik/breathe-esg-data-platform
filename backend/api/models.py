import uuid
from django.db import models
from django.contrib.auth.models import User

class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('ANALYST', 'Analyst'),
        ('ADMIN', 'Admin'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='ANALYST')

    def __str__(self):
        return f"{self.user.username} ({self.role}) - {self.tenant.name}"

class IngestionBatch(models.Model):
    SOURCE_CHOICES = (
        ('SAP', 'SAP ERP Export'),
        ('UTILITY', 'Utility Portal Export'),
        ('TRAVEL', 'Travel Platform Export'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='ingestion_batches')
    source_type = models.CharField(max_length=50, choices=SOURCE_CHOICES)
    file_name = models.CharField(max_length=255)
    raw_content = models.TextField()
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploads')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source_type} batch ({self.file_name}) - {self.uploaded_at.strftime('%Y-%m-%d %H:%M')}"

class IngestionRow(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('NORMALIZED', 'Normalized'),
        ('FAILED', 'Failed'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(IngestionBatch, on_delete=models.CASCADE, related_name='rows')
    row_index = models.IntegerField()
    raw_data = models.JSONField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Row {self.row_index} of {self.batch.id}"

class NormalizedRecord(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Review'),
        ('NORMALIZED', 'Normalized'),
        ('FLAGGED', 'Flagged with Issues'),
        ('APPROVED', 'Approved & Locked'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='normalized_records')
    source_row = models.ForeignKey(IngestionRow, on_delete=models.SET_NULL, null=True, blank=True, related_name='records')
    
    scope = models.IntegerField(choices=((1, 'Scope 1'), (2, 'Scope 2'), (3, 'Scope 3')))
    category = models.CharField(max_length=100) # e.g. FUEL_COMBUSTION, ELECTRICITY, BUSINESS_TRAVEL
    activity_type = models.CharField(max_length=100) # e.g. DIESEL, GRID_ELECTRICITY, FLIGHT
    
    quantity = models.DecimalField(max_digits=20, decimal_places=6)
    normalized_unit = models.CharField(max_length=50) # LITER, KWH, KM
    source_unit = models.CharField(max_length=50)
    
    date = models.DateField()
    confidence = models.DecimalField(max_digits=3, decimal_places=2) # 0.00 to 1.00
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    
    co2e_emissions = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True) # in kg CO2e
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.category} ({self.activity_type}): {self.quantity} {self.normalized_unit} - {self.status}"

class ValidationIssue(models.Model):
    SEVERITY_CHOICES = (
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(NormalizedRecord, on_delete=models.CASCADE, related_name='validation_issues')
    rule_name = models.CharField(max_length=100) # MISSING_VALUE, INVALID_DATE, NEGATIVE_CONSUMPTION, SUSPICIOUS_SPIKE, UNKNOWN_UNIT
    message = models.TextField()
    severity = models.CharField(max_length=50, choices=SEVERITY_CHOICES, default='ERROR')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rule_name} ({self.severity}): {self.message}"

class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='audit_logs')
    record = models.ForeignKey(NormalizedRecord, on_delete=models.CASCADE, related_name='audit_history')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_actions')
    old_values = models.JSONField()
    new_values = models.JSONField()
    reason = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        user_str = self.changed_by.username if self.changed_by else "System"
        return f"Change to {self.record.id} by {user_str} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
