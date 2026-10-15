import { db } from '@project/db'
import type { Role } from '@project/shared'
import { config } from '../lib/config'
import { requireOrg, requirePermission, type AuthContext } from '../lib/context'
import { randomToken, sha256 } from '../lib/crypto'
import { conflict, forbidden, notFound, unprocessable } from '../lib/errors'
import { organizationOut } from './AuthService'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const privileged = (r: Role) => r === 'OWNER' || r === 'ADMIN'

export class TeamService {
  async getOrganization(auth: AuthContext) {
    const ctx = requireOrg(auth)
    return organizationOut(await db.organization.findUniqueOrThrow({ where: { id: ctx.orgId } }))
  }

  async updateOrganization(
    auth: AuthContext,
    input: { name?: string; timezone?: string; logoUrl?: string | null; reviewUrl?: string | null },
  ) {
    const ctx = requirePermission(auth, 'settings.manage')
    if (input.timezone && !isValidTimezone(input.timezone)) throw unprocessable('Unknown timezone')
    const org = await db.organization.update({ where: { id: ctx.orgId }, data: input })
    return organizationOut(org)
  }

  async listMembers(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const rows = await db.membership.findMany({
      where: { organizationId: ctx.orgId },
      include: { user: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(memberOut)
  }

  async updateMember(auth: AuthContext, userId: string, input: { role?: Role; status?: 'ACTIVE' | 'DEACTIVATED' }) {
    const ctx = requirePermission(auth, 'team.invite')
    if (userId === ctx.userId) throw forbidden('You cannot change your own role or status')
    const m = await db.membership.findUnique({
      where: { organizationId_userId: { organizationId: ctx.orgId, userId } },
      include: { user: true },
    })
    if (!m) throw notFound('Member')
    // Admin grants and anything touching an owner/admin are owner-only (addendum 09).
    const touchesPrivileged = privileged(m.role) || (input.role !== undefined && privileged(input.role))
    if (touchesPrivileged && ctx.role !== 'OWNER') throw forbidden('Only the company owner can change admin or owner access')
    if (m.role === 'OWNER' && (input.role !== 'OWNER' || input.status === 'DEACTIVATED')) {
      const owners = await db.membership.count({
        where: { organizationId: ctx.orgId, role: 'OWNER', status: 'ACTIVE' },
      })
      if (owners <= 1) throw unprocessable('A company must keep at least one active owner')
    }
    const updated = await db.$transaction(async (tx) => {
      const row = await tx.membership.update({ where: { id: m.id }, data: input, include: { user: true } })
      await tx.activityEvent.create({
        data: {
          organizationId: ctx.orgId,
          type: input.status === 'DEACTIVATED' ? 'member.deactivated' : 'member.role_changed',
          category: 'SYSTEM',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          payload: { userId, fromRole: m.role, toRole: row.role, status: row.status },
        },
      })
      return row
    })
    return memberOut(updated)
  }

  async listInvitations(auth: AuthContext) {
    const ctx = requirePermission(auth, 'team.invite')
    const rows = await db.invitation.findMany({ where: { organizationId: ctx.orgId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return rows.map(invitationOut)
  }

  async createInvitation(auth: AuthContext, input: { email: string; role: Role }) {
    const ctx = requirePermission(auth, 'team.invite')
    if (privileged(input.role) && ctx.role !== 'OWNER') throw forbidden('Only the company owner can invite admins or owners')
    const email = input.email.trim().toLowerCase()
    const existingMember = await db.membership.findFirst({
      where: { organizationId: ctx.orgId, status: 'ACTIVE', user: { email } },
    })
    if (existingMember) throw conflict('That person is already a member of this company', 'already_member')
    // One open invitation per email: revoke older ones.
    await db.invitation.updateMany({
      where: { organizationId: ctx.orgId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    const token = randomToken()
    const inv = await db.invitation.create({
      data: {
        organizationId: ctx.orgId,
        email,
        role: input.role,
        tokenHash: sha256(token),
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    })
    return { ...invitationOut(inv), acceptUrl: `${config.WEB_URL}/invite/${token}` }
  }

  async revokeInvitation(auth: AuthContext, id: string) {
    const ctx = requirePermission(auth, 'team.invite')
    const result = await db.invitation.updateMany({
      where: { id, organizationId: ctx.orgId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (result.count === 0) throw notFound('Invitation')
  }
}

function memberOut(m: {
  userId: string
  role: Role
  status: 'ACTIVE' | 'DEACTIVATED'
  createdAt: Date
  user: { displayName: string; slug: string; email: string; avatarUrl: string | null; title: string | null }
}) {
  return {
    userId: m.userId,
    displayName: m.user.displayName,
    slug: m.user.slug,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    title: m.user.title,
    role: m.role,
    status: m.status,
    joinedAt: m.createdAt,
  }
}

function invitationOut(i: {
  id: string
  email: string
  role: Role
  expiresAt: Date
  createdAt: Date
  acceptedAt: Date | null
  revokedAt: Date | null
}) {
  return {
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
    acceptedAt: i.acceptedAt,
    revokedAt: i.revokedAt,
  }
}

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
