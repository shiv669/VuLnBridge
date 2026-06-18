"""Submission Node — creates and records a new vulnerability case."""

import uuid
from django.utils import timezone


def handle_submission(state: dict) -> dict:
    """
    Entry node: receives raw submission data, assigns a case_id,
    and sets the workflow stage to 'security_validation'.
    """
    case_id = state.get('case_id') or f"VULN-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    return {
        **state,
        'case_id': case_id,
        'status': 'submitted',
        'current_stage': 'security_validation',
        'validate_authorized': False,
        'remediate_authorized': False,
        'disclose_authorized': False,
        'publish_authorized': False,
        'validation_result': None,
        'remediation_result': None,
        'disclosure_result': None,
        'publication_result': None,
        'error_message': None,
    }
