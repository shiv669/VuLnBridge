// Zustand store — single source of truth for VulnBridge demo state
import { create } from 'zustand';
import type {
  CaseResponse,
  AllAuthorityStatus,
  AuditEntry,
  ContractResult,
  AuthorityStatus,
} from '../lib/api';

// ── WebSocket Event Types ────────────────────────────────────────────────────

export type WSEventType =
  | 'connected'
  | 'authority_granted'
  | 'authority_revoked'
  | 'contract_executed'
  | 'contract_blocked'
  | 'case_status_updated';

export interface WSEvent {
  type: WSEventType;
  action?: string;
  case_id?: string;
  granted_by?: string;
  revoked_by?: string;
  t3n_proof?: string;
  t3n_verification?: ContractResult['t3n_verification'];
  reason?: string;
  signature?: string;
  proof_of_authority?: string;
  status?: string;
  stage?: string;
  timestamp?: string;
}

// ── Store State ──────────────────────────────────────────────────────────────

export interface RevocationEvent {
  action: string;
  reason: string;
  t3n_verification?: ContractResult['t3n_verification'];
  timestamp: string;
}

interface VulnBridgeStore {
  // Case state
  currentCase: CaseResponse | null;
  setCurrentCase: (c: CaseResponse) => void;
  updateCaseStatus: (status: string, stage: string) => void;

  // Authority state (live from T3N)
  authorityStatus: AllAuthorityStatus | null;
  setAuthorityStatus: (s: AllAuthorityStatus) => void;
  updateAuthority: (action: string, granted: boolean, proof?: string) => void;

  // Audit log
  auditLog: AuditEntry[];
  appendAuditEntry: (entry: AuditEntry) => void;

  // WebSocket
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;
  lastWsEvent: WSEvent | null;

  // THE MONEY MOMENT — revocation blocking disclosure
  revocationEvent: RevocationEvent | null;
  setRevocationEvent: (e: RevocationEvent | null) => void;

  // UI state
  isSubmitting: boolean;
  setSubmitting: (v: boolean) => void;
  activeContractLoading: string | null;
  setActiveContractLoading: (action: string | null) => void;

  // WebSocket event handler — called from useWebSocket hook
  handleWSEvent: (event: WSEvent) => void;
}

export const useVulnBridgeStore = create<VulnBridgeStore>((set, get) => ({
  // Case
  currentCase: null,
  setCurrentCase: (c) => set({ currentCase: c }),
  updateCaseStatus: (status, stage) =>
    set((state) => ({
      currentCase: state.currentCase
        ? { ...state.currentCase, status: status as any, current_workflow_stage: stage }
        : null,
    })),

  // Authority
  authorityStatus: null,
  setAuthorityStatus: (s) => set({ authorityStatus: s }),
  updateAuthority: (action, granted, proof) =>
    set((state) => {
      if (!state.authorityStatus) return {};
      const key = action as keyof AllAuthorityStatus;
      return {
        authorityStatus: {
          ...state.authorityStatus,
          [key]: {
            ...state.authorityStatus[key],
            authorized: granted,
            t3n_verified: true,
            t3n_proof: proof,
            ...(granted ? {} : { revoked_at: new Date().toISOString() }),
          },
        },
      };
    }),

  // Audit log
  auditLog: [],
  appendAuditEntry: (entry) =>
    set((state) => ({ auditLog: [...state.auditLog, entry] })),

  // WebSocket
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
  lastWsEvent: null,

  // Money moment
  revocationEvent: null,
  setRevocationEvent: (e) => set({ revocationEvent: e }),

  // UI
  isSubmitting: false,
  setSubmitting: (v) => set({ isSubmitting: v }),
  activeContractLoading: null,
  setActiveContractLoading: (action) => set({ activeContractLoading: action }),

  // WebSocket event dispatch
  handleWSEvent: (event) => {
    set({ lastWsEvent: event });
    const { updateAuthority, updateCaseStatus, appendAuditEntry, setRevocationEvent } = get();

    switch (event.type) {
      case 'authority_granted':
        if (event.action) {
          updateAuthority(event.action, true, event.t3n_proof);
          appendAuditEntry({
            action: `grant:${event.action}`,
            case_id: event.case_id || '',
            timestamp: event.timestamp || new Date().toISOString(),
            agent_did: '',
            result: 'granted',
            proof_of_authority: event.t3n_proof,
          });
        }
        break;

      case 'authority_revoked':
        if (event.action) {
          updateAuthority(event.action, false, event.t3n_proof);
          appendAuditEntry({
            action: `revoke:${event.action}`,
            case_id: event.case_id || '',
            timestamp: event.timestamp || new Date().toISOString(),
            agent_did: '',
            result: 'revoked',
          });
        }
        break;

      case 'contract_executed':
        if (event.action && event.case_id) {
          appendAuditEntry({
            action: event.action,
            case_id: event.case_id,
            timestamp: event.timestamp || new Date().toISOString(),
            agent_did: '',
            signature: event.signature,
            proof_of_authority: event.proof_of_authority,
            result: 'success',
          });
        }
        break;

      case 'contract_blocked':
        // THE MONEY MOMENT
        setRevocationEvent({
          action: event.action || 'disclose',
          reason: event.reason || 'Authority revoked',
          t3n_verification: event.t3n_verification,
          timestamp: event.timestamp || new Date().toISOString(),
        });
        if (event.action && event.case_id) {
          appendAuditEntry({
            action: `BLOCKED:${event.action}`,
            case_id: event.case_id,
            timestamp: event.timestamp || new Date().toISOString(),
            agent_did: '',
            result: 'blocked',
          });
        }
        break;

      case 'case_status_updated':
        if (event.status && event.stage) {
          updateCaseStatus(event.status, event.stage);
        }
        break;
    }
  },
}));
