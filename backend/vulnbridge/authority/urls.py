from django.urls import path
from . import views

urlpatterns = [
    path('grant/', views.grant_authority, name='grant_authority'),
    path('revoke/', views.revoke_authority, name='revoke_authority'),
    path('status/', views.authority_status, name='authority_status'),
]
