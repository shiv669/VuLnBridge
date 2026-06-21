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
    <div className="flex flex-col">
      {STAGES.map((stage, i) => {
        const isDone = i < currentIdx || (currentStage === 'closed' && i === currentIdx);
        const isActive = i === currentIdx && currentStage !== 'closed';

        return (
          <div key={stage.key} className="flex items-start gap-4">
            {/* Dot + line */}
            <div className="flex flex-col items-center w-3 shrink-0">
              <div
                className={`w-3 h-3 border-2 mt-1 transition-all ${
                  isDone 
                    ? 'border-blue-500 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                    : isActive 
                    ? 'border-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.3)]' 
                    : 'border-white/20 bg-transparent'
                }`}
              />
              {i < STAGES.length - 1 && (
                <div
                  className={`w-[2px] h-10 ${
                    isDone ? 'bg-blue-500' : 'bg-white/10'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-6">
              <div
                className={`font-mono text-sm tracking-widest uppercase transition-colors ${
                  isDone
                    ? 'text-blue-400'
                    : isActive
                    ? 'text-white'
                    : 'text-white/40'
                }`}
              >
                {isActive && <span className="text-blue-400 mr-2">▶</span>}
                {isDone && <span className="mr-2">✓</span>}
                {stage.label}
              </div>
              <div
                className={`text-[11px] mt-1 tracking-wide ${
                  isDone ? 'text-blue-400/50' : 'text-white/30'
                }`}
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
