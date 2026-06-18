"""
URL configuration for vulnbridge_project project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authority management (grant/revoke/status)
    # vulnbridge/authority/views.py — these are standalone api_view functions
    path('api/authority/', include('vulnbridge.authority.urls')),

    # Vulnerability cases (CRUD + contract execution actions)
    path('', include('cases.urls')),
]
