# VulnBridge Project Setup Guide

Complete setup instructions for initializing the VulnBridge project before coding.

## Prerequisites

Ensure you have installed:
- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Git
- Docker (optional, for containerized deployment)

Verify installations:
```bash
python --version
node --version
psql --version
git --version
```

---

## Step 1: Initialize Git Repository

```bash
cd f:\Shivam\vulnbridge

git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

git add .
git commit -m "Initial commit: project documentation and setup"
```

---

## Step 2: Create Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Activate virtual environment (Linux/macOS)
source venv/bin/activate

# Verify activation (should show venv in prompt)
```

---

## Step 3: Create Project Directory Structure

```bash
# Create Django project structure
mkdir backend
mkdir frontend
mkdir scripts
mkdir config
mkdir docs

# Create backend structure
mkdir backend/vulnbridge
mkdir backend/vulnbridge/api
mkdir backend/vulnbridge/workflow
mkdir backend/vulnbridge/integrations
mkdir backend/vulnbridge/auth
mkdir backend/vulnbridge/static
mkdir backend/vulnbridge/templates

# Create configuration directories
mkdir config/terminal3
mkdir config/oauth2
mkdir config/database
```

---

## Step 4: Django Backend Setup

### 4.1 Create Django Project

```bash
cd backend

# Install Django and dependencies
pip install Django==4.2
pip install djangorestframework==3.14.0
pip install django-cors-headers==4.0.0
pip install python-decouple==3.8
pip install psycopg2-binary==2.9.6

# Create Django project
django-admin startproject vulnbridge_project .

# Create Django apps
python manage.py startapp cases
python manage.py startapp authority
python manage.py startapp audit
python manage.py startapp notifications
```

### 4.2 Update Django Settings

```bash
# Create .env file
echo "DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
DATABASE_NAME=vulnbridge
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1" > .env

# Create settings override file for local development
touch vulnbridge_project/settings_local.py
```

### 4.3 Install Additional Backend Dependencies

```bash
# Workflow and AI orchestration
pip install langgraph==0.0.20
pip install langchain==0.0.350
pip install langchain-groq==0.0.1

# Real-time communication
pip install channels==4.0.0
pip install channels-redis==4.1.0

# Message queue
pip install celery==5.3.1
pip install redis==5.0.0

# Authentication
pip install djangorestframework-simplejwt==5.2.2
pip install django-oauth-toolkit==2.3.0
pip install requests-oauthlib==1.3.0

# Testing
pip install pytest==7.4.0
pip install pytest-django==4.5.2

# Database
pip install sqlalchemy==2.0.19

# Utilities
pip install pydantic==1.10.12
pip install httpx==0.24.1
pip install requests==2.31.0
```

**Note on Terminal 3 Integration:** Terminal 3 is an external service, not a pip package. You'll integrate with it using HTTP API requests. The SDK will be added later when configuring the Terminal3Client class to make API calls to Terminal 3's endpoints.

### 4.4 Create requirements.txt

```bash
# Generate requirements file
pip freeze > requirements.txt
```

---

## Step 5: PostgreSQL Database Setup

### 5.1 Create Database and User

```bash
# Open PostgreSQL command line
psql -U postgres

# Inside psql:
CREATE DATABASE vulnbridge;
CREATE USER vulnbridge_user WITH PASSWORD 'vulnbridge_password';

ALTER ROLE vulnbridge_user SET client_encoding TO 'utf8';
ALTER ROLE vulnbridge_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE vulnbridge_user SET default_transaction_deferrable TO on;
ALTER ROLE vulnbridge_user SET TimeZone TO 'UTC';

GRANT ALL PRIVILEGES ON DATABASE vulnbridge TO vulnbridge_user;

\q
```

### 5.2 Create Database Tables

```bash
# From backend directory with venv activated
python manage.py migrate
python manage.py migrate cases
python manage.py migrate authority
python manage.py migrate audit
python manage.py migrate notifications
```

---

## Step 6: React Frontend Setup

### 6.1 Create React Application

```bash
cd frontend

# Create React app with TypeScript
# Note: This automatically installs TypeScript, @types/react, and @types/react-dom
npx create-react-app . --template typescript

# Install all frontend dependencies in one command
npm install axios react-router-dom ws zustand tailwindcss postcss autoprefixer @headlessui/react @heroicons/react @tailwindcss/postcss
```

### 6.2 Configure Environment

**Create .env file:**

```powershell
@"
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
"@ | Set-Content .env
```

**Create Tailwind config files:**

```powershell
# Create tailwind.config.js
@"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
"@ | Set-Content tailwind.config.js

