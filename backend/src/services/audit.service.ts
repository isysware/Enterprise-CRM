import { PoolClient } from 'pg';
import { query } from '../database/connection';
import { AuthUser, UserRole } from '../types';
import { logger } from '../utils/logger';

export interface AuditLogInput {
  actor: {
    id: string;
    name: string;
    role: UserRole | string;
  };
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  details?: Record<string, unknown>;
  client?: PoolClient;
}

export interface ActivityLogDbRow {
  id: string;
  timestamp: Date;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  details: Record<string, unknown>;
}

export class AuditService {
  /**
   * Automatically records an immutable audit log entry using verified server-side actor identity
   */
  public static async logActivity(input: AuditLogInput): Promise<void> {
    const { actor, action, entityType, entityId, entityTitle, details, client } = input;

    const sql = `
      INSERT INTO activity_logs (
        actor_id, actor_name, actor_role, action,
        entity_type, entity_id, entity_title, details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const isUuid = (str?: string): boolean =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    const validActorId = isUuid(actor.id) ? actor.id : null;

    const params = [
      validActorId,
      actor.name || 'System',
      actor.role || 'Unknown',
      action,
      entityType,
      entityId || null,
      entityTitle || null,
      JSON.stringify(details || {}),
    ];

    try {
      if (client) {
        await client.query(sql, params);
      } else {
        await query(sql, params);
      }
    } catch (err) {
      // Never crash the main business transaction if background auditing fails
      logger.error('Failed to write activity audit log:', err);
    }
  }

  /**
   * Helper to audit an action directly from Express Authenticated Request
   */
  public static async logFromRequest(
    user: AuthUser,
    action: string,
    entityType: string,
    entityId?: string,
    entityTitle?: string,
    details?: Record<string, unknown>,
    client?: PoolClient
  ): Promise<void> {
    await this.logActivity({
      actor: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      action,
      entityType,
      entityId,
      entityTitle,
      details,
      client,
    });
  }
}
