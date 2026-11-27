import { apiClient } from './client';

export interface ProposalLineItemDto {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPricePKR: number;
  totalPKR: number;
}

export interface ProposalMilestoneDto {
  title: string;
  percentage: number;
  amountPKR: number;
  dueDate?: string | null;
}

export interface ProposalDbDto {
  id: string;
  lead_id: string | null;
  proposal_number: string;
  issue_date: string;
  expiry_date: string | null;
  client_snapshot: Record<string, unknown>;
  assigned_rep_id: string | null;
  scope_deliverables: string | null;
  line_items: ProposalLineItemDto[];
  discount_pkr: string | number;
  tax_pkr: string | number;
  total_pkr: string | number;
  milestones: ProposalMilestoneDto[];
  terms: string | null;
  letterhead_snapshot: Record<string, unknown>;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  created_at: string;
  updated_at: string;
  assigned_rep_name?: string | null;
}

export interface CreateProposalPayload {
  leadId?: string | null;
  proposalNumber?: string;
  issueDate?: string;
  expiryDate?: string | null;
  clientSnapshot?: Record<string, unknown>;
  assignedRepId?: string | null;
  scopeDeliverables?: string | null;
  lineItems?: ProposalLineItemDto[];
  discountPKR?: number;
  taxPKR?: number;
  totalPKR?: number;
  milestones?: ProposalMilestoneDto[];
  terms?: string | null;
  letterheadSnapshot?: Record<string, unknown>;
  status?: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
}

export interface UpdateProposalPayload {
  expiryDate?: string | null;
  clientSnapshot?: Record<string, unknown>;
  assignedRepId?: string | null;
  scopeDeliverables?: string | null;
  lineItems?: ProposalLineItemDto[];
  discountPKR?: number;
  taxPKR?: number;
  totalPKR?: number;
  milestones?: ProposalMilestoneDto[];
  terms?: string | null;
  letterheadSnapshot?: Record<string, unknown>;
  status?: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
}

export const proposalsApi = {
  listProposals: (leadId?: string) =>
    apiClient.get<ProposalDbDto[]>('/proposals', {
      params: leadId ? { leadId } : undefined,
    }),

  getProposalById: (id: string) =>
    apiClient.get<ProposalDbDto>(`/proposals/${encodeURIComponent(id)}`),

  createProposal: (payload: CreateProposalPayload) =>
    apiClient.post<ProposalDbDto>('/proposals', payload),

  updateProposal: (id: string, payload: UpdateProposalPayload) =>
    apiClient.put<ProposalDbDto>(`/proposals/${encodeURIComponent(id)}`, payload),

  updateStatus: (id: string, status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired') =>
    apiClient.patch<ProposalDbDto>(`/proposals/${encodeURIComponent(id)}/status`, { status }),
};
