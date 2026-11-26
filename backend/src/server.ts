import http from 'http';
import { app } from './app';
import { env } from './config';
import { logger } from './utils';

const server = http.createServer(app);

const startServer = (): void => {
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
const handleTermination = (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(() => {
    logger.info('HTTP server closed cleanly. Exiting process.');
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
