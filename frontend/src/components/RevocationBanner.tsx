// THE MONEY MOMENT — Full-screen revocation block with T3N proof
import React from 'react';
import type { RevocationEvent } from '../store/vulnbridge';

interface Props {
  event: RevocationEvent;
  onDismiss: () => void;
  onReauthorize: (action: string) => void;
}

export function RevocationBanner({ event, onDismiss, onReauthorize }: Props) {
  const { action, reason, t3n_verification } = event;

  return (
    <div className="revocation-overlay" style={{ zIndex: 1000 }}>
      {/* Main message */}
      <div style={{ textAlign: 'center', maxWidth: 700, padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* BLOCKED header */}
        <div className="revocation-title">
          ⛔ BLOCKED
        </div>

        <div style={{
          fontFamily: 'var(--font-vt)',
          fontSize: 32,
          color: 'var(--red)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 24,
          textShadow: '0 0 20px rgba(255,51,51,0.6)',
        }}>
          {action.toUpperCase()} AUTHORITY REVOKED
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: '#ffaaaa',
          marginBottom: 32,
          lineHeight: 1.8,
        }}>
          {reason}
        </div>

        {/* T3N Proof Panel */}
        {t3n_verification && (
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,51,51,0.4)',
            padding: '20px 24px',
            textAlign: 'left',
            marginBottom: 32,
            fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              ⚡ Terminal 3 Hardware Verification
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-dim)', padding: '3px 0', width: '40%' }}>Agent DID</td>
                  <td style={{ color: 'var(--amber)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {t3n_verification.agent_did}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Storage Key</td>
                  <td style={{ color: '#ffaaaa' }}>{t3n_verification.authority_key}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>T3N Result</td>
                  <td style={{ color: 'var(--red)', fontWeight: 'bold' }}>AUTHORITY = FALSE</td>
                </tr>
                {t3n_verification.revoked_at && (
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Revoked At</td>
                    <td style={{ color: '#ffaaaa' }}>
                      {new Date(t3n_verification.revoked_at).toLocaleString()}
                    </td>
                  </tr>
                )}
                {t3n_verification.proof && (
                  <tr>
                    <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>TEE Proof</td>
                    <td style={{ color: 'var(--amber)', fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>
                      {t3n_verification.proof}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: 'var(--text-dim)', padding: '3px 0' }}>Checked At</td>
                  <td style={{ color: '#ffaaaa' }}>
                    {new Date(t3n_verification.checked_at).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-green"
            onClick={() => onReauthorize(action)}
            style={{ fontSize: 12 }}
          >
            RE-AUTHORIZE {action.toUpperCase()}
          </button>
          <button
            className="btn"
            onClick={onDismiss}
            style={{ fontSize: 12 }}
          >
            ACKNOWLEDGE & DISMISS
          </button>
        </div>

        <div style={{ marginTop: 24, fontSize: 10, color: 'rgba(255,51,51,0.4)', letterSpacing: '0.1em' }}>
          VulnBridge Agent cannot proceed without hardware-verified authority.
          <br />
          This block is enforced by Terminal 3 TEE — not configurable in software.
        </div>
      </div>
    </div>
  );
}
