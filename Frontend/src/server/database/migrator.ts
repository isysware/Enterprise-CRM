import fs from 'fs';
import path from 'path';
import { getClient, withTransaction, query } from './connection';
import { logger } from '../utils/logger';

export interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

/**
 * Migration runner with idempotent schema tracking
 */
export class DatabaseMigrator {
  /**
   * Ensure schema_migrations tracking table exists
   */
  public static async ensureMigrationsTable(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Get list of applied migration names
   */
  public static async getAppliedMigrations(): Promise<string[]> {
    await this.ensureMigrationsTable();
    const res = await query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY id ASC'
    );
    return res.rows.map((r) => r.name);
  }

  /**
   * Execute pending migrations in chronological order
   */
  public static async runMigrations(): Promise<{ applied: string[]; alreadyApplied: string[] }> {
    await this.ensureMigrationsTable();
    const applied = await this.getAppliedMigrations();
    const migrationsDir = path.resolve(__dirname, 'migrations');

    const files = fs.existsSync(migrationsDir)
      ? fs
          .readdirSync(migrationsDir)
          .filter((f) => f.endsWith('.sql'))
          .sort()
      : [];

    const newlyApplied: string[] = [];

    for (const file of files) {
      if (applied.includes(file)) {
        continue;
      }

      logger.info(`Applying database migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      await withTransaction(async (client) => {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
      });

      logger.info(`Successfully applied migration: ${file}`);
      newlyApplied.push(file);
    }

    return {
      applied: newlyApplied,
      alreadyApplied: applied,
    };
  }
}

// Standalone runner when invoked via CLI
if (require.main === module) {
  DatabaseMigrator.runMigrations()
    .then((res) => {
      logger.info(
        `Migration run completed. Applied: ${res.applied.length}, Previously applied: ${res.alreadyApplied.length}`
      );
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Database migration failed:', err);
      process.exit(1);
    });
}
