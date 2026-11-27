import { leadsApi } from '../api/leads.api';
import { Lead, Activity } from '../types';

/**
 * Leads Database Service — Live Express API Client Integration
 */
export const leadsService = {
  async getAll(): Promise<{ data: Lead[] | null; error: any }> {
    try {
      const res = await leadsApi.listLeads({ limit: 200 });
      return { data: res.items as unknown as Lead[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async create(lead: Omit<Lead, 'id' | 'createdAt' | 'lastContactDate' | 'activities'>): Promise<{ data: any; error: any }> {
    try {
      const res = await leadsApi.createLead({
        name: lead.name,
        businessName: lead.businessName,
        phone: lead.phone,
        email: lead.email || null,
        city: lead.city,
        valuePKR: lead.valuePKR || 0,
        status: lead.status,
        source: lead.source,
        notes: lead.notes,
      });
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(id: string, updates: Partial<Lead>): Promise<{ data: any; error: any }> {
    try {
      const res = await leadsApi.updateLead(id, updates as any);
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async delete(id: string): Promise<{ error: any }> {
    try {
      await leadsApi.deleteLead(id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async addActivity(leadId: string, activity: Omit<Activity, 'id' | 'timestamp'>): Promise<{ data: any; error: any }> {
    try {
      const res = await leadsApi.addActivity(leadId, {
        type: 'Note',
        title: activity.title,
        notes: activity.notes,
        outcome: activity.outcome,
      });
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async bulkInsert(_leadsList: Partial<Lead>[]): Promise<{ count: number; error: any }> {
    return { count: 0, error: null };
  },
};
