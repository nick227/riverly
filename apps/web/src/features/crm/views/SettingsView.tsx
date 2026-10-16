import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { Permission } from '@project/shared/permissions'
import { cx } from '@/lib/cx'
import { useSession } from '@/lib/session'
import { CompanySettings } from './settings/CompanySettings'
import { TeamSettings } from './settings/TeamSettings'
import { WorkflowSettings } from './settings/WorkflowSettings'
import { EmailSettings } from './settings/EmailSettings'
import { ReportsSettings } from './settings/ReportsSettings'
import { DiagnosticsSettings } from './settings/DiagnosticsSettings'

const SECTIONS: { path: string; label: string; permission: Permission; element: React.ReactNode }[] = [
  { path: 'company', label: 'Company', permission: 'settings.manage', element: <CompanySettings /> },
  { path: 'team', label: 'Team', permission: 'settings.manage', element: <TeamSettings /> },
  { path: 'workflow', label: 'Workflow', permission: 'settings.manage', element: <WorkflowSettings /> },
  { path: 'email', label: 'Email', permission: 'settings.manage', element: <EmailSettings /> },
  { path: 'reports', label: 'Reports', permission: 'reports.view', element: <ReportsSettings /> },
  { path: 'diagnostics', label: 'Diagnostics', permission: 'diagnostics.view', element: <DiagnosticsSettings /> },
]

/** Company configuration and reports. Managers see only the sections their role allows (Reports). */
export default function SettingsView() {
  const { can } = useSession()
  const sections = SECTIONS.filter((s) => can(s.permission))
  return (
    <main className="crm-page">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--1">Settings</h1>
        </div>
      </div>
      <nav className="segmented" aria-label="Settings sections" style={{ marginBottom: 'var(--section-gap)' }}>
        {sections.map((s) => (
          <NavLink key={s.path} to={`/settings/${s.path}`} className={({ isActive }) => cx('segmented__item', isActive && 'is-active')}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to={sections[0]?.path ?? '/contacts'} replace />} />
        {sections.map((s) => (
          <Route key={s.path} path={s.path} element={s.element} />
        ))}
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Routes>
    </main>
  )
}
