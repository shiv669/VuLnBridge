# VulnBridge Architecture Requirements Document

## System Overview

VulnBridge consists of five core components:

```
React Frontend
     ↓
Django API Layer
     ↓
LangGraph Workflow Engine
     ↓
Terminal 3 Authority Layer
     ↓
PostgreSQL Database
```

Each component is responsible for a specific concern:

- **Frontend**: User interface for vulnerability submission, case management, authority delegation
- **API**: REST endpoints for case operations, authority delegation requests, audit trail queries
- **Workflow Engine**: Orchestrates multi-stage vulnerability workflow, queries Terminal 3 before actions
- **Authority Layer**: Terminal 3 integration for authority verification and revocation
- **Database**: Persistent storage for cases, delegations, audit logs

## Component Architecture

### Frontend (React)

The frontend is a single-page application providing:

- Vulnerability submission form (no authentication required)
- Case details dashboard (role-based access)
- Authority delegation panel (requires stakeholder authentication)
- Real-time workflow timeline (WebSocket updates)

The frontend uses WebSocket connection to receive real-time status updates from the backend. When backend publishes status change, all connected browsers viewing that case receive message and update UI immediately.

### Backend API (Django)

The backend exposes REST API endpoints:

- `POST /api/vulnerabilities/submit` - Accept vulnerability submission
- `GET /api/vulnerabilities/{caseId}` - Retrieve case details
- `POST /api/authority/delegate` - Request authority delegation
- `POST /api/authority/revoke` - Request authority revocation
- `GET /api/audit/trail/{caseId}` - Retrieve audit log

All endpoints except vulnerability submission require authentication. Organizational users authenticate via OAuth2. The API validates that requester has appropriate role to access the resource.

### Workflow Engine (LangGraph)

LangGraph is a state machine framework that represents the vulnerability disclosure workflow as a directed graph with nodes for each workflow stage:

- Node: Submission (receives vulnerability)
- Node: Security Validation (security team reviews)
- Node: Engineering Remediation (engineering team patches)
- Node: Legal Review (legal team approves)
- Node: Communications (communications team publishes)
- Node: Closed (case resolved)

Transitions between nodes represent completion conditions. For example, transition from Security Validation to Engineering Remediation occurs when security team marks validation complete AND security has delegated investigation authority.

LangGraph persists workflow state to PostgreSQL. If the workflow engine crashes, it can recover from the last persisted checkpoint and resume execution without losing progress.

Before transitioning to the next stage, LangGraph:

1. Identifies what authority is required for the next stage
2. Queries Authority Validation Service with authority type
3. Waits for response from Terminal 3
4. Only transitions if Terminal 3 confirms authority is active
5. Logs the authority check and decision to audit trail

### Authority Verification

All authority verification flows through Terminal 3:

```
Workflow Action Needed
     ↓
Query Authority Service
     ↓
Authority Service → Terminal 3 API
     ↓
Terminal 3 checks delegation state
     ↓
Terminal 3 → Authority Service (ACTIVE or REVOKED)
     ↓
Authority Service → Workflow Engine
     ↓
Proceed (if ACTIVE) or Pause (if REVOKED)
```

The Authority Service caches recent verification results for performance but always queries Terminal 3 for critical decisions.

### Authority Delegation Flow

When stakeholder requests authority delegation:

```
Stakeholder Clicks "Delegate Authority" Button
     ↓
Frontend Requests Authentication Confirmation
     ↓
Frontend Sends Delegation Request to Django API
     ↓
API Authenticates Stakeholder
     ↓
API Forwards Delegation Request to Terminal 3
     ↓
Terminal 3 Verifies Stakeholder Identity
     ↓
Terminal 3 Creates Cryptographic Signature
     ↓
Terminal 3 Returns Signed Token
     ↓
API Stores Token in Database
     ↓
API Updates Authority Cache
     ↓
LangGraph Detects Authority is Active
     ↓
Workflow Progresses to Next Stage
```

### Authority Revocation Flow

When stakeholder revokes authority:

