import { db } from '@project/db'
import bcrypt from 'bcryptjs'
import { config } from '../lib/config'
import { randomToken, sha256 } from '../lib/crypto'
import { conflict, forbidden, notFound, unauthorized, unprocessable } from '../lib/errors'
import { rateLimit } from '../lib/rateLimit'
import type { AuthContext } from '../lib/context'
import { provisionOrganization } from './provisioning'
import { uniqueOrgSlug, uniqueSlug } from './slug'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const INVITE_MIN_PASSWORD = 10
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12)

export class AuthService {
  async login(input: { email: string; password: string }, ip: string) {
    const email = input.email.trim().toLowerCase()
    await rateLimit(`login:${ip}:${email}`, 10, 15 * 60)
    const user = await db.user.findUnique({ where: { email } })
    // Compare against a dummy hash when the user is unknown so timing does not reveal accounts.
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !ok || user.deletedAt) throw unauthorized('Email or password is incorrect')
    const membership = await db.membership.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    })
    const token = await this.createSession(user.id, membership?.organizationId ?? null)
    return { token, me: await this.me(user.id, membership?.organizationId ?? null) }
  }

  async logout(token: string | undefined) {
    if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } })
  }

  async createSession(userId: string, organizationId: string | null) {
    const token = randomToken()
    await db.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        activeOrganizationId: organizationId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    })
    return token
  }

  async me(userId: string, organizationId: string | null) {
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: { where: { status: 'ACTIVE' }, include: { organization: true }, orderBy: { createdAt: 'asc' } },
        platformRoles: { where: { revokedAt: null } },
      },
    })
    const active = user.memberships.find((m) => m.organizationId === organizationId) ?? null
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      slug: user.slug,
      avatarUrl: user.avatarUrl,
      title: user.title,
      bio: user.bio,
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      })),
      organization: active ? organizationOut(active.organization) : null,
      role: active?.role ?? null,
      platformRoles: user.platformRoles.map((p) => p.role),
    }
  }

  async switchOrganization(ctx: AuthContext, organizationId: string) {
    const m = await db.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId: ctx.userId } },
    })
    if (!m || m.status !== 'ACTIVE') throw forbidden('You are not a member of that company')
    await db.session.update({ where: { id: ctx.sessionId }, data: { activeOrganizationId: organizationId } })
    return this.me(ctx.userId, organizationId)
  }

  // Licensed company onboarding. Staff never create companies by being members.
  async createCompany(
    input: { companyName: string; timezone?: string; displayName: string; email: string; password: string },
    ip: string,
  ) {
    if (!config.allowCompanySignup) throw forbidden('Company signup is not enabled')
    await rateLimit(`signup:${ip}`, 5, 60 * 60)
    const email = input.email.trim().toLowerCase()
    if (await db.user.findUnique({ where: { email } }))
      throw conflict('An account with that email already exists. Sign in and ask for an invitation.', 'email_taken')
    const passwordHash = await bcrypt.hash(input.password, 12)
    const { orgId, userId } = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, displayName: input.displayName.trim(), slug: await uniqueSlug(tx, input.displayName) },
      })
      const org = await tx.organization.create({
        data: {
          name: input.companyName.trim(),
          slug: await uniqueOrgSlug(tx, input.companyName),
          timezone: input.timezone || 'America/Denver',
        },
      })
      await tx.membership.create({ data: { organizationId: org.id, userId: user.id, role: 'OWNER' } })
      await provisionOrganization(tx, org.id, user.id)
      return { orgId: org.id, userId: user.id }
    })
    const token = await this.createSession(userId, orgId)
    return { token, me: await this.me(userId, orgId) }
  }

  async previewInvitation(token: string) {
    const inv = await this.findOpenInvitation(token)
    const existing = await db.user.findUnique({ where: { email: inv.email } })
    return {
      organizationName: inv.organization.name,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      hasAccount: !!existing,
    }
  }

  async acceptInvitation(token: string, input: { displayName?: string; password: string }, ip: string) {
    await rateLimit(`invite:${ip}`, 20, 15 * 60)
    const inv = await this.findOpenInvitation(token)
    let user = await db.user.findUnique({ where: { email: inv.email } })
    if (user) {
      // Existing global account: prove ownership with its password.
      if (!(await bcrypt.compare(input.password, user.passwordHash))) throw unauthorized('Password is incorrect for this account')
    } else {
      if (input.password.length < INVITE_MIN_PASSWORD)
        throw unprocessable(`Choose a password of at least ${INVITE_MIN_PASSWORD} characters`)
      if (!input.displayName?.trim()) throw unprocessable('Your name is required')
      const passwordHash = await bcrypt.hash(input.password, 12)
      user = await db.$transaction(async (tx) =>
        tx.user.create({
          data: {
            email: inv.email,
            passwordHash,
            displayName: input.displayName!.trim(),
            slug: await uniqueSlug(tx, input.displayName!),
          },
        }),
      )
    }
    const userId = user.id
    await db.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: { organizationId_userId: { organizationId: inv.organizationId, userId } },
        create: { organizationId: inv.organizationId, userId, role: inv.role },
        update: { role: inv.role, status: 'ACTIVE' },
      })
      await tx.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date(), acceptedById: userId } })
      await tx.activityEvent.create({
        data: {
          organizationId: inv.organizationId,
          type: 'member.joined',
          category: 'TEAM',
          actorType: 'USER',
          actorId: userId,
          verification: 'SYSTEM_RECORDED',
          payload: { role: inv.role },
        },
      })
    })
    const sessionToken = await this.createSession(userId, inv.organizationId)
    return { token: sessionToken, me: await this.me(userId, inv.organizationId) }
  }

  private async findOpenInvitation(token: string) {
    const inv = await db.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { organization: true } })
    if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date()) throw notFound('Invitation')
    return inv
  }
}

export function organizationOut(o: {
  id: string
  name: string
  slug: string
  timezone: string
  logoUrl: string | null
  reviewUrl: string | null
}) {
  return { id: o.id, name: o.name, slug: o.slug, timezone: o.timezone, logoUrl: o.logoUrl, reviewUrl: o.reviewUrl }
}
