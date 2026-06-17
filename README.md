# VulnBridge

Vulnerability disclosure workflows stall at organizational boundaries. 

VulnBridge is an AI coordinator that moves work across those boundaries by operating under explicitly delegated authority that can be revoked at any time.

---

## The Problem

When a vulnerability is discovered, five teams must coordinate sequentially:

1. Security validates the vulnerability
2. Engineering develops a patch
3. Legal approves disclosure timing
4. Communications publishes the advisory
5. Researchers are notified

Each team waits for the previous team to complete their work. Each wait extends the active vulnerability window.

The bottleneck is not technical work. The bottleneck is cross-team handoff friction.

Traditional workflow tools like Jira or Slack cannot solve this because they have no way to verify that an automated coordinator has legitimate authority to move work forward at organizational boundaries.

---

## How VulnBridge Works

VulnBridge uses Terminal 3 to establish cryptographically verified delegated authority.

**The process:**

1. Researcher submits vulnerability report
2. Security team reviews and explicitly delegates investigation authority to the AI coordinator
3. AI coordinator can now validate the vulnerability and notify the engineering team
4. Engineering team reviews and explicitly delegates remediation authority
5. AI coordinator coordinates patch development
6. Legal team reviews and explicitly delegates disclosure authority
7. AI coordinator prepares the disclosure package
8. Communications team reviews and explicitly delegates publication authority
9. AI coordinator publishes disclosure and notifies the researcher

At each stage, the stakeholder explicitly delegates authority through Terminal 3. Terminal 3 cryptographically signs each delegation.

**The critical capability:**

At any point, a stakeholder can revoke authority. When authority is revoked:

- The AI coordinator immediately loses the ability to perform actions requiring that authority
- Any pending operations requiring that authority are halted
- The workflow pauses at that stage
- Other workflows continue normally
- When authority is restored, the workflow resumes

The key insight is that authority verification happens through Terminal 3, not through the application. This means:

- Authority state is always current
- The AI cannot forge authority even if the VulnBridge database is compromised
- Revocations take effect immediately
- There is no window where the coordinator could operate with revoked authority

---

## Why This Matters

Without delegated authority verification, an AI coordinator is just another automation tool. It can send messages, create tickets, and track status. But it cannot prove to stakeholders that it is legitimately authorized to act.

Terminal 3 changes this. Every workflow action is preceded by a query to Terminal 3: "Does this coordinator have authority for this action right now?"

If authority has been revoked, Terminal 3 says no. The action does not execute.

This creates a fundamentally different capability than traditional workflow automation. The coordinator is not trusted. The authority is trusted. When authority disappears, the coordinator immediately becomes powerless.

---

## Workflow Architecture

**The vulnerability disclosure process:**

```
Researcher submits

↓

Security delegates authority

↓

Agent coordinates investigation

↓

Engineering delegates authority

↓

Agent coordinates remediation

↓

Legal delegates authority

↓

Agent prepares disclosure

↓

Communications delegates authority

↓

Agent publishes disclosure

↓

Case closed
```

**The revocation scenario:**

During any stage, a stakeholder can revoke authority. When they do:

```
Stakeholder revokes authority

↓

Terminal 3 marks authority as revoked

↓

Terminal 3 notifies VulnBridge

↓

Agent checks authority before next action

↓

Terminal 3 says authority revoked

↓

Agent stops

↓

Workflow pauses

↓

Stakeholder restores authority

↓

Agent resumes

↓

Workflow continues
```

---

## System Components

**Frontend (React)**
- Vulnerability submission interface for researchers
- Case details dashboard for stakeholders
- Authority delegation panel
- Real-time workflow timeline

**Backend (Django)**
- REST API for case management
- User authentication and authorization
- Integration with Jira, Slack, email
- WebSocket server for real-time updates

**Workflow Engine (LangGraph)**
- Represents vulnerability disclosure as a directed graph with nodes for each stage
- Persists workflow state to PostgreSQL
- Queries Terminal 3 before taking each action
- Pauses workflows when authority is revoked

