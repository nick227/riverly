import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Permission } from '@project/shared/permissions'
import { cx } from '@/lib/cx'
import { usePageTitle } from '@/lib/pageTitle'
import { useSession } from '@/lib/session'
import { CompanySettings } from './settings/CompanySettings'
import { TeamSettings } from './settings/TeamSettings'
import { WorkflowSettings } from './settings/WorkflowSettings'
import { EmailSettings } from './settings/EmailSettings'
import { IntegrationsSettings } from './settings/IntegrationsSettings'
import { ReportsSettings } from './settings/ReportsSettings'
import { DiagnosticsSettings } from './settings/DiagnosticsSettings'
import { BillingSettings } from './settings/BillingSettings'

interface SettingsSection {
  path: string
  label: string
  permission: Permission
  Component: React.ComponentType
}

const SECTIONS: SettingsSection[] = [
  { path: 'company', label: 'Company', permission: 'settings.manage', Component: CompanySettings },
  { path: 'billing', label: 'Billing & Plan', permission: 'settings.manage', Component: BillingSettings },
  { path: 'team', label: 'Team', permission: 'settings.manage', Component: TeamSettings },
  { path: 'workflow', label: 'Workflow', permission: 'settings.manage', Component: WorkflowSettings },
  { path: 'email', label: 'Email', permission: 'settings.manage', Component: EmailSettings },
  { path: 'integrations', label: 'Integrations', permission: 'settings.manage', Component: IntegrationsSettings },
  { path: 'reports', label: 'Reports', permission: 'reports.view', Component: ReportsSettings },
  { path: 'diagnostics', label: 'Diagnostics', permission: 'diagnostics.view', Component: DiagnosticsSettings },
]

/** Company configuration and reports. Managers see only the sections their role allows (Reports). */
export default function SettingsView() {
  const { can } = useSession()
  const location = useLocation()
  const sections = SECTIONS.filter((s) => can(s.permission))
  const activeSection = SECTIONS.find((s) => location.pathname.includes(`/settings/${s.path}`))
  const sectionLabel = activeSection ? `${activeSection.label} Settings` : 'Company Settings'

  usePageTitle(
    {
      pageName: sectionLabel,
      context: 'Administration',
      description: 'Configure company profile, roofing workflow stages, email templates, integrations, and reports in Riverly CRM.',
    },
    [sectionLabel],
  )
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
        {sections.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Routes>
    </main>
  )
}
