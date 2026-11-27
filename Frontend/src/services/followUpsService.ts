import { followUpsApi } from '../api/followUps.api';
import { FollowUp } from '../types';

/**
 * Follow-Ups Database Service — Live Express API Client Integration
 */
export const followUpsService = {
  async getAll(): Promise<{ data: FollowUp[] | null; error: any }> {
    try {
      const res = await followUpsApi.listFollowUps();
      return { data: res as unknown as FollowUp[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async create(fu: Omit<FollowUp, 'id' | 'createdAt'>): Promise<{ data: any; error: any }> {
    try {
      const res = await followUpsApi.createFollowUp({
        leadId: fu.leadId,
        scheduledDate: fu.scheduledDate,
        scheduledTime: fu.scheduledTime,
        type: fu.type === 'WhatsApp' ? 'WhatsApp' : fu.type === 'Meeting' ? 'Meeting' : fu.type === 'Email' ? 'Email' : 'Call',
        notes: fu.notes,
      });
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(id: string, updates: Partial<FollowUp>): Promise<{ data: any; error: any }> {
    try {
      if (updates.scheduledDate) {
        const res = await followUpsApi.rescheduleFollowUp(id, {
          scheduledDate: updates.scheduledDate,
          scheduledTime: updates.scheduledTime,
          reason: updates.notes,
        });
        return { data: res, error: null };
      }
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async delete(id: string): Promise<{ error: any }> {
    try {
      await followUpsApi.deleteFollowUp(id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};
