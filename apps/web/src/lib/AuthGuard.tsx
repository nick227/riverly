import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '@project/sdk'
import { PageState } from '@/components/patterns/States'

export function AuthGuard() {
  const { data, isLoading } = useCurrentUser()
  const location = useLocation()
  if (isLoading) return <PageState />
  if (!data?.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