```
Stakeholder Clicks "Revoke Authority" Button
     ↓
Frontend Sends Revocation Request to API
     ↓
API Forwards Revocation to Terminal 3
     ↓
Terminal 3 Marks Delegation as Revoked
     ↓
Terminal 3 Sends Webhook to VulnBridge
     ↓
API Receives Webhook
     ↓
API Updates Authority Cache
     ↓
API Notifies LangGraph of Revocation
     ↓
LangGraph Stops Attempting Revoked Actions
     ↓
Workflow Pauses at Current Stage
     ↓
WebSocket Notifies Connected Browsers
```

### Database Schema (PostgreSQL)

**vulnerability_cases** table
- case_id (UUID primary key)
- created_timestamp
- submitted_by (researcher email)
- title, description
- severity_score (CVSS)
- affected_systems (text array)
- current_workflow_stage
- status
- updated_timestamp

**authority_delegations** table
- delegation_id (UUID primary key)
- case_id (foreign key)
- delegated_by (stakeholder identity)
- authority_type (investigation, remediation, disclosure, publication)
- delegated_timestamp
- revoked_timestamp (null if still active)
- terminal3_token (signed delegation from Terminal 3)

**audit_log** table
- log_id (bigint primary key)
- timestamp
- case_id (foreign key)
- actor_identity
- action_type
- authority_used
- result
- details (JSON)

Audit log table has only INSERT permission. UPDATE and DELETE are not allowed. This ensures immutability.

**notifications** table
- notification_id (UUID primary key)
- case_id (foreign key)
- recipient_address
- notification_type
- status (pending, sent, failed)
- created_timestamp
- sent_timestamp
- error_message

## Data Flow: Complete Scenario

**Initial Submission**

1. Researcher fills vulnerability form and clicks submit
2. Browser sends POST request to `/api/vulnerabilities/submit`
3. API validates form data
4. API creates record in vulnerability_cases table
5. API creates audit log entry
6. API sends message to notification queue
7. Background worker consumes message
8. Worker sends email to security team
9. API returns case_id to browser

**Authority Delegation**

1. Security team opens case details page
2. Page displays "Delegate Investigation Authority" button
3. Security team clicks button
4. Frontend requests password confirmation
5. Frontend sends POST request to `/api/authority/delegate` with authority_type=investigation
6. API authenticates stakeholder
7. API forwards request to Terminal 3
8. Terminal 3 signs delegation and returns token
9. API creates record in authority_delegations table with terminal3_token
10. API creates audit log entry
11. API updates authority cache in memory
12. LangGraph detects authority is now active
13. LangGraph begins investigation workflow
14. LangGraph publishes StatusChanged event via WebSocket

**Workflow Progression**

1. LangGraph reaches decision point requiring next stage transition
2. LangGraph identifies required authority (e.g., remediation authority)
3. LangGraph queries Authority Validation Service
4. Authority Service queries Terminal 3 API
5. Terminal 3 checks authority_delegations table for active delegation
6. Terminal 3 returns ACTIVE
7. Authority Service returns ACTIVE to LangGraph
8. LangGraph proceeds with next stage
9. LangGraph creates audit log entry recording authority verification and decision

**Authority Revocation**

1. Legal counsel clicks "Revoke Communications Authority" button
2. Frontend sends POST request to `/api/authority/revoke` with authority_type=communications
3. API sends revocation request to Terminal 3
4. Terminal 3 updates authority_delegations record, sets revoked_timestamp
5. Terminal 3 sends webhook to VulnBridge: `POST /webhooks/authority-revoked`
6. API receives webhook
7. API updates authority cache, marking communications authority as revoked
8. API publishes WorkflowPaused event
9. WebSocket delivers WorkflowPaused message to all connected browsers
10. LangGraph's next authority check queries Terminal 3
11. Terminal 3 returns REVOKED for communications authority
12. LangGraph stops executing
13. Workflow remains paused

**Authority Restoration**

1. Legal counsel clicks "Restore Communications Authority" button
2. Frontend sends POST request to `/api/authority/delegate`
3. API forwards to Terminal 3
4. Terminal 3 creates new delegation record
5. Terminal 3 returns new signed token
6. API creates new record in authority_delegations
7. API updates authority cache
8. API publishes WorkflowResumed event
9. LangGraph detects authority is active again
10. LangGraph resumes execution from paused state

