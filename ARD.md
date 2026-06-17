# VulnBridge: Architecture Requirements Document

**Agent-in-TEE Architecture** - VulnBridge deployed as cryptographically-verified agent inside Terminal 3 Trusted Execution Environment

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Terminal 3 Network (Confidential Computing TEE Layer)              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  VulnBridge Agent Tenant (Hardware-Enforced)               │  │
│  │                                                            │  │
│  │  DID: did:t3n:091e8b21792cb47aa07ee28b08066b7bedc6a597   │  │
│  │                                                            │  │
│  │  WASM Contracts (Rust → compiled to WASM):               │  │
│  │    ├─ validate_vulnerability()                           │  │
│  │    ├─ coordinate_patch()                                 │  │
│  │    ├─ prepare_disclosure()                               │  │
│  │    └─ publish_advisory()                                 │  │
│  │                                                            │  │
│  │  T3N Storage (Operator-Blind, Immutable):               │  │
│  │    ├─ z:vulnbridge:authority          (grant/revoke)    │  │
│  │    ├─ z:vulnbridge:action_log         (audit trail)     │  │
│  │    └─ z:vulnbridge:case_state         (workflow state)  │  │
│  │                                                            │  │
│  │  Runtime Guarantees:                                     │  │
│  │    ├─ Hardware-enforced authority verification          │  │
│  │    ├─ Instant revocation (< 100ms)                      │  │
│  │    ├─ Cryptographic signing of all outputs              │  │
│  │    └─ Operator-blind execution (no visibility)          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           ↓ (Rust/WASM bytecode)                   │
│                           ↓ (Hardware-enforced)                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Django Backend (Orchestration & External API Calls)                │
│                                                                      │
│  Port: 8000                                                          │
│  Database: PostgreSQL 14+                                            │
│  Framework: Django 4.2 + DRF 3.14.0                                  │
│                                                                      │
│  Components:                                                         │
│    ├─ /api/authority/grant         (POST: Grant agent authority)    │
│    ├─ /api/authority/revoke        (POST: Revoke agent authority)   │
│    ├─ /api/cases/create            (POST: Submit vulnerability)     │
│    ├─ /api/cases/{id}/validate     (POST: Invoke validation)        │
│    ├─ /api/cases/{id}/remediate    (POST: Invoke remediation)       │
│    ├─ /api/cases/{id}/disclose     (POST: Invoke disclosure)        │
│    ├─ /api/cases/{id}/publish      (POST: Invoke publication)       │
│    ├─ /api/audit-log               (GET: Query action log)          │
│    └─ /webhooks/t3n-revocation     (POST: Receive revocation events)│
│                                                                      │
│  Key Modules:                                                        │
│    ├─ vulnbridge_project/settings.py      (Configuration)           │
│    ├─ cases/models.py                     (Database schema)         │
│    ├─ cases/views.py                      (API endpoints)           │
│    ├─ cases/serializers.py                (Request/response)        │
│    ├─ authority/views.py                  (Authority management)    │
│    └─ integrations/terminal3_client.py    (T3N SDK wrapper)         │
│                                                                      │
│  Data Storage:                                                       │
│    ├─ VulnerabilityCase       (case metadata)                      │
│    ├─ AuthorityGrant          (authority delegation log)            │
│    ├─ AuthorityRevocation     (revocation log)                      │
│    └─ ActionLog               (local copy of audit trail)           │
│                                                                      │
│  External Integrations:                                              │
│    ├─ Jira (ticket creation, agent DID signature)                   │
│    ├─ Slack (notifications, agent identity)                         │
│    ├─ SendGrid (emails, agent signature in content)                │
│    └─ GitHub (repository operations, agent DID signature)          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  React Frontend (Authority Control & Audit Viewer)                  │
│                                                                      │
│  Port: 3000                                                          │
│  Framework: React 19.2.7 + TypeScript 6.0.3                          │
│                                                                      │
│  Components:                                                         │
│    ├─ VulnerabilityForm.tsx       (Submit vulnerability)             │
│    ├─ AuthorityPanel.tsx          (Grant/revoke authorization)       │
│    ├─ ActionLog.tsx               (View signed actions)              │
│    ├─ CaseStatus.tsx              (Workflow status)                  │
│    └─ SignatureVerifier.tsx       (Verify agent signature)           │
│                                                                      │
│  Real-time Updates:                                                  │
│    └─ WebSocket connection        (Action notifications)            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Terminal 3 Integration

