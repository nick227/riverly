import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass, Sparkles, Zap } from 'lucide-react'
import { useCompanyHome, useOrganization, type CompanyHome, type HomeTask } from '@project/sdk'
import { Skeleton } from '@/components/patterns/States'
import { Badge } from '@/components/patterns/Badge'
import { usePageTitle } from '@/lib/pageTitle'
import { useSession } from '@/lib/session'
import { useSubscription } from '@/lib/subscription'
import { COMPANY_DOCS, docDate } from '../config/companyDocs'
import { useWorkflowView } from '../config/workflow'
import { ExecutiveOverview } from '../components/ExecutiveOverview'

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "2 days ago", "in 3 hours", "yesterday": spelled out, never abbreviated. */
function spokenTime(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diff)
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  return rtf.format(Math.round(diff / 86_400_000), 'day')
}

const visitTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const TASK: Record<HomeTask['kind'], { label: string; when: (at: string) => string }> = {
  follow_up: { label: 'Follow-up call', when: (at) => `Due ${spokenTime(at)}` },
  first_call: { label: 'First call', when: (at) => `Lead came in ${spokenTime(at)}` },
  visit: { label: 'Visit', when: (at) => visitTime(at) },
  quiet: { label: 'Check in', when: (at) => `Last contact ${spokenTime(at)}` },
}

function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function HomeView() {
  const { me, org } = useSession()
  const { view } = useWorkflowView()
  const company = useOrganization()
  const q = useCompanyHome()
  const { isPremium, openUpgradeModal } = useSubscription()
  const hasCompletedOnboarding = typeof window !== 'undefined' && me?.id ? localStorage.getItem(`riverly_onboarding_completed_${me.id}`) === 'true' : false

  usePageTitle({
    pageName: 'Home',
    context: 'Dashboard',
    companyName: company.data?.name || org?.name,
    description: 'Your tasks, the team pipeline and company documents.',
  })

  if (!me || !view) return null
  const name = company.data?.name ?? org?.name ?? 'Company'
  const d = q.data

  return (
    <main className="crm-home">
      <header className="row row--between row--wrap gap-4 items-center">
        <div className="crm-home__masthead">
          <BrandMark name={name} logoUrl={company.data?.logoUrl ?? null} />
          <div className="crm-home__brand">
            <span className="crm-home__brand-name">{name}</span>
          </div>
        </div>
      </header>

      <div className="crm-home__welcome">
        {!hasCompletedOnboarding && (
          <div className="row row--between items-center p-3 mb-4" style={{ background: 'var(--color-surface-subtle)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <div className="row gap-3 items-center">
              <div style={{ width: 'var(--control-height)', height: 'var(--control-height)', borderRadius: 'var(--radius-full)', background: 'var(--brand-river-soft)', color: 'var(--brand-river)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={18} />
              </div>
              <div>
                <strong className="text--sm block">Setup Your Workspace</strong>
              </div>
            </div>
            <Link to="/settings/company" className="button button--primary button--sm row gap-1 items-center">
              <span>Start Onboarding</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        <p className="crm-home__date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <h1 className="crm-home__hello">
          {greeting()}, {me.displayName.split(' ')[0]}.
        </h1>
        {d ? <p className="crm-home__lede">{summary(d.tasks.length)}</p> : null}

        <Section title="Your tasks">
          {d ? <Tasks tasks={d.tasks} waiting={d.waiting} /> : <Skeleton height={220} />}
        </Section>
      </div>

      <ExecutiveOverview companyHome={d} name={name} view={view} />
      
    </main>
  )
}

function summary(n: number) {
  if (!n) return ''
  return `You have ${n} ${n === 1 ? 'task' : 'tasks'} waiting. Start at the top: homeowners who wait for a call often hire someone else.`
}

/** The company logo, or a monogram when none is set. */
function BrandMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) return <img className="crm-home__logo" src={logoUrl} alt={`${name} logo`} />
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return (
    <span className="crm-home__logo crm-home__logo--mark" aria-hidden>
      {letters}
    </span>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="crm-home__section" aria-label={title}>
      <h2 className="crm-home__heading">{title}</h2>
      {children}
    </section>
  )
}

function Tasks({ tasks, waiting }: { tasks: HomeTask[]; waiting: CompanyHome['waiting'] }) {
  return (
    <>
      {tasks.length ? (
        <ol className="crm-home__tasks">
          {tasks.map((t) => (
            <li key={`${t.kind}-${t.opportunityId}`}>
              <Link to={`/jobs/${t.opportunityId}`} className="crm-home__task">
                <span className="crm-home__task-kind">{TASK[t.kind].label}</span>
                <span className="crm-home__task-main">
                  <span className="crm-home__task-name">{t.contactName}</span>
                  <span className="crm-home__task-detail">
                    {t.title} · {TASK[t.kind].when(t.at)}
                  </span>
                </span>
                <ArrowRight className="crm-home__task-arrow" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="crm-home__text">Nothing is waiting on you right now.</p>
      )}
      {waiting.notContacted ? (
        <p className="crm-home__text">
          Across the team, {waiting.notContacted} new {waiting.notContacted === 1 ? 'lead has' : 'leads have'} not been called yet.{' '}
          <Link to="/contacts?attention=no_outreach" className="link">
            Help call them
          </Link>
          .
        </p>
      ) : null}
    </>
  )
}
