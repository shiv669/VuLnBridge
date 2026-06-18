// Typed API client for VulnBridge backend
// All calls use relative URLs — CRA proxy routes them to localhost:8000

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Types ──────────────────────────────────────────────────────────────────

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface SubmitVulnerabilityPayload {
  title: string;
  description: string;
  severity: Severity;
  affected_systems: string;     // comma-separated
  researcher_email: string;
  researcher_name?: string;
}

export interface CaseResponse {
  case_id: string;
  title: string;
  description: string;
  severity_score: number;
  affected_systems: string[];
  researcher_email: string;
  researcher_name: string;
  status: 'submitted' | 'validated' | 'remediated' | 'disclosed' | 'closed';
  current_workflow_stage: string;
  created_at: string;
  updated_at: string;
}

export interface T3NVerification {
  checked_at: string;
  agent_did: string;
  authority_key: string;
  result: boolean;
  proof?: string;
  revoked_at?: string;
}

export interface ContractResult {
  success: boolean;
  contract?: string;
  agent_did?: string;
  signature?: string;
  proof_of_authority?: string;
  timestamp?: string;
  // On AUTHORITY_REVOKED:
  error?: 'AUTHORITY_REVOKED' | string;
  message?: string;
  t3n_verification?: T3NVerification;
  demo_moment?: boolean;
}

export interface AuthorityStatus {
  action: string;
  authorized: boolean;
  t3n_verified: boolean;
  t3n_proof?: string;
  granted_by?: string;
  granted_at?: string;
  revoked_at?: string;
  checked_at?: string;
  storage_key?: string;
}

export interface AllAuthorityStatus {
  validate: AuthorityStatus;
  remediate: AuthorityStatus;
  disclose: AuthorityStatus;
  publish: AuthorityStatus;
}

export interface GrantAuthorityPayload {
  action: 'validate' | 'remediate' | 'disclose' | 'publish';
  granted_by: string;
  case_id?: string;
}

export interface RevokeAuthorityPayload {
  action: 'validate' | 'remediate' | 'disclose' | 'publish';
  revoked_by?: string;
  reason?: string;
  case_id?: string;
}

export interface AuditEntry {
  action: string;
  case_id: string;
  timestamp: string;
  agent_did: string;
  signature?: string;
  proof_of_authority?: string;
  result: string;
}

// ── API Methods ────────────────────────────────────────────────────────────

export const vulnbridgeApi = {
  // Cases
  submitVulnerability: (data: SubmitVulnerabilityPayload) =>
    api.post<{ case_id: string; status: string; message: string }>(
      '/cases/submit_vulnerability/',
      data
    ),

  getCase: (caseId: string) =>
    api.get<CaseResponse>(`/cases/${caseId}/`),

  getCases: () =>
    api.get<CaseResponse[]>('/cases/'),

  // Workflow contracts
  validateContract: (caseId: string) =>
    api.post<ContractResult>(`/cases/${caseId}/validate_contract/`),

  remediateContract: (caseId: string) =>
    api.post<ContractResult>(`/cases/${caseId}/remediate_contract/`),

  discloseContract: (caseId: string) =>
    api.post<ContractResult>(`/cases/${caseId}/disclose_contract/`),

  publishContract: (caseId: string) =>
    api.post<ContractResult>(`/cases/${caseId}/publish_contract/`),

  // Authority
  getAllAuthorityStatus: () =>
    api.get<AllAuthorityStatus>('/authority/all/'),

  getAuthorityStatus: (action: string) =>
    api.get<AuthorityStatus>('/authority/status/', { params: { action } }),

  grantAuthority: (data: GrantAuthorityPayload) =>
    api.post<AuthorityStatus & { t3n_proof: string }>('/authority/grant/', data),

  revokeAuthority: (data: RevokeAuthorityPayload) =>
    api.post<{ success: boolean; t3n_proof: string; revoked_at: string }>(
      '/authority/revoke/',
      data
    ),

  // Audit log
  getAuditLog: (caseId?: string) =>
    api.get<{ actions: AuditEntry[]; count: number }>(
      '/cases/audit_log/',
      caseId ? { params: { case_id: caseId } } : {}
    ),
};

export default vulnbridgeApi;