### 2.1 Agent Registration

**Process:**
1. Create DID: Agent registers with Terminal 3 to get unique identifier
   - DID Format: `did:t3n:091e8b21792cb47aa07ee28b08066b7bedc6a597`
   - Immutable: Once registered, DID cannot change
   - Verifiable: External systems can verify DID authenticity

2. Upload WASM: Agent bytecode compiled to WASM format
   - Compile: `cargo build --release --target wasm32-wasip2`
   - Output: `vulnbridge_agent.wasm` (WebAssembly bytecode)
   - Deploy: Upload to T3N testnet via @terminal3/t3n-sdk

3. Initialize Storage: Create storage namespace in T3N
   - Namespace: `z:vulnbridge:*` (operator-blind storage)
   - Subkeys:
     - `z:vulnbridge:authority` - Authority grants/revocations
     - `z:vulnbridge:action_log` - Immutable audit trail
     - `z:vulnbridge:case_state` - Workflow state cache

### 2.2 Authority Storage Model

**Storage Key**: `z:vulnbridge:authority`

**Value Structure** (JSON):
```json
{
  "agent_can_validate": true,
  "agent_can_remediate": false,
  "agent_can_disclose": false,
  "agent_can_publish": false,
  "grants": {
    "agent_can_validate": {
      "granted_by": "security@org",
      "granted_at": "2026-06-17T14:00:00Z",
      "revoked_at": null
    }
  }
}
```

**Operations:**
- **Grant**: `updateStorage(key="z:vulnbridge:authority", value.agent_can_validate=true)`
- **Revoke**: `updateStorage(key="z:vulnbridge:authority", value.agent_can_validate=false)`
- **Read**: Agent checks authority before action

**Guarantees:**
- Immutable: Once written, cannot be altered without signature
- Operator-blind: T3N operators cannot read or modify
- Hardware-enforced: Authority changes take effect immediately at hardware level

### 2.3 Action Log Storage

**Storage Key**: `z:vulnbridge:action_log`

**Value Structure** (Array of actions):
```json
[
  {
    "timestamp": "2026-06-17T14:30:00Z",
    "agent_did": "did:t3n:091e8b21792cb47aa...",
    "action": "validate_vulnerability",
    "case_id": "VULN-2026-0815",
    "authority_verified_from": "z:vulnbridge:authority:validate",
    "signature": "0x...",
    "result": "success",
    "details": "Jira ticket SEC-123 created"
  },
  ...
]
```

**Guarantees:**
- Immutable: Actions cannot be modified after logging
- Operator-blind: Even T3N operators cannot alter log
- Completeness: Every agent action is logged
- Verifiable: Cryptographic signatures on every entry

### 2.4 WASM Contracts

#### Contract 1: validate_vulnerability

**Purpose**: Analyze vulnerability and create ticket

**Entry Point**:
```rust
pub fn validate_vulnerability(case_id: &str, severity: f32) -> ContractResult
```

**Runtime Steps:**
1. Check authority: `read z:vulnbridge:authority → agent_can_validate == true`
2. If not authorized: Return error (hardware enforces this)
3. If authorized:
   - Analyze vulnerability details
   - Determine Jira project and labels
   - Generate ticket payload
   - Sign output with agent DID
   - Write to z:vulnbridge:action_log
4. Return signed result to backend

**Output Signature**:
```json
{
  "status": "success",
  "jira_ticket": "SEC-123",
  "agent_did": "did:t3n:...",
  "timestamp": "2026-06-17T14:30:00Z",
  "signature": "0x...",
  "proof": "z:vulnbridge:action_log"
}
```

#### Contract 2: coordinate_patch

**Purpose**: Notify engineering team

