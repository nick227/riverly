import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Activity, Building2, CreditCard, Compass, House, LogOut, Moon, Search, Sparkles, Sun, UserRound, Users, Zap } from 'lucide-react'
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

export function AppHeader() {
  const { me, org, can } = useSession()
  const logout = useLogout()
  const switchOrg = useSwitchOrganization()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { isPremium, openUpgradeModal } = useSubscription()
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
  const navClass = ({ isActive }: { isActive: boolean }) => cx('crm-header__link', isActive && 'is-active')

  return (
    <>
      <header className="crm-header">
        <div className="crm-header__inner">
          <Link to="/" className="crm-header__brand" aria-label="Company home">
            <span className="crm-header__company">{org?.name ?? 'Riverly'}</span>
          </Link>
          <nav className="crm-header__nav" aria-label="Primary">
            <NavLink to="/activity" className={navClass}>
              Activity
            </NavLink>
            <NavLink to="/contacts" className={navClass}>
              Contacts
            </NavLink>
            {can('reports.view') ? (
              <NavLink to="/settings" className={navClass}>
                Settings
              </NavLink>
            ) : null}
          </nav>
          <GlobalSearch />
          {isPremium ? (
            <span className="crm-badge--pro" title="Riverly Premium Pro Active">
              <Sparkles size={11} /> Pro
            </span>
          ) : (
            <button
              type="button"
              className="crm-badge--upgrade"
              onClick={() => openUpgradeModal('header')}
              title="Unlock Email, AI, Reports & Broadcasting"
            >
              <Zap size={11} /> Upgrade
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
                <MenuItem icon={theme === 'dark' ? <Sun /> : <Moon />} onSelect={toggle}>
                  {theme === 'dark' ? 'Light theme' : 'Dark theme'}
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
        <NavLink to="/" end className={({ isActive }) => cx(isActive && 'is-active')}>
          <House aria-hidden />
          Home
        </NavLink>
        <NavLink to="/activity" className={({ isActive }) => cx(isActive && 'is-active')}>
          <Activity aria-hidden />
          Activity
        </NavLink>
        <NavLink to="/contacts" className={({ isActive }) => cx(isActive && 'is-active')}>
          <Users aria-hidden />
          Contacts
        </NavLink>
        <NavLink to={`/u/${me.slug}`} className={({ isActive }) => cx(isActive && 'is-active')}>
          <UserRound aria-hidden />
          Profile
        </NavLink>
      </nav>
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
