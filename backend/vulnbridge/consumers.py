"""
WebSocket Consumer for real-time case updates.

Clients connect to ws://localhost:8000/ws/cases/{case_id}/
and receive live events:
  - authority_granted
  - authority_revoked
  - contract_executed
  - contract_blocked
  - case_status_updated
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer


class CaseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.case_id = self.scope['url_route']['kwargs']['case_id']
        self.group_name = f"case_{self.case_id}"

        # Join case group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            "type": "connected",
            "case_id": self.case_id,
            "message": "VulnBridge Agent Console connected"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Clients don't send messages — this is a one-way broadcast channel
        pass

    # ── Event handlers (called by group_send from views) ─────────────────────

    async def authority_granted(self, event):
        await self.send(text_data=json.dumps({
            "type": "authority_granted",
            "action": event["action"],
            "granted_by": event["granted_by"],
            "t3n_proof": event.get("t3n_proof"),
            "timestamp": event["timestamp"],
        }))

    async def authority_revoked(self, event):
        await self.send(text_data=json.dumps({
            "type": "authority_revoked",
            "action": event["action"],
            "revoked_by": event.get("revoked_by"),
            "t3n_proof": event.get("t3n_proof"),
            "timestamp": event["timestamp"],
        }))

    async def contract_executed(self, event):
        await self.send(text_data=json.dumps({
            "type": "contract_executed",
            "action": event["action"],
            "case_id": event["case_id"],
            "signature": event.get("signature"),
            "proof_of_authority": event.get("proof_of_authority"),
            "timestamp": event["timestamp"],
        }))

    async def contract_blocked(self, event):
        """The money moment — authority was revoked mid-workflow."""
        await self.send(text_data=json.dumps({
            "type": "contract_blocked",
            "action": event["action"],
            "case_id": event["case_id"],
            "reason": event["reason"],
            "t3n_verification": event.get("t3n_verification"),
            "timestamp": event["timestamp"],
        }))

    async def case_status_updated(self, event):
        await self.send(text_data=json.dumps({
            "type": "case_status_updated",
            "case_id": event["case_id"],
            "status": event["status"],
            "stage": event["stage"],
            "timestamp": event["timestamp"],
        }))


async def broadcast_to_case(case_id: str, event_type: str, payload: dict):
    """
    Utility: broadcast an event to all clients watching a case.
    Call from Django views (sync → async bridge via async_to_sync).
    """
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"case_{case_id}",
        {"type": event_type, **payload}
    )
