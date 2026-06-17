# VulnBridge: Product Requirements Document

**Agent-in-TEE Edition** - Vulnerability disclosure automation via cryptographically-verified agent execution

---

## 1. Problem & Solution

### Problem
Vulnerability disclosure requires sequential approvals from multiple teams (Security → Engineering → Legal → Communications), taking **15 hours** while the vulnerability window stays open. Organizations cannot automate this because they have no way to verify:
- Agent identity (who is acting?)
- Authorization (was the agent authorized?)
- Revocation (can we stop the agent instantly?)
- Audit trail (what actually happened?)

### Solution
Deploy VulnBridge Agent inside Terminal 3's Trusted Execution Environment (TEE):
- **Agent Identity**: DID (did:t3n:...) cryptographically verified
- **Authorization**: Hardware-enforced (cannot be bypassed by software)
- **Revocation**: Instant (< 100ms, hardware-level)
- **Audit Trail**: Immutable, operator-blind, stored in T3N

**Result**: Disclosure time reduced to **4 hours** with cryptographic proof of every action.

---

## 2. Core Capabilities

### 2.1 Agent as Trusted Identity

VulnBridge Agent has cryptographic identity:
- **DID**: `did:t3n:091e8b21792cb47aa07ee28b08066b7bedc6a597` (unique, immutable)
- **Location**: Terminal 3 TEE (hardware-enforced security boundary)
- **Code**: Rust compiled to WASM (runs inside TEE)
- **Authority**: Verified at hardware level (cannot be bypassed)

Every action includes:
```json
{
  "action": "validate_vulnerability",
  "agent_did": "did:t3n:091e8b21792cb47aa...",
  "timestamp": "2026-06-17T14:30:00Z",
  "authority_verified": true,
  "signature": "0x...",
  "proof_of_authority": "z:vulnbridge:authority:validate"
}
```

### 2.2 Authority Model

Four authority types, each independently grantable/revocable:

| Authority | Action | Granted By | Effect |
|-----------|--------|------------|--------|
| `validate` | Create Jira ticket | Security team | Agent validates vulnerability |
| `remediate` | Notify engineers | Engineering team | Agent coordinates patch |
| `disclose` | Generate CVE | Legal team | Agent prepares disclosure |
| `publish` | Send notifications | Communications | Agent publishes advisory |

**Authority Lifecycle:**
1. Team grants: `POST /api/authority/grant` → Backend calls T3N SDK → Authority stored in T3N storage
2. Agent checks: Agent reads from T3N storage before action
3. Agent acts: If authorized, executes WASM contract, signs output
4. Team revokes: `POST /api/authority/revoke` → Authority cleared in T3N storage
5. Agent stops: Next check finds no authority, halts execution (hardware-enforced)

### 2.3 Hardware-Enforced Revocation

Unlike software-based authorization:

**Traditional approach (vulnerable):**
```
Backend: "Check if authorized" → Database lookup → Might be outdated
Agent: "I was authorized 5 seconds ago, proceeding"
Meanwhile: Revocation request arrives, database updated
Result: Agent already acting, race condition, edge cases
```

**Terminal 3 approach (hardware-enforced):**
```
Agent: "Am I authorized?" → Query T3N hardware
T3N Hardware: Checks z:vulnbridge:authority
Result: Either YES (authority exists) or NO (revoked or never granted)
Revocation: Hardware immediately removes authority
Agent next check: NO → Hardware prevents execution
Result: Zero edge cases, instant enforcement
```

### 2.4 Verifiable Audit Trail

All actions logged in T3N storage (z:vulnbridge:action_log):
- **Immutable**: Once logged, cannot be altered
- **Operator-blind**: Even T3N operators cannot modify log
- **Verifiable**: Cryptographically signed (external systems can verify)
- **Queryable**: Organizations can retrieve log for compliance

Example log entry:
```json
{
  "timestamp": "2026-06-17T14:30:00Z",
  "agent_did": "did:t3n:091e8b21792cb47aa...",
  "action": "validate_vulnerability",
  "case_id": "CVE-2026-12345",
  "authority_verified_from": "z:vulnbridge:authority:validate",
  "signature": "0x...",
  "result": "success"
}
```

---

## 3. Functional Requirements

### F1: Vulnerability Submission

**Researcher submission (public endpoint, no auth):**
- Submit: Title, Description, CVSS severity, Affected systems, Contact email
- Response: Case ID (e.g., `VULN-2026-0815`)
- Backend creates VulnerabilityCase in database
- Initial case status: `submitted`

### F2: Authority Grant API

**Endpoint**: `POST /api/authority/grant`

**Request:**
```json
{
  "action": "validate",
  "authorized_by": "security@organization.com",
  "reason": "Initial vulnerability review"
}
```

