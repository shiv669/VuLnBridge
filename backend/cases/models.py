from django.db import models
from django.contrib.postgres.fields import ArrayField


class VulnerabilityCase(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('validated', 'Validated'),
        ('remediated', 'Remediated'),
        ('disclosed', 'Disclosed'),
        ('closed', 'Closed'),
    ]

    case_id = models.CharField(max_length=36, unique=True, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    title = models.CharField(max_length=256)
    description = models.TextField()
    severity_score = models.FloatField(default=0.0)
    affected_systems = ArrayField(models.CharField(max_length=255), default=list)

    researcher_email = models.EmailField()
    researcher_name = models.CharField(max_length=255, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    current_workflow_stage = models.CharField(max_length=50, blank=True, default='submission')

    
    class Meta:
        db_table = 'vulnerability_cases'

class AuthorityDelegation(models.Model):
    AUTHORITY_TYPES = [
        ('investigation', 'Investigation'),
        ('remediation', 'Remediation'),
        ('disclosure', 'Disclosure'),
        ('publication', 'Publication'),
    ]
    
    delegation_id = models.CharField(max_length=36, unique=True, primary_key=True)
    case = models.ForeignKey(VulnerabilityCase, on_delete=models.CASCADE)
    
    authority_type = models.CharField(max_length=20, choices=AUTHORITY_TYPES)
    delegated_by = models.CharField(max_length=255)
    delegated_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    terminal3_token = models.TextField()
    
    class Meta:
        db_table = 'authority_delegations'

class AuditLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    case = models.ForeignKey(VulnerabilityCase, on_delete=models.CASCADE)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    actor_identity = models.CharField(max_length=255)
    action_type = models.CharField(max_length=100)
    authority_used = models.CharField(max_length=50, blank=True)
    result = models.CharField(max_length=50)
    details = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'audit_log'

class Notification(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    notification_id = models.CharField(max_length=36, unique=True, primary_key=True)
    case = models.ForeignKey(VulnerabilityCase, on_delete=models.CASCADE)
    
    recipient_address = models.EmailField()
    notification_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'notifications'