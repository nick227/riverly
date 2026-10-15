import type { Prisma } from '@project/db'
import { ROOFING_TEMPLATE, STOCK_EMAIL_TEMPLATES } from '@project/shared'
import { config } from '../lib/config'

type Tx = Prisma.TransactionClient

export const DEFAULT_RECOGNITION_TYPES = [
  { key: 'thank_you', label: 'Thank you', emoji: '🙏' },
  { key: 'clutch', label: 'Clutch save', emoji: '🛟' },
  { key: 'customer_love', label: 'Customer love', emoji: '💬' },
  { key: 'craftsmanship', label: 'Craftsmanship', emoji: '🔨' },
  { key: 'team_player', label: 'Team player', emoji: '🤝' },
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
        verificationDetail: 'Development transport — messages are written to the local outbox and never leave this machine.',
        isDefault: true,
      },
    })
  }
}
