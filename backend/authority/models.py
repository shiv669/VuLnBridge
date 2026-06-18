# Re-export models defined in vulnbridge.authority.models.
# Django discovers migrations through the app in INSTALLED_APPS ('authority'),
# but the actual class definitions live in vulnbridge/authority/models.py
# with app_label = 'authority' to tie them back here.
from vulnbridge.authority.models import AuthorityGrant, AuthorityRevocation

__all__ = ['AuthorityGrant', 'AuthorityRevocation']
