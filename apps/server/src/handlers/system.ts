import { db } from '@project/db'
import type { Rep, Req } from './_shared'

export async function getHealth(_request: Req, reply: Rep) {
  try {
    await db.$queryRaw`SELECT 1`
    return reply.send({ status: 'ok', database: 'ok', version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev' })
  } catch {
    return reply.status(503).send({ status: 'degraded', database: 'unavailable' })
  }
}
