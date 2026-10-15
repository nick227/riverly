import { can, type Permission, type Role } from '@project/shared'
import { forbidden } from './errors'

// Resolved by the bearerAuth security handler for every private route.
export type AuthContext = {
  userId: string
  sessionId: string
  orgId: string | null
  role: Role | null
}

export type OrgContext = AuthContext & { orgId: string; role: Role }

export function requireOrg(ctx: AuthContext): OrgContext {
  if (!ctx.orgId || !ctx.role) throw forbidden('You are not an active member of a company')
  return ctx as OrgContext
}

export function requirePermission(ctx: AuthContext, permission: Permission): OrgContext {
  const org = requireOrg(ctx)
  if (!can(org.role, permission)) throw forbidden()
  return org
}

export function hasPermission(ctx: OrgContext, permission: Permission) {
  return can(ctx.role, permission)
}
