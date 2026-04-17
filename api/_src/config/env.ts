import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().url().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
