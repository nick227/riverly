import { createReadStream } from 'fs'
import { mkdir, stat, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../lib/config'
import { hmac, safeEqual } from '../lib/crypto'

// Relative paths in env resolve from the repository root regardless of the process cwd.
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

const SIGNED_URL_TTL_SECONDS = 15 * 60

export interface StorageDriver {
  readonly kind: 'local' | 's3'
  put(key: string, body: Buffer, mimeType: string): Promise<void>
  signedUrl(key: string, attachmentId: string, fileName: string): Promise<string>
}

// Development: files on disk; downloads go through GET /files/{id} with an HMAC signature
// that expires, so URLs behave like the production presigned URLs.
class LocalStorage implements StorageDriver {
  readonly kind = 'local' as const
  private root = resolve(REPO_ROOT, config.STORAGE_LOCAL_DIR)

  path(key: string) {
    const p = resolve(this.root, key)
    if (!p.startsWith(this.root)) throw new Error('Invalid storage key')
    return p
  }

  async put(key: string, body: Buffer) {
    const p = this.path(key)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, body)
  }

  async signedUrl(_key: string, attachmentId: string) {
    const expires = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS
    return `${config.API_PUBLIC_URL}/files/${attachmentId}?expires=${expires}&signature=${signFile(attachmentId, expires)}`
  }

  async open(key: string) {
    const p = this.path(key)
    await stat(p)
    return createReadStream(p)
  }
}

// Deployed: any S3-compatible bucket (Railway buckets, R2, S3). Objects are private;
// clients only ever receive short-lived presigned GET URLs.
class S3Storage implements StorageDriver {
  readonly kind = 's3' as const
  private client = new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    forcePathStyle: config.s3.forcePathStyle,
    credentials:
      config.s3.accessKeyId && config.s3.secretAccessKey
        ? { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey }
        : undefined,
  })
  private bucket = (() => {
    if (!config.s3.bucket) throw new Error('S3 bucket is not configured (S3_BUCKET / BUCKET)')
    return config.s3.bucket
  })()

  async put(key: string, body: Buffer, mimeType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mimeType }))
  }

  async signedUrl(key: string, _attachmentId: string, fileName: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `inline; filename="${fileName.replace(/["\\\r\n]/g, '_')}"`,
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    )
  }
}

function signFile(attachmentId: string, expires: number) {
  return hmac(`file:${attachmentId}:${expires}`)
}

export function verifyFileSignature(attachmentId: string, expires: number, signature: string) {
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false
  return safeEqual(signFile(attachmentId, expires), signature)
}

let driver: StorageDriver | null = null
export function storage(): StorageDriver {
  driver ??= config.STORAGE_DRIVER === 's3' ? new S3Storage() : new LocalStorage()
  return driver
}

export function localStorageDriver() {
  const d = storage()
  return d instanceof LocalStorage ? d : null
}
