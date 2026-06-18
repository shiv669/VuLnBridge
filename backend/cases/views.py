from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from cases.models import VulnerabilityCase, AuthorityDelegation, AuditLog
from cases.serializers import VulnerabilityCaseSerializer
from django.utils import timezone
import uuid
import logging

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


def _t3n():
    from vulnbridge.integrations.terminal3_client import terminal3_client
    return terminal3_client


def _broadcast(case_id: str, event_type: str, payload: dict):
    """Push a WebSocket event to all clients watching this case."""
    try:
        async_to_sync(channel_layer.group_send)(
            f"case_{case_id}",
            {"type": event_type, **payload}
        )
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed (non-fatal): {e}")


class VulnerabilityCaseViewSet(viewsets.ModelViewSet):
    queryset = VulnerabilityCase.objects.all().order_by('-created_at')
    serializer_class = VulnerabilityCaseSerializer

    # ── Vulnerability Submission ──────────────────────────────────────────────

    @action(detail=False, methods=['post'], url_path='submit_vulnerability')
    def submit_vulnerability(self, request):
        """
        Public endpoint — researcher submits vulnerability.
        No authentication required. Creates case and returns case_id.
        """
        severity_map = {'low': 3.0, 'medium': 5.5, 'high': 8.0, 'critical': 9.5}
        severity_str = request.data.get('severity', 'medium')

        case_id = f"VULN-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

        data = {
            'case_id': case_id,
            'title': request.data.get('title', '').strip(),
            'description': request.data.get('description', '').strip(),
            'severity_score': severity_map.get(severity_str, 5.5),
            'affected_systems': [
                s.strip()
                for s in request.data.get('affected_systems', '').split(',')
                if s.strip()
            ],
            'researcher_email': request.data.get('researcher_email', '').strip(),
            'researcher_name': request.data.get('researcher_name', '').strip(),
            'status': 'submitted',
            'current_workflow_stage': 'submission',
        }

        if not data['title']:
            return Response({'error': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not data['researcher_email']:
            return Response({'error': 'researcher_email is required'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            case = serializer.save()
            return Response({
                'case_id': case.case_id,
                'status': case.status,
                'current_stage': case.current_workflow_stage,
                'message': f'Case {case.case_id} created. Agent is now process owner.',
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Contract Execution ────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='validate_contract')
    def validate_contract(self, request, pk=None):
        """
        Execute validate contract in T3N TEE.
        T3N checks authority before executing — returns signed proof on success,
        or AUTHORITY_REVOKED with T3N proof if revoked.
        """
        case = self.get_object()
        t3n = _t3n()

        result = t3n.execute_contract('validate', {
            'case_id': str(case.case_id),
            'title': case.title,
            'description': case.description,
            'severity': case.severity_score,
            'timestamp': timezone.now().isoformat(),
        })

        if not result.get('success'):
            if result.get('error') == 'AUTHORITY_REVOKED':
                _broadcast(case.case_id, 'contract_blocked', {
                    'action': 'validate',
                    'case_id': case.case_id,
                    'reason': result.get('message'),
                    't3n_verification': result.get('t3n_verification'),
                    'timestamp': timezone.now().isoformat(),
                })
                return Response(result, status=status.HTTP_403_FORBIDDEN)
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Update case status
        case.status = 'validated'
        case.current_workflow_stage = 'engineering_remediation'
        case.save()

        _broadcast(case.case_id, 'contract_executed', {
            'action': 'validate',
            'case_id': case.case_id,
            'signature': result.get('signature'),
            'proof_of_authority': result.get('proof_of_authority'),
            'timestamp': timezone.now().isoformat(),
        })
        _broadcast(case.case_id, 'case_status_updated', {
            'case_id': case.case_id,
            'status': 'validated',
            'stage': 'engineering_remediation',
            'timestamp': timezone.now().isoformat(),
        })

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='remediate_contract')
    def remediate_contract(self, request, pk=None):
        case = self.get_object()
        t3n = _t3n()

        result = t3n.execute_contract('remediate', {
            'case_id': str(case.case_id),
            'timestamp': timezone.now().isoformat(),
        })

        if not result.get('success'):
            if result.get('error') == 'AUTHORITY_REVOKED':
                _broadcast(case.case_id, 'contract_blocked', {
                    'action': 'remediate',
                    'case_id': case.case_id,
                    'reason': result.get('message'),
                    't3n_verification': result.get('t3n_verification'),
                    'timestamp': timezone.now().isoformat(),
                })
                return Response(result, status=status.HTTP_403_FORBIDDEN)
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        case.status = 'remediated'
        case.current_workflow_stage = 'legal_review'
        case.save()

        _broadcast(case.case_id, 'contract_executed', {
            'action': 'remediate',
            'case_id': case.case_id,
            'signature': result.get('signature'),
            'proof_of_authority': result.get('proof_of_authority'),
            'timestamp': timezone.now().isoformat(),
        })
        _broadcast(case.case_id, 'case_status_updated', {
            'case_id': case.case_id,
            'status': 'remediated',
            'stage': 'legal_review',
            'timestamp': timezone.now().isoformat(),
        })

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='disclose_contract')
    def disclose_contract(self, request, pk=None):
        """
        THE MONEY MOMENT.
        If legal authority was revoked, T3N returns AUTHORITY_REVOKED
        with cryptographic proof. Frontend shows the big red screen.
        """
        case = self.get_object()
        t3n = _t3n()

        result = t3n.execute_contract('disclose', {
            'case_id': str(case.case_id),
            'timestamp': timezone.now().isoformat(),
        })

        if not result.get('success'):
            if result.get('error') == 'AUTHORITY_REVOKED':
                # This is the demo's key moment — broadcast to all watching clients
                _broadcast(case.case_id, 'contract_blocked', {
                    'action': 'disclose',
                    'case_id': case.case_id,
                    'reason': result.get('message', 'Disclosure authority revoked by Legal'),
                    't3n_verification': result.get('t3n_verification'),
                    'timestamp': timezone.now().isoformat(),
                })
                return Response({
                    **result,
                    'demo_moment': True,
                    'message': 'Disclosure authority revoked by Legal',
                }, status=status.HTTP_403_FORBIDDEN)
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        case.status = 'disclosed'
        case.current_workflow_stage = 'communications'
        case.save()

        _broadcast(case.case_id, 'contract_executed', {
            'action': 'disclose',
            'case_id': case.case_id,
            'signature': result.get('signature'),
            'proof_of_authority': result.get('proof_of_authority'),
            'timestamp': timezone.now().isoformat(),
        })
        _broadcast(case.case_id, 'case_status_updated', {
            'case_id': case.case_id,
            'status': 'disclosed',
            'stage': 'communications',
            'timestamp': timezone.now().isoformat(),
        })

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='publish_contract')
    def publish_contract(self, request, pk=None):
        case = self.get_object()
        t3n = _t3n()

        result = t3n.execute_contract('publish', {
            'case_id': str(case.case_id),
            'timestamp': timezone.now().isoformat(),
        })

        if not result.get('success'):
            if result.get('error') == 'AUTHORITY_REVOKED':
                _broadcast(case.case_id, 'contract_blocked', {
                    'action': 'publish',
                    'case_id': case.case_id,
                    'reason': result.get('message'),
                    't3n_verification': result.get('t3n_verification'),
                    'timestamp': timezone.now().isoformat(),
                })
                return Response(result, status=status.HTTP_403_FORBIDDEN)
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        case.status = 'closed'
        case.current_workflow_stage = 'closed'
        case.save()

        _broadcast(case.case_id, 'case_status_updated', {
            'case_id': case.case_id,
            'status': 'closed',
            'stage': 'closed',
            'timestamp': timezone.now().isoformat(),
        })

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='audit_log')
    def audit_log(self, request):
        case_id = request.query_params.get('case_id')
        try:
            actions = _t3n().get_action_log(case_id)
            return Response({
                'case_id': case_id,
                'actions': actions,
                'count': len(actions),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)