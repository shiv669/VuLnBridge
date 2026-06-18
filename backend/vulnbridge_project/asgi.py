"""
ASGI config for vulnbridge_project.
Routes HTTP to Django and WebSocket to Channels consumers.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from vulnbridge.consumers import CaseConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vulnbridge_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/cases/<str:case_id>/", CaseConsumer.as_asgi()),
        ])
    ),
})
