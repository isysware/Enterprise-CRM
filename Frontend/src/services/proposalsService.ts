import { proposalsApi } from '../api/proposals.api';
import { Proposal } from '../types';

/**
 * Proposals Database Service — Live Express API Client Integration
 */
export const proposalsService = {
  async getAll(): Promise<{ data: Proposal[] | null; error: any }> {
    try {
      const res = await proposalsApi.listProposals();
      return { data: res as unknown as Proposal[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async create(proposal: Omit<Proposal, 'id' | 'createdAt'>): Promise<{ data: any; error: any }> {
    try {
      const res = await proposalsApi.createProposal({
        leadId: proposal.leadId || null,
        proposalNumber: proposal.refNumber,
        issueDate: proposal.issueDate,
        expiryDate: proposal.expiryDate || null,
        totalPKR: proposal.grandTotalPKR ?? proposal.grandTotal ?? 0,
      });
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(id: string, updates: Partial<Proposal>): Promise<{ data: any; error: any }> {
    try {
      const res = await proposalsApi.updateProposal(id, updates as any);
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: null };
  },
};
