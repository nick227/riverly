import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { config } from './config'

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

export function hmac(value: string) {
  return createHmac('sha256', config.SESSION_SECRET).update(value).digest('base64url')
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

// AES-256-GCM for company-owned provider credentials. ENCRYPTION_KEY is required in production;
// development derives a key from SESSION_SECRET so local setup needs no extra secret.
function key() {
  const raw = config.ENCRYPTION_KEY
  if (raw) {
    const buf = Buffer.from(raw, 'base64')
    if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded')
    return buf
  }
  return createHash('sha256').update(`dev-encryption:${config.SESSION_SECRET}`).digest()
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.')
}

export function decryptSecret(payload: string) {
  const [v, iv, tag, data] = payload.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unrecognized secret format')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}
