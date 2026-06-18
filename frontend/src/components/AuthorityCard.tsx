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
}

export function AuthorityCard({ action, status, caseId, onUpdate }: Props) {
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
      className="terminal-card p-4 flex flex-col gap-3"
      style={{
        borderColor: authorized
          ? 'rgba(0,255,65,0.6)'
          : revoked_at
          ? 'rgba(255,51,51,0.6)'
          : 'rgba(0,255,65,0.2)',
        boxShadow: authorized ? '0 0 12px rgba(0,255,65,0.15)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>{' '}
          <span className="font-vt text-green-400 uppercase tracking-widest" style={{ fontFamily: 'var(--font-vt)', fontSize: 18, color: 'var(--green)' }}>
            {meta.label}
          </span>
        </div>
        <span
          className="badge"
          style={{
            color: authorized ? 'var(--green)' : revoked_at ? 'var(--red)' : 'var(--text-dim)',
            borderColor: authorized ? 'var(--green)' : revoked_at ? 'var(--red)' : 'var(--border)',
            background: authorized
              ? 'rgba(0,255,65,0.1)'
              : revoked_at
              ? 'rgba(255,51,51,0.1)'
              : 'transparent',
          }}
        >
          {authorized ? '● AUTHORIZED' : revoked_at ? '✕ REVOKED' : '○ PENDING'}
        </span>
      </div>

      {/* Team */}
      <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
        {meta.team}
      </div>

      {/* T3N verification badge */}
      {t3n_verified && (
        <div style={{ fontSize: 10, color: 'var(--amber)' }}>
          ⚡ T3N VERIFIED
          {t3n_proof && (
            <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>
              {t3n_proof.slice(0, 16)}…
            </span>
          )}
        </div>
      )}

      {/* Grant info */}
      {granted_by && authorized && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Granted by <span style={{ color: 'var(--text)' }}>{granted_by}</span>
          {granted_at && (
            <span> · {new Date(granted_at).toLocaleTimeString()}</span>
          )}
        </div>
      )}
      {revoked_at && !authorized && (
        <div style={{ fontSize: 11, color: 'var(--red)' }}>
          Revoked {new Date(revoked_at).toLocaleTimeString()}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-2 mt-1">
        {!authorized ? (
          <>
            {showInput && (
              <input
                className="terminal-input"
                style={{ fontSize: 11, padding: '4px 8px' }}
                placeholder={`${meta.team} email...`}
                value={granterEmail}
                onChange={(e) => setGranterEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGrant()}
              />
            )}
            <button
              className="btn btn-green"
              onClick={showInput ? handleGrant : () => setShowInput(true)}
              disabled={loading === 'grant'}
              style={{ fontSize: 11 }}
            >
              {loading === 'grant' ? 'WRITING TO T3N...' : showInput ? 'CONFIRM GRANT' : 'GRANT AUTHORITY'}
            </button>
          </>
        ) : (
          <button
            className="btn btn-red"
            onClick={handleRevoke}
            disabled={loading === 'revoke'}
            style={{ fontSize: 11 }}
          >
            {loading === 'revoke' ? 'REVOKING IN T3N...' : 'REVOKE AUTHORITY'}
          </button>
        )}
      </div>
    </div>
  );
}