## Integration Points

### Jira Integration

When engineering remediation authority becomes active:

1. LangGraph calls Jira REST API with vulnerability details
2. Jira creates ticket and returns ticket identifier
3. LangGraph stores ticket_id in vulnerability_cases record
4. Periodically, integration service polls Jira API for ticket status
5. When ticket status changes to "resolved", integration service creates PatchReady event
6. LangGraph consumes event and progresses workflow

### Slack Integration

When workflow status changes:

1. LangGraph publishes StatusChanged event
2. Notification service consumes event
3. Notification service formats Slack message
4. Notification service sends webhook to Slack incoming webhook URL
5. Slack posts message to configured channel
6. Message includes case link and current status

### Email Integration

When notifications are required:

1. Notification service creates email message
2. Notification service connects to external email service (SendGrid, AWS SES, etc.)
3. Email service handles delivery and retry
4. Notification service records notification status in database

### Webhook Support

External systems can subscribe to case updates:

1. Subscribers register webhook endpoint through API
2. When case status changes, system sends HTTP POST to all registered endpoints
3. Payload includes case_id, new_status, timestamp
4. System includes HMAC signature for authenticity verification
5. External systems verify signature and process update

## Security Architecture

### Authentication

- Organizational users: OAuth2 with identity provider (Azure AD, Okta, etc)
- Researchers: No authentication required for submission
- Administrators: OAuth2 + MFA

### Authorization

- Users can only view cases in workflow stages where their role applies
- All authority decisions are verified through Terminal 3
- No implicit permissions

### Data Protection

- All network traffic: TLS 1.3
- Vulnerability descriptions at rest: AES-256 encryption
- Researcher contact info at rest: AES-256 encryption
- Audit logs: Stored in plaintext (required for audit access)
- Encryption keys: Stored separately from encrypted data

### Terminal 3 Integration

- Communication with Terminal 3: Agent Dev Kit protocol
- Authority verification: Always delegated to Terminal 3
- Authority caching: Minimal, used only for performance
- Revocation: Terminal 3 is authoritative source

## Deployment

**Development Environment**
- Single Linux server
- All components in Docker containers
- PostgreSQL running locally
- Simple file-based logging

**Production Deployment (Future)**
- Docker containers
- Kubernetes orchestration
- PostgreSQL managed database
- Redis cache layer
- Load balancer for horizontal scaling
- Centralized logging (ELK stack)
- Prometheus metrics collection

**For Hackathon Deployment**
- Single Linux server
- Docker containers for Django and PostgreSQL
- React built and served by Django
- Basic logging to stdout

## Performance Characteristics

- Vulnerability submission: 100ms
- Authority delegation: 2-5 seconds (includes Terminal 3 latency)
- Authority verification: 200-500ms (Terminal 3 query)
- WebSocket update delivery: 1-2 seconds
- Case retrieval: 50ms
- Workflow stage transition: 1-5 seconds (includes authority check and integrations)

## Scalability Limits

Single server deployment supports:

- Approximately 10 concurrent users
- Approximately 100 active cases
- Approximately 1 workflow transition per second
- WebSocket connections: 50 simultaneous

Scaling beyond these limits requires:
- Multiple Django application servers
- Load balancer
- PostgreSQL read replicas
- Redis cache
- Message queue (RabbitMQ or Kafka)

## Critical Design Decisions

**1. Authority Verification Through Terminal 3**

Authority is not stored or enforced by VulnBridge. All verification queries Terminal 3. This ensures that:
- Authority state is always current
- Application cannot escalate permissions
- Revocations take effect immediately

**2. Immutable Audit Logs**

Audit logs are write-only. This creates permanent forensic record that cannot be tampered with.

**3. WebSocket for Real-Time Updates**

WebSocket provides low-latency updates to connected browsers. Users see workflow status changes immediately without polling.

**4. LangGraph for Workflow Persistence**

LangGraph persists workflow state to database. If process crashes, workflow resumes from checkpoint without data loss.

**5. Terminal 3 as External Authority**

Terminal 3 is the single source of truth for authority. VulnBridge is a thin client to Terminal 3's authority system.
