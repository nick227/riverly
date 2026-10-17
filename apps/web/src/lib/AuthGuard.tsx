import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '@project/sdk'
import { LoadingScreen } from '@/components/patterns/LoadingScreen'

/** Signed-out visitors go to sign in, or see `guest` instead when one is given (the front page). */
export function AuthGuard({ guest }: { guest?: ReactNode } = {}) {
  const { data, isLoading, errorUpdateCount } = useCurrentUser()
  const location = useLocation()
  // Only the first check shows a spinner. A signed-out visitor's 401 is refetched whenever another
  // component subscribes; flipping back to the spinner would unmount the guest page and loop.
  if (isLoading && errorUpdateCount === 0) return <LoadingScreen />
  if (!data?.data && guest) return <>{guest}</>
  if (!data?.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