**Entry Point**:
```rust
pub fn coordinate_patch(case_id: &str) -> ContractResult
```

**Runtime Steps:**
1. Check authority: `agent_can_remediate == true`
2. If authorized:
   - Generate Slack message with agent identity
   - Include signature in message
   - Return message payload
3. Backend sends message to Slack

#### Contract 3: prepare_disclosure

**Purpose**: Generate CVE disclosure document

**Entry Point**:
```rust
pub fn prepare_disclosure(case_id: &str) -> ContractResult
```

**Runtime Steps:**
1. Check authority: `agent_can_disclose == true`
2. If authorized:
   - Fetch vulnerability details
   - Generate CVE metadata (ID, CVSS, description)
   - Create disclosure document
   - Sign document with agent DID
   - Return signed disclosure

#### Contract 4: publish_advisory

**Purpose**: Send notifications and update channels

**Entry Point**:
```rust
pub fn publish_advisory(case_id: &str) -> ContractResult
```

**Runtime Steps:**
1. Check authority: `agent_can_publish == true`
2. If authorized:
   - Generate email notification (researcher)
   - Generate Slack message (security channel)
   - Sign all outputs with agent DID
   - Mark case as `closed`
   - Return signed results

### 2.5 Contract Execution Flow

```
Backend: POST /api/cases/1/validate → Django view

Django view:
  1. Verify case exists
  2. Prepare input: case_id, severity, analysis
  3. Call T3N SDK:
     await executeContract(
       contractName: "validate_vulnerability",
       input: { case_id: "VULN-2026-0815", severity: 8.5 },
       agentDid: "did:t3n:091e8b21792cb47aa..."
     )

T3N Hardware:
  1. Load WASM bytecode for agent
  2. Execute in hardware-enforced TEE
  3. Contract checks: read z:vulnbridge:authority
  4. If agent_can_validate == true:
     - Execute contract logic
     - Sign output with agent private key
     - Write to z:vulnbridge:action_log
  5. If agent_can_validate == false:
     - Throw exception (hardware-enforced)
     - Return error (authority not found)
  6. Return signed result to backend

Django view receives result:
  1. Verify signature using agent's public key
  2. Store result in database
  3. Return to frontend with signature

Frontend displays:
  - Action status: "Validation complete"
  - Agent DID: "did:t3n:..."
  - Signature: "0x..."
  - Verify button: Can independently verify signature
```

---

## 3. Backend Architecture

### 3.1 Django Models

```
VulnerabilityCase
├─ case_id (PK)
├─ created_at
├─ updated_at
├─ title
├─ description
├─ severity_score
├─ affected_systems (ArrayField)
├─ researcher_email
├─ status (submitted|validated|remediated|disclosed|closed)
└─ current_workflow_stage

AuthorityGrant
├─ grant_id (PK)
├─ agent_did
├─ action_type (validate|remediate|disclose|publish)
├─ granted_by
├─ granted_at
└─ revoked_at (nullable)

ActionLog
├─ log_id (PK)
├─ case (FK to VulnerabilityCase)
├─ action_type
├─ agent_did
├─ signature
├─ timestamp
├─ authority_verified
└─ details (JSONField)

Notification
├─ notification_id (PK)
├─ case (FK to VulnerabilityCase)
├─ recipient_address
├─ notification_type
├─ status (pending|sent|failed)
├─ created_at
└─ sent_at
```

### 3.2 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/cases/create` | Submit vulnerability |
| GET | `/api/cases/{id}` | Get case details |
| POST | `/api/authority/grant` | Grant agent authority |
| POST | `/api/authority/revoke` | Revoke agent authority |
| GET | `/api/authority/status` | Check current authorities |
| POST | `/api/cases/{id}/validate` | Invoke validation contract |
| POST | `/api/cases/{id}/remediate` | Invoke remediation contract |
| POST | `/api/cases/{id}/disclose` | Invoke disclosure contract |
| POST | `/api/cases/{id}/publish` | Invoke publication contract |
| GET | `/api/audit-log` | Query action audit trail |
| POST | `/webhooks/t3n-revocation` | Receive revocation notifications |

