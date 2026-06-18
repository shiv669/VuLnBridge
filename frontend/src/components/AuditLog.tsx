// Scrolling terminal audit log — shows all T3N actions in real time
import React, { useEffect, useRef } from 'react';
import type { AuditEntry } from '../lib/api';

interface Props {
  entries: AuditEntry[];
}

function formatEntry(e: AuditEntry): { prefix: string; text: string; color: string } {
  const ts = new Date(e.timestamp).toLocaleTimeString();

  if (e.action.startsWith('BLOCKED:')) {
    return {
      prefix: `[${ts}]`,
      text: `${e.action} ← AUTHORITY REVOKED (case: ${e.case_id})`,
      color: 'var(--red)',
    };
  }
  if (e.action.startsWith('revoke:')) {
    return {
      prefix: `[${ts}]`,
      text: `REVOKED ${e.action.replace('revoke:', '').toUpperCase()} authority`,
      color: 'var(--red)',
    };
  }
  if (e.action.startsWith('grant:')) {
    return {
      prefix: `[${ts}]`,
      text: `GRANTED ${e.action.replace('grant:', '').toUpperCase()} authority`,
      color: 'var(--green)',
    };
  }
  return {
    prefix: `[${ts}]`,
    text: `EXEC ${e.action.toUpperCase()}${e.signature ? ` :: ${e.signature.slice(0, 20)}…` : ''}`,
    color: 'var(--text)',
  };
}

export function AuditLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="audit-log">
      {entries.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Awaiting T3N events...
          <span className="cursor" />
        </div>
      ) : (
        entries.map((e, i) => {
          const { prefix, text, color } = formatEntry(e);
          return (
            <div key={i} className="audit-entry" style={{ color }}>
              <span style={{ color: 'rgba(0,255,65,0.3)', marginRight: 8 }}>{prefix}</span>
              {text}
              {e.proof_of_authority && (
                <div style={{ color: 'var(--amber)', fontSize: 9, marginTop: 1, paddingLeft: 74 }}>
                  proof_of_authority: {e.proof_of_authority}
                </div>
              )}
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
