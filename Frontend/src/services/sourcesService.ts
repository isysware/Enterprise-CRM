import { sourcesApi } from '../api';

/**
 * Lead Sources API Service (Connected to Express REST API /api/v1/sources)
 */
export const sourcesService = {
  async getAll(activeOnly?: boolean): Promise<{ data: string[] | null; error: any }> {
    try {
      const list = await sourcesApi.listSources(activeOnly);
      const mapped = list.map((s) => s.name);
      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async create(name: string, description?: string): Promise<{ data: any; error: any }> {
    try {
      const created = await sourcesApi.createSource({ name, description, isActive: true });
      return { data: created, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async update(oldNameOrId: string, newName: string, id?: string): Promise<{ data: any; error: any }> {
    try {
      // If id is provided or oldNameOrId is a uuid, update by id
      const targetId = id || oldNameOrId;
      const updated = await sourcesApi.updateSource(targetId, { name: newName });
      return { data: updated, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async delete(idOrName: string): Promise<{ error: any }> {
    try {
      await sourcesApi.deleteSource(idOrName);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },
};
