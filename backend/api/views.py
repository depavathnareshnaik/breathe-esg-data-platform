from decimal import Decimal
from django.shortcuts import render
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token

from api.models import Tenant, UserProfile, IngestionBatch, IngestionRow, NormalizedRecord, ValidationIssue, AuditLog
from api.serializers import TenantSerializer, UserSerializer, IngestionBatchSerializer, NormalizedRecordSerializer, AuditLogSerializer

class CustomLoginView(ObtainAuthToken):
    """Authenticates a user and returns their token along with tenant information."""
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        user_serializer = UserSerializer(user)
        return Response({
            'token': token.key,
            'user': user_serializer.data
        })

class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    """Allows authenticated users to list tenants."""
    permission_classes = [IsAuthenticated]
    serializer_class = TenantSerializer
    queryset = Tenant.objects.all().order_by('name')

class IngestionViewSet(viewsets.ModelViewSet):
    """Handles upload of raw CSV files and triggering parsing and normalization."""
    permission_classes = [IsAuthenticated]
    serializer_class = IngestionBatchSerializer
    queryset = IngestionBatch.objects.all().order_by('-uploaded_at')

    def get_queryset(self):
        # Strict tenant separation
        return self.queryset.filter(tenant=self.request.user.profile.tenant)

    @action(detail=False, methods=['POST'], url_path='upload')
    def upload_file(self, request):
        file_obj = request.FILES.get('file')
        source_type = request.data.get('source_type')
        tenant_id = request.data.get('tenant_id')
        
        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        if source_type not in ['SAP', 'UTILITY', 'TRAVEL']:
            return Response({'error': f"Invalid source type '{source_type}'."}, status=status.HTTP_400_BAD_REQUEST)
            
        tenant = request.user.profile.tenant
        if tenant_id and request.user.profile.role == 'ADMIN':
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response({'error': 'Tenant not found.'}, status=status.HTTP_400_BAD_REQUEST)
                
        try:
            raw_content = file_obj.read().decode('utf-8')
        except Exception as e:
            return Response({'error': f"Failed to decode CSV: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Save original CSV content in the batch record
        batch = IngestionBatch.objects.create(
            tenant=tenant,
            source_type=source_type,
            file_name=file_obj.name,
            raw_content=raw_content,
            uploaded_by=request.user
        )
        
        from api.services.ingestion import parse_csv_batch
        from api.services.normalization import normalize_row
        
        try:
            rows = parse_csv_batch(batch)
            normalized_count = 0
            flagged_count = 0
            
            for row in rows:
                record = normalize_row(row)
                if record.status == 'NORMALIZED':
                    normalized_count += 1
                elif record.status == 'FLAGGED':
                    flagged_count += 1
                    
            return Response({
                'batch_id': batch.id,
                'file_name': batch.file_name,
                'source_type': batch.source_type,
                'row_count': len(rows),
                'normalized_count': normalized_count,
                'flagged_count': flagged_count,
                'status': 'COMPLETED'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'batch_id': batch.id,
                'error': f"Failed during parsing/normalization processing: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NormalizedRecordViewSet(viewsets.ModelViewSet):
    """Exposes normalized canonical ESG records. Supports search and audits."""
    permission_classes = [IsAuthenticated]
    serializer_class = NormalizedRecordSerializer
    queryset = NormalizedRecord.objects.all().order_by('-date', '-created_at')

    def get_queryset(self):
        # Strict tenant separation
        qs = self.queryset.filter(tenant=self.request.user.profile.tenant)
        
        # Filters
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
            
        scope_param = self.request.query_params.get('scope')
        if scope_param:
            qs = qs.filter(scope=scope_param)
            
        category_param = self.request.query_params.get('category')
        if category_param:
            qs = qs.filter(category=category_param)
            
        search_param = self.request.query_params.get('search')
        if search_param:
            # Query JSON keys in IngestionRow.raw_data for description, supplier, or account info
            qs = qs.filter(
                models.Q(activity_type__icontains=search_param) |
                models.Q(source_row__raw_data__Description__icontains=search_param) |
                models.Q(source_row__raw_data__SupplierName__icontains=search_param) |
                models.Q(source_row__raw_data__ServiceAddress__icontains=search_param) |
                models.Q(source_row__raw_data__AccountNumber__icontains=search_param)
            )
            
        return qs

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        reason = request.data.get('reason')
        if not reason or not reason.strip():
            return Response({'reason': 'A reason is required to edit this record.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Parse and sanitize fields
        editable_fields = ['quantity', 'source_unit', 'date', 'confidence']
        updated_fields = {}
        
        for f in editable_fields:
            if f in request.data:
                val = request.data[f]
                if f == 'quantity':
                    try:
                        val = Decimal(str(val))
                    except (InvalidOperation, ValueError):
                        return Response({'quantity': 'Invalid decimal format.'}, status=status.HTTP_400_BAD_REQUEST)
                elif f == 'confidence':
                    try:
                        val = Decimal(str(val))
                    except (InvalidOperation, ValueError):
                        return Response({'confidence': 'Invalid decimal format.'}, status=status.HTTP_400_BAD_REQUEST)
                elif f == 'date':
                    import datetime
                    try:
                        # Standard ISO date format parsing
                        if isinstance(val, str) and 'T' in val:
                            val = datetime.datetime.strptime(val.split('T')[0], '%Y-%m-%d').date()
                        else:
                            val = datetime.datetime.strptime(str(val), '%Y-%m-%d').date()
                    except ValueError:
                        return Response({'date': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
                updated_fields[f] = val
                
        try:
            from api.services.audit import track_and_save_record
            record = track_and_save_record(instance, request.user, reason, updated_fields)
            serializer = self.get_serializer(record)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['POST'])
    def approve(self, request, pk=None):
        record = self.get_object()
        from api.services.audit import check_immutability
        try:
            check_immutability(record)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        comment = request.data.get('comment', 'Approved by analyst')
        
        old_status = record.status
        record.status = 'APPROVED'
        record.save()
        
        # Save to Audit Log
        AuditLog.objects.create(
            tenant=record.tenant,
            record=record,
            changed_by=request.user,
            old_values={'status': old_status},
            new_values={'status': 'APPROVED'},
            reason=comment
        )
        
        return Response({'status': 'success', 'new_status': 'APPROVED'})

    @action(detail=True, methods=['POST'])
    def reject(self, request, pk=None):
        record = self.get_object()
        from api.services.audit import check_immutability
        try:
            check_immutability(record)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        reason = request.data.get('reason')
        if not reason or not reason.strip():
            return Response({'error': 'A reason is required to reject a record.'}, status=status.HTTP_400_BAD_REQUEST)
            
        old_status = record.status
        record.status = 'FLAGGED'
        record.save()
        
        # Record validation issue explaining rejection reason
        ValidationIssue.objects.create(
            record=record,
            rule_name='ANALYST_REJECTION',
            message=f"Rejected by analyst: {reason}",
            severity='ERROR'
        )
        
        # Save to Audit Log
        AuditLog.objects.create(
            tenant=record.tenant,
            record=record,
            changed_by=request.user,
            old_values={'status': old_status},
            new_values={'status': 'FLAGGED'},
            reason=reason
        )
        
        return Response({'status': 'success', 'new_status': 'FLAGGED'})

    @action(detail=True, methods=['GET'], url_path='audit-history')
    def audit_history(self, request, pk=None):
        record = self.get_object()
        history = AuditLog.objects.filter(record=record).order_by('-timestamp')
        serializer = AuditLogSerializer(history, many=True)
        return Response(serializer.data)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Exposes global audit trails scoped by tenant."""
    permission_classes = [IsAuthenticated]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.all().order_by('-timestamp')

    def get_queryset(self):
        # Strict tenant separation
        return self.queryset.filter(tenant=self.request.user.profile.tenant)
