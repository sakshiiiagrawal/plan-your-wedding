import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    FRONTEND_URL: z.string().url().optional(),
    // Guards /api/v1/cron/* — Vercel Cron sends it as a bearer token. Unset
    // means the cron endpoints always 401 (safe default, digest just won't run).
    CRON_SECRET: z.string().optional(),
    // Unset/empty = auto: 'smtp' when SMTP_HOST is set, 'console' otherwise
    EMAIL_PROVIDER: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.enum(['smtp', 'console']).optional(),
    ),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    // WhatsApp Cloud API — all unset disables the feature (endpoints 503)
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_WABA_ID: z.string().optional(),
    // Echoed back to Meta on webhook GET verification
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    // Meta app secret; set to enforce X-Hub-Signature-256 on inbound webhooks
    WHATSAPP_APP_SECRET: z.string().optional(),
  })
  .superRefine((cfg, ctx) => {
    // Every invite/verification/reset email builds its link from FRONTEND_URL;
    // without it those links render relative and dead. Fail fast in production.
    if (cfg.NODE_ENV === 'production' && !cfg.FRONTEND_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['FRONTEND_URL'],
        message: 'FRONTEND_URL is required in production (email links depend on it)',
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
