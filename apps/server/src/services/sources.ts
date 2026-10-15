import type { Prisma, SourceKind } from '@project/db'

export async function ensureSource(tx: Prisma.TransactionClient, organizationId: string, kind: SourceKind, displayName: string) {
  return tx.source.upsert({
    where: { organizationId_kind_displayName: { organizationId, kind, displayName } },
    create: { organizationId, kind, displayName },
    update: {},
  })
}
