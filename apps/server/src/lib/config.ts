import { z } from 'zod'

const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1'))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  WEB_URL: z.string().default('http://localhost:5173'),
  API_PUBLIC_URL: z.string().default('http://localhost:3001'),
  ALLOW_COMPANY_SIGNUP: bool,
  TRUST_PROXY: bool,
  WORKER_ENABLED: bool,
  WORKER_POLL_MS: z.coerce.number().default(2000),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('.data/uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool,
  UPLOAD_MAX_MB: z.coerce.number().default(25),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_DEV_TRANSPORT: bool,
  DEV_OUTBOX_DIR: z.string().default('.data/outbox'),
  // Production: API mounted under /api and the built web app served from the same origin.
  API_PREFIX: z.string().regex(/^(\/[a-z]+)?$/).default(''),
  SERVE_WEB_DIR: z.string().optional(),
})

// Empty values in .env files mean "not set".
const parsed = schema.safeParse(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')))
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment configuration')
}
const env = parsed.data
const isProd = env.NODE_ENV === 'production'

if (isProd) {
  if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters in production')
  if (!env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required in production')
  if (env.STORAGE_DRIVER !== 's3') throw new Error('STORAGE_DRIVER=s3 is required in production (persistent object storage)')
}

// Railway bucket variables use different names; accept both.
const s3 = {
  endpoint: env.S3_ENDPOINT ?? process.env.ENDPOINT,
  region: env.S3_REGION ?? process.env.REGION ?? 'auto',
  bucket: env.S3_BUCKET ?? process.env.BUCKET,
  accessKeyId: env.S3_ACCESS_KEY_ID ?? process.env.ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? process.env.SECRET_ACCESS_KEY,
  forcePathStyle: env.S3_FORCE_PATH_STYLE ?? false,
}

export const config = {
  ...env,
  isProd,
  isTest: env.NODE_ENV === 'test',
  corsOrigins: env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  allowCompanySignup: env.ALLOW_COMPANY_SIGNUP ?? !isProd,
  trustProxy: env.TRUST_PROXY ?? isProd,
  workerEnabled: env.WORKER_ENABLED ?? env.NODE_ENV !== 'test',
  // The development transport never leaves the machine. It is off in production unless explicitly enabled.
  devEmailAllowed: env.EMAIL_DEV_TRANSPORT ?? !isProd,
  s3,
}
