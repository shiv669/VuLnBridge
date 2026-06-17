from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from vulnbridge.cases.models import VulnerabilityCase, AuthorityDelegation
from vulnbridge.cases.serializers import VulnerabilityCaseSerializer
from vulnbridge.integrations.terminal3_client import terminal3_client
from django.utils import timezone
import json

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
    
    @action(detail='uuid', methods=['post'])
    def validate_contract(self, request, pk=None):
        """Execute validate contract in T3N TEE"""
        case = self.get_object()
        
        try:
            result = terminal3_client.execute_contract(
                'validate',
                {
                    'case_id': str(case.case_id),
                    'title': case.title,
                    'description': case.description,
                    'severity': case.severity,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            # Log action
            terminal3_client.log_action({
                'case_id': str(case.case_id),
                'action': 'validate',
                'timestamp': timezone.now().isoformat(),
                'result': result
            })
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail='uuid', methods=['post'])
    def remediate_contract(self, request, pk=None):
        """Execute remediate contract in T3N TEE"""
        case = self.get_object()
        
        try:
            result = terminal3_client.execute_contract(
                'remediate',
                {
                    'case_id': str(case.case_id),
                    'patch_url': request.data.get('patch_url'),
                    'affected_versions': request.data.get('affected_versions', []),
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            terminal3_client.log_action({
                'case_id': str(case.case_id),
                'action': 'remediate',
                'timestamp': timezone.now().isoformat(),
                'result': result
            })
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail='uuid', methods=['post'])
    def disclose_contract(self, request, pk=None):
        """Execute disclose contract in T3N TEE"""
        case = self.get_object()
        
        try:
            result = terminal3_client.execute_contract(
                'disclose',
                {
                    'case_id': str(case.case_id),
                    'disclosure_date': request.data.get('disclosure_date'),
                    'stakeholders': request.data.get('stakeholders', []),
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            terminal3_client.log_action({
                'case_id': str(case.case_id),
                'action': 'disclose',
                'timestamp': timezone.now().isoformat(),
                'result': result
            })
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail='uuid', methods=['post'])
    def publish_contract(self, request, pk=None):
        """Execute publish contract in T3N TEE"""
        case = self.get_object()
        
        try:
            result = terminal3_client.execute_contract(
                'publish',
                {
                    'case_id': str(case.case_id),
                    'advisory_url': request.data.get('advisory_url'),
                    'cve_id': request.data.get('cve_id'),
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            terminal3_client.log_action({
                'case_id': str(case.case_id),
                'action': 'publish',
                'timestamp': timezone.now().isoformat(),
                'result': result
            })
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def audit_log(self, request):
        """Retrieve audit log from T3N"""
        case_id = request.query_params.get('case_id')
        
        try:
            actions = terminal3_client.get_action_log(case_id)
            return Response({
                'case_id': case_id,
                'actions': actions,
                'count': len(actions)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)