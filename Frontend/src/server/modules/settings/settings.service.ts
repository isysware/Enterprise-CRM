import { query } from '../../database/connection';
import { AuthUser } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';

export interface SystemSettingsPayload {
  applicationName: string;
  companyName: string;
  companyLogo?: string;
  proposalLetterheadBg?: string;
  companyAddress?: string;
  companyTaxId?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  defaultProposalValidityDays?: number;
  defaultProposalTerms?: string;
  authorizedSignatureName?: string;
  authorizedSignatureTitle?: string;
  authorizedSignatureImg?: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  staleLeadDays: number;
  followUpReminderMinutes: number;
  enableWhatsAppDirect: boolean;
  enableNotifications: boolean;
  whatsappGreetingTemplate?: string;
  defaultPricingModel: string;
  [key: string]: unknown;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsPayload = {
  applicationName: 'CRM',
  companyName: '',
  companyLogo: '',
  proposalLetterheadBg: '',
  companyAddress: 'Suite #402, Business Executive Center, Main Shahrah-e-Faisal, Karachi, Pakistan',
  companyTaxId: 'NTN: 8294719-4 | STRN: 3277876123456',
  companyPhone: '+92 300 1234567',
  companyEmail: 'proposals@isysware.com',
  companyWebsite: 'https://isysware.com',
  defaultProposalValidityDays: 14,
  defaultProposalTerms: `1. Validity: This commercial quotation is valid for 14 calendar days from the date of issuance.
2. Payment Terms: 40% advance milestone on contract signing, 30% on beta milestone preview, and 30% upon final delivery & handover.
3. Taxes: Quoted prices are in Pakistani Rupees (PKR) and exclusive of applicable provincial sales tax (GST/PST) unless explicitly itemized.
4. Support & Warranty: 3 months of complimentary technical bug-fixing and cloud maintenance support is included post-launch.
5. Intellectual Property: Complete source code ownership and database rights will be transferred upon settlement of final invoice.`,
  authorizedSignatureName: 'Abdur Rehman Arain',
  authorizedSignatureTitle: 'Director of Enterprise Solutions',
  authorizedSignatureImg: '',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  timezone: 'Asia/Karachi (UTC+5)',
  staleLeadDays: 7,
  followUpReminderMinutes: 30,
  enableWhatsAppDirect: true,
  enableNotifications: true,
  whatsappGreetingTemplate:
    'Assalam-o-Alaikum {{clientName}}, this is {{repName}} from {{companyName}}. We are following up regarding your inquiry for {{serviceName}}. How can we assist you today?',
  defaultPricingModel: 'one_time',
};

export class SettingsService {
  /**
   * Fetch all settings categories from PostgreSQL and merge with defaults
   */
  public static async getAllSettings(): Promise<SystemSettingsPayload> {
    const res = await query<{ category: string; data: Record<string, unknown> }>(
      'SELECT category, data FROM settings ORDER BY category ASC'
    );

    const merged: SystemSettingsPayload = { ...DEFAULT_SYSTEM_SETTINGS };

    for (const row of res.rows) {
      if (row.data && typeof row.data === 'object') {
        Object.assign(merged, row.data);
      }
    }

    return merged;
  }

  /**
   * Get settings for a specific category
   */
  public static async getCategorySettings(category: string): Promise<Record<string, unknown>> {
    const res = await query<{ data: Record<string, unknown> }>(
      'SELECT data FROM settings WHERE category = $1',
      [category]
    );

    if (res.rows.length === 0) {
      return {};
    }

    return res.rows[0].data || {};
  }

  /**
   * Update or insert settings for a category
   */
  public static async updateCategory(
    category: string,
    data: Record<string, unknown>,
    actor: AuthUser
  ): Promise<SystemSettingsPayload> {
    const sql = `
      INSERT INTO settings (category, data, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (category) DO UPDATE
      SET data = settings.data || EXCLUDED.data,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    await query(sql, [category, JSON.stringify(data), actor.id]);

    await AuditService.logFromRequest(
      actor,
      'UPDATE_SYSTEM_SETTINGS',
      'SETTINGS',
      category,
      `Updated settings for category: ${category}`,
      { category, updatedFields: Object.keys(data) }
    );

    return this.getAllSettings();
  }

  /**
   * Reset settings to factory defaults
   */
  public static async resetToDefaults(actor: AuthUser): Promise<SystemSettingsPayload> {
    await query('DELETE FROM settings');

    await AuditService.logFromRequest(
      actor,
      'RESET_SYSTEM_SETTINGS',
      'SETTINGS',
      'all',
      'Reset system configurations to factory defaults',
      {}
    );

    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
}
