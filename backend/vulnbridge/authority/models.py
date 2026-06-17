from django.db import models
from django.utils import timezone

class AuthorityGrant(models.Model):
    ACTIONS = [
        ('validate', 'Validate Vulnerability'),
        ('remediate', 'Coordinate Patch'),
        ('disclose', 'Prepare Disclosure'),
        ('publish', 'Publish Advisory'),
    ]
    
    grant_id = models.CharField(max_length=50, unique=True, primary_key=True)
    action = models.CharField(max_length=20, choices=ACTIONS)
    granted_by = models.EmailField()
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'authority_grants'
    
    def is_active(self):
        return self.revoked_at is None

class AuthorityRevocation(models.Model):
    revocation_id = models.AutoField(primary_key=True)
    action = models.CharField(max_length=20)
    revoked_by = models.EmailField()
    revoked_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)
    
    class Meta:
        db_table = 'authority_revocations'
