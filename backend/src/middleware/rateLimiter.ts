import rateLimit from 'express-rate-limit';
import { env } from '../config';
import { AppError } from '../utils';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError('Too many requests from this IP, please try again later.', 429));
  },
});
