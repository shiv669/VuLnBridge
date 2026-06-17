# VulnBridge: Trusted Agent for Vulnerability Disclosure

Vulnerability disclosure workflows stall at organizational boundaries because:
1. **No agent identity**: Automated coordinators lack cryptographic proof of who they are
2. **No verifiable authorization**: Teams can't cryptographically verify an agent is authorized
3. **No instant revocation**: Revoking agent permissions is slow and asynchronous
4. **No audit trail**: Organizations can't prove what the agent did and who authorized it

**VulnBridge solves this** by deploying a security agent inside Terminal 3's Trusted Execution Environment (TEE):

- **Agent Identity**: Gets DID (did:t3n:...) via Terminal 3—cryptographic identity that cannot be spoofed
- **Secure Execution**: Runs as WASM contract inside hardware-enforced secure environment
- **Verifiable Actions**: Every action is cryptographically signed and auditable
- **Instant Revocation**: Teams can revoke agent authority immediately—enforcement is hardware-level

The agent performs sensitive security actions (create tickets, notify teams, prepare disclosures) with **cryptographic proof** that it was authorized to do so.

---

## The Problem: Trust + Speed

Vulnerability disclosure requires two things that traditionally conflict:

**Speed Requirement:**
```
Security validates (2h)
  → Engineering develops (8h)
    → Legal approves (4h)
      → Communications publishes (1h)
Total: 15 hours (vulnerability window stays open)
```

**Trust Problem:**
If we automate this, we need to answer:
- How do we prove the agent is authorized?
- How do we revoke authorization instantly?
- How do we audit what the agent actually did?
- What prevents the agent from acting without authorization?

Traditional automation (Zapier, IFTTT) has no answer. Agents are just scripts on a server—no identity, no verifiable authorization, no instant revocation.

**Terminal 3 is the missing piece.** It provides cryptographic identity and verifiable execution inside hardware-enforced secure environments.

---

## How VulnBridge Works

### Architecture: Agent Tenant in TEE

```
┌─────────────────────────────────────────────────┐
│  Terminal 3 Network (TEE Hardware)              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ VulnBridge Agent Tenant                 │   │
│  │                                         │   │
│  │ DID: did:t3n:091e8b21792cb47aa...      │   │
│  │                                         │   │
│  │ WASM Contracts:                         │   │
│  │  - validate_vulnerability()             │   │
│  │  - coordinate_patch()                   │   │
│  │  - prepare_disclosure()                 │   │
│  │  - publish_advisory()                   │   │
│  │                                         │   │
│  │ Storage (z:vulnbridge:*)                │   │
│  │  - authority_log                        │   │
│  │  - action_audit_trail                   │   │
│  │  - case_state                           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
          ↓ (Rust/WASM compiled to bytecode)
          ↓ (Hardware-enforced isolation)
          ↓
┌─────────────────────────────────────────────────┐
│  VulnBridge Backend (Django)                    │
│  - Orchestration logic                          │
│  - Webhook receivers (from T3N)                 │
│  - External API integration setup               │
│  - Frontend API                                 │
└─────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│  External Systems (Agent calls with DID sig)    │
│  - Jira (create tickets)                        │
│  - SendGrid (notifications)                     │
│  - GitHub (patch repositories)                  │
│  - Slack (team updates)                         │
└─────────────────────────────────────────────────┘
```

### The Workflow: Authority-Driven Action

**Stage 1: Security Validation**
```
Researcher submits vulnerability
  ↓
Security team reviews and authorizes:
  "Agent can validate this vulnerability"
  (Creates authority entry in T3N storage)
  ↓
Agent checks authority in T3N storage: ✓ AUTHORIZED
  ↓
Agent executes validate_vulnerability() WASM contract
  - Analyzes severity, affected systems, impact
  - Creates Jira ticket (API call signed with agent DID)
  ↓
Action logged in T3N storage with cryptographic proof:
  "Agent did:t3n:... performed validate_vulnerability
   with authority from security@org
   at 2026-06-17T14:30:00Z"
```

**Stage 2: Engineering Remediation**
```
Engineering team reviews and authorizes:
  "Agent can coordinate patch development"
  ↓
Agent checks authority in T3N storage: ✓ AUTHORIZED
  ↓
Agent executes coordinate_patch() WASM contract
  - Notifies engineering team via Slack
  - Monitors patch progress
  - Updates case status in backend database
  ↓
Action logged in T3N storage (cryptographically signed)
```

**Stage 3: Legal Review**
```
Legal team reviews patch and authorizes:
  "Agent can prepare disclosure"
  ↓
Agent executes prepare_disclosure() WASM contract
  - Generates disclosure package
  - Prepares CVE metadata
  ↓
Action logged in T3N storage
```