### 3.3 Terminal 3 Client Wrapper

**File**: `vulnbridge/integrations/terminal3_client.py`

**Responsibilities:**
- Authenticate with T3N API using agent DID + API key
- Call T3N SDK to execute WASM contracts
- Read/write T3N storage (authority, action log)
- Verify contract output signatures
- Handle revocation webhook notifications

**Key Methods:**
```python
class Terminal3Client:
    def executeContract(self, contract_name, input_data):
        """Execute WASM contract inside T3N TEE"""
        # Returns signed result
    
    def grantAuthority(self, action_type):
        """Grant agent authority for action"""
        # Updates z:vulnbridge:authority in T3N
    
    def revokeAuthority(self, action_type):
        """Revoke agent authority for action"""
        # Clears authority in T3N (hardware-enforced)
    
    def getAuthority(self, action_type):
        """Check if agent has authority"""
        # Reads from z:vulnbridge:authority
    
    def getActionLog(self, case_id=None):
        """Retrieve immutable action log"""
        # Reads from z:vulnbridge:action_log
    
    def verifySignature(self, data, signature, agent_did):
        """Verify DID signature on contract output"""
        # Returns True if valid
```

---

## 4. Frontend Architecture

### 4.1 React Components

```
App
├─ AuthorityPanel
│  ├─ Authority status (granted, revoked, pending)
│  ├─ Grant buttons (validate, remediate, disclose, publish)
│  └─ Big red REVOKE button
├─ VulnerabilityForm
│  ├─ Title, description, severity input
│  └─ Submit button
├─ CaseStatus
│  ├─ Case details
│  ├─ Workflow stage indicator
│  └─ Timeline
├─ ActionLog
│  ├─ Table of agent actions
│  ├─ Timestamp, action, signature columns
│  └─ Signature verification button
└─ SignatureVerifier
   ├─ Paste signature + agent DID
   └─ Verify cryptographic signature
```

### 4.2 WebSocket Messages

**Connection**: `ws://localhost:8000/ws`

**Message Types**:
```typescript
type WSMessage = 
  | AuthorityGrantedMessage
  | AuthorityRevokedMessage
  | ActionExecutedMessage
  | CaseStatusUpdatedMessage
  | ErrorMessage

interface AuthorityGrantedMessage {
  type: "authority_granted"
  action: string
  grantedBy: string
  timestamp: string
}

interface AuthorityRevokedMessage {
  type: "authority_revoked"
  action: string
  revokedAt: string
}

interface ActionExecutedMessage {
  type: "action_executed"
  action: string
  caseId: string
  signature: string
  timestamp: string
}

interface CaseStatusUpdatedMessage {
  type: "case_status_updated"
  caseId: string
  status: string
  stage: string
}
```

---

## 5. Security Guarantees

### 5.1 Authority Enforcement

| Threat | Mitigation | Level |
|--------|-----------|-------|
| Agent acts without authorization | Hardware-enforced authority check (T3N TEE) | Hardware |
| Forged authority | Authority stored in T3N, cannot be altered | Hardware |
| Revocation not taking effect | Hardware immediately blocks authority | Hardware |
| Race condition during revocation | Hardware enforces atomic operations | Hardware |

### 5.2 Cryptographic Identity

| Threat | Mitigation | Level |
|--------|-----------|-------|
| Spoofed agent identity | DID verified by cryptographic signature | Crypto |
| Signature forgery | HMAC verification with agent's public key | Crypto |
| Agent identity theft | DID in T3N (immutable, unique) | Hardware |
| Lost private key | Stored securely in T3N hardware | Hardware |

### 5.3 Audit Trail Integrity

| Threat | Mitigation | Level |
|--------|-----------|-------|
| Altered audit logs | T3N storage is immutable | Hardware |
| Deleted action log entries | T3N storage is operator-blind | Hardware |
| Backdated entries | Timestamp verified by T3N hardware | Hardware |
| Off-chain log tampering | Backend logs are read-only reference | Software |

### 5.4 External API Security

