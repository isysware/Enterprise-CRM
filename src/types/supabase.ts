import {
  UserRole,
  LeadStatus,
  LeadQuality,
  Priority,
  LeadSource,
  FollowUpType,
  FollowUpStatus,
  PricingModel,
  BudgetDetails,
  PaymentMilestone,
  ProposalItem,
  PricingModelField,
  SystemSettings
} from '../types';

/**
 * Database Schema Definitions for Supabase PostgreSQL tables
 *
 * Core Identity & RBAC tables correspond to verified migrations 001-004:
 * - organizations
 * - roles
 * - permissions
 * - role_permissions
 * - profiles
 * - teams
 * - team_members
 *
 * Business domain tables (leads, clients, proposals, etc.) are future database contracts.
 */
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: 'active' | 'inactive' | 'suspended';
          default_currency: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: 'active' | 'inactive' | 'suspended';
          default_currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: 'active' | 'inactive' | 'suspended';
          default_currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          hierarchy_level: number;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          hierarchy_level: number;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          hierarchy_level?: number;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          module: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          module: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          module?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          role_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          job_title: string | null;
          status: 'active' | 'inactive' | 'suspended';
          manager_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          role_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          job_title?: string | null;
          status?: 'active' | 'inactive' | 'suspended';
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          role_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          job_title?: string | null;
          status?: 'active' | 'inactive' | 'suspended';
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          manager_id: string | null;
          team_lead_id: string | null;
          status: 'active' | 'inactive' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          manager_id?: string | null;
          team_lead_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          manager_id?: string | null;
          team_lead_id?: string | null;
          status?: 'active' | 'inactive' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          profile_id: string;
          is_primary: boolean;
          joined_at: string;
        };
        Insert: {
          team_id: string;
          profile_id: string;
          is_primary?: boolean;
          joined_at?: string;
        };
        Update: {
          team_id?: string;
          profile_id?: string;
          is_primary?: boolean;
          joined_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          business_name: string;
          phone: string;
          email: string;
          city: string;
          services: string[];
          value_pkr: number;
          status: LeadStatus;
          quality: LeadQuality;
          priority: Priority;
          source: LeadSource;
          assigned_to_id: string;
          assigned_to_name: string;
          team_id: string | null;
          team_name: string | null;
          created_at: string;
          last_contact_date: string;
          next_follow_up_date: string | null;
          next_follow_up_time: string | null;
          next_follow_up_type: FollowUpType | null;
          tags: string[];
          notes: string;
          pricing_model: PricingModel | null;
          budget_details: BudgetDetails | null;
          pricing_details: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
        Relationships: [];
      };
      lead_activities: {
        Row: {
          id: string;
          lead_id: string;
          type: 'call' | 'whatsapp' | 'meeting' | 'note' | 'stage_change' | 'reassign';
          title: string;
          notes: string;
          timestamp: string;
          author: string;
          outcome: string | null;
          duration: string | null;
        };
        Insert: Omit<Database['public']['Tables']['lead_activities']['Row'], 'timestamp'> & {
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['lead_activities']['Insert']>;
        Relationships: [];
      };
      follow_ups: {
        Row: {
          id: string;
          lead_id: string | null;
          client_name: string;
          client_business: string;
          phone: string;
          scheduled_date: string;
          scheduled_time: string;
          type: FollowUpType;
          source: LeadSource;
          status: FollowUpStatus;
          notes: string;
          assigned_to_id: string;
          assigned_to_name: string;
          completed_at: string | null;
          result_notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['follow_ups']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['follow_ups']['Insert']>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          lead_id: string | null;
          business_name: string;
          client_name: string;
          phone: string;
          email: string;
          city: string;
          services: string[];
          source: LeadSource;
          pricing_model: string;
          final_price: number;
          active_revenue_pkr: number;
          currency: string;
          generated_by_id: string | null;
          generated_by_name: string;
          assigned_to_id: string | null;
          assigned_to_name: string;
          closed_by_id: string | null;
          closed_by_name: string;
          payment_terms: string | null;
          package_details: string | null;
          conversion_notes: string | null;
          notes: string;
          converted_date: string;
          start_date: string;
          status: 'Active' | 'Churned' | 'On-Hold';
          pricing_details: Record<string, any> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
        Relationships: [];
      };
      proposals: {
        Row: {
          id: string;
          lead_id: string | null;
          ref_number: string;
          client_name: string;
          business_name: string;
          phone: string;
          email: string;
          city: string;
          services: string[];
          prepared_by_name: string;
          prepared_by_role: string;
          prepared_by_phone: string;
          pricing_model_id: string | null;
          pricing_model_name: string;
          pricing_details: Record<string, any>;
          items: ProposalItem[];
          subtotal: number;
          tax_rate: number;
          tax_amount: number;
          overall_discount: number;
          grand_total: number;
          payment_milestones: PaymentMilestone[];
          terms_conditions: string[];
          validity_days: number;
          authorized_signatory_name: string;
          authorized_signatory_title: string;
          authorized_signature_img: string | null;
          company_logo: string | null;
          letterhead_bg: string | null;
          notes: string;
          status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['proposals']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['proposals']['Insert']>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          name: string;
          category: string;
          default_price_pkr: number;
          base_price_pkr: number;
          pricing_model: string;
          description: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sources']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sources']['Insert']>;
        Relationships: [];
      };
      pricing_models: {
        Row: {
          id: string;
          name: string;
          billing_type: 'one-time' | 'recurring' | 'hybrid' | 'milestone';
          description: string;
          is_default: boolean;
          fields: PricingModelField[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pricing_models']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pricing_models']['Insert']>;
        Relationships: [];
      };
      system_settings: {
        Row: {
          id: string; // 'singleton' primary key
          company_name: string;
          company_tagline: string;
          app_name: string;
          currency: string;
          currency_symbol: string;
          system_timezone: string;
          company_email: string;
          company_phone: string;
          company_address: string;
          company_website: string;
          company_logo: string | null;
          proposal_letterhead_bg: string | null;
          authorized_signature_img: string | null;
          stale_lead_days: number;
          enable_auto_reminders: boolean;
          enable_daily_digest: boolean;
          allow_lead_reassignment: boolean;
          enable_whats_app_integration: boolean;
          enable_email_alerts: boolean;
          lead_overdue_threshold_hours: number;
          meta_pixel_id: string;
          google_analytics_id: string;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['system_settings']['Row'];
        Update: Partial<Database['public']['Tables']['system_settings']['Insert']>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          timestamp: string;
          user_id: string;
          user_name: string;
          user_role: UserRole;
          action: string;
          entity_type: 'Lead' | 'FollowUp' | 'Client' | 'User' | 'Team' | 'Service' | 'Source' | 'Setting' | 'Auth';
          entity_id: string | null;
          entity_title: string;
          details: string;
        };
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'timestamp'> & {
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
