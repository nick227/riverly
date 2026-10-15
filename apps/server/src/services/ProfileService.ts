import { db, type Recognition, type RecognitionType } from '@project/db'
import { appendActivity, transaction } from '../lib/activity'
import { assertActiveMember } from '../lib/access'
import { requireOrg, type AuthContext } from '../lib/context'
import { conflict, notFound, unprocessable } from '../lib/errors'
import { rateLimit } from '../lib/rateLimit'
import { opportunitySummary, opportunitySummaryInclude, userSummary, usersById } from '../lib/serialize'
import { hydrate } from './ActivityService'
import { AuthService } from './AuthService'

// Profile highlights are a filtered projection of Activity — never a second source of truth.
const HIGHLIGHT_TYPES = ['post.created', 'recognition.given', 'stage.changed', 'appointment.completed', 'review.requested']

export class ProfileService {
  /** Internal-only: visible to members of the viewer's active company where the person is a member. */
  async get(auth: AuthContext, slug: string) {
    const ctx = requireOrg(auth)
    const user = await db.user.findUnique({ where: { slug } })
    if (!user || user.deletedAt) throw notFound('Profile')
    const membership = await db.membership.findUnique({
      where: { organizationId_userId: { organizationId: ctx.orgId, userId: user.id } },
    })
    if (!membership) throw notFound('Profile')
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [openJobs, completedTransitions, attempts, recognitions, assigned, events] = await Promise.all([
      db.opportunity.count({ where: { organizationId: ctx.orgId, ownerId: user.id, deletedAt: null, status: { in: ['OPEN', 'WON'] } } }),
      lastStageCompletions(ctx.orgId, user.id),
      db.activityEvent.count({ where: { organizationId: ctx.orgId, actorId: user.id, type: 'contact.attempt', occurredAt: { gte: since30 } } }),
      db.recognition.findMany({
        where: { organizationId: ctx.orgId, recipientUserId: user.id, revokedAt: null },
        include: { type: true },
        orderBy: { createdAt: 'desc' },
        take: 24,
      }),
      db.opportunity.findMany({
        where: { organizationId: ctx.orgId, ownerId: user.id, deletedAt: null, status: { in: ['OPEN', 'WON'] } },
        include: opportunitySummaryInclude,
        orderBy: { lastActivityAt: 'desc' },
        take: 8,
      }),
      db.activityEvent.findMany({
        where: {
          organizationId: ctx.orgId,
          type: { in: HIGHLIGHT_TYPES },
          OR: [{ actorId: user.id }, { recognitionId: { in: (await recognitionIdsFor(ctx.orgId, user.id)) } }],
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 12,
      }),
    ])
    const recMap = await recognitionsOut(recognitions)
    return {
      user: userSummary(user)!,
      bio: user.bio,
      role: membership.role,
      memberSince: membership.createdAt,
      isSelf: user.id === ctx.userId,
      stats: {
        openJobs,
        jobsCompleted: completedTransitions,
        contactAttempts30d: attempts,
        recognitionCount: recognitions.length,
      },
      recognitions: recognitions.map((r) => recMap.get(r.id)!),
      assignedJobs: assigned.map(opportunitySummary),
      highlights: await hydrate(events, ctx.userId),
    }
  }

  async updateMine(
    auth: AuthContext,
    input: { displayName?: string; slug?: string; title?: string | null; bio?: string | null; avatarUrl?: string | null },
  ) {
    if (input.slug) {
      const taken = await db.user.findUnique({ where: { slug: input.slug } })
      if (taken && taken.id !== auth.userId) throw conflict('That profile URL is taken', 'slug_taken')
    }
    if (input.avatarUrl && !/^https?:\/\//.test(input.avatarUrl)) throw unprocessable('Avatar must be an http(s) URL')
    await db.user.update({
      where: { id: auth.userId },
      data: {
        displayName: input.displayName?.trim(),
        slug: input.slug,
        title: input.title === undefined ? undefined : input.title?.trim() || null,
        bio: input.bio === undefined ? undefined : input.bio?.trim() || null,
        avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl || null,
      },
    })
    return new AuthService().me(auth.userId, auth.orgId)
  }

  async recognitionTypes(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const rows = await db.recognitionType.findMany({ where: { organizationId: ctx.orgId, isEnabled: true }, orderBy: { createdAt: 'asc' } })
    return rows.map(typeOut)
  }

  async give(auth: AuthContext, input: { recipientUserId: string; typeId: string; note?: string | null }) {
    const ctx = requireOrg(auth)
    if (input.recipientUserId === ctx.userId) throw unprocessable('Recognize a teammate, not yourself')
    await assertActiveMember(ctx.orgId, input.recipientUserId)
    const type = await db.recognitionType.findFirst({ where: { id: input.typeId, organizationId: ctx.orgId, isEnabled: true } })
    if (!type) throw unprocessable('Unknown sticker')
    await rateLimit(`recognition:${ctx.userId}`, 20, 24 * 60 * 60)
    const rec = await transaction(async (tx) => {
      const r = await tx.recognition.create({
        data: { organizationId: ctx.orgId, recipientUserId: input.recipientUserId, giverUserId: ctx.userId, typeId: type.id, note: input.note?.trim() || null, createdAt: new Date() },
        include: { type: true },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'recognition.given',
        category: 'TEAM',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        recognitionId: r.id,
        note: r.note,
      })
      return r
    })
    return (await recognitionsOut([rec])).get(rec.id)!
  }
}

async function recognitionIdsFor(orgId: string, userId: string) {
  const rows = await db.recognition.findMany({ where: { organizationId: orgId, recipientUserId: userId }, select: { id: true }, take: 50 })
  return rows.map((r) => r.id)
}

/** Jobs this person owned that reached the final active stage (stable IDs, not labels). */
async function lastStageCompletions(orgId: string, userId: string) {
  const version = await db.workflowVersion.findFirst({ where: { organizationId: orgId }, orderBy: { version: 'desc' } })
  const stages = ((version?.definition as { stages?: { id: string; order: number; retired?: boolean }[] })?.stages ?? [])
    .filter((s) => !s.retired)
    .sort((a, b) => a.order - b.order)
  const last = stages[stages.length - 1]
  if (!last) return 0
  return db.opportunity.count({ where: { organizationId: orgId, ownerId: userId, deletedAt: null, stageId: last.id } })
}

export async function recognitionsOut(rows: (Recognition & { type: RecognitionType })[]) {
  const people = await usersById(rows.flatMap((r) => [r.giverUserId, r.recipientUserId]))
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        type: typeOut(r.type),
        giver: userSummary(people.get(r.giverUserId))!,
        recipient: userSummary(people.get(r.recipientUserId))!,
        note: r.note,
        createdAt: r.createdAt,
      },
    ]),
  )
}

function typeOut(t: RecognitionType) {
  return { id: t.id, key: t.key, label: t.label, emoji: t.emoji }
}