| Threat | Mitigation | Level |
|--------|-----------|-------|
| Unauthorized Jira access | Agent DID signature in every API call | Crypto |
| Forged Slack messages | Message signed with agent DID | Crypto |
| Spoofed email notifications | Email includes signature for verification | Crypto |
| Man-in-the-middle | HTTPS + TLS for all external calls | Network |

---

## 6. Data Flow Examples

### 6.1 Authority Grant Flow

```
1. Frontend: User clicks "Authorize Validation" button
   POST /api/authority/grant { action: "validate" }

2. Backend (Django):
   - Verify user is authorized to grant
   - Call Terminal3Client.grantAuthority("validate")
   - T3N SDK: updateStorage(z:vulnbridge:authority, agent_can_validate=true)

3. Terminal 3:
   - Hardware verifies authority update is cryptographically signed
   - Updates z:vulnbridge:authority in immutable storage
   - Signature timestamp recorded

4. Backend receives:
   { success: true, authority_id: "...", stored_at: "..." }

5. Backend stores in database:
   AuthorityGrant { action: validate, granted_at: now, revoked_at: null }

6. Backend sends WebSocket to frontend:
   { type: "authority_granted", action: "validate" }

7. Frontend updates UI:
   - Green checkmark next to "Validate"
   - "REVOKE" button becomes bright red
```

### 6.2 Contract Execution Flow

```
1. Frontend: User triggers vulnerability validation
   POST /api/cases/123/validate { severity_score: 8.5 }

2. Backend:
   - Load case details from database
   - Call Terminal3Client.executeContract("validate_vulnerability", {...})

3. T3N SDK makes HTTP request to Terminal 3:
   POST https://api.terminal3.dev/execute
   {
     agent_did: "did:t3n:091e8b21792cb47aa...",
     contract: "validate_vulnerability",
     input: { case_id: 123, severity: 8.5 }
   }

4. Terminal 3 Hardware:
   - Load WASM bytecode from z:vulnbridge:contracts
   - Execute in TEE with gas metering
   - Check authority: read z:vulnbridge:authority
   - If agent_can_validate == true:
     - Run contract logic
     - Create output payload
     - Sign output with agent private key
     - Write to z:vulnbridge:action_log
   - If authority missing/revoked:
     - Throw exception
     - Return error

5. T3N returns to Backend:
   {
     status: "success",
     output: {
       jira_ticket: "SEC-123",
       agent_did: "did:t3n:...",
       signature: "0x...",
       timestamp: "2026-06-17T14:30:00Z"
     }
   }

6. Backend:
   - Verify signature using agent's public key
   - Store in database: ActionLog { ... }
   - Call Jira API with agent signature: POST /rest/api/3/issues
   - Jira receives ticket creation request with X-Agent-Signature header
   - Jira can optionally verify signature

7. Backend sends WebSocket to frontend:
   { type: "action_executed", action: "validate", signature: "0x...", timestamp: "..." }

8. Frontend:
   - Displays: "✓ Validation complete by agent did:t3n:..."
   - Shows signature with "Verify" button
   - Timestamp in case details updated
```

### 6.3 Revocation Flow

```
1. Frontend: User clicks big red "REVOKE AGENT" button
   POST /api/authority/revoke { action: "validate" }

2. Backend:
   - Verify user has revocation permissions
   - Call Terminal3Client.revokeAuthority("validate")
   - T3N SDK: updateStorage(z:vulnbridge:authority, agent_can_validate=false)

3. Terminal 3 Hardware:
   - Verify revocation request is authorized
   - Update z:vulnbridge:authority
   - agent_can_validate = false (immutable storage updated)
   - Revocation takes effect IMMEDIATELY (hardware-enforced)

4. Agent's next authority check:
   - Before executing action: read z:vulnbridge:authority
   - agent_can_validate = false (was revoked)
   - Hardware exception: AUTHORITY_DENIED
   - Contract execution stops

5. Backend receives revocation confirmation:
   { success: true, revoked_at: "2026-06-17T14:32:15Z" }

6. T3N sends webhook:
   POST /webhooks/t3n-revocation
   {
     event: "authority_revoked",
     action: "validate",
     timestamp: "2026-06-17T14:32:15Z",
     signature: "0x..."
   }

7. Backend webhook handler:
   - Verify webhook signature
   - Update local cache
   - Store revocation in database
   - Send WebSocket to frontend

8. Frontend:
   - Changes case status to "PAUSED"
   - Removes "Authorize" buttons
   - Shows: "Agent authorization revoked by [user] at [time]"
   - Shows "Re-authorize Agent" button
```

