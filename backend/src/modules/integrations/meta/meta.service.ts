import { query } from '../../../database/connection';
import { AuthUser } from '../../../types';
import { AuditService } from '../../../services/audit.service';
import { AppError } from '../../../utils/AppError';
import { IncomingLeadsService } from '../../incoming-leads/incoming-leads.service';
import {
  MetaConfigureInput,
  MetaConnectionStatus,
  MetaWebhookPayload,
} from './meta.validator';

export class MetaIntegrationService {
  /**
   * Get Meta Integration Status
   * Groundwork contract: Never returns fake successful connection when not actually connected.
   */
  public static async getStatus(): Promise<MetaConnectionStatus> {
    const res = await query<{
      status: string;
      config: Record<string, unknown>;
      last_sync_at: Date | null;
    }>('SELECT status, config, last_sync_at FROM integration_connections WHERE provider = $1', [
      'meta',
    ]);

    if (res.rows.length === 0) {
      return {
        provider: 'meta',
        status: 'disconnected',
        subscribedFormsCount: 0,
      };
    }

    const row = res.rows[0];
    const config = row.config || {};
    const statusVal = row.status === 'connected' ? 'connected' : config.pageId ? 'configured' : 'disconnected';

    return {
      provider: 'meta',
      status: statusVal as 'connected' | 'disconnected' | 'configured',
      pageId: (config.pageId as string) || undefined,
      pageName: (config.pageName as string) || undefined,
      subscribedFormsCount: Array.isArray(config.subscribedForms) ? config.subscribedForms.length : 0,
      lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : undefined,
    };
  }

  /**
   * Save / Update Meta Integration Configuration
   */
  public static async configure(actor: AuthUser, input: MetaConfigureInput): Promise<MetaConnectionStatus> {
    const configData = {
      appId: input.appId,
      pageId: input.pageId,
      pageName: input.pageName || 'Connected Page',
      webhookVerifyToken: input.webhookVerifyToken,
      subscribedForms: input.subscribedForms || [],
    };

    const sql = `
      INSERT INTO integration_connections (provider, status, config, updated_by, updated_at)
      VALUES ('meta', 'pending', $1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (provider) DO UPDATE
      SET config = EXCLUDED.config,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    await query(sql, [JSON.stringify(configData), actor.id]);

    await AuditService.logFromRequest(
      actor,
      'CONFIGURE_META_INTEGRATION',
      'INTEGRATION',
      'meta',
      'Meta Lead Ads Configuration Updated',
      { pageId: input.pageId, subscribedFormsCount: input.subscribedForms?.length || 0 }
    );

    return this.getStatus();
  }

  /**
   * Verify Webhook challenge from Meta Platform
   */
  public static async verifyWebhook(
    mode?: string,
    token?: string,
    challenge?: string
  ): Promise<string> {
    if (!mode || !token) {
      throw AppError.forbidden('Forbidden: Missing hub.mode or hub.verify_token');
    }

    if (mode !== 'subscribe') {
      throw AppError.badRequest('Invalid hub.mode');
    }

    const res = await query<{ config: { webhookVerifyToken?: string } }>(
      "SELECT config FROM integration_connections WHERE provider = 'meta'"
    );

    const configuredToken =
      res.rows[0]?.config?.webhookVerifyToken || process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (!configuredToken || token !== configuredToken) {
      throw AppError.forbidden('Forbidden: Verification token mismatch');
    }

    return challenge || '';
  }

  /**
   * Ingest incoming webhook event from Meta Lead Ads
   * Idempotent ingestion: uses existing IncomingLeadsService externalId deduplication.
   */
  public static async ingestWebhookEvent(payload: MetaWebhookPayload): Promise<{ processed: number; duplicates: number }> {
    let processed = 0;
    let duplicates = 0;

    if (!payload.entry || !Array.isArray(payload.entry)) {
      return { processed: 0, duplicates: 0 };
    }

    for (const entry of payload.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.field !== 'leadgen' || !change.value) continue;

        const val = change.value;
        const externalId = val.leadgen_id;
        if (!externalId) continue;

        // Parse contact fields from field_data if available
        const contactData: Record<string, unknown> = {};
        if (val.field_data && Array.isArray(val.field_data)) {
          for (const f of val.field_data) {
            contactData[f.name] = f.values?.[0] || '';
          }
        }

        const campaignData = {
          pageId: val.page_id,
          formId: val.form_id,
          createdTime: val.created_time,
          adId: val.ad_id,
          adgroupId: val.adgroup_id,
          campaignId: val.campaign_id,
        };

        try {
          await IncomingLeadsService.ingestLead({
            source: 'Meta Lead Ads',
            externalId,
            contactData,
            campaignData,
            status: 'Pending',
          });
          processed++;
        } catch (err) {
          // Idempotency: if duplicate externalId, increment duplicate count without crashing
          if (err instanceof AppError && err.statusCode === 409) {
            duplicates++;
          } else {
            throw err;
          }
        }
      }
    }

    // Update last_sync_at on integration_connections
    if (processed > 0 || duplicates > 0) {
      await query(
        "UPDATE integration_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE provider = 'meta'"
      );
    }

    return { processed, duplicates };
  }
}
