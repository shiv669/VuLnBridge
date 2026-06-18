"""
Validation Nodes — one per workflow stage.

Each node checks if the agent has T3N authority before executing its action,
then calls the Terminal3Client to execute the appropriate WASM contract.
"""

import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def _get_t3n():
    """Lazy import to avoid startup crash if T3N env vars are absent."""
    from vulnbridge.integrations.terminal3_client import terminal3_client
    return terminal3_client


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Security Validation
# ─────────────────────────────────────────────────────────────────────────────

def handle_security_validation(state: dict) -> dict:
    """
    Checks validate authority and, if authorized, executes the validate contract.
    If not authorized, returns state unchanged (workflow will loop back here).
    """
    t3n = _get_t3n()

    try:
        is_authorized = t3n.get_authority('validate')
    except Exception as e:
        logger.error("T3N authority check failed: %s", e)
        return {**state, 'error_message': str(e)}

    if not is_authorized:
        logger.info("Validate authority not granted yet. Waiting.")
        return {**state, 'validate_authorized': False}

    try:
        result = t3n.execute_contract('validate', {
            'case_id': state['case_id'],
            'title': state.get('title', ''),
            'description': state.get('description', ''),
            'severity': state.get('severity_score', 0.0),
            'timestamp': timezone.now().isoformat(),
        })

        t3n.log_action({
            'case_id': state['case_id'],
            'action': 'validate',
            'timestamp': timezone.now().isoformat(),
            'result': result,
        })

        return {
            **state,
            'validate_authorized': True,
            'status': 'validated',
            'current_stage': 'engineering_remediation',
            'validation_result': result,
            'error_message': None,
        }
    except Exception as e:
        logger.error("Validate contract failed: %s", e)
        return {**state, 'error_message': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Engineering Remediation
# ─────────────────────────────────────────────────────────────────────────────

def handle_engineering_remediation(state: dict) -> dict:
    """Checks remediate authority and executes the remediate contract."""
    t3n = _get_t3n()

    try:
        is_authorized = t3n.get_authority('remediate')
    except Exception as e:
        return {**state, 'error_message': str(e)}

    if not is_authorized:
        return {**state, 'remediate_authorized': False}

    try:
        result = t3n.execute_contract('remediate', {
            'case_id': state['case_id'],
            'timestamp': timezone.now().isoformat(),
        })

        t3n.log_action({
            'case_id': state['case_id'],
            'action': 'remediate',
            'timestamp': timezone.now().isoformat(),
            'result': result,
        })

        return {
            **state,
            'remediate_authorized': True,
            'status': 'remediated',
            'current_stage': 'legal_review',
            'remediation_result': result,
            'error_message': None,
        }
    except Exception as e:
        return {**state, 'error_message': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: Legal Review / Disclosure Preparation
# ─────────────────────────────────────────────────────────────────────────────

def handle_legal_review(state: dict) -> dict:
    """Checks disclose authority and executes the disclose contract."""
    t3n = _get_t3n()

    try:
        is_authorized = t3n.get_authority('disclose')
    except Exception as e:
        return {**state, 'error_message': str(e)}

    if not is_authorized:
        return {**state, 'disclose_authorized': False}

    try:
        result = t3n.execute_contract('disclose', {
            'case_id': state['case_id'],
            'timestamp': timezone.now().isoformat(),
        })

        t3n.log_action({
            'case_id': state['case_id'],
            'action': 'disclose',
            'timestamp': timezone.now().isoformat(),
            'result': result,
        })

        return {
            **state,
            'disclose_authorized': True,
            'status': 'disclosed',
            'current_stage': 'communications',
            'disclosure_result': result,
            'error_message': None,
        }
    except Exception as e:
        return {**state, 'error_message': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Stage 5: Communications / Publication
# ─────────────────────────────────────────────────────────────────────────────

def handle_communications(state: dict) -> dict:
    """Checks publish authority and executes the publish contract."""
    t3n = _get_t3n()

    try:
        is_authorized = t3n.get_authority('publish')
    except Exception as e:
        return {**state, 'error_message': str(e)}

    if not is_authorized:
        return {**state, 'publish_authorized': False}

    try:
        result = t3n.execute_contract('publish', {
            'case_id': state['case_id'],
            'timestamp': timezone.now().isoformat(),
        })

        t3n.log_action({
            'case_id': state['case_id'],
            'action': 'publish',
            'timestamp': timezone.now().isoformat(),
            'result': result,
        })

        return {
            **state,
            'publish_authorized': True,
            'status': 'closed',
            'current_stage': 'closed',
            'publication_result': result,
            'error_message': None,
        }
    except Exception as e:
        return {**state, 'error_message': str(e)}