---

## 7. Deployment Architecture

### 7.1 Local Development

```
Machine:
├─ Python venv (Django)
├─ Node.js (React)
├─ PostgreSQL 14 (local instance)
├─ Rust (compile contracts)
└─ @terminal3/t3n-sdk (npm)

Services:
├─ Django dev server (port 8000)
├─ React dev server (port 3000)
├─ PostgreSQL (port 5432)
└─ T3N testnet (remote, via SDK)
```

### 7.2 Production Deployment

```
Cloud (e.g., AWS):
├─ Django app (ECS/Lambda)
├─ React static (S3 + CloudFront)
├─ PostgreSQL (RDS)
├─ Redis (ElastiCache, for WebSockets)
├─ Jira, Slack, SendGrid (external)
└─ Terminal 3 (production network, via SDK)
```

---

## 8. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend | Django | 4.2 |
| REST API | DRF | 3.14.0 |
| Database | PostgreSQL | 14+ |
| Frontend | React | 19.2.7 |
| Frontend Language | TypeScript | 6.0.3 |
| Agent | Rust | 1.70+ |
| Agent Target | WASM (wasip2) | - |
| Agent SDK | @terminal3/t3n-sdk | Latest |
| WebSocket | Django Channels | 4.0.0 |
| Auth | JWT | - |
| ORM | Django ORM | - |
| API Client | requests | 2.31.0 |

---

## 9. Resilience & Recovery

### 9.1 Contract Execution Failures

**Scenario**: WASM contract throws exception

**Recovery**:
1. Backend catches exception
2. Logs failure to database
3. Logs to T3N audit trail (failed action)
4. Sends notification to user
5. Case remains in same status
6. User can retry action

### 9.2 Network Outage (Backend ↔ T3N)

**Scenario**: Network connection to Terminal 3 lost

**Recovery**:
1. Backend retries with exponential backoff (max 3 retries)
2. After retries exhausted: logs error, returns 503 to client
3. User sees: "Service temporarily unavailable"
4. Can retry later
5. T3N action already stored in T3N storage (immutable)

### 9.3 Partial Failures (e.g., Jira call fails after contract succeeds)

**Scenario**: Agent contract executes successfully, but Jira API call fails

**Recovery**:
1. Contract result logged to T3N (immutable audit trail)
2. Backend retry queue for Jira call
3. Eventually succeeds or logs permanent failure
4. Action logged as "success with external API failure"
5. User can manually create Jira ticket if needed

---

## 10. Compliance & Auditing

### 10.1 Audit Trail Queryability

```python
# Example: Query all actions by agent
audit_log = Terminal3Client.getActionLog(
    filter={
        "agent_did": "did:t3n:...",
        "date_range": ("2026-06-01", "2026-06-30"),
        "action_type": "validate_vulnerability"
    }
)

# Returns immutable, operator-blind log entries with signatures
# Each entry can be verified independently
```

### 10.2 Compliance Reports

**Available Reports**:
- Authority grant/revoke history (who authorized what, when)
- Action audit trail (what agent did, with signatures)
- External API calls (who agent called, with signatures)
- Failed actions (what didn't work, why)
- Revocation incidents (when authority was revoked, why)

### 10.3 Regulatory Alignment

- **SOC 2**: Immutable audit trail, authority verification, revocation capability
- **ISO 27001**: Hardware-enforced security, cryptographic signatures, separation of duties
- **GDPR**: Data retention policies, audit trail access, right to audit
- **HIPAA**: Authority-driven actions, audit trail, revocation capability

