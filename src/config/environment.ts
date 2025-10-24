import dotenv from 'dotenv';
import type jwt from 'jsonwebtoken';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('localhost'),

  DATABASE_URL: z.url(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  CORS_ORIGINS: z.string().default('*'),

  JWT_SECRET: z.string().default('your_jwt_secret'),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_SECRET: z.string().default('refresh_secret'),
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().int().positive().default(604800),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),

  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')} : ${issue.message}`);
      });
      process.exit(1);
    }
    return;
  }
}

const env = validateEnv();

if (!env) {
  throw new Error('Environment variables validation failed');
}

export const config = {
  env: env.NODE_ENV,

  server: {
    port: env.PORT,
    host: env.HOST,
  },

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    url: env.REDIS_PASSWORD
      ? `redis://:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}`
      : `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
  },

  jwt: {
    secret: env.JWT_SECRET as jwt.Secret,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    refreshSecret: env.JWT_REFRESH_SECRET as jwt.Secret,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
  },

  logging: {
    level: env.LOG_LEVEL,
  },

  cors: {
    origin: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  },

  admin: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  },
} as const;

export type Config = typeof config;
