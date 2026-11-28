import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100), // 100 requests per window
  API_PREFIX: z.string().default('/api/v1'),

  // Auth & Token Security
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long')
    .default('dev_jwt_access_secret_super_secure_32_characters_minimum'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long')
    .default('dev_jwt_refresh_secret_super_secure_32_characters_minimum'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z
    .string()
    .min(32, 'COOKIE_SECRET must be at least 32 characters long')
    .default('dev_cookie_signing_secret_32_characters_minimum'),

  // PostgreSQL Database
  DATABASE_URL: z.string().optional(),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Warning: Invalid or partial environment variables configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));

    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'production',
      PORT: Number(process.env.PORT) || 5000,
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX: 5000,
      API_PREFIX: '/api/v1',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32_characters_minimum',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_super_secure_32_characters_minimum',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_signing_secret_32_characters_minimum',
      DATABASE_URL: process.env.DATABASE_URL,
    };
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
