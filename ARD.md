# VulnBridge

## Architecture Requirements Document (ARD)

### Version 1.0

---

# 1. Purpose

VulnBridge is an autonomous vulnerability disclosure coordination system designed to reduce coordination delays during critical vulnerability response while maintaining verifiable organizational control over every sensitive action executed by the agent.

The system addresses a common organizational failure mode in vulnerability disclosure programs. Security teams, engineering teams, legal departments, communications teams, and external researchers frequently participate in the same disclosure process, but no single stakeholder possesses complete ownership of the workflow. As a result, vulnerability response timelines are often dominated by coordination delays rather than technical remediation effort.

VulnBridge introduces an autonomous process owner that continuously coordinates disclosure activities across organizational boundaries. The agent is responsible for workflow progression, stakeholder synchronization, disclosure preparation, status tracking, and execution of approved actions. Human stakeholders remain responsible for decision making and authorization.

Terminal 3 provides the trust infrastructure required for organizations to safely delegate limited operational authority to the agent. Rather than relying solely on application level permissions, authority is verified through Terminal 3 identity, trusted execution, signed outputs, and revocable execution rights.

---

# 2. Architectural Objectives

The architecture must satisfy the following objectives:

### O1. Autonomous Coordination

The system shall autonomously coordinate vulnerability disclosure workflows without requiring continuous human orchestration.

### O2. Human Controlled Authority

The system shall ensure that all sensitive actions remain subject to explicit organizational authorization.

### O3. Verifiable Execution

Every consequential action executed by the agent shall produce cryptographically verifiable evidence of execution.

### O4. Immediate Revocation

Organizations shall be able to revoke delegated authority at any point during workflow execution.

### O5. Complete Auditability

The system shall provide a complete and immutable history of authority grants, authority revocations, workflow transitions, and executed actions.

### O6. Platform Independence

The workflow orchestration layer shall remain independent from any individual integration platform including GitHub, Jira, Slack, or email providers.

---

# 3. System Context

VulnBridge operates between external researchers and internal organizational stakeholders.

The system coordinates interactions among:

* Security Teams
* Engineering Teams
* Legal Teams
* Communications Teams
* Product Teams
* External Researchers
* Vendor Security Contacts

The system is not responsible for vulnerability remediation itself.

The system is responsible for ensuring that remediation, disclosure preparation, stakeholder approval, and public disclosure occur in the correct sequence and under the correct authority.

---

# 4. High Level Architecture

The architecture consists of four primary layers.

## 4.1 Presentation Layer

Technology:

* React
* TypeScript

Responsibilities:

* Vulnerability submission
* Workflow visualization
* Authority management
* Audit log inspection
* Approval and revocation interfaces

The presentation layer is considered untrusted and does not make authority decisions.

---

## 4.2 Application Layer

Technology:

* Django
* Django REST Framework
* PostgreSQL

Responsibilities:

* Workflow state management
* Case lifecycle management
* Notification routing
* Integration management
* API exposure

The application layer coordinates workflow execution but is not the source of trust.

Application state may be modified, replayed, restored, or migrated without affecting authority decisions.

---

## 4.3 Agent Layer

Technology:

* Python
* Terminal 3 ADK

Responsibilities:

* Workflow ownership
* Case monitoring
* Stakeholder coordination
* Approval collection
* Escalation management
* Execution requests

The agent acts as a process owner rather than a decision maker.

The agent cannot independently assume authority.

Authority must be granted before sensitive execution occurs.

---

## 4.4 Trust Layer

Technology:

* Terminal 3 ADK
* Agent Identity
* Trusted Execution Environment
* Signed Execution Proofs

Responsibilities:

* Agent identity verification
* Authority verification
* Execution attestation
* Revocation enforcement
* Execution proof generation

The trust layer represents the root of authority within the system.

All sensitive actions depend on successful verification through this layer.

---

# 5. Trust Model

The architecture separates workflow ownership from authority ownership.

