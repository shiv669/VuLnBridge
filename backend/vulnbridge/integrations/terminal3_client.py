import os
import requests
from typing import Dict, Optional

class Terminal3Client:
    """HTTP client for Terminal 3 authority verification service"""
    
    def __init__(self):
        self.api_url = os.getenv('TERMINAL3_API_URL', 'https://terminal3.dev/api')
        self.agent_id = os.getenv('TERMINAL3_AGENT_ID')
        self.agent_key = os.getenv('TERMINAL3_AGENT_KEY')
    
    def verify_authority(self, case_id: str, authority_type: str) -> Dict:
        """Verify if authority is currently active"""
        try:
            response = requests.post(
                f"{self.api_url}/v1/authority/verify",
                json={
                    "case_id": case_id,
                    "authority_type": authority_type,
                    "agent_id": self.agent_id
                },
                headers={"Authorization": f"Bearer {self.agent_key}"}
            )
            return response.json()
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delegate_authority(self, case_id: str, authority_type: str, stakeholder: str) -> Dict:
        """Create new authority delegation"""
        try:
            response = requests.post(
                f"{self.api_url}/v1/authority/delegate",
                json={
                    "case_id": case_id,
                    "authority_type": authority_type,
                    "stakeholder": stakeholder,
                    "agent_id": self.agent_id
                },
                headers={"Authorization": f"Bearer {self.agent_key}"}
            )
            return response.json()
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def revoke_authority(self, case_id: str, authority_type: str) -> Dict:
        """Revoke existing authority delegation"""
        try:
            response = requests.post(
                f"{self.api_url}/v1/authority/revoke",
                json={
                    "case_id": case_id,
                    "authority_type": authority_type,
                    "agent_id": self.agent_id
                },
                headers={"Authorization": f"Bearer {self.agent_key}"}
            )
            return response.json()
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_delegation_history(self, case_id: str) -> Dict:
        """Retrieve complete authority history"""
        try:
            response = requests.get(
                f"{self.api_url}/v1/authority/history/{case_id}",
                headers={"Authorization": f"Bearer {self.agent_key}"}
            )
            return response.json()
        except Exception as e:
            return {"success": False, "error": str(e)}

# Initialize Terminal 3 client
terminal3_client = Terminal3Client()