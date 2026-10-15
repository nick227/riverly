import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthGuard } from './lib/AuthGuard'
import { ErrorBoundary } from './lib/ErrorBoundary'
import { useSession } from './lib/session'
import { PageState } from './components/patterns/States'
import { AppHeader } from './features/crm/components/AppHeader'
import { LoginView } from './features/crm/views/LoginView'

const ContactsView = lazy(() => import('./features/crm/views/ContactsView'))
const ContactView = lazy(() => import('./features/crm/views/ContactView'))
const JobView = lazy(() => import('./features/crm/views/JobView'))
const ActivityView = lazy(() => import('./features/crm/views/ActivityView'))
const ProfileView = lazy(() => import('./features/crm/views/ProfileView'))
const SettingsView = lazy(() => import('./features/crm/views/SettingsView'))
const ReviewView = lazy(() => import('./features/crm/views/ReviewView'))
const SignupView = lazy(() => import('./features/crm/views/SignupView'))
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
      <Suspense fallback={<PageState />}>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/signup" element={<SignupView />} />
          <Route path="/invite/:token" element={<InviteView />} />
          <Route path="/f/:token" element={<PublicFormView />} />
          <Route element={<AuthGuard />}>
            <Route element={<Shell />}>
              <Route index element={<Navigate to="/contacts" replace />} />
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
    </BrowserRouter>
  )
}
