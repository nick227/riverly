// Role matrix (addendum 09). The server enforces it; the web app only uses it to hide
// controls the user cannot use.
export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'

const RANK: Record<Role, number> = { MEMBER: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 }

export const PERMISSIONS = {
  'crm.use': 'MEMBER', // contacts, jobs, activity, templates, posting
  'jobs.assign_any': 'MANAGER',
  'manage.view': 'MANAGER',
  'reports.view': 'MANAGER',
  'intake.review': 'MEMBER',
  'imports.run': 'MANAGER',
  'settings.manage': 'ADMIN', // workflow, fields, resources, email templates, senders, forms
  'team.invite': 'ADMIN',
  'team.grant_admin': 'OWNER',
  'diagnostics.view': 'ADMIN',
} as const satisfies Record<string, Role>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return RANK[role] >= RANK[PERMISSIONS[permission]]
}

export function outranks(a: Role, b: Role) {
  return RANK[a] > RANK[b]
}
