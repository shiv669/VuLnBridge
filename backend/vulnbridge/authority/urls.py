from django.urls import path
from . import views

urlpatterns = [
    path('grant/', views.grant_authority, name='authority-grant'),
    path('revoke/', views.revoke_authority, name='authority-revoke'),
    path('status/', views.authority_status, name='authority-status'),
    path('all/', views.all_authority_status, name='authority-all'),
]
