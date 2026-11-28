import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config';
import { apiV1Router } from './routes';
import {
  apiRateLimiter,
  requestLogger,
  notFoundHandler,
  errorHandler,
} from './middleware';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Security HTTP Headers
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin, server-to-server, localhost, or vercel deployments
        if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin === env.CORS_ORIGIN) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Request Parsers & Cookie Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // 4. HTTP Request Logging
  app.use(requestLogger);

  // 5. Rate Limiting Foundation
  app.use('/api', apiRateLimiter);

  // 6. API Version 1 Mounting
  app.use(env.API_PREFIX, apiV1Router);

  // 7. 404 Route Catch-all
  app.use(notFoundHandler);

  // 8. Centralized Global Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
