// Authority card — shows grant/revoke controls for one T3N authority action
import React, { useState } from 'react';
import { vulnbridgeApi } from '../lib/api';
import type { AuthorityStatus } from '../lib/api';

const ACTION_META: Record<string, { label: string; team: string; icon: string }> = {
  validate: { label: 'VALIDATE', team: 'Security Team', icon: '🛡' },
  remediate: { label: 'REMEDIATE', team: 'Engineering', icon: '⚙' },
  disclose: { label: 'DISCLOSE', team: 'Legal', icon: '⚖' },
  publish: { label: 'PUBLISH', team: 'Communications', icon: '📡' },
};

interface Props {
  action: 'validate' | 'remediate' | 'disclose' | 'publish';
  status: AuthorityStatus;
  caseId: string;
  onUpdate: () => void;
  onExecute?: () => void;
  isExecuting?: boolean;
}

export function AuthorityCard({ action, status, caseId, onUpdate, onExecute, isExecuting }: Props) {
  const [loading, setLoading] = useState<'grant' | 'revoke' | null>(null);
  const [granterEmail, setGranterEmail] = useState('');
  const [showInput, setShowInput] = useState(false);
  const meta = ACTION_META[action];

  const handleGrant = async () => {
    const email = granterEmail.trim() || `${meta.team.toLowerCase().replace(' ', '.')}@company.com`;
    setLoading('grant');
    try {
      await vulnbridgeApi.grantAuthority({ action, granted_by: email, case_id: caseId });
      onUpdate();
    } catch (e: any) {
      alert(`Grant failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(null);
      setShowInput(false);
    }
  };

  const handleRevoke = async () => {
    setLoading('revoke');
    try {
      await vulnbridgeApi.revokeAuthority({
        action,
        revoked_by: `${meta.team}`,
        reason: `Demo revocation of ${action} authority`,
        case_id: caseId,
      });
      onUpdate();
    } catch (e: any) {
      alert(`Revoke failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(null);
    }
  };

  const { authorized, t3n_verified, t3n_proof, granted_by, granted_at, revoked_at } = status;

  return (
    <div
      className="bg-white/5 backdrop-blur-md border border-white/10 p-5 flex flex-col gap-4 rounded-xl shadow-lg transition-all"
      style={{
        borderColor: authorized
          ? 'rgba(59,130,246,0.6)' // blue-500
          : revoked_at
          ? 'rgba(239,68,68,0.6)' // red-500
          : 'rgba(255,255,255,0.1)',
        boxShadow: authorized ? '0 0 20px rgba(59,130,246,0.15)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl mr-2">{meta.icon}</span>
          <span className="text-xl tracking-widest text-blue-400 uppercase">
            {meta.label}
          </span>
        </div>
        <span
          className="text-xs px-2 py-1 rounded tracking-widest uppercase border"
          style={{
            color: authorized ? '#60a5fa' : revoked_at ? '#f87171' : 'rgba(255,255,255,0.5)',
            borderColor: authorized ? 'rgba(59,130,246,0.5)' : revoked_at ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)',
            background: authorized
              ? 'rgba(59,130,246,0.1)'
              : revoked_at
              ? 'rgba(239,68,68,0.1)'
              : 'transparent',
          }}
        >
          {authorized ? '● AUTHORIZED' : revoked_at ? '✕ REVOKED' : '○ PENDING'}
        </span>
      </div>

      {/* Team */}
      <div className="text-white/50 text-xs tracking-widest uppercase">
        {meta.team}
      </div>

      {/* T3N verification badge */}
      {t3n_verified && (
        <div className="text-[10px] text-yellow-500 tracking-widest">
          ⚡ T3N VERIFIED
          {t3n_proof && (
            <span className="text-white/40 ml-2 tracking-normal">
              {t3n_proof.slice(0, 16)}…
            </span>
          )}
        </div>
      )}

      {/* Grant info */}
      {granted_by && authorized && (
        <div className="text-xs text-white/50 tracking-wider">
          Granted by <span className="text-white/90">{granted_by}</span>
          {granted_at && (
            <span> · {new Date(granted_at).toLocaleTimeString()}</span>
          )}
        </div>
      )}
      {revoked_at && !authorized && (
        <div className="text-xs text-red-400 tracking-wider">
          Revoked {new Date(revoked_at).toLocaleTimeString()}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 mt-2">
        {!authorized ? (
          <>
            {showInput && (
              <input
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder={`${meta.team} email...`}
                value={granterEmail}
                onChange={(e) => setGranterEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGrant()}
              />
            )}
            <button
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded text-xs tracking-widest uppercase transition-colors"
              onClick={showInput ? handleGrant : () => setShowInput(true)}
              disabled={loading === 'grant'}
            >
              {loading === 'grant' ? 'WRITING TO T3N...' : showInput ? 'CONFIRM GRANT' : 'GRANT AUTHORITY'}
            </button>
          </>
        ) : (
          <div className="flex gap-3">
            <button
              className="flex-1 bg-red-900/50 hover:bg-red-900 border border-red-500/50 disabled:opacity-50 text-red-300 py-2 rounded text-xs tracking-widest uppercase transition-colors"
              onClick={handleRevoke}
              disabled={loading === 'revoke'}
            >
              {loading === 'revoke' ? 'REVOKING...' : 'REVOKE'}
            </button>
            {onExecute && (
              <button
                className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded text-xs tracking-widest uppercase transition-colors"
                onClick={onExecute}
                disabled={isExecuting}
              >
                {isExecuting ? 'EXECUTING IN TEE...' : '▶ EXECUTE CONTRACT'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
