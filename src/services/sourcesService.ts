/**
 * Lead Sources Database Service (Quarantined - database persistence not enabled yet)
 */
export const sourcesService = {
  async getAll(): Promise<{ data: string[] | null; error: any }> {
    return { data: null, error: new Error('Sources database persistence is not enabled yet.') };
  },

  async create(_name: string): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Sources database persistence is not enabled yet.') };
  },

  async update(_oldName: string, _newName: string): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Sources database persistence is not enabled yet.') };
  },

  async delete(_name: string): Promise<{ error: any }> {
    return { error: new Error('Sources database persistence is not enabled yet.') };
  }
};

