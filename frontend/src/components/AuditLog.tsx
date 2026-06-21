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
      color: 'text-red-400',
    };
  }
  if (e.action.startsWith('revoke:')) {
    return {
      prefix: `[${ts}]`,
      text: `REVOKED ${e.action.replace('revoke:', '').toUpperCase()} authority`,
      color: 'text-red-400',
    };
  }
  if (e.action.startsWith('grant:')) {
    return {
      prefix: `[${ts}]`,
      text: `GRANTED ${e.action.replace('grant:', '').toUpperCase()} authority`,
      color: 'text-blue-400',
    };
  }
  return {
    prefix: `[${ts}]`,
    text: `EXEC ${e.action.toUpperCase()}${e.signature ? ` :: ${e.signature.slice(0, 20)}…` : ''}`,
    color: 'text-white/80',
  };
}

export function AuditLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="bg-black/50 border border-white/10 rounded-lg text-xs font-mono overflow-y-auto max-h-[300px] p-4 shadow-inner">
      {entries.length === 0 ? (
        <div className="text-white/40 italic">
          Awaiting T3N events...
        </div>
      ) : (
        entries.map((e, i) => {
          const { prefix, text, color } = formatEntry(e);
          return (
            <div key={i} className={`py-1 border-b border-white/5 ${color}`}>
              <span className="text-blue-500/50 mr-2">{prefix}</span>
              {text}
              {e.proof_of_authority && (
                <div className="text-yellow-500/80 text-[10px] mt-1 pl-[74px]">
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
