import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '@project/sdk'
import { usePageTitle } from '@/lib/pageTitle'
import { AuthFrame } from '../components/AuthFrame'
import { AuthCard } from '../components/AuthCard'

/** Licensed company onboarding: creates the company, its owner and workflow. */
export default function SignupView() {
  const me = useCurrentUser()

  usePageTitle({
    pageName: 'Create Workspace',
    context: 'Sales-First CRM Platform',
    description: 'Deploy your Riverly CRM workspace. Standardize sales pipelines, automate customer communications, and scale operations.',
  })

  if (me.data?.data) return <Navigate to="/" replace />

  return (
    <AuthFrame title="Create Company" subtitle="Deploy your dedicated sales & operations command center.">
      <AuthCard initialTab="signup" />
    </AuthFrame>
  )
}
