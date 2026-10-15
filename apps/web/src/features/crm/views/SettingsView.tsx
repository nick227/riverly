import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { CompanySettings } from './settings/CompanySettings'
import { TeamSettings } from './settings/TeamSettings'
import { WorkflowSettings } from './settings/WorkflowSettings'
import { ResourceSettings } from './settings/ResourceSettings'
import { EmailSettings } from './settings/EmailSettings'
import { IntakeSettings } from './settings/IntakeSettings'
import { DiagnosticsSettings } from './settings/DiagnosticsSettings'

const SECTIONS = [
  ['company', 'Company'],
  ['team', 'Team'],
  ['workflow', 'Workflow'],
  ['resources', 'Resources'],
  ['email', 'Email'],
  ['intake', 'Lead intake'],
  ['diagnostics', 'Diagnostics'],
] as const

/** Company admin configuration: how the application operates (not how work gets done). */
export default function SettingsView() {
  return (
    <main className="crm-page">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--1">Settings</h1>
          <p className="text text--muted">Vocabulary, workflow, team and email — changes never rewrite history.</p>
        </div>
      </div>
      <nav className="segmented" aria-label="Settings sections" style={{ marginBottom: 'var(--section-gap)' }}>
        {SECTIONS.map(([path, label]) => (
          <NavLink key={path} to={`/settings/${path}`} className={({ isActive }) => cx('segmented__item', isActive && 'is-active')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="company" replace />} />
        <Route path="company" element={<CompanySettings />} />
        <Route path="team" element={<TeamSettings />} />
        <Route path="workflow" element={<WorkflowSettings />} />
        <Route path="resources" element={<ResourceSettings />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="intake" element={<IntakeSettings />} />
        <Route path="diagnostics" element={<DiagnosticsSettings />} />
      </Routes>
    </main>
  )
}
