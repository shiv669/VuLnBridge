from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import AuthorityGrant, AuthorityRevocation
from ..integrations.terminal3_client import terminal3_client

@api_view(['POST'])
def grant_authority(request):
    """Grant agent authority for an action via T3N"""
    action = request.data.get('action')
    granted_by = request.data.get('granted_by')
    
    if not action or not granted_by:
        return Response(
            {"error": "Missing action or granted_by"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Grant to Terminal 3
        t3n_result = terminal3_client.grant_authority(action, granted_by)
        
        # Record in database
        grant = AuthorityGrant.objects.create(
            grant_id=f"{action}:{granted_by}",
            action=action,
            granted_by=granted_by
        )
        
        return Response({
            "success": True,
            "action": action,
            "granted_by": granted_by,
            "granted_at": grant.granted_at.isoformat(),
            "t3n_response": t3n_result
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
def revoke_authority(request):
    """Revoke agent authority for an action (IMMEDIATE via T3N TEE)"""
    action = request.data.get('action')
    revoked_by = request.data.get('revoked_by')
    reason = request.data.get('reason', '')
    
    if not action:
        return Response(
            {"error": "Missing action"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Revoke in Terminal 3 (immediate effect - NO timeout)
        t3n_result = terminal3_client.revoke_authority(action)
        
        # Mark grant as revoked
        AuthorityGrant.objects.filter(
            action=action,
            revoked_at__isnull=True
        ).update(revoked_at=timezone.now())
        
        # Record revocation
        revocation = AuthorityRevocation.objects.create(
            action=action,
            revoked_by=revoked_by or "system",
            reason=reason
        )
        
        return Response({
            "success": True,
            "action": action,
            "revoked_at": revocation.revoked_at.isoformat(),
            "immediate_effect": True,
            "t3n_response": t3n_result
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
def authority_status(request):
    """Check current authority status"""
    action = request.query_params.get('action')
    
    if not action:
        return Response(
            {"error": "Missing action parameter"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Check if authorized in T3N
        is_authorized = terminal3_client.get_authority(action)
        
        # Get latest grant
        grant = AuthorityGrant.objects.filter(
            action=action
        ).order_by('-granted_at').first()
        
        return Response({
            "action": action,
            "authorized": is_authorized,
            "last_grant": grant.granted_at.isoformat() if grant else None,
            "active": grant.is_active() if grant else False
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
