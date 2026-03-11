import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().optional(), // Legacy HS256 — not needed if using JWKS (ECC P-256)
  ENCRYPTION_KEY: z.string().min(32, 'A 32+ char key used with pgcrypto to encrypt/decrypt gateway secrets'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  WEB_URL: z.string().default('http://localhost:8001'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@mzadat.om'),
  TZ: z.string().default('Asia/Muscat'),
  // Redis / BullMQ
  REDIS_URL: z.string().default('redis://localhost:6380'),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
