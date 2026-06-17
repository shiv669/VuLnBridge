# VulnBridge: Product Requirements Document

**Digital Chief of Staff for Vulnerability Disclosures** - Process ownership automation via cryptographically-verified agent execution

---

## 1. Problem & Solution

### Problem
When a critical vulnerability is discovered, organizations coordinate across five teams:

- **Security team** reviews and validates
- **Engineering team** develops patch
- **Legal team** approves disclosure terms
- **Communications** publishes advisory
- **Downstream vendors** require embargo coordination

Each team excels at their specialty. But **nobody owns the process** of making sure all pieces work together end-to-end.

Result: Decisions get lost in email, vendors miss embargo dates, legal approval happens too late, coordination becomes manual and chaotic.

**Root cause:** Process ownership falls into the gap between specialists. When the bottleneck is coordination (not expertise), you need someone whose job is making sure things get done.

Traditionally, that's a person (security manager, incident commander) spending their day chasing approvals. That person becomes the constraint on how fast vulnerabilities can be disclosed.

### Solution
Automate the chief of staff role with VulnBridge:

1. **Process owner** - Tracks all team approvals, ensures nothing falls through gaps
2. **Executor** - When authorized, publishes advisories, notifies vendors, updates registries
3. **Auditable** - Every action cryptographically signed and immutable (Terminal 3)
4. **Revocable** - At any moment, any stakeholder can halt agent (hardware-enforced)

**Key insight:** You can't replace a human chief of staff with a script. You need a non-human chief of staff with the credibility humans have: verifiable identity, revocable authority, auditable actions. Terminal 3 provides that.

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

| Authority | Agent Action | Granted By | Security Control |
|-----------|---------|------------|------------------|
| `validate` | Analyzes vulnerability, opens GitHub issue | Security team | Audit trail proves authorization |
| `remediate` | Opens emergency remediation branch, notifies team | Engineering team | Revocation stops all actions |
| `disclose` | Publishes GitHub Security Advisory, creates CVE entry | Legal team | Hardware-enforced authority check |
| `publish` | Notifies vendors, updates package registries, sends emails | Communications | Every action cryptographically signed |

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

### F8: GitHub Security Advisory Integration

**Requirement**: Agent creates GitHub Security Advisories with cryptographic proof

**Implementation:**
- Backend authenticates to GitHub with agent identity
- Calls GitHub API: `POST /repos/{owner}/{repo}/security/advisories`
- Advisory body includes: "Published by agent did:t3n:... on {date}"
- GitHub records agent DID signature in advisory
- External systems can verify: This advisory was published by verified agent

### F9: CVE and Package Registry Integration

**Requirement**: Agent publishes CVE entries with cryptographic proof

**Implementation:**
- Agent creates CVE JSON: `{ "id": "CVE-2026-12345", "agent_did": "did:t3n:..." }`
- Posts to NVD API with agent signature
- Updates package registries (npm, PyPI, etc.) with advisory
- Every entry signed by agent DID
- Registries can verify: This CVE was published by authorized agent

### F10: Vendor Notification and Embargo Coordination

**Requirement**: Agent notifies downstream vendors with cryptographic proof of authorization

**Implementation:**
- Agent sends emails to vendor security contacts with signature
- Email includes: "This notification was sent by authorized agent did:t3n:..."
- Signature allows vendors to verify: Agent was authorized to disclose embargo date
- Agent tracks embargo dates and sends follow-up notifications
- All notifications logged with cryptographic proof

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
| Workflow automation | Verifiable | Manual, unauditable |
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
