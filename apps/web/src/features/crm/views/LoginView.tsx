import { Navigate, useLocation } from 'react-router-dom'
import { useCurrentUser } from '@project/sdk'
import { usePageTitle } from '@/lib/pageTitle'
import { AuthFrame } from '../components/AuthFrame'
import { AuthCard } from '../components/AuthCard'

export function LoginView() {
  const me = useCurrentUser()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  usePageTitle({
    pageName: 'Sign In',
    context: 'Sales-First CRM Platform',
    description: 'Sign in to your Riverly CRM workspace. Access real-time pipeline, team tasks, and customer timelines.',
  })

  if (me.data?.data) return <Navigate to={from} replace />

  return (
    <AuthFrame title="Sign In" subtitle="Riverly — The Sales-First CRM Platform">
      <AuthCard initialTab="login" />
    </AuthFrame>
  )
}
