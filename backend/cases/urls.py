from django.urls import path, include
from rest_framework.routers import DefaultRouter
from vulnbridge.cases.views import VulnerabilityCaseViewSet

router = DefaultRouter()
router.register(r'vulnerabilities', VulnerabilityCaseViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]