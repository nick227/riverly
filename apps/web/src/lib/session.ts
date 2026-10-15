import { can, type Permission } from '@project/shared/permissions'
import { useCurrentUser } from '@project/sdk'

/** Current user + role helpers. Hiding controls is convenience; the API enforces permissions. */
export function useSession() {
  const { data } = useCurrentUser()
  const me = data?.data ?? null
  return {
    me,
    org: me?.organization ?? null,
    role: me?.role ?? null,
    can: (p: Permission) => can(me?.role ?? null, p),
  }
}
