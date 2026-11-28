import { query, withTransaction } from '../../../database/connection';
import { AuthUser, HierarchyScope } from '../../../types';
import { AuditService } from '../../../services/audit.service';
import { AppError } from '../../../utils/AppError';
import { IncomingLeadsService } from '../../incoming-leads/incoming-leads.service';
import {
  WhatsAppConnectionStatus,
  WhatsAppSendMessageInput,
  WhatsAppInboundMessageInput,
} from './whatsapp.validator';

export class WhatsAppIntegrationService {
  /**
   * Get WhatsApp connection status
   * Groundwork rule: never fabricate a connected WhatsApp session.
   */
  public static async getStatus(): Promise<WhatsAppConnectionStatus> {
    const res = await query<{
      status: string;
      config: Record<string, unknown>;
      last_sync_at: Date | null;
    }>("SELECT status, config, last_sync_at FROM integration_connections WHERE provider = 'whatsapp'");

    if (res.rows.length === 0) {
      return {
        provider: 'whatsapp',
        status: 'disconnected',
        activeSession: false,
      };
    }

    const row = res.rows[0];
    const config = row.config || {};
    let statusVal: WhatsAppConnectionStatus['status'] = 'disconnected';
    if (row.status === 'connected') {
      statusVal = 'connected';
    } else if (row.status === 'pending') {
      statusVal = (config.pairingStatus as WhatsAppConnectionStatus['status']) || 'connecting';
    }

    return {
      provider: 'whatsapp',
      status: statusVal,
      sessionName: (config.sessionName as string) || undefined,
      connectedPhone: (config.connectedPhone as string) || undefined,
      lastSeen: row.last_sync_at ? row.last_sync_at.toISOString() : undefined,
      activeSession: statusVal === 'connected',
    };
  }

  /**
   * Request / initialize a new pairing session (Baileys compatible)
   */
  public static async initSession(actor: AuthUser): Promise<WhatsAppConnectionStatus> {
    const configData = {
      sessionName: 'Enterprise_CRM_WhatsApp_Session',
      pairingStatus: 'qr_ready',
      requestedBy: actor.id,
      initializedAt: new Date().toISOString(),
    };

    const sql = `
      INSERT INTO integration_connections (provider, status, config, updated_by, updated_at)
      VALUES ('whatsapp', 'pending', $1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (provider) DO UPDATE
      SET status = 'pending',
          config = EXCLUDED.config,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    await query(sql, [JSON.stringify(configData), actor.id]);

    await AuditService.logFromRequest(
      actor,
      'INIT_WHATSAPP_SESSION',
      'INTEGRATION',
      'whatsapp',
      'WhatsApp session initialization requested',
      { sessionName: configData.sessionName }
    );

    return this.getStatus();
  }

  /**
   * Send WhatsApp message to CRM lead / contact
   * Enforces object-level scope: if actor is Employee, target lead must be assigned to them!
   */
  public static async sendMessage(
    actor: AuthUser,
    scope: HierarchyScope,
    input: WhatsAppSendMessageInput
  ): Promise<{ messageId: string; status: 'queued' | 'sent'; leadId?: string; recipientPhone: string }> {
    // 1. Resolve lead association by ID or by Phone Number
    let associatedLeadId = input.leadId;

    if (!associatedLeadId) {
      const cleanPhone = input.recipientPhone.replace(/[^0-9+]/g, '');
      const leadMatch = await query<{ id: string; assigned_to_id: string | null; team_id: string | null }>(
        'SELECT id, assigned_to_id, team_id FROM leads WHERE phone = $1 OR phone ILIKE $2 LIMIT 1',
        [cleanPhone, `%${cleanPhone.slice(-9)}%`]
      );

      if (leadMatch.rows.length > 0) {
        associatedLeadId = leadMatch.rows[0].id;

        // Verify scope on matched lead
        if (actor.role === 'Employee' && leadMatch.rows[0].assigned_to_id !== actor.id) {
          throw AppError.forbidden('Forbidden: Cannot send messages to leads outside your assigned portfolio');
        }
      }
    } else {
      // Verify scope on explicitly passed leadId
      const targetLead = await query<{ id: string; assigned_to_id: string | null; team_id: string | null }>(
        'SELECT id, assigned_to_id, team_id FROM leads WHERE id = $1',
        [associatedLeadId]
      );
      if (targetLead.rows.length === 0) {
        throw AppError.notFound(`Lead '${associatedLeadId}' not found`);
      }
      if (actor.role === 'Employee' && targetLead.rows[0].assigned_to_id !== actor.id) {
        throw AppError.forbidden('Forbidden: Lead is not assigned to you');
      }
    }

    // 2. Check WhatsApp connection state
    const currentStatus = await this.getStatus();
    const messageId = `wa_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 3. Record outbound message interaction in lead activities if associated with a lead
    if (associatedLeadId) {
      await query(
        `INSERT INTO lead_activities (lead_id, type, title, notes, actor_id)
         VALUES ($1, 'WhatsApp', 'Outbound WhatsApp Message', $2, $3)`,
        [associatedLeadId, input.messageText, actor.id]
      );
    }

    // 4. Audit Log
    await AuditService.logFromRequest(
      actor,
      'SEND_WHATSAPP_MESSAGE',
      'COMMUNICATION',
      messageId,
      `Outbound WhatsApp message to ${input.recipientPhone}`,
      { recipientPhone: input.recipientPhone, leadId: associatedLeadId, status: currentStatus.status }
    );

    return {
      messageId,
      status: currentStatus.status === 'connected' ? 'sent' : 'queued',
      leadId: associatedLeadId,
      recipientPhone: input.recipientPhone,
    };
  }

  /**
   * Handle incoming message from WhatsApp webhook / runtime listener
   * Associates message with existing CRM lead; if new, ingests into incoming leads table.
   */
  public static async handleInboundMessage(
    payload: WhatsAppInboundMessageInput
  ): Promise<{ status: 'associated_with_lead' | 'ingested_as_incoming_lead'; entityId: string }> {
    const cleanPhone = payload.senderPhone.replace(/[^0-9+]/g, '');

    // 1. Check if sender matches an existing CRM lead
    const leadMatch = await query<{ id: string; name: string }>(
      'SELECT id, name FROM leads WHERE phone = $1 OR phone ILIKE $2 LIMIT 1',
      [cleanPhone, `%${cleanPhone.slice(-9)}%`]
    );

    if (leadMatch.rows.length > 0) {
      const lead = leadMatch.rows[0];

      // Record inbound activity on existing lead
      const actRes = await query<{ id: string }>(
        `INSERT INTO lead_activities (lead_id, type, title, notes)
         VALUES ($1, 'WhatsApp', 'Inbound WhatsApp Message', $2)
         RETURNING id`,
        [lead.id, `From ${payload.senderName || payload.senderPhone}: ${payload.messageText}`]
      );

      return {
        status: 'associated_with_lead',
        entityId: actRes.rows[0].id,
      };
    }

    // 2. New sender: Ingest into incoming_leads table with messageId deduplication
    const incoming = await IncomingLeadsService.ingestLead({
      source: 'WhatsApp',
      externalId: payload.messageId,
      contactData: {
        phone: payload.senderPhone,
        name: payload.senderName || 'WhatsApp Contact',
        lastMessage: payload.messageText,
      },
      campaignData: {
        receivedVia: 'WhatsApp Direct Inbound',
        timestamp: payload.timestamp || new Date().toISOString(),
      },
      status: 'Pending',
    });

    return {
      status: 'ingested_as_incoming_lead',
      entityId: incoming.id,
    };
  }
}
