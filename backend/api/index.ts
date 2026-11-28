import { app } from '../src/app';
import { DatabaseMigrator } from '../src/database/migrator';
import { DatabaseSeeder } from '../src/database/seed';

let isDbInitialized = false;

async function ensureDatabaseInitialized(): Promise<void> {
  if (!isDbInitialized) {
    try {
      await DatabaseMigrator.runMigrations();
      await DatabaseSeeder.seed();
      isDbInitialized = true;
    } catch (err) {
      console.error('Database migration/seed error during serverless cold start:', err);
    }
  }
}

export default async function handler(req: any, res: any) {
  try {
    await ensureDatabaseInitialized();
    return app(req, res);
  } catch (err: any) {
    console.error('Fatal unhandled error in serverless handler:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'SERVER_HANDLER_ERROR',
            message: err?.message || 'Server error during execution',
          },
        })
      );
    }
  }
}