# Create postcss.config.js (for Tailwind v4)
@"
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
"@ | Set-Content postcss.config.js
```

**Add Tailwind directives to src/index.css:**

Open `src/index.css` and add these lines at the very top:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Step 7: Terminal 3 Integration Setup

### 7.1 Create Terminal 3 Configuration

```powershell
cd ../backend

# Create Terminal 3 config directory
mkdir config\terminal3 -Force

# Create Terminal 3 configuration file
@"
[terminal3]
agent_id=vulnbridge-agent
agent_key=your-agent-key-here
agent_secret=your-agent-secret-here
api_url=https://terminal3.dev/api
sandbox_url=https://sandbox.terminal3.dev
auth_method=agent-credentials

[authority]
verification_endpoint=/api/v1/authority/verify
revocation_endpoint=/api/v1/authority/revoke
delegation_endpoint=/api/v1/authority/delegate
webhook_secret=your-webhook-secret
"@ | Set-Content config\terminal3\config.ini

# Create Terminal 3 integration module
New-Item -ItemType File -Path vulnbridge\integrations\terminal3_client.py -Force
```

### 7.2 Create Terminal 3 Client Code Template

Create the file `vulnbridge\integrations\terminal3_client.py` with this content:

```python
"""Terminal 3 Authority Verification Client"""

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
```

---

## Step 8: LangGraph Workflow Setup

### 8.1 Create Workflow Directory Structure

```powershell
# Create workflow directories
mkdir vulnbridge\workflow\states -Force
mkdir vulnbridge\workflow\nodes -Force
mkdir vulnbridge\workflow\edges -Force

# Create workflow modules
New-Item -ItemType File -Path vulnbridge\workflow\__init__.py -Force
New-Item -ItemType File -Path vulnbridge\workflow\states\__init__.py -Force
New-Item -ItemType File -Path vulnbridge\workflow\states\vulnerability_state.py -Force
New-Item -ItemType File -Path vulnbridge\workflow\nodes\__init__.py -Force
New-Item -ItemType File -Path vulnbridge\workflow\nodes\submission_node.py -Force
New-Item -ItemType File -Path vulnbridge\workflow\nodes\validation_node.py -Force
New-Item -ItemType File -Path vulnbridge\workflow\edges\__init__.py -Force
New-Item -ItemType File -Path vulnbridge\workflow\edges\transitions.py -Force
```

### 8.2 Create Main Workflow File

Create `vulnbridge\workflow\vulnerability_workflow.py`:

```python
"""LangGraph Vulnerability Disclosure Workflow"""

from langgraph.graph import StateGraph
from vulnbridge.workflow.states.vulnerability_state import VulnerabilityState
from vulnbridge.workflow.nodes import submission_node, validation_node
from vulnbridge.workflow.edges import transitions

def create_workflow():
    """Create vulnerability disclosure workflow graph"""
    
    workflow = StateGraph(VulnerabilityState)
    
    # Add nodes
    workflow.add_node("submission", submission_node.handle_submission)
    workflow.add_node("security_validation", validation_node.handle_security_validation)
    workflow.add_node("engineering_remediation", validation_node.handle_engineering_remediation)
    workflow.add_node("legal_review", validation_node.handle_legal_review)
    workflow.add_node("communications", validation_node.handle_communications)
    workflow.add_node("closed", lambda x: x)
    
    # Add edges
    workflow.add_edge("submission", "security_validation")
    workflow.add_conditional_edges(
        "security_validation",
        transitions.check_security_authority,
        {
            "proceed": "engineering_remediation",
            "pause": "security_validation"
        }
    )
    
    # Set entry point
    workflow.set_entry_point("submission")
    
    return workflow.compile()

# Create workflow instance
vulnerability_workflow = create_workflow()
```

---

## Step 9: Database Models Setup

### 9.1 Create Django Models

Create `vulnbridge\cases\models.py` with this content:

```python
from django.db import models
from django.contrib.postgres.fields import ArrayField

