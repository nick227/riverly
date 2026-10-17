import type { Prisma } from '@project/db'
import { ROOFING_TEMPLATE, STOCK_EMAIL_TEMPLATES } from '@project/shared'
import { config } from '../lib/config'

type Tx = Prisma.TransactionClient

export const DEFAULT_RECOGNITION_TYPES = [
  // ── 5 Cheers (1-click immediate send) ──
  { key: 'cheer_attaboy', label: 'Attaboy!', emoji: '👏' },
  { key: 'cheer_thumbsup', label: 'Thumbs Up', emoji: '👍' },
  { key: 'cheer_highfive', label: 'High Five', emoji: '🙌' },
  { key: 'cheer_crushing_it', label: 'Crushing It', emoji: '🚀' },
  { key: 'cheer_coffee', label: 'Coffee Cheer', emoji: '☕' },

  // ── 8 Gifts (emoticon style gifts / tokens, optional note) ──
  { key: 'clutch', label: 'Clutch save', emoji: '🛟' },
  { key: 'craftsmanship', label: 'Craftsmanship', emoji: '🔨' },
  { key: 'customer_love', label: 'Customer love', emoji: '💬' },
  { key: 'team_player', label: 'Team player', emoji: '🤝' },
  { key: 'gift_lightning', label: 'Lightning fast', emoji: '⚡' },
  { key: 'gift_treat', label: 'Sweet treat', emoji: '🍩' },
  { key: 'gift_star', label: 'Star contributor', emoji: '🌟' },
  { key: 'gift_box', label: 'Special gift', emoji: '🎁' },

  // ── 4 Awards (prestigious / milestone recognitions) ──
  { key: 'award_mvp', label: 'MVP', emoji: '🏆' },
  { key: 'award_gold_standard', label: 'Gold standard', emoji: '🥇' },
  { key: 'award_milestone', label: 'Milestone master', emoji: '🎯' },
  { key: 'award_legend', label: 'Peer legend', emoji: '👑' },
]

/**
 * Everything a new company needs to work on day one: roofing workflow v1 from the platform
 * template, the 13 stock email templates, recognition stickers and the built-in intake
 * sources. Used by company signup and the seed script.
 */
export async function provisionOrganization(tx: Tx, organizationId: string, ownerId: string) {
  await tx.workflowVersion.create({
    data: {
      organizationId,
      templateKey: ROOFING_TEMPLATE.templateKey,
      version: 1,
      definition: ROOFING_TEMPLATE as unknown as Prisma.InputJsonValue,
      publishedById: ownerId,
      changeNote: 'Roofing platform template',
    },
  })
  await tx.emailTemplate.createMany({
    data: STOCK_EMAIL_TEMPLATES.map((t) => ({ organizationId, ...t, updatedById: ownerId })),
  })
  await tx.recognitionType.createMany({
    data: DEFAULT_RECOGNITION_TYPES.map((r) => ({ organizationId, ...r })),
  })
  await tx.source.createMany({
    data: [
      { organizationId, kind: 'MANUAL', displayName: 'Manual entry' },
      { organizationId, kind: 'FORM', displayName: 'Website form' },
    ],
  })
  if (config.devEmailAllowed) {
    await tx.senderIdentity.create({
      data: {
        organizationId,
        provider: 'DEV_LOG',
        fromName: 'Riverly (development)',
        fromEmail: 'dev-outbox@riverly.local',
        verification: 'VERIFIED',
        verifiedAt: new Date(),
        verificationDetail: 'Development mode',
        isDefault: true,
      },
    })
  }
}
