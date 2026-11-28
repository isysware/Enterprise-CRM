import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

/**
 * Returns the singleton PostgreSQL connection pool
 */
export const getDatabasePool = (): Pool => {
  if (!pool) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured in environment variables');
    }

    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20, // Max clients in pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
    });

    pool.on('error', (err: Error) => {
      logger.error('Unexpected PostgreSQL pool error on idle client:', err);
    });
  }

  return pool;
};

/**
 * Execute a parameterized SQL query on the pool
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const p = getDatabasePool();
  const start = Date.now();
  try {
    const res = await p.query<T>(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development' && duration > 100) {
      logger.warn(`Slow SQL query executed in ${duration}ms: ${text.slice(0, 100)}`);
    }
    return res;
  } catch (error) {
    logger.error(`Database query failed: ${text.slice(0, 100)}`, error);
    throw error;
  }
};

/**
 * Acquire a dedicated client from the pool (for transactions)
 */
export const getClient = async (): Promise<PoolClient> => {
  const p = getDatabasePool();
  return await p.connect();
};

/**
 * Execute operations within an atomic database transaction
 */
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export interface DbConnectionStatus {
  connected: boolean;
  database?: string;
  latencyMs?: number;
  serverVersion?: string;
  error?: string;
}

/**
 * Safely verify database connectivity without exposing connection secrets
 */
export const verifyDatabaseConnection = async (): Promise<DbConnectionStatus> => {
  if (!env.DATABASE_URL) {
    return {
      connected: false,
      error: 'DATABASE_URL not configured',
    };
  }

  const start = Date.now();
  try {
    const res = await query<{ current_db: string; pg_version: string }>(
      'SELECT current_database() as current_db, split_part(version(), \' \', 2) as pg_version'
    );
    const latencyMs = Date.now() - start;
    const row = res.rows[0];

    return {
      connected: true,
      database: row?.current_db,
      serverVersion: row?.pg_version,
      latencyMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    return {
      connected: false,
      error: message,
      latencyMs: Date.now() - start,
    };
  }
};

/**
 * Gracefully close the database pool
 */
export const closeDatabasePool = async (): Promise<void> => {
  if (pool) {
    logger.info('Closing PostgreSQL database connection pool...');
    await pool.end();
    pool = null;
    logger.info('PostgreSQL connection pool closed cleanly.');
  }
};