**Behavior:**
1. Verify requester is authorized to grant authority
2. Call T3N SDK: `updateAuthority(agent_did, action, true)`
3. T3N storage updated: `z:vulnbridge:authority:validate = true`
4. Backend stores record in AuthorityGrant table
5. Response: `{ "success": true, "authority_id": "..." }`
6. Frontend shows: "Agent authorized for validation"

### F3: Authority Revoke API

**Endpoint**: `POST /api/authority/revoke`

**Request:**
```json
{
  "action": "validate",
  "reason": "Critical new vulnerability discovered, pausing"
}
```

**Behavior:**
1. Call T3N SDK: `updateAuthority(agent_did, action, false)`
2. T3N hardware immediately blocks agent authority
3. Agent's next authority check: authorization denied
4. Backend stores record in AuthorityRevocation table
5. Webhook receiver (separate endpoint) listens for T3N revocation confirmation
6. Response: `{ "success": true, "revoked_at": "..." }`

### F4: Contract Execution (Validation)

**Endpoint**: `POST /api/cases/{id}/validate`

**Request:**
```json
{
  "severity_score": 8.5,
  "analysis": "Buffer overflow in authentication handler"
}
```

**Behavior:**
1. Backend receives request
2. Calls T3N SDK: `executeContract("validate_vulnerability", { case_id, severity_score, analysis })`
3. T3N executes WASM contract inside TEE
4. Contract checks authority: `read from z:vulnbridge:authority:validate`
5. If authorized:
   - Analyzes vulnerability
   - Creates Jira ticket (backend makes call with agent signature)
   - Signs output with agent DID
   - Returns `{ "status": "success", "jira_ticket": "SEC-123", "signature": "0x..." }`
6. Backend verifies signature
7. Backend logs to database and T3N storage
8. Response includes agent DID and signature for audit

### F5: Contract Execution (Remediation)

**Endpoint**: `POST /api/cases/{id}/remediate`

Triggers agent to:
- Notify engineering team (Slack)
- Create engineering tracking board
- Set timeline expectations
- Update case status to `remediation_in_progress`

### F6: Contract Execution (Disclosure)

**Endpoint**: `POST /api/cases/{id}/disclose`

Triggers agent to:
- Generate CVE metadata (ID, description, CVSS)
- Prepare disclosure document
- Request legal approval
- Create secret holding period reminder

### F7: Contract Execution (Publication)

**Endpoint**: `POST /api/cases/{id}/publish`

Triggers agent to:
- Send email to researcher (with DID signature for verification)
- Post to Slack security channel
- Update GitHub security advisory
- Mark case as `closed`

### F8: Jira Integration

**Requirement**: Jira tickets created by agent include cryptographic proof

**Implementation:**
- Backend calls Jira API: `POST /rest/api/3/issues`
- Include header: `X-Agent-Signature: 0x...` (DID signature)
- Ticket body includes: "Created by agent did:t3n:..."
- Jira can verify signature by checking agent's public key

### F9: Slack Integration

**Requirement**: Slack notifications from agent show agent identity

**Example message:**
```
🤖 VulnBridge Agent (did:t3n:091e8b21792cb47aa...) 
validated vulnerability CVE-2026-0815 (CVSS 8.5)

Status: Buffer overflow in authentication handler requires immediate attention
Ticket: SEC-123 (in Jira)

[ ✓ Verify Signature ]  [ 📋 View Full Audit Trail ]
```

Click "Verify Signature" → External verification URL with signature + public key

### F10: SendGrid Email Integration

**Requirement**: Emails include agent identity and signature proof

**Example:**
```
Dear Researcher,

Your vulnerability report has been validated and is being processed.

Reported: CVE-2026-0815 (CVSS 8.5)
Assigned: VulnBridge Agent (did:t3n:...)
Status: In remediation

To verify this notification was sent by the authorized agent:
1. Copy signature: 0x...
2. Visit: https://verify.vulnbridge.io/signature
3. Paste signature + agent DID
4. Verification successful means this is authentic

Ticket: SEC-123
Timeline: 3-5 business days
```

### F11: Webhook Receiver for Revocation

**Endpoint**: `POST /webhooks/t3n-revocation`

**Receives from Terminal 3:**
```json
{
  "event": "authority_revoked",
  "agent_did": "did:t3n:...",
  "action": "validate",
  "timestamp": "2026-06-17T14:30:00Z",
  "signature": "0x..."
}
```

**Behavior:**
1. Verify webhook signature using TERMINAL3_WEBHOOK_SECRET
2. Update local cache: Authority for "validate" is now revoked
3. Send WebSocket message to connected UI clients: "Agent authorization revoked"
4. Log revocation to database
5. Response: `{ "success": true }`

### F12: Real-time WebSocket Updates

**Endpoint**: `ws://localhost:8000/ws`

