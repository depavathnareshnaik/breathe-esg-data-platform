from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import CustomLoginView, TenantViewSet, IngestionViewSet, NormalizedRecordViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'ingestion', IngestionViewSet, basename='ingestion')
router.register(r'records', NormalizedRecordViewSet, basename='record')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('auth/login/', CustomLoginView.as_view(), name='login'),
    path('', include(router.urls)),
]