**Authority Layer (Terminal 3)**
- Receives authority delegation requests from stakeholders
- Cryptographically signs all delegations
- Maintains authority state
- Processes revocations
- Notifies VulnBridge when authority changes

**Database (PostgreSQL)**
- Stores vulnerability cases and case metadata
- Maintains immutable audit log of all actions
- Records authority delegations and revocations
- Cannot modify audit log entries after creation

---

## Demo Scenario

**Setup**: A researcher discovers a SQL injection vulnerability in a customer portal.

**Steps:**

1. Researcher navigates to VulnBridge and submits vulnerability report with CVSS score 9.2
2. System creates case record and sends notification to security team
3. Security team reviews vulnerability and clicks "Delegate Investigation Authority"
4. System sends delegation to Terminal 3, receives signed token
5. AI coordinator begins coordinating investigation activities
6. Security team approves, engineering team receives notification
7. Engineering team clicks "Delegate Remediation Authority"
8. System sends delegation to Terminal 3, receives signed token
9. AI coordinator creates Jira ticket and coordinates patch development
10. Patch is completed, legal team receives notification of patch availability
11. Legal team reviews and clicks "Delegate Disclosure Authority"
12. System sends delegation to Terminal 3, receives signed token
13. AI coordinator prepares disclosure package
14. Communications team receives notification and clicks "Delegate Publication Authority"
15. System sends delegation to Terminal 3, receives signed token
16. AI coordinator prepares to publish disclosure

**The revocation:**

17. During publication, legal counsel discovers a related lawsuit and clicks "Revoke Communications Authority"
18. System sends revocation to Terminal 3
19. Terminal 3 marks communications authority as revoked
20. Terminal 3 sends webhook notification to VulnBridge
21. AI coordinator attempts next action: publish disclosure
22. Before executing, coordinator queries Terminal 3: "Is communications authority active?"
23. Terminal 3 responds: "No, authority was revoked"
24. Coordinator stops execution
25. Workflow pauses at communications stage
26. All stakeholders receive notification: "Workflow paused - communications authority revoked"

**The recovery:**

27. Legal counsel reviews situation and confirms disclosure is safe
28. Legal counsel clicks "Restore Communications Authority"
29. System sends new delegation to Terminal 3, receives signed token
30. Coordinator resumes execution
31. Disclosure is published
32. Researcher is notified
33. Case is closed

The critical moment is steps 21-24: the system prevents action despite being instructed to execute it because authority no longer exists.

---

## Integration

**Jira Integration**
When engineering authority is active, the coordinator can create tickets in Jira. The system polls Jira for ticket status updates and triggers workflow progression when patches are marked as resolved.

**Slack Integration**
When workflow status changes, the system sends notifications to Slack channels. Team members can view case details by following links in Slack messages.

**Email Integration**
All stakeholder notifications are sent via email. Researchers automatically receive status updates without requiring system access.

**Webhooks**
External systems can subscribe to VulnBridge webhooks. When case status changes, the system sends HTTP POST requests to all subscribed endpoints.

---

## Getting Started

To run VulnBridge locally:

1. Clone the repository
2. Set up PostgreSQL database
3. Configure Terminal 3 Agent Dev Kit credentials
4. Install Python dependencies: `pip install -r requirements.txt`
5. Run migrations: `python manage.py migrate`
6. Start Django server: `python manage.py runserver`
7. Start React frontend: `npm start`

The system will be available at `http://localhost:3000`

---

## What This Demonstrates

VulnBridge demonstrates that AI agents can operate effectively across organizational boundaries when operating under explicitly delegated and cryptographically verified authority.

The key difference from other workflow tools is that authority verification is external to the application. Terminal 3 is the authoritative source. The application trusts Terminal 3's answer to "Is authority active?"

This creates a security model where:
- Authority cannot be forged or cached indefinitely
- Revocations take effect immediately
- The application cannot escalate or bypass authority checks
- Complete audit trails live in Terminal 3

This is fundamentally different from traditional role-based access control where the application enforces permissions. Here, the application merely coordinates work while an external authority system verifies that coordination is allowed.
