from django.urls import path, include
from rest_framework.routers import DefaultRouter
from cases.views import VulnerabilityCaseViewSet

router = DefaultRouter()
router.register(r'cases', VulnerabilityCaseViewSet, basename='cases')

urlpatterns = [
    path('api/', include(router.urls)),
]