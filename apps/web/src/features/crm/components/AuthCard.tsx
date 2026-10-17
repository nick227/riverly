import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Building2, Lock, Mail, User, ShieldCheck, Sparkles } from 'lucide-react'
import { useLogin, useCreateCompany } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Field } from '@/components/patterns/Field'
import { Notice } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { useSubscription } from '@/lib/subscription'
import { UpgradeModal } from '@/features/billing/UpgradeModal'

export interface AuthCardProps {
  initialTab?: 'login' | 'signup'
  compact?: boolean
  onSuccess?: () => void
  className?: string
  onTabChange?: (tab: 'login' | 'signup') => void
}

export function AuthCard({ initialTab = 'signup', compact = false, onSuccess, className = '', onTabChange }: AuthCardProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab)
    }
  }, [initialTab])

  const handleTabSwitch = (newTab: 'login' | 'signup') => {
    setTab(newTab)
    onTabChange?.(newTab)
  }

  const { openUpgradeModal } = useSubscription()

  // Login form state
  const login = useLogin()
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Signup form state
  const create = useCreateCompany()
  const [companyName, setCompanyName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) return

    login.mutate(
      { email: loginEmail, password: loginPassword },
      {
        onSuccess: () => {
          toast.success('Welcome back!')
          if (onSuccess) {
            onSuccess()
          } else {
            navigate(from, { replace: true })
          }
        },
      },
    )
  }

  const handleSignupSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!signupEmail.trim() || signupPassword.length < 10) return

    // Auto-derive display name and company if not entered yet (will be completed in onboarding)
    const emailPrefix = signupEmail.split('@')[0]?.replace(/[._]/g, ' ') || 'Partner'
    const cleanName = displayName.trim() || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    const cleanCompany = companyName.trim() || `${cleanName}'s Contracting`

    create.mutate(
      {
        companyName: cleanCompany,
        displayName: cleanName,
        email: signupEmail.trim(),
        password: signupPassword,
        timezone,
      },
      {
        onSuccess: () => {
          toast.success('Registration complete! Choose your plan.')
          // Trigger the Post-Registration Upgrade Modal immediately on submit!
          openUpgradeModal('registration', true)
          onSuccess?.()
        },
      },
    )
  }

  return (
    <div className={`site-auth-card ${compact ? 'site-auth-card--compact' : ''} ${className}`} id="auth">
      {/* ── Switcher Tabs ── */}
      <div className="site-auth-card__tabs" role="tablist" aria-label="Authentication Options">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'signup'}
          className={`site-auth-card__tab ${tab === 'signup' ? 'is-active' : ''}`}
          onClick={() => handleTabSwitch('signup')}
        >
          Create Workspace
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'login'}
          className={`site-auth-card__tab ${tab === 'login' ? 'is-active' : ''}`}
          onClick={() => handleTabSwitch('login')}
        >
          Sign In
        </button>
      </div>

      <div className="site-auth-card__body">
        {tab === 'signup' ? (
          <form className="stack gap-3" onSubmit={handleSignupSubmit} noValidate>
            <div className="stack gap-1">
              <h3 className="site-auth-card__title">Create your workspace</h3>
              <p className="site-auth-card__subtitle">
                Set up your team&rsquo;s sales pipeline and customer records in under 2 minutes.
              </p>
            </div>

            {create.error ? <Notice tone="danger">{create.error.message}</Notice> : null}

            <Field label="Work Email / Username">
              {(id) => (
                <div className="site-auth-input-wrap">
                  <Mail size={16} className="site-auth-input-icon" />
                  <Input
                    id={id}
                    type="email"
                    placeholder="alex@acme.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              )}
            </Field>

            <Field label="Password" hint="At least 10 characters">
              {(id) => (
                <div className="site-auth-input-wrap">
                  <Lock size={16} className="site-auth-input-icon" />
                  <Input
                    id={id}
                    type="password"
                    placeholder="••••••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                </div>
              )}
            </Field>

            <div className="row gap-2">
              <div style={{ flex: 1 }}>
                <Field label="Your Name (Optional)" hint="Or set in onboarding">
                  {(id) => (
                    <div className="site-auth-input-wrap">
                      <User size={16} className="site-auth-input-icon" />
                      <Input
                        id={id}
                        placeholder="Alex Morgan"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                  )}
                </Field>
              </div>

              <div style={{ flex: 1 }}>
                <Field label="Company (Optional)" hint="Or set in Settings - Company">
                  {(id) => (
                    <div className="site-auth-input-wrap">
                      <Building2 size={16} className="site-auth-input-icon" />
                      <Input
                        id={id}
                        placeholder="Acme Roofing Co."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                  )}
                </Field>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              block
              loading={create.isPending}
              disabled={!signupEmail.trim() || signupPassword.length < 10}
              className="mt-1"
            >
              <span>Create Free Account</span>
              <ArrowRight size={14} aria-hidden />
            </Button>

            <div className="site-auth-card__footer">
              <span className="row gap-1 items-center text--muted">
                <ShieldCheck size={12} className="text--success" /> No credit card required · Free 14-day trial
              </span>
              <p className="text text--xs text--muted pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  className="link font-semibold"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  onClick={() => handleTabSwitch('login')}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </form>
        ) : (
          <form className="stack gap-3" onSubmit={handleLoginSubmit} noValidate>
            <div className="stack gap-1">
              <h3 className="site-auth-card__title">Sign In</h3>
              <p className="site-auth-card__subtitle">
                Enter your work email and password to access your company workspace.
              </p>
            </div>

            {login.error ? <Notice tone="danger">{login.error.message}</Notice> : null}

            <Field label="Work Email">
              {(id) => (
                <div className="site-auth-input-wrap">
                  <Mail size={16} className="site-auth-input-icon" />
                  <Input
                    id={id}
                    type="email"
                    placeholder="alex@company.com"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}
            </Field>

            <Field label="Password">
              {(id) => (
                <div className="site-auth-input-wrap">
                  <Lock size={16} className="site-auth-input-icon" />
                  <Input
                    id={id}
                    type="password"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              )}
            </Field>

            <Button
              type="submit"
              variant="primary"
              block
              loading={login.isPending}
              disabled={!loginEmail || !loginPassword}
              className="mt-1"
            >
              <span>Sign In</span>
              <ArrowRight size={14} aria-hidden />
            </Button>

            <div className="site-auth-card__footer">
              <span className="row gap-1 items-center text--muted">
                <ShieldCheck size={12} className="text--success" /> Secure 256-bit encrypted session
              </span>
              <p className="text text--xs text--muted pt-1">
                New to Riverly?{' '}
                <button
                  type="button"
                  className="link font-semibold"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  onClick={() => handleTabSwitch('signup')}
                >
                  Create a workspace
                </button>
              </p>
            </div>
          </form>
        )}
      </div>

      <UpgradeModal />
    </div>
  )
}
