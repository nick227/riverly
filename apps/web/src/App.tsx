import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthGuard } from './lib/AuthGuard'
import { ErrorBoundary } from './lib/ErrorBoundary'
import { useSession } from './lib/session'
import { SubscriptionProvider } from './lib/subscription'
import { PageState } from './components/patterns/States'
import { AppHeader } from './features/crm/components/AppHeader'
import { LandingView } from './features/crm/views/LandingView'
import { PageTitleManager } from './lib/pageTitle'
import { UpgradeModal } from './features/billing/UpgradeModal'

const HomeView = lazy(() => import('./features/crm/views/HomeView'))
const OnboardingView = lazy(() => import('./features/crm/views/OnboardingView'))
const DocumentView = lazy(() => import('./features/crm/views/DocumentView'))
const ContactsView = lazy(() => import('./features/crm/views/ContactsView'))
const ContactView = lazy(() => import('./features/crm/views/ContactView'))
const JobView = lazy(() => import('./features/crm/views/JobView'))
const ActivityView = lazy(() => import('./features/crm/views/ActivityView'))
const ProfileView = lazy(() => import('./features/crm/views/ProfileView'))
const SettingsView = lazy(() => import('./features/crm/views/SettingsView'))
const ReviewView = lazy(() => import('./features/crm/views/ReviewView'))
const InviteView = lazy(() => import('./features/crm/views/InviteView'))
const PublicFormView = lazy(() => import('./features/crm/views/PublicFormView'))

function Shell() {
  const location = useLocation()
  return (
    <>
      <AppHeader />
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<PageState />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

/** Route-level convenience gate; the API enforces the same permission on every call. */
function Gate({ permission, children }: { permission: Parameters<ReturnType<typeof useSession>['can']>[0]; children: ReactNode }) {
  const { can } = useSession()
  return can(permission) ? <>{children}</> : <Navigate to="/contacts" replace />
}

export function App() {
  return (
    <BrowserRouter>
      <SubscriptionProvider>
        <PageTitleManager />
        <UpgradeModal />
        <Suspense fallback={<PageState />}>
          <Routes>
            <Route path="/login" element={<Navigate to="/#signin" replace />} />
            <Route path="/signup" element={<Navigate to="/#auth" replace />} />
            <Route path="/invite/:token" element={<InviteView />} />
            <Route path="/f/:token" element={<PublicFormView />} />
            <Route path="/" element={<AuthGuard guest={<LandingView />} />}>
              <Route element={<Shell />}>
                <Route index element={<HomeView />} />
              </Route>
            </Route>
            <Route element={<AuthGuard />}>
              <Route element={<Shell />}>
                <Route path="/onboarding" element={<Navigate to="/settings/company" replace />} />
                <Route path="/docs/:docId" element={<DocumentView />} />
                <Route path="/contacts" element={<ContactsView />} />
                <Route path="/contacts/review" element={<ReviewView />} />
                <Route path="/contacts/:contactId" element={<ContactView />} />
                <Route path="/jobs/:jobId" element={<JobView />} />
                <Route path="/activity" element={<ActivityView />} />
                <Route path="/u/:slug" element={<ProfileView />} />
                <Route path="/manage/*" element={<Navigate to="/activity" replace />} />
                <Route path="/settings/*" element={<Gate permission="reports.view"><SettingsView /></Gate>} />
                <Route path="*" element={<Navigate to="/contacts" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </SubscriptionProvider>
    </BrowserRouter>
  )
}
