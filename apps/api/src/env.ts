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

  // Auth
  /** 32+ char key used for AES-256-GCM TOTP secret encryption. */
  AUTH_ENCRYPTION_KEY: z.string().min(32),
  /** WebAuthn RP ID — must match the app domain (e.g. "app.corredor.ar"). */
  WEBAUTHN_RP_ID: z.string().min(1).default('localhost'),
  /** WebAuthn RP name shown in authenticator UIs. */
  WEBAUTHN_RP_NAME: z.string().min(1).default('Corredor'),
  /** Full origin for WebAuthn verification. Defaults to https://{WEBAUTHN_RP_ID}. */
  WEBAUTHN_ORIGIN: z.string().optional(),

  // E-sign providers (RENA-57)
  SIGNATURIT_API_KEY: z.string().optional(),
  SIGNATURIT_BASE_URL: z.string().default('https://api.sandbox.signaturit.com'),
  SIGNATURIT_WEBHOOK_SECRET: z.string().optional(),
  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_SECRET_KEY: z.string().optional(),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_WEBHOOK_SECRET: z.string().optional(),

  // AI providers (Phase F)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Stripe billing (Phase G)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_STARTER: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),

  // Mercado Pago billing — AR domestic (Phase G)
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_PUBLIC_KEY: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),

  // AFIP electronic invoicing — WSAA (Phase G)
  AFIP_CUIT: z.string().optional(),
  AFIP_PRIVATE_KEY: z.string().optional(),
  AFIP_CERTIFICATE: z.string().optional(),
  AFIP_SANDBOX: z.coerce.boolean().default(true),

  // Cloudflare custom domain management for tenant websites (Phase G)
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),

  // Email — SMTP transport (Mailhog in dev, SES SMTP in prod)
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('no-reply@corredor.local'),
  APP_URL: z.string().default('https://app.corredor.ar'),

  // Cloudflare R2 — private bucket for PDF storage (Phase G)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('corredor-appraisals'),
  R2_PUBLIC_URL: z.string().optional(),
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
