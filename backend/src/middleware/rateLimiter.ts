import rateLimit from 'express-rate-limit';
import { env } from '../config';
import { AppError } from '../utils';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'development' || env.NODE_ENV === 'test' ? 5000 : Math.max(env.RATE_LIMIT_MAX, 1000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path.endsWith('/health'),
  handler: (_req, _res, next) => {
    next(new AppError('Too many requests from this IP, please try again later.', 429));
  },
});