**Messages:**
- `{ "type": "authority_granted", "action": "validate", "authorized_by": "..." }`
- `{ "type": "authority_revoked", "action": "validate", "revoked_at": "..." }`
- `{ "type": "action_executed", "action": "validate_vulnerability", "case_id": "...", "signature": "0x..." }`
- `{ "type": "case_status_updated", "case_id": "...", "status": "remediation_in_progress" }`

---

## 4. Non-Functional Requirements

### NFR1: Security
- Authority enforcement is hardware-level (T3N TEE)
- Signatures are cryptographically verifiable
- Audit trail is immutable (T3N storage)
- Agent cannot bypass authorization checks
- Revocation is instant (hardware-enforced)

### NFR2: Reliability
- 99.9% uptime target
- Revocation success rate: 100% (hardware-enforced, no edge cases)
- Action logging: 100% completeness (immutable T3N storage)
- Signature verification: 100% success (deterministic crypto)

### NFR3: Performance
- Authority grant: < 1 second (T3N storage update)
- Authority revoke: < 100ms (T3N hardware enforcement)
- Contract execution: < 5 seconds (WASM in TEE)
- Webhook delivery: < 1 second
- Action logging: < 500ms (T3N storage write)

### NFR4: Auditability
- All actions logged with timestamp, actor, authority, signature
- Logs immutable and operator-blind
- Compliance officers can query audit trail
- External systems can verify signatures independently

---

## 5. User Stories

### US1: Security Team Validates Vulnerability

**As a** security team lead  
**I want to** authorize the agent to validate a submitted vulnerability  
**So that** the vulnerability can be automatically triaged without waiting for manual review

**Acceptance Criteria:**
- [ ] UI shows "Authorize Validation" button when vulnerability submitted
- [ ] Clicking button shows: "Are you sure? Agent will create Jira ticket"
- [ ] After authorization, agent has authority to validate
- [ ] Jira ticket created within 30 seconds
- [ ] Ticket includes agent DID signature in description
- [ ] Validation action appears in audit log with signature

### US2: Engineering Team Authorizes Patch Coordination

**As an** engineering manager  
**I want to** authorize the agent to coordinate patch development  
**So that** the team can be notified automatically and work can proceed without manual status updates

**Acceptance Criteria:**
- [ ] UI shows "Authorize Patch Coordination" button when validation complete
- [ ] Slack notification sent to engineering team with agent identity
- [ ] Notification includes agent DID and verification link
- [ ] Patch coordination action logged with signature in T3N storage

### US3: Team Revokes Agent Authorization

**As an** incident commander  
**I want to** instantly revoke the agent's authorization during an incident  
**So that** the agent stops acting immediately and work is halted for manual review

**Acceptance Criteria:**
- [ ] UI shows big red "REVOKE AGENT" button at all times
- [ ] One-click revocation (confirmation modal)
- [ ] Revocation takes effect in < 100ms
- [ ] Agent stops mid-action if necessary (hardware-enforced)
- [ ] Case status changes to "paused"
- [ ] Revocation action appears in audit log
- [ ] Team can re-authorize agent later to resume work

### US4: Compliance Officer Audits Agent Actions

**As a** compliance officer  
**I want to** query the complete audit trail of agent actions with signatures  
**So that** I can verify the agent was authorized and prove compliance to auditors

**Acceptance Criteria:**
- [ ] Audit log UI shows all agent actions with timestamps
- [ ] Each action shows: agent DID, action type, authority used, signature
- [ ] Can filter by date, action type, or case
- [ ] Can download audit trail as CSV/JSON
- [ ] Signature verification tool: paste signature + public key to verify
- [ ] Audit trail is read-only and immutable

---

## 6. Success Metrics

| Metric | Target | Baseline |
|--------|--------|----------|
| Disclosure time | 4 hours | 15 hours |
| Authority grant latency | < 1 sec | N/A |
| Revocation latency | < 100ms | N/A |
| Audit trail completeness | 100% | N/A |
| Signature verification success | 100% | N/A |
| Revocation reliability | 100% (hardware-enforced) | N/A |
| Uptime | 99.9% | N/A |
| User satisfaction | 4.5+ / 5 | N/A |

---

## 7. Acceptance Criteria (End-to-End)

- [ ] Researcher can submit vulnerability
- [ ] Security team can grant validation authority
- [ ] Agent validates and creates Jira ticket (signed with DID)
- [ ] Engineering team can grant remediation authority
- [ ] Agent notifies engineering (signed notification)
- [ ] Legal team can grant disclosure authority
- [ ] Agent prepares CVE disclosure (signed)
- [ ] Communications can grant publication authority
- [ ] Agent publishes advisory (signed emails, Slack messages)
- [ ] Team can revoke authority at any time (instant, hardware-enforced)
- [ ] All actions appear in immutable audit log with signatures
- [ ] Compliance officer can verify signatures independently
- [ ] Workflow completes in < 4 hours
