from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from vulnbridge.cases.models import VulnerabilityCase, AuthorityDelegation
from vulnbridge.cases.serializers import VulnerabilityCaseSerializer
from vulnbridge.integrations.terminal3_client import terminal3_client

class VulnerabilityCaseViewSet(viewsets.ModelViewSet):
    queryset = VulnerabilityCase.objects.all()
    serializer_class = VulnerabilityCaseSerializer
    
    @action(detail=False, methods=['post'])
    def submit_vulnerability(self, request):
        """Handle vulnerability submission"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail='uuid', methods=['post'])
    def delegate_authority(self, request, pk=None):
        """Handle authority delegation through Terminal 3"""
        case = self.get_object()
        authority_type = request.data.get('authority_type')
        
        # Call Terminal 3 to verify and delegate authority
        result = terminal3_client.delegate_authority(
            case_id=case.case_id,
            authority_type=authority_type,
            stakeholder=request.user.email
        )
        
        if result.get('success'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail='uuid', methods=['post'])
    def revoke_authority(self, request, pk=None):
        """Handle authority revocation through Terminal 3"""
        case = self.get_object()
        authority_type = request.data.get('authority_type')
        
        result = terminal3_client.revoke_authority(
            case_id=case.case_id,
            authority_type=authority_type
        )
        
        if result.get('success'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)