from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import uuid
import logging

from .models import AuthorityGrant, AuthorityRevocation
from vulnbridge.integrations.terminal3_client import terminal3_client

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


def _broadcast(case_id: str, event_type: str, payload: dict):
    if not case_id:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            f"case_{case_id}",
            {"type": event_type, **payload}
        )
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed: {e}")


@api_view(['POST'])
def grant_authority(request):
    """
    Grant agent authority for an action via T3N hardware storage.
    T3N writes authority=true at z:vulnbridge:authority:{action}.
    Returns T3N proof (signature/txHash) along with grant record.
    """
    action_name = request.data.get('action')
    granted_by = request.data.get('granted_by')
    case_id = request.data.get('case_id')  # optional — for WebSocket broadcast

    if not action_name or not granted_by:
        return Response(
            {"error": "Missing required fields: action, granted_by"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Write authority to T3N hardware storage
        t3n_result = terminal3_client.grant_authority(action_name, granted_by, case_id=case_id)

        # Record in local DB for audit history (includes T3N proof)
        grant = AuthorityGrant.objects.create(
            grant_id=f"{action_name}:{uuid.uuid4().hex[:12]}",
            action=action_name,
            granted_by=granted_by,
            t3n_proof=t3n_result.get('t3n_proof', ''),
            agent_did=t3n_result.get('agent_did', ''),
        )

        response_data = {
            "success": True,
            "action": action_name,
            "granted_by": granted_by,
            "granted_at": grant.granted_at.isoformat(),
            "t3n_proof": t3n_result.get('t3n_proof'),
            "storage_key": t3n_result.get('storage_key'),
            "timestamp": t3n_result.get('timestamp'),
        }

        # Broadcast to all clients watching this case
        _broadcast(case_id, 'authority_granted', {
            'action': action_name,
            'granted_by': granted_by,
            't3n_proof': t3n_result.get('t3n_proof'),
            'timestamp': t3n_result.get('timestamp'),
        })

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"grant_authority failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def revoke_authority(request):
    """
    Revoke agent authority — IMMEDIATE via T3N hardware enforcement.
    Next T3N authority check for this action returns false.
    No race conditions. No edge cases. Hardware-enforced.
    """
    action_name = request.data.get('action')
    revoked_by = request.data.get('revoked_by', 'system')
    reason = request.data.get('reason', '')
    case_id = request.data.get('case_id')

    if not action_name:
        return Response({"error": "Missing required field: action"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Revoke in T3N hardware — immediate effect
        t3n_result = terminal3_client.revoke_authority(action_name, case_id=case_id)

        # Mark any active grants as revoked in local DB
        AuthorityGrant.objects.filter(
            action=action_name,
            revoked_at__isnull=True
        ).update(revoked_at=timezone.now())

        # Record revocation
        revocation = AuthorityRevocation.objects.create(
            action=action_name,
            revoked_by=revoked_by,
            reason=reason,
        )

        response_data = {
            "success": True,
            "action": action_name,
            "revoked_by": revoked_by,
            "revoked_at": revocation.revoked_at.isoformat(),
            "immediate_effect": True,
            "t3n_proof": t3n_result.get('t3n_proof'),
            "storage_key": t3n_result.get('storage_key'),
        }

        # Broadcast revocation — this triggers the big red screen on connected clients
        _broadcast(case_id, 'authority_revoked', {
            'action': action_name,
            'revoked_by': revoked_by,
            't3n_proof': t3n_result.get('t3n_proof'),
            'timestamp': revocation.revoked_at.isoformat(),
        })

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"revoke_authority failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def authority_status(request):
    """
    Check current authority status — reads live from T3N storage.
    Result is authoritative (hardware-verified).
    """
    action_name = request.query_params.get('action')

    if not action_name:
        return Response({"error": "Missing query param: action"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        t3n_status = terminal3_client.get_authority(action_name)

        return Response({
            "action": action_name,
            "authorized": t3n_status.get('authorized', False),
            "t3n_verified": t3n_status.get('t3n_verified', False),
            "t3n_proof": t3n_status.get('t3n_proof'),
            "granted_by": t3n_status.get('granted_by'),
            "granted_at": t3n_status.get('granted_at'),
            "revoked_at": t3n_status.get('revoked_at'),
            "checked_at": t3n_status.get('checked_at'),
            "storage_key": t3n_status.get('storage_key'),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"authority_status failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET'])
def all_authority_status(request):
    """
    Returns status for all 4 authority types in one call.
    Reads from T3N Contract.
    """
    case_id = request.query_params.get('case_id')
    actions = ['validate', 'remediate', 'disclose', 'publish']
    results = {}

    for action_name in actions:
        try:
            t3n_status = terminal3_client.get_authority(action_name, case_id=case_id)
            results[action_name] = {
                "authorized": t3n_status.get('authorized', False),
                "t3n_verified": t3n_status.get('t3n_verified', False),
                "t3n_proof": t3n_status.get('t3n_proof'),
                "granted_by": t3n_status.get('granted_by'),
                "granted_at": t3n_status.get('granted_at'),
                "revoked_at": t3n_status.get('revoked_at'),
                "checked_at": t3n_status.get('checked_at'),
            }
        except Exception as e:
            logger.error(f"all_authority_status error for {action_name}: {str(e)}")
            results[action_name] = {"authorized": False, "error": str(e)}

    return Response(results)
