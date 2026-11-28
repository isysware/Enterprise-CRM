import http from 'http';
import { app } from './app';
import { env } from './config';
import { logger } from './utils';
import { verifyDatabaseConnection, closeDatabasePool } from './database/connection';
import { DatabaseMigrator } from './database/migrator';
import { DatabaseSeeder } from './database/seed';

const server = http.createServer(app);

const startServer = async (): Promise<void> => {
  // 1. Verify PostgreSQL Database Connection & Ensure Schemas
  try {
    const dbStatus = await verifyDatabaseConnection();
    if (dbStatus.connected) {
      logger.info(
        `🐘 PostgreSQL connected: database "${dbStatus.database}" (v${dbStatus.serverVersion}) in ${dbStatus.latencyMs}ms`
      );
      // Run pending migrations and essential system seeds
      await DatabaseMigrator.runMigrations();
      await DatabaseSeeder.seed();
    } else {
      logger.warn(`⚠️ PostgreSQL connection check: ${dbStatus.error || 'Disconnected'}`);
    }
  } catch (dbErr) {
    logger.error('Failed to initialize PostgreSQL database during startup:', dbErr);
  }

  // 2. Start HTTP Listener
  server.listen(env.PORT, () => {
    logger.info(`=======================================================`);
    logger.info(`🚀 Enterprise CRM Backend Service Started Successfully`);
    logger.info(`🌐 Environment : ${env.NODE_ENV}`);
    logger.info(`🔌 Port        : ${env.PORT}`);
    logger.info(`📡 Base URL    : http://localhost:${env.PORT}`);
    logger.info(`🩺 Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    logger.info(`🛡️  CORS Origin : ${env.CORS_ORIGIN}`);
    logger.info(`=======================================================`);
  });
};

// Graceful Termination
const handleTermination = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
  
  server.close(async () => {
    logger.info('HTTP server closed cleanly.');
    try {
      await closeDatabasePool();
    } catch (err) {
      logger.error('Error closing database pool during shutdown:', err);
    }
    logger.info('Process exit clean.');
    process.exit(0);
  });

  // Force shutdown after 10s if connections linger
  setTimeout(() => {
    logger.error('Forced shutdown due to lingering connections.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleTermination('SIGTERM'));
process.on('SIGINT', () => handleTermination('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export default app;
export { app, server };
