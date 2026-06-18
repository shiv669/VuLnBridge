"""
Workflow Edge Transitions — conditional routing between LangGraph nodes.

Each function receives the current state and returns a string key
that determines which node to go to next.
"""


def check_security_authority(state: dict) -> str:
    """
    After security_validation node runs:
    - If the agent executed successfully (validate_authorized=True), proceed.
    - If not authorized yet, pause (loop back to security_validation).
    - If there's an error, also pause for human review.
    """
    if state.get('error_message'):
        return "pause"  # Error state — stay here for human review
    if state.get('validate_authorized'):
        return "proceed"
    return "pause"


def check_remediation_authority(state: dict) -> str:
    """Route after engineering_remediation node."""
    if state.get('error_message'):
        return "pause"
    if state.get('remediate_authorized'):
        return "proceed"
    return "pause"


def check_disclosure_authority(state: dict) -> str:
    """Route after legal_review node."""
    if state.get('error_message'):
        return "pause"
    if state.get('disclose_authorized'):
        return "proceed"
    return "pause"


def check_publication_authority(state: dict) -> str:
    """Route after communications node."""
    if state.get('error_message'):
        return "pause"
    if state.get('publish_authorized'):
        return "proceed"
    return "pause"
