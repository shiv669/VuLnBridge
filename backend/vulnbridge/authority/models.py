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
    t3n_proof = models.TextField(blank=True, default='')  # T3N proof from map-entry-set
    agent_did = models.TextField(blank=True, default='')  # DID of the T3N agent

    class Meta:
        app_label = 'authority'
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
        app_label = 'authority'   # ties to the 'authority' app in INSTALLED_APPS
        db_table = 'authority_revocations'

