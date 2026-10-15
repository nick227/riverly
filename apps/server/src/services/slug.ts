import type { Prisma } from '@project/db'
import { randomToken } from '../lib/crypto'

// Profile slugs are one global namespace (users are global identities).
export async function uniqueSlug(tx: Prisma.TransactionClient, name: string, exceptUserId?: string) {
  const base = slugify(name) || 'member'
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const taken = await tx.user.findUnique({ where: { slug: candidate } })
    if (!taken || taken.id === exceptUserId) return candidate
  }
  return `${base}-${randomToken(4).toLowerCase()}`
}

// Company slugs are their own namespace.
export async function uniqueOrgSlug(tx: { organization: { findUnique: Function } }, name: string) {
  const base = slugify(name) || 'company'
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    if (!(await tx.organization.findUnique({ where: { slug: candidate } }))) return candidate
  }
  return `${base}-${randomToken(4).toLowerCase()}`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
