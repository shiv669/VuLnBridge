// Case Dashboard — the main demo screen
// Shows: Case info | Workflow timeline | T3N Authority panel | Audit log
// WebSocket connected for real-time updates

import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vulnbridgeApi } from '../lib/api';
import { useVulnBridgeStore } from '../store/vulnbridge';
import { useWebSocket } from '../lib/websocket';
import { AuthorityCard } from '../components/AuthorityCard';
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { AuditLog } from '../components/AuditLog';
import { RevocationBanner } from '../components/RevocationBanner';

function severityColor(score: number): string {
  if (score >= 9) return '#ff0000';
  if (score >= 7) return '#ff6600';
  if (score >= 5) return '#ffaa00';
  return '#44ff44';
}

function severityLabel(score: number): string {
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}

export function CaseDashboard() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const {
    currentCase,
    setCurrentCase,
    authorityStatus,
    setAuthorityStatus,
    auditLog,
    wsConnected,
    revocationEvent,
    setRevocationEvent,
    activeContractLoading,
    setActiveContractLoading,
  } = useVulnBridgeStore();

  // Connect WebSocket
  useWebSocket(caseId || null);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!caseId) return;
    try {
      const [caseResp, authResp] = await Promise.all([
        vulnbridgeApi.getCase(caseId),
        vulnbridgeApi.getAllAuthorityStatus(),
      ]);
      setCurrentCase(caseResp.data);
      setAuthorityStatus(authResp.data);
    } catch (e: any) {
      if (e.response?.status === 404) {
        alert(`Case ${caseId} not found`);
        navigate('/');
      }
    }
  }, [caseId, setCurrentCase, setAuthorityStatus, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const executeContract = async (action: 'validate' | 'remediate' | 'disclose' | 'publish') => {
    if (!caseId) return;
    setActiveContractLoading(action);
    try {
      const contractFn = {
        validate: () => vulnbridgeApi.validateContract(caseId),
        remediate: () => vulnbridgeApi.remediateContract(caseId),
        disclose: () => vulnbridgeApi.discloseContract(caseId),
        publish: () => vulnbridgeApi.publishContract(caseId),
      }[action];

      await contractFn();
      // Status update arrives via WebSocket — no need to reload
    } catch (e: any) {
      // 403 = AUTHORITY_REVOKED — RevocationBanner handles display via WS event
      if (e.response?.status !== 403) {
        alert(`Contract error: ${e.response?.data?.error || e.message}`);
      }
    } finally {
      setActiveContractLoading(null);
    }
  };

  if (!currentCase || !authorityStatus) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-vt)', fontSize: 24, color: 'var(--green)' }}>
          LOADING CASE DATA<span className="cursor" />
        </div>
      </div>
    );
  }

  const stage = currentCase.current_workflow_stage;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Revocation overlay — THE MONEY MOMENT */}
      {revocationEvent && (
        <RevocationBanner
          event={revocationEvent}
          onDismiss={() => setRevocationEvent(null)}
          onReauthorize={async (action) => {
            setRevocationEvent(null);
            // Re-grant authority
            const email = prompt(`Enter ${action} authority grantor email:`);
            if (email) {
              try {
                await vulnbridgeApi.grantAuthority({
                  action: action as any,
                  granted_by: email,
                  case_id: caseId,
                });
                loadData();
              } catch (e: any) {
                alert(`Re-authorize failed: ${e.message}`);
              }
            }
          }}
        />
      )}

      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,255,65,0.03)',
      }}>
        <div>
          <span style={{ fontFamily: 'var(--font-vt)', fontSize: 22, color: 'var(--green)', letterSpacing: '0.2em' }}>
            VULNBRIDGE
          </span>
          <span style={{ color: 'var(--text-dim)', marginLeft: 16, fontSize: 11 }}>
            AGENT CONSOLE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11 }}>
          <span style={{ color: wsConnected ? 'var(--green)' : 'var(--red)' }}>
            {wsConnected ? '● LIVE' : '○ DISCONNECTED'}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            CASE: <span style={{ color: 'var(--green)' }}>{caseId}</span>
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 340px',
        gap: 1,
        flex: 1,
        background: 'var(--border)',
      }}>

        {/* LEFT: Case info + workflow */}
        <div style={{ background: 'var(--bg)', padding: 20, overflowY: 'auto' }}>
          {/* Case info */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-vt)',
              fontSize: 11,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: 8,
            }}>
              Case Report
            </div>
            <div style={{ fontFamily: 'var(--font-vt)', fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>
              {currentCase.title}
            </div>

            {/* Severity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 11,
                padding: '2px 10px',
                border: `1px solid ${severityColor(currentCase.severity_score)}`,
                color: severityColor(currentCase.severity_score),
                background: `${severityColor(currentCase.severity_score)}18`,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: 'var(--font-mono)',
              }}>
                {severityLabel(currentCase.severity_score)} · {currentCase.severity_score.toFixed(1)}
              </span>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 12 }}>
              {currentCase.description}
            </div>

            {currentCase.affected_systems?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  Affected Systems
                </div>
                {currentCase.affected_systems.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 2 }}>▸ {s}</div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              Reported by {currentCase.researcher_name || currentCase.researcher_email}
              <br />
              {new Date(currentCase.created_at).toLocaleString()}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>
              Workflow
            </div>
            <WorkflowTimeline
              currentStage={stage}
              status={currentCase.status}
            />
          </div>

          {/* Back link */}
          <button
            className="btn"
            onClick={() => navigate('/')}
            style={{ marginTop: 24, fontSize: 10, width: '100%' }}
          >
            NEW SUBMISSION
          </button>
        </div>

        {/* CENTER: Contract execution */}
        <div style={{ background: 'var(--bg)', padding: 20, overflowY: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-vt)', fontSize: 16, color: 'var(--green)', marginBottom: 4, letterSpacing: '0.1em' }}>
            AGENT EXECUTION CONSOLE
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 24 }}>
            Agent DID: <span style={{ color: 'var(--amber)' }}>did:t3n:091e8b21...c597</span>
            &nbsp;·&nbsp; Each action requires T3N authority verification before execution.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Each contract */}
            {(['validate', 'remediate', 'disclose', 'publish'] as const).map((action) => {
              const authState = authorityStatus[action];
              const isLoading = activeContractLoading === action;
              const actionLabels = {
                validate: { label: '1. Validate Vulnerability', desc: 'Security: Confirm severity, scope, and technical impact' },
                remediate: { label: '2. Coordinate Remediation', desc: 'Engineering: Track patch development and deployment' },
                disclose: { label: '3. Prepare Disclosure', desc: 'Legal: Review CVE draft, liability, coordinated timeline' },
                publish: { label: '4. Publish Advisory', desc: 'Comms: Release public advisory and notify vendors' },
              };

              return (
                <div
                  key={action}
                  className="terminal-card"
                  style={{
                    padding: 16,
                    borderColor: authState.authorized ? 'rgba(0,255,65,0.4)' : 'rgba(0,255,65,0.12)',
                    opacity: authState.authorized ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: authState.authorized ? 'var(--text)' : 'var(--text-dim)', marginBottom: 4 }}>
                        {actionLabels[action].label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {actionLabels[action].desc}
                      </div>
                      {!authState.authorized && (
                        <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 6 }}>
                          ⚠ Requires T3N authority — grant in the authority panel →
                        </div>
                      )}
                    </div>
                    <button
                      className={`btn ${authState.authorized ? 'btn-green' : ''}`}
                      disabled={!authState.authorized || isLoading}
                      onClick={() => executeContract(action)}
                      style={{ flexShrink: 0, fontSize: 11, whiteSpace: 'nowrap' }}
                    >
                      {isLoading ? 'EXECUTING IN TEE...' : 'EXECUTE'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* T3N Agent info box */}
          <div style={{
            marginTop: 24,
            background: 'rgba(0,255,65,0.03)',
            border: '1px solid rgba(0,255,65,0.1)',
            padding: '14px 16px',
            fontSize: 11,
            color: 'var(--text-dim)',
            lineHeight: 1.8,
          }}>
            <div style={{ color: 'var(--amber)', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ⚡ How Terminal 3 works here
            </div>
            Each EXECUTE button calls the T3N TEE, which reads authority from hardware storage
            ({`z:vulnbridge:authority:{action}`}) before running the contract.
            If authority was revoked — even 1 second ago — the TEE returns AUTHORITY_REVOKED
            with a cryptographic proof. There is no way to bypass this in software.
          </div>
        </div>

        {/* RIGHT: Authority panel + audit log */}
        <div style={{ background: 'var(--bg)', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-vt)', fontSize: 16, color: 'var(--green)', marginBottom: 4, letterSpacing: '0.1em' }}>
              T3N AUTHORITY PANEL
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 16 }}>
              Authority stored in Terminal 3 hardware. Grant/revoke takes effect immediately.
            </div>
          </div>

          {(['validate', 'remediate', 'disclose', 'publish'] as const).map((action) => (
            <AuthorityCard
              key={action}
              action={action}
              status={authorityStatus[action]}
              caseId={caseId!}
              onUpdate={loadData}
            />
          ))}

          {/* Audit log */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: 'var(--font-vt)', fontSize: 14, color: 'var(--green)', marginBottom: 8, letterSpacing: '0.1em' }}>
              T3N AUDIT LOG
            </div>
            <AuditLog entries={auditLog} />
          </div>
        </div>
      </div>
    </div>
  );
}
