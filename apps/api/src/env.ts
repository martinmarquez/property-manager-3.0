import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis (Upstash or self-hosted)
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // Observability (optional — skipped if empty)
  SENTRY_DSN: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  // App metadata
  APP_VERSION: z.string().default('0.1.0'),
  FLY_APP_NAME: z.string().optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[env] Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
