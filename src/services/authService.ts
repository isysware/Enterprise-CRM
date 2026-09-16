import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, UserRole } from '../types';

/**
 * Authentication Service
 * Prepares the application for Supabase Auth while allowing seamless fallback
 * during Phase 1 transition.
 */
export const authService = {
  /**
   * Signs in a user using Supabase Auth with email and password
   */
  async signInWithPassword(email: string, password: string) {
    if (!isSupabaseConfigured) {
      console.warn('[Supabase AuthService] Supabase is not configured. Falling back to local mode.');
      return { data: null, error: new Error('Supabase is not configured') };
    }
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  /**
   * Signs up a new user via Supabase Auth
   */
  async signUp(email: string, password: string, metadata?: { name?: string; role?: UserRole }) {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase is not configured') };
    }
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
  },

  /**
   * Signs out the current user session
   */
  async signOut() {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    return await supabase.auth.signOut();
  },

  /**
   * Retrieves the current Supabase session
   */
  async getSession() {
    if (!isSupabaseConfigured) {
      return { data: { session: null }, error: null };
    }
    return await supabase.auth.getSession();
  },

  /**
   * Retrieves current logged in user from Supabase Auth
   */
  async getCurrentAuthUser() {
    if (!isSupabaseConfigured) {
      return { data: { user: null }, error: null };
    }
    return await supabase.auth.getUser();
  },

  /**
   * Subscribes to auth state changes (e.g. login, logout, token refresh)
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  }
};
