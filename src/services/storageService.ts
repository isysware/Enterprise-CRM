import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type StorageBucketName = 'crm-assets' | 'logos' | 'signatures' | 'letterheads' | 'avatars';

/**
 * Storage Service for managing assets in Supabase Storage buckets
 */
export const storageService = {
  /**
   * Uploads a file (File, Blob, or Uint8Array) to a designated Supabase Storage bucket
   */
  async upload(
    bucket: StorageBucketName,
    path: string,
    file: File | Blob | Uint8Array,
    options?: { contentType?: string; upsert?: boolean }
  ): Promise<{ url: string | null; error: any }> {
    if (!isSupabaseConfigured) {
      return { url: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options?.upsert ?? true,
        contentType: options?.contentType
      });

    if (error || !data) {
      return { url: null, error };
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { url: publicData.publicUrl, error: null };
  },

  /**
   * Uploads a base64 Data URL string to a bucket
   */
  async uploadBase64(
    bucket: StorageBucketName,
    path: string,
    base64DataUrl: string
  ): Promise<{ url: string | null; error: any }> {
    if (!isSupabaseConfigured) {
      return { url: null, error: new Error('Supabase not configured') };
    }

    try {
      const match = base64DataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid Base64 Data URL');
      }

      const mimeType = match[1];
      const byteCharacters = atob(match[2]);
      const byteArrays = new Uint8Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays[i] = byteCharacters.charCodeAt(i);
      }

      const blob = new Blob([byteArrays], { type: mimeType });
      return await this.upload(bucket, path, blob, { contentType: mimeType, upsert: true });
    } catch (err) {
      return { url: null, error: err };
    }
  },

  /**
   * Gets public URL for an asset in a bucket
   */
  getPublicUrl(bucket: StorageBucketName, path: string): string | null {
    if (!isSupabaseConfigured) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Deletes a file from a bucket
   */
  async delete(bucket: StorageBucketName, paths: string[]): Promise<{ error: any }> {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase not configured') };
    }
    const { error } = await supabase.storage.from(bucket).remove(paths);
    return { error };
  }
};
