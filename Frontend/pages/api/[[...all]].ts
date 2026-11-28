import type { NextApiRequest, NextApiResponse } from 'next';
import { app } from '../../src/server/app';
import { DatabaseMigrator } from '../../src/server/database/migrator';
import { DatabaseSeeder } from '../../src/server/database/seed';

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};

let isDbInitialized = false;

async function ensureDatabaseInitialized(): Promise<void> {
  if (!isDbInitialized) {
    try {
      await DatabaseMigrator.runMigrations();
      await DatabaseSeeder.seed();
      isDbInitialized = true;
    } catch (err) {
      console.error('Database migration/seed error during cold start:', err);
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureDatabaseInitialized();
  return app(req as any, res as any);
}
