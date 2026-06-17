from rest_framework import serializers
from vulnbridge.cases.models import VulnerabilityCase, AuthorityDelegation, AuditLog

class VulnerabilityCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = VulnerabilityCase
        fields = '__all__'

class AuthorityDelegationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorityDelegation
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'