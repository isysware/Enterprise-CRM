import { query } from '../../database/connection';
import { ActivityLogDbRow } from '../../services/audit.service';

export interface ListActivityLogsQuery {
  entityType?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class ActivityLogsService {
  public static async listLogs(
    queryInput: ListActivityLogsQuery
  ): Promise<{ items: ActivityLogDbRow[]; total: number; page: number; limit: number; totalPages: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (queryInput.entityType) {
      conditions.push(`entity_type = $${idx++}`);
      params.push(queryInput.entityType);
    }
    if (queryInput.actorId) {
      conditions.push(`actor_id = $${idx++}`);
      params.push(queryInput.actorId);
    }
    if (queryInput.startDate) {
      conditions.push(`timestamp >= $${idx++}`);
      params.push(queryInput.startDate);
    }
    if (queryInput.endDate) {
      conditions.push(`timestamp <= $${idx++}`);
      params.push(queryInput.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(id)::int as total FROM activity_logs ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const page = queryInput.page || 1;
    const limit = queryInput.limit || 50;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT *
      FROM activity_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);

    const res = await query<ActivityLogDbRow>(sql, params);

    return {
      items: res.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
