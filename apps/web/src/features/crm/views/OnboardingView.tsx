import { Navigate } from 'react-router-dom'

/**
 * Onboarding and Settings - Company are unified on `/settings/company`.
 * Redirect any direct visits to `/settings/company`.
 */
export default function OnboardingView() {
  return <Navigate to="/settings/company" replace />
}
