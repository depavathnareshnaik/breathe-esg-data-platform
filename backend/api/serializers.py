from rest_framework import serializers
from django.contrib.auth.models import User
from api.models import Tenant, UserProfile, IngestionBatch, IngestionRow, NormalizedRecord, ValidationIssue, AuditLog

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'created_at']

class UserSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='profile.tenant.name', read_only=True)
    tenant_id = serializers.UUIDField(source='profile.tenant.id', read_only=True)
    role = serializers.CharField(source='profile.role', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'tenant_name', 'tenant_id', 'role']

class IngestionBatchSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    row_count = serializers.SerializerMethodField()

    class Meta:
        model = IngestionBatch
        fields = ['id', 'tenant', 'tenant_name', 'source_type', 'file_name', 'uploaded_by', 'uploaded_by_username', 'uploaded_at', 'row_count']

    def get_row_count(self, obj):
        return obj.rows.count()

class ValidationIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValidationIssue
        fields = ['id', 'rule_name', 'message', 'severity', 'created_at']

class NormalizedRecordSerializer(serializers.ModelSerializer):
    validation_issues = ValidationIssueSerializer(many=True, read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    batch_id = serializers.CharField(source='source_row.batch.id', read_only=True, default=None)
    batch_file_name = serializers.CharField(source='source_row.batch.file_name', read_only=True, default=None)
    source_type = serializers.CharField(source='source_row.batch.source_type', read_only=True, default=None)

    class Meta:
        model = NormalizedRecord
        fields = [
            'id', 'tenant', 'tenant_name', 'batch_id', 'batch_file_name', 'source_type',
            'scope', 'category', 'activity_type', 'quantity', 'normalized_unit', 'source_unit',
            'date', 'confidence', 'status', 'co2e_emissions', 'validation_issues', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'co2e_emissions', 'status', 'created_at', 'updated_at']

class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True, default="System")
    record_category = serializers.CharField(source='record.category', read_only=True)
    record_activity = serializers.CharField(source='record.activity_type', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'tenant', 'record', 'record_category', 'record_activity', 'changed_by', 'changed_by_username', 'old_values', 'new_values', 'reason', 'timestamp']
