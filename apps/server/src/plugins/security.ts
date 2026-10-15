import { db } from '@project/db'
import type { FastifyRequest } from 'fastify'
import { sha256 } from '../lib/crypto'
import { unauthorized } from '../lib/errors'
import type { AuthContext } from '../lib/context'

const TOUCH_INTERVAL_MS = 5 * 60 * 1000

/**
 * Resolves the session (httpOnly cookie first, Bearer header for native clients) and the
 * caller's role in the session's active company. Membership is re-checked on every
 * request, so deactivating a member takes effect immediately.
 */
export async function bearerAuth(request: FastifyRequest) {
  const token = request.cookies?.token ?? request.headers.authorization?.replace(/^Bearer /, '')
  if (!token) throw unauthorized()
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } })
  if (!session || session.expiresAt < new Date() || session.user.deletedAt) throw unauthorized('Your session has expired')

  let orgId = session.activeOrganizationId
  let membership = orgId
    ? await db.membership.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId: session.userId } } })
    : null
  if (!membership || membership.status !== 'ACTIVE') {
    // Fall back to another active company (or none) rather than trusting a stale selection.
    membership = await db.membership.findFirst({ where: { userId: session.userId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } })
    orgId = membership?.organizationId ?? null
    await db.session.update({ where: { id: session.id }, data: { activeOrganizationId: orgId } })
  }
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
  }
  const ctx: AuthContext = { userId: session.userId, sessionId: session.id, orgId, role: membership?.role ?? null }
  ;(request as FastifyRequest & { ctx: AuthContext }).ctx = ctx
}
