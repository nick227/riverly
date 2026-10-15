import { Prisma } from '@project/db'

export function isUniqueViolation(err: unknown, target?: string) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
  if (!target) return true
  const meta = err.meta?.target
  return Array.isArray(meta) ? meta.some((t) => String(t).includes(target)) : String(meta ?? '').includes(target)
}
