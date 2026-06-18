// Workflow stage timeline — vertical progress indicator
import React from 'react';

const STAGES = [
  { key: 'submission', label: 'Submission', desc: 'Researcher filed vulnerability' },
  { key: 'security_validation', label: 'Security Validation', desc: 'Agent validates severity + impact' },
  { key: 'engineering_remediation', label: 'Engineering Remediation', desc: 'Patch coordinated in TEE' },
  { key: 'legal_review', label: 'Legal Review', desc: 'Disclosure legal clearance' },
  { key: 'communications', label: 'Communications', desc: 'Public advisory published' },
  { key: 'closed', label: 'Closed', desc: 'CVE lifecycle complete' },
];


const STAGE_ORDER = STAGES.map((s) => s.key);

interface Props {
  currentStage: string;
  status: string;
}

function stageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage);
}

export function WorkflowTimeline({ currentStage, status }: Props) {
  const currentIdx = stageIndex(currentStage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {STAGES.map((stage, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;

        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  border: `2px solid ${isDone ? 'var(--green)' : isActive ? 'var(--green)' : 'rgba(0,255,65,0.2)'}`,
                  background: isDone ? 'var(--green)' : 'transparent',
                  boxShadow: isDone || isActive ? '0 0 6px rgba(0,255,65,0.5)' : undefined,
                  animation: isActive ? 'blink 1s infinite' : undefined,
                  marginTop: 2,
                }}
              />
              {i < STAGES.length - 1 && (
                <div
                  style={{
                    width: 2,
                    height: 36,
                    background: isDone ? 'var(--green)' : 'rgba(0,255,65,0.15)',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: 24, paddingTop: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: isDone
                    ? 'var(--green)'
                    : isActive
                    ? 'var(--text)'
                    : 'var(--text-dim)',
                }}
              >
                {isActive && <span style={{ color: 'var(--green)', marginRight: 4 }}>▶</span>}
                {isDone && <span style={{ marginRight: 4 }}>✓</span>}
                {stage.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: isDone ? 'rgba(0,255,65,0.5)' : 'var(--text-dim)',
                  marginTop: 2,
                }}
              >
                {stage.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