class VulnerabilityCase(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('validated', 'Validated'),
        ('remediated', 'Remediated'),
        ('disclosed', 'Disclosed'),
        ('closed', 'Closed'),
    ]
    
    case_id = models.CharField(max_length=36, unique=True, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    title = models.CharField(max_length=256)
    description = models.TextField()
    severity_score = models.FloatField()
    affected_systems = ArrayField(models.CharField(max_length=255))
    
    researcher_email = models.EmailField()
    researcher_name = models.CharField(max_length=255, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    current_workflow_stage = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'vulnerability_cases'

class AuthorityDelegation(models.Model):
    AUTHORITY_TYPES = [
        ('investigation', 'Investigation'),
        ('remediation', 'Remediation'),
        ('disclosure', 'Disclosure'),
        ('publication', 'Publication'),
    ]
    
    delegation_id = models.CharField(max_length=36, unique=True, primary_key=True)
    case = models.ForeignKey(VulnerabilityCase, on_delete=models.CASCADE)
    
    authority_type = models.CharField(max_length=20, choices=AUTHORITY_TYPES)
    delegated_by = models.CharField(max_length=255)
    delegated_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    terminal3_token = models.TextField()
    
    class Meta:
        db_table = 'authority_delegations'

class AuditLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    case = models.ForeignKey(VulnerabilityCase, on_delete=models.CASCADE)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    actor_identity = models.CharField(max_length=255)
    action_type = models.CharField(max_length=100)
    authority_used = models.CharField(max_length=50, blank=True)
    result = models.CharField(max_length=50)
    details = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'audit_log'

class Notification(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    notification_id = models.CharField(max_length=36, unique=True, primary_key=True)
    case = models.ForeignKey(VulnerabilityCase, on_delete=models.CASCADE)
    
    recipient_address = models.EmailField()
    notification_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'notifications'
```

---

## Step 10: API Endpoints Setup

### 10.1 Create Serializers

Create `vulnbridge\cases\serializers.py`:

```python
from rest_framework import serializers
from vulnbridge.cases.models import VulnerabilityCase, AuthorityDelegation, AuditLog

class VulnerabilityCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = VulnerabilityCase
        fields = '__all__'

class AuthorityDelegationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorityDelegation
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
```

### 10.2 Create Views

Create `vulnbridge\cases\views.py`:

```python
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from vulnbridge.cases.models import VulnerabilityCase, AuthorityDelegation
from vulnbridge.cases.serializers import VulnerabilityCaseSerializer
from vulnbridge.integrations.terminal3_client import terminal3_client

class VulnerabilityCaseViewSet(viewsets.ModelViewSet):
    queryset = VulnerabilityCase.objects.all()
    serializer_class = VulnerabilityCaseSerializer
    
    @action(detail=False, methods=['post'])
    def submit_vulnerability(self, request):
        """Handle vulnerability submission"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail='uuid', methods=['post'])
    def delegate_authority(self, request, pk=None):
        """Handle authority delegation through Terminal 3"""
        case = self.get_object()
        authority_type = request.data.get('authority_type')
        
        # Call Terminal 3 to verify and delegate authority
        result = terminal3_client.delegate_authority(
            case_id=case.case_id,
            authority_type=authority_type,
            stakeholder=request.user.email
        )
        
        if result.get('success'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail='uuid', methods=['post'])
    def revoke_authority(self, request, pk=None):
        """Handle authority revocation through Terminal 3"""
        case = self.get_object()
        authority_type = request.data.get('authority_type')
        
        result = terminal3_client.revoke_authority(
            case_id=case.case_id,
            authority_type=authority_type
        )
        
        if result.get('success'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
```

### 10.3 Create URL Router

Create `vulnbridge\cases\urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from vulnbridge.cases.views import VulnerabilityCaseViewSet

router = DefaultRouter()
router.register(r'vulnerabilities', VulnerabilityCaseViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
```

---

## Step 11: Docker Setup

### 11.1 Create Backend Dockerfile

```bash
cd backend

cat > Dockerfile << 'EOF'
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run Django
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
EOF
```

### 11.2 Create Frontend Dockerfile

```bash
cd ../frontend

cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF
```

### 11.3 Create Docker Compose

```bash
cd ..

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: vulnbridge
      POSTGRES_USER: vulnbridge_user
      POSTGRES_PASSWORD: vulnbridge_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  django:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    ports:
      - "8000:8000"
    environment:
      DEBUG: "True"
      DATABASE_HOST: postgres
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

  react:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8000
      REACT_APP_WS_URL: ws://localhost:8000/ws
    depends_on:
      - django
    volumes:
      - ./frontend:/app

volumes:
  postgres_data:
EOF
```

---

## Step 12: Environment Configuration Files

### 12.1 Backend .env

Create `.env` in the backend directory with:

```powershell
@"
DEBUG=True
SECRET_KEY=your-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=vulnbridge
DATABASE_USER=vulnbridge_user
DATABASE_PASSWORD=vulnbridge_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# Groq API (Free - get key from https://console.groq.com)
GROQ_API_KEY=your-groq-api-key-here

# Terminal 3
TERMINAL3_AGENT_ID=vulnbridge-agent
TERMINAL3_AGENT_KEY=your-agent-key-here
TERMINAL3_AGENT_SECRET=your-agent-secret-here
TERMINAL3_API_URL=https://terminal3.dev/api
TERMINAL3_WEBHOOK_SECRET=your-webhook-secret-here

# OAuth2
OAUTH2_PROVIDER_ID=your-provider-id
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=1025

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
"@ | Set-Content .env
```

### 12.2 Frontend .env

Create `.env` in the frontend directory:

```powershell
cd ../frontend

@"
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_TIMEOUT=30000
REACT_APP_WS_URL=ws://localhost:8000/ws
REACT_APP_WS_RECONNECT_INTERVAL=5000
"@ | Set-Content .env
```

---

## Step 13: Initialize Django Admin

```bash
cd backend

# Run migrations
python manage.py migrate

# Create superuser (interactive)
python manage.py createsuperuser

# Create groups for RBAC
python manage.py shell -c "
from django.contrib.auth.models import Group
groups = ['security', 'engineering', 'legal', 'communications']
for group_name in groups:
    Group.objects.get_or_create(name=group_name)
print('Groups created successfully')
"
```

---

## Step 14: Test Local Development Setup

### 14.1 Start Django Development Server

```bash
cd backend

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver 0.0.0.0:8000
```

### 14.2 Start React Development Server (in new terminal)

```bash
# Activate venv if not already active
cd frontend

npm start
```

### 14.3 Test API Endpoints (in new terminal)

```bash
# Test vulnerability submission endpoint
curl -X POST http://localhost:8000/api/vulnerabilities/submit/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Vulnerability",
    "description": "Test Description",
    "severity_score": 8.5,
    "affected_systems": ["system1", "system2"],
    "researcher_email": "researcher@example.com"
  }'

# Test case retrieval
curl http://localhost:8000/api/vulnerabilities/
```

---

## Step 15: Git Repository Setup

```powershell
# Go to project root
cd ..

# Create .gitignore
@"
# Python
venv/
*.py[cod]
__pycache__/
*.egg-info/
dist/
build/

# Django
*.log
db.sqlite3
/staticfiles/
/media/

# Node
node_modules/
npm-debug.log
yarn-error.log
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
.dockerignore
"@ | Set-Content .gitignore

# Create .gitattributes
@"
*.py text eol=lf
*.js text eol=lf
*.json text eol=lf
*.md text eol=lf
"@ | Set-Content .gitattributes

# Initial commit
git add .
git commit -m "Initial project setup with Django, React, PostgreSQL, and Terminal 3 integration"
```

---

## Step 16: Verify Complete Setup

```bash
# Check Python packages
pip list | grep -E "django|langraph|terminal3|psycopg2"

# Check Node packages
cd frontend && npm list react react-dom ws

# Check database connection
psql -U vulnbridge_user -d vulnbridge -c "SELECT version();"

# Check Django
cd backend && python manage.py check

# Check Node
node --version
npm --version
```

---

## Quick Start Commands

### Full Docker Setup

```bash
# Build and start all services
docker-compose up --build

# Access services
# Django: http://localhost:8000
# React: http://localhost:3000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Development Setup (without Docker)

```bash
# Terminal 1: Activate venv and start Django
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/macOS
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Start React
cd frontend
npm start

# Terminal 3: Optional - Start Celery worker
cd backend
celery -A vulnbridge_project worker -l info
```

---

## Database Backup/Restore

### Backup

```bash
pg_dump -U vulnbridge_user -d vulnbridge > vulnbridge_backup.sql
```

### Restore

```bash
psql -U vulnbridge_user -d vulnbridge < vulnbridge_backup.sql
```

---

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
psql -U postgres

# If connection refused, restart PostgreSQL service
# Windows
net start postgresql-14

# Linux
sudo service postgresql restart
```

### Python Package Issues

```bash
# Clear pip cache
pip cache purge

# Reinstall requirements
pip install --force-reinstall -r requirements.txt
```

### Node Package Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall node packages
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps After Setup

1. Verify all services are running on correct ports
2. Test vulnerability submission endpoint
3. Test authority delegation with Terminal 3
4. Begin implementing workflow nodes
5. Create frontend components for case management
6. Implement WebSocket real-time updates
7. Add Jira integration
8. Add Slack integration

All setup is now complete. You're ready to begin development.