**Stage 4: Communications Publication**
```
Communications team authorizes:
  "Agent can publish advisory"
  ↓
Agent executes publish_advisory() WASM contract
  - Posts advisory to security channels
  - Notifies researcher via email
  ↓
Action logged in T3N storage
```

### The Revocation Moment

At **any point**, a team member can revoke authorization:

```
Stakeholder clicks "Revoke Agent Authorization"
  ↓
Backend calls T3N SDK:
  "Update authority: agent_authorized = false"
  ↓
T3N updates z:vulnbridge:authority immediately
  ↓
Agent's next check:
  "Do I have authority?"
  ↓
T3N storage says: NO
  ↓
Agent STOPS execution
  ↓
No further actions taken
  ↓
Workflow pauses
```

**This is cryptographically enforced.** The agent cannot forge authorization. The hardware prevents it.

---

## Why Terminal 3 is Essential

**Without Terminal 3:**
- Agent is just a script on a server
- No cryptographic identity (how do external systems know who's calling?)
- No verifiable authorization (how do we prove the agent was allowed?)
- No hardware-enforced revocation (what if authorization is revoked mid-action?)
- Audit trail is in backend database (can be altered by attackers)
- Organizations cannot cryptographically prove agent had authorization

**Result:** Organizations would never allow this agent to perform sensitive actions.

**With Terminal 3:**
1. **Agent Identity**: DID (did:t3n:...) cannot be forged or spoofed
2. **Verifiable Authorization**: Each action includes cryptographic proof of authority
3. **Secure Execution**: WASM code runs in hardware-enforced TEE
4. **Instant Revocation**: Authority changes take effect immediately at hardware level
5. **Operator-Blind Audit**: Actions logged in T3N storage (not in backend, cannot be altered)
6. **Cross-System Verification**: External systems (Jira, etc.) can verify agent's DID signature

**Result:** Organizations trust the agent enough to grant real authority and let it act autonomously.

---

## Project Components

### 1. VulnBridge Agent (Rust → WASM in TEE)

**Location:** `backend/contracts/src/lib.rs`

**What it does:**
- Registers as Terminal 3 tenant with DID
- Stores authority rules in T3N storage (z:vulnbridge:authority)
- Implements WASM contracts:
  - `validate_vulnerability()` - Analyze severity, create Jira ticket
  - `coordinate_patch()` - Notify engineering, track progress  
  - `prepare_disclosure()` - Generate CVE metadata and advisory
  - `publish_advisory()` - Send notifications, update channels

**Authority checks:**
- Before each action: reads from T3N storage
- Verifies authority exists and hasn't been revoked
- If revoked: stops execution (hardware-enforced)

**Cryptographic signing:**
- Every action includes agent DID signature
- External systems can verify: "Did this come from agent X?"

**Audit trail:**
- All actions stored in T3N storage (operator-blind, immutable)
- Organizations can retrieve: "What did agent X do?"

### 2. VulnBridge Backend (Django)

**Location:** `backend/vulnbridge/`

**What it does:**
- REST API for researchers to submit vulnerabilities
- Orchestration: tells T3N client which contract to execute
- Webhook receiver: listens for revocation events from T3N
- Authority grants: receives "Team X authorizes agent" requests
- External integrations: setup for Jira, SendGrid, Slack APIs

**Key files:**
- `integrations/terminal3_client.py` - Uses T3N SDK (not HTTP)
- `models.py` - VulnerabilityCase, ActionLog, etc.
- `views.py` - API endpoints for submission and authority grants

### 3. VulnBridge Frontend (React)

**Location:** `frontend/src/`

**What it does:**
- **Researchers:** Submit vulnerabilities
- **Teams:** View case details and authorize agent
  - Security: "Authorize validation"
  - Engineering: "Authorize patch coordination"
  - Legal: "Authorize disclosure"
  - Communications: "Authorize publication"
- **Everyone:** View cryptographically-signed action log
- **Authority control:** Instant revocation button

**Key components:**
- `VulnerabilityForm.tsx` - Submit vulnerability
- `AuthorityPanel.tsx` - Grant/revoke agent authorization
- `ActionLog.tsx` - View signed actions
- `Dashboard.tsx` - Case status and timeline

### 4. Terminal 3 Integration

**What Terminal 3 provides:**
- **Agent Tenant:** VulnBridge Agent registers and gets DID
- **Secure Storage:** z:vulnbridge:* namespace for authority and audit logs
- **WASM Execution:** Hardware-enforced execution environment
- **SDK:** `@terminal3/t3n-sdk` for authentication and contract calls
- **Authority Verification:** Agent checks authority at runtime
- **Revocation:** Hardware-level enforcement of revocation

---

## Demo: Speed + Trust

**Scenario:** Critical RCE discovered in production system. 500+ customers affected.

**Traditional approach (15 hours):**
```
Security validates        (2 hours - waiting for standup)
  ↓ Email engineering
Engineering develops      (8 hours - standard patch cycle)
  ↓ Email legal
Legal reviews             (4 hours - waiting for review cycle)
  ↓ Email communications
Communications publishes  (1 hour - draft and review)

Vulnerability window: 15 hours open
```

**With VulnBridge (4 hours):**
```
Security reviews & authorizes agent       (5 min)
  Agent validates immediately            (1 min) - DID signature in audit log
  ↓
Engineering reviews & authorizes agent    (5 min)
  Agent creates Jira ticket              (1 min) - DID signature sent to Jira
  Agent notifies team via Slack          (1 min) - DID signature in Slack
  ↓
Engineering develops patch                (3 hours)
  ↓
Legal reviews & authorizes agent          (5 min)
  Agent generates disclosure package     (1 min) - DID signature in audit log
  ↓
Communications reviews & authorizes       (5 min)
  Agent publishes advisory                (2 min) - DID signature in email
  ↓
Vulnerability window: 4 hours (11-hour improvement)
```

**The revocation test:**
At any point, stakeholder clicks "Revoke". Agent immediately stops. No edge cases.

**The audit requirement:**
Organization can cryptographically prove: "Agent did this under authority from X"

---

## Authority Model

Each stage requires explicit agent authorization:

| Stage | Authority Key | Duration | Revocable |
|-------|---|---|---|
| Validation | `agent_can_validate` | Until revoked | ✓ Instant |
| Remediation | `agent_can_remediate` | Until revoked | ✓ Instant |
| Disclosure | `agent_can_disclose` | Until revoked | ✓ Instant |
| Publication | `agent_can_publish` | Until revoked | ✓ Instant |

**How authorization works:**

1. Team member clicks "Authorize Agent" button in frontend
2. Frontend calls: `POST /api/authorize` with authority type
3. Backend calls T3N SDK: `updateAuthority(agent_id, authority_type, true)`
4. T3N updates z:vulnbridge:authority (immutable, hardware-enforced)
5. Agent reads authority before next action
6. If authorized: execute WASM contract, sign action, log to T3N storage
7. If revoked: stop immediately (hardware-enforced)

**Cryptographic proof:**
Every action includes:
```json
{
  "action": "validate_vulnerability",
  "agent_did": "did:t3n:091e8b21792cb47aa07ee28b08066b7bedc6a597",
  "timestamp": "2026-06-17T14:30:00Z",
  "authority_verified": true,
  "signature": "0x...",
  "t3n_storage_proof": "z:vulnbridge:actions:validate_v1"
}
```

---

## Implementation Roadmap

**Phase 1: Agent Tenant Setup**
- [ ] Install Rust + WASM toolchain
- [ ] Register agent as Terminal 3 tenant
- [ ] Get DID (did:t3n:...)
- [ ] Setup T3N storage namespace (z:vulnbridge:*)

**Phase 2: WASM Contracts**
- [ ] Write Rust contract for validate_vulnerability()
- [ ] Write Rust contract for coordinate_patch()
- [ ] Write Rust contract for prepare_disclosure()
- [ ] Write Rust contract for publish_advisory()
- [ ] Compile to WASM, deploy to T3N

**Phase 3: Backend Integration**
- [ ] Update `terminal3_client.py` to use T3N SDK
- [ ] Implement authority grant endpoints
- [ ] Implement contract invocation endpoints
- [ ] Add webhook receiver for revocation events

**Phase 4: Frontend Authority UI**
- [ ] Build AuthorityPanel component
- [ ] Add revocation button
- [ ] Display cryptographically-signed action log
- [ ] Show real-time agent status

**Phase 5: External Integrations**
- [ ] Jira: Agent creates tickets with DID signature
- [ ] Slack: Agent sends notifications from DID identity
- [ ] SendGrid: Agent sends emails from agent identity
- [ ] GitHub: Agent can interact with repositories

**Phase 6: Testing & Hardening**
- [ ] Test instant revocation halts agent
- [ ] Verify cryptographic signatures
- [ ] Load test T3N storage updates
- [ ] Security audit of WASM contracts

---

## Getting Started

1. Read [Terminal 3 Docs](https://docs.terminal3.io/) to understand ADK
2. Set up development environment: see SETUP.md
3. Install Rust + WASM toolchain
4. Deploy agent to Terminal 3 testnet
5. Run backend and frontend locally
6. Test authority workflows end-to-end
