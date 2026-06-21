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
  if (score >= 9) return '#ef4444'; // red-500
  if (score >= 7) return '#f97316'; // orange-500
  if (score >= 5) return '#eab308'; // yellow-500
  return '#3b82f6'; // blue-500 (fits the cosmic theme better for low severity)
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
        vulnbridgeApi.getAllAuthorityStatus(caseId),
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="font-vt text-2xl text-blue-400 tracking-widest uppercase animate-pulse">
          LOADING CASE DATA
        </div>
      </div>
    );
  }

  const stage = currentCase.current_workflow_stage;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-white" style={{ fontFamily: 'var(--font-vt)' }}>

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
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-md">
        <div className="flex items-baseline gap-4">
          <span className="text-2xl text-blue-400 tracking-widest uppercase">
            VULNBRIDGE
          </span>
          <span className="text-white/40 text-sm tracking-widest uppercase">
            AGENT CONSOLE
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm tracking-widest">
          <span className={wsConnected ? 'text-green-400' : 'text-red-400'}>
            {wsConnected ? '● LIVE' : '○ DISCONNECTED'}
          </span>
          <span className="text-white/60">
            CASE: <span className="text-blue-400">{caseId}</span>
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-[380px_1fr] gap-[1px] flex-1 min-h-0 min-w-0 bg-white/10">

        {/* LEFT: Case info + workflow */}
        <div className="bg-[#0a0a0a] p-6 overflow-y-auto">
          {/* Case info */}
          <div className="mb-8">
            <div className="text-white/40 text-sm tracking-widest uppercase mb-2">
              Case Report
            </div>
            <div className="text-2xl text-white mb-4 tracking-wider">
              {currentCase.title}
            </div>

            {/* Severity */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm px-3 py-1 border rounded bg-opacity-10 tracking-widest"
                style={{ 
                  color: severityColor(currentCase.severity_score), 
                  borderColor: severityColor(currentCase.severity_score),
                  backgroundColor: `${severityColor(currentCase.severity_score)}20`
                }}>
                {severityLabel(currentCase.severity_score)} · {currentCase.severity_score.toFixed(1)}
              </span>
            </div>

            <div className="text-base text-white/70 leading-relaxed mb-6">
              {currentCase.description}
            </div>

            {currentCase.affected_systems?.length > 0 && (
              <div className="mb-6">
                <div className="text-white/40 text-xs tracking-widest uppercase mb-2">
                  Affected Systems
                </div>
                {currentCase.affected_systems.map((s, i) => (
                  <div key={i} className="text-sm text-blue-300 mb-1">▸ {s}</div>
                ))}
              </div>
            )}

            <div className="text-sm text-white/40">
              Reported by {currentCase.researcher_name || currentCase.researcher_email}
              <br />
              {new Date(currentCase.created_at).toLocaleString()}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="text-white/40 text-sm tracking-widest uppercase mb-6">
              Workflow
            </div>
            <WorkflowTimeline
              currentStage={stage}
              status={currentCase.status}
            />
          </div>

          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="w-full mt-8 py-3 px-4 border border-white/20 text-white/60 hover:text-white hover:bg-white/5 rounded-lg tracking-widest transition-colors uppercase text-sm"
          >
            NEW SUBMISSION
          </button>
        </div>

        {/* RIGHT: Unified Agent Console & Authority */}
        <div className="bg-[#050505] p-8 overflow-y-auto flex flex-col gap-6">
          <div>
            <div className="text-2xl text-blue-400 mb-2 tracking-widest uppercase">
              AGENT AUTHORITY & EXECUTION CONSOLE
            </div>
            <div className="text-sm text-white/40 mb-1 tracking-wider">
              Agent DID: <span className="text-blue-300">did:t3n:091e8b21...c597</span>
            </div>
            <div className="text-sm text-white/40 mb-6">
              Authority is stored in Terminal 3 hardware. Grant/revoke takes effect immediately.
              Execution is cryptographically blocked without active authority.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['validate', 'remediate', 'disclose', 'publish'] as const).map((action) => (
              <AuthorityCard
                key={action}
                action={action}
                status={authorityStatus[action]}
                caseId={caseId!}
                onUpdate={loadData}
                onExecute={() => executeContract(action)}
                isExecuting={activeContractLoading === action}
              />
            ))}
          </div>

          {/* Audit log */}
          <div className="mt-4">
            <div className="text-lg text-blue-400 mb-4 tracking-widest uppercase">
              T3N AUDIT LOG
            </div>
            <AuditLog entries={auditLog} />
          </div>
        </div>
      </div>
    </div>
  );
}