The VulnBridge agent owns workflow progression.

Human stakeholders own authority.

Authority is never inferred from workflow state.

Authority is never inferred from application roles.

Authority must be explicitly granted before execution.

Authority may be revoked independently of workflow state.

Execution requests must be validated against currently active authority before action execution begins.

This design prevents application level state corruption from granting unauthorized execution rights.

---

# 6. Authority Model

Authority is represented as discrete operational capabilities.

### Validation Authority

Allows vulnerability validation activities including severity classification, evidence gathering, and disclosure preparation.

### Remediation Authority

Allows coordination of engineering remediation activities and patch preparation workflows.

### Disclosure Authority

Allows preparation of disclosure artifacts including advisories, disclosure packages, and researcher communications.

### Publication Authority

Allows publication of approved disclosure content and execution of vendor notification workflows.

Each authority type may be independently granted or revoked.

Authority ownership remains attributable to the granting stakeholder.

All authority transitions are recorded within the audit trail.

---

# 7. Workflow Lifecycle

The vulnerability disclosure workflow consists of six primary stages.

### Stage 1: Submission

A researcher submits a vulnerability report.

The system creates a disclosure case and assigns ownership to the VulnBridge agent.

### Stage 2: Validation

Security stakeholders authorize validation activities.

The agent coordinates evidence collection and disclosure assessment.

### Stage 3: Remediation

Engineering stakeholders authorize remediation coordination.

The agent coordinates patch preparation and remediation tracking.

### Stage 4: Disclosure Preparation

Legal stakeholders authorize disclosure preparation activities.

The agent coordinates disclosure artifacts and communication materials.

### Stage 5: Publication

Communications stakeholders authorize publication activities.

The agent coordinates advisory publication and vendor notifications.

### Stage 6: Closure

The case is archived and all authority grants are terminated.

Execution history remains available for audit purposes.

---

# 8. External Integrations

The system may integrate with:

* GitHub
* GitLab
* Jira
* Linear
* Slack
* Microsoft Teams
* Email Providers
* CVE Systems
* Vendor Notification Channels

External systems remain consumers of verified actions.

Trust is established before interaction with external platforms.

The architecture does not assume trust in external services.

---

# 9. Audit Architecture

Every workflow transition generates an audit event.

Every authority grant generates an audit event.

Every authority revocation generates an audit event.

Every execution request generates an audit event.

Every executed action generates an audit event.

Audit records include:

* Timestamp
* Case Identifier
* Agent Identity
* Authority Source
* Action Type
* Execution Result
* Verification Evidence

Audit records must remain queryable throughout the lifecycle of the disclosure program.

---

# 10. Revocation Model

Revocation represents a first class architectural capability.

Any stakeholder with ownership of delegated authority may revoke that authority at any point during workflow execution.

Once revocation occurs:

* New execution requests fail verification.
* Pending execution requests are rejected.
* Workflow progression pauses.
* Human stakeholders are notified.
* Audit records are generated.

Workflow execution may resume only after authority is re-established.

---

# 11. Security Architecture

The architecture assumes compromise of application infrastructure is possible.

The architecture therefore does not rely solely on backend authorization logic.

Sensitive actions depend on independently verifiable authority.

The architecture assumes:

* Frontend compromise is possible.
* Backend compromise is possible.
* Database modification is possible.
* Integration failures are possible.

The trust layer must continue enforcing authority boundaries even when application infrastructure behaves unexpectedly.

This separation of workflow orchestration and authority verification forms the primary security property of the system.

---

# 12. Architectural Outcome

The resulting system transforms vulnerability disclosure from a stakeholder coordinated process into an agent coordinated process while preserving human ownership of authority.

Organizations gain the ability to automate coordination activities without relinquishing control over consequential actions.

The agent becomes the operational owner of the process.

Human stakeholders remain the owners of authority.

Terminal 3 provides the verifiable trust layer that allows those two responsibilities to coexist safely.
