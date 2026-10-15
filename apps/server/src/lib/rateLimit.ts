import { db } from '@project/db'
import { tooMany } from './errors'

// Fixed-window limiter stored in MySQL so it works across instances without Redis.
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + windowSeconds * 1000)
  const count = await db.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } })
    if (!bucket || bucket.windowEnd < now) {
      await tx.rateLimitBucket.upsert({ where: { key }, create: { key, count: 1, windowEnd }, update: { count: 1, windowEnd } })
      return 1
    }
    const updated = await tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } })
    return updated.count
  })
  if (count > limit) throw tooMany()
}
