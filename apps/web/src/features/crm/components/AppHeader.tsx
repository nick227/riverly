import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Building2, CreditCard, Compass, House, LogOut, Moon, Palette, Search, Settings, Sparkles, Sun, UserRound, Users, Zap, type LucideIcon } from 'lucide-react'
import { useLogout, useOpportunities, useSwitchOrganization } from '@project/sdk'
import { cx } from '@/lib/cx'
import { useSession } from '@/lib/session'
import { useTheme } from '@/lib/theme'
import { useDebounce } from '@/lib/useDebounce'
import { useSubscription } from '@/lib/subscription'
import { Avatar } from '@/components/patterns/Avatar'
import { Menu, MenuDivider, MenuItem, MenuLabel } from '@/components/patterns/Menu'
import { toast } from '@/components/patterns/Toast'
import { loadingScreen } from '@/components/patterns/LoadingScreen'
import { useWorkflowView } from '../config/workflow'
import { ThemeModal } from './ThemeModal'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Extra path prefixes that count as this section (a job lives under Contacts). */
  match?: string[]
  /** Shown only in the mobile bar; desktop reaches it via the brand link or account menu. */
  mobileOnly?: boolean
}

/** The one primary navigation list: desktop header links and the mobile bottom bar both render it. */
function usePrimaryNav(): NavItem[] {
  const { me, can } = useSession()
  return [
    { to: '/', label: 'Home', icon: House, mobileOnly: true },
    { to: '/activity', label: 'Activity', icon: Activity },
    { to: '/contacts', label: 'Contacts', icon: Users, match: ['/jobs/'] },
    ...(can('reports.view') ? [{ to: '/settings', label: 'Settings', icon: Settings }] : []),
    ...(me ? [{ to: `/u/${me.slug}`, label: 'Profile', icon: UserRound, mobileOnly: true }] : []),
  ]
}

function useIsActive() {
  const { pathname } = useLocation()
  return (item: Pick<NavItem, 'to' | 'match'>) =>
    item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`) || !!item.match?.some((m) => pathname.startsWith(m))
}

export function AppHeader() {
  const { me, org } = useSession()
  const nav = usePrimaryNav()
  const isActive = useIsActive()
  const logout = useLogout()
  const switchOrg = useSwitchOrganization()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { isPremium, openUpgradeModal } = useSubscription()
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  if (!me) return null
  const signOut = () => {
    const screen = loadingScreen.start('Signing out')
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate('/login')
        screen.done()
      },
      onError: (err) => {
        screen.cancel()
        toast.error(err, 'Could not sign out')
      },
    })
  }

  return (
    <>
      <header className="crm-header">
        <div className="crm-header__inner">
          <Link to="/" className="crm-header__brand" aria-label="Company home">
            <span className="crm-header__company">{org?.name ?? 'Riverly'}</span>
          </Link>
          <nav className="crm-header__nav" aria-label="Primary">
            {nav
              .filter((item) => !item.mobileOnly)
              .map((item) => (
                <Link key={item.to} to={item.to} className={cx('crm-header__link', isActive(item) && 'is-active')} aria-current={isActive(item) ? 'page' : undefined}>
                  {item.label}
                </Link>
              ))}
          </nav>
          <GlobalSearch />
          {isPremium ? (
            <span className="crm-badge--pro crm-header__upgrade" title="Riverly Premium Pro Active">
              <Sparkles size={11} /> Pro
            </span>
          ) : (
            <button
              type="button"
              className="crm-badge--upgrade crm-header__upgrade"
              onClick={() => openUpgradeModal('header')}
              title="Unlock Email, AI, Reports & Broadcasting"
            >
              <Zap size={11} />
            </button>
          )}
          <Menu
            label="Account"
            trigger={(p) => (
              <button type="button" className="button button--ghost button--icon" aria-label="Account menu" {...p}>
                <Avatar name={me.displayName} src={me.avatarUrl} size="sm" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>
                  {me.displayName}
                  <br />
                  {me.email}
                </MenuLabel>
                <MenuItem icon={<UserRound />} onSelect={() => (close(), navigate(`/u/${me.slug}`))}>
                  Your profile
                </MenuItem>
                <MenuItem icon={<Compass />} onSelect={() => (close(), navigate('/settings/company'))}>
                  Setup &amp; onboarding
                </MenuItem>
                <MenuItem icon={<CreditCard />} onSelect={() => (close(), navigate('/settings/billing'))}>
                  Billing &amp; plan ({isPremium ? 'Pro' : 'Free'})
                </MenuItem>
                <MenuItem icon={<Palette />} onSelect={() => (close(), setThemeModalOpen(true))}>
                  Theme &amp; appearance
                </MenuItem>
                <MenuItem icon={theme === 'dark' ? <Sun /> : <Moon />} onSelect={toggle}>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </MenuItem>
                {me.memberships.length > 1 ? (
                  <>
                    <MenuDivider />
                    <MenuLabel>Switch company</MenuLabel>
                    {me.memberships
                      .filter((m) => m.organizationId !== org?.id)
                      .map((m) => (
                        <MenuItem
                          key={m.organizationId}
                          icon={<Building2 />}
                          onSelect={() =>
                            switchOrg.mutate(
                              { organizationId: m.organizationId },
                              { onSuccess: () => (close(), navigate('/')), onError: (e) => toast.error(e) },
                            )
                          }
                        >
                          {m.organizationName}
                        </MenuItem>
                      ))}
                  </>
                ) : null}
                <MenuDivider />
                <MenuItem icon={<LogOut />} onSelect={signOut}>
                  Sign out
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </header>
      <nav className="crm-nav-mobile" aria-label="Primary">
        {nav.map(({ icon: Icon, ...item }) => (
          <Link key={item.to} to={item.to} className={cx(isActive(item) && 'is-active')} aria-current={isActive(item) ? 'page' : undefined}>
            <Icon aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
      <ThemeModal open={themeModalOpen} onClose={() => setThemeModalOpen(false)} />
    </>
  )
}

/** Header search across contacts and jobs; Enter opens the Contacts list filtered by the query. */
function GlobalSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(q.trim(), 200)
  const navigate = useNavigate()
  const root = useRef<HTMLDivElement>(null)
  const { view } = useWorkflowView()
  const results = useOpportunities({ q: debounced, status: 'ALL', limit: 8 })
  const items = debounced.length >= 2 ? (results.data?.pages[0]?.data ?? []) : []

  useEffect(() => {
    const onDoc = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="crm-header__search" ref={root}>
      <Search aria-hidden />
      <input
        className="input"
        type="search"
        placeholder="Search contacts, jobs, addresses"
        aria-label="Search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q.trim()) {
            setOpen(false)
            navigate(`/contacts?q=${encodeURIComponent(q.trim())}`)
          }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && items.length ? (
        <div className="crm-search-results" role="listbox">
          {items.map((job) => (
            <button
              key={job.id}
              type="button"
              className="menu__item"
              role="option"
              aria-selected={false}
              onClick={() => {
                setOpen(false)
                setQ('')
                navigate(`/jobs/${job.id}`)
              }}
            >
              <span className="stack gap-1" style={{ minWidth: 0 }}>
                <span className="text text--sm text--strong text--truncate">{job.contactName}</span>
                <span className="text text--xs text--muted text--truncate">
                  {job.title} · {view?.stageLabel(job.stageId)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
