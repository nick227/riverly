import { useState, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  useOrganization,
  useUpdateOrganization,
  useUpdateMyProfile,
  useCreateInvitation,
} from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Field } from '@/components/patterns/Field'
import { SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { useSession } from '@/lib/session'
import { useSubscription } from '@/lib/subscription'

export const TRADES = [
  'Roofing & Gutters',
  'Siding & Windows',
  'Solar & Clean Energy',
  'General Contracting & Remodeling',
  'Commercial Storm Restoration',
  'HVAC & Mechanical',
  'Electrical & Plumbing',
  'Painting & Drywall',
  'Other Specialty Trade',
]

export const TEAM_SIZES = [
  '1 (Solo operator)',
  '2 – 5 team members',
  '6 – 15 team members',
  '16 – 50 team members',
  '50+ enterprise',
]

interface TeammateInvite {
  email: string
  role: 'MANAGER' | 'MEMBER'
}

export function CompanySettings() {
  const navigate = useNavigate()
  const { me, org } = useSession()
  const { isPremium } = useSubscription()
  const orgQuery = useOrganization()
  const updateProfile = useUpdateMyProfile()
  const updateOrg = useUpdateOrganization()
  const createInvite = useCreateInvitation()

  // Onboarding completion state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !me?.id) return false
    return localStorage.getItem(`riverly_onboarding_completed_${me.id}`) === 'true'
  })

  // Personal Profile
  const [displayName, setDisplayName] = useState(me?.displayName || '')
  const [title, setTitle] = useState(me?.title || '')
  const [phone, setPhone] = useState(() => {
    if (typeof window === 'undefined' || !me?.id) return ''
    return localStorage.getItem(`riverly_user_phone_${me.id}`) || ''
  })

  // Company Details
  const [companyName, setCompanyName] = useState(orgQuery.data?.name || org?.name || '')
  const [trade, setTrade] = useState<string>(() => {
    if (typeof window === 'undefined' || !org?.id) return TRADES[0] ?? 'Roofing & Gutters'
    return localStorage.getItem(`riverly_company_trade_${org.id}`) || (TRADES[0] ?? 'Roofing & Gutters')
  })
  const [teamSize, setTeamSize] = useState<string>(() => {
    if (typeof window === 'undefined' || !org?.id) return TEAM_SIZES[1] ?? '2 – 5 team members'
    return localStorage.getItem(`riverly_team_size_${org.id}`) || (TEAM_SIZES[1] ?? '2 – 5 team members')
  })
  const [timezone, setTimezone] = useState(orgQuery.data?.timezone || '')
  const [reviewUrl, setReviewUrl] = useState(orgQuery.data?.reviewUrl || org?.reviewUrl || '')
  const [logoUrl, setLogoUrl] = useState(orgQuery.data?.logoUrl || '')

  // Teammates Invites
  const [invites, setInvites] = useState<TeammateInvite[]>([
    { email: '', role: 'MEMBER' },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize from server org query if available
  useEffect(() => {
    if (orgQuery.data && !isInitialized) {
      if (orgQuery.data.name) setCompanyName(orgQuery.data.name)
      if (orgQuery.data.timezone) setTimezone(orgQuery.data.timezone)
      if (orgQuery.data.reviewUrl) setReviewUrl(orgQuery.data.reviewUrl)
      if (orgQuery.data.logoUrl) setLogoUrl(orgQuery.data.logoUrl)
      setIsInitialized(true)
    }
  }, [orgQuery.data, isInitialized])

  // Sync profile details from session
  useEffect(() => {
    if (me?.displayName && !displayName) {
      setDisplayName(me.displayName)
    }
    if (me?.title && !title) {
      setTitle(me.title)
    }
  }, [me])

  const handleAddInviteRow = () => {
    setInvites([...invites, { email: '', role: 'MEMBER' }])
  }

  const handleRemoveInviteRow = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index))
  }

  const handleInviteChange = (index: number, field: keyof TeammateInvite, value: string) => {
    const updated = [...invites]
    updated[index] = { ...updated[index]!, [field]: value }
    setInvites(updated)
  }

  const formatPhoneNumber = (value: string) => {
    if (!value) return ''
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length < 4) return cleaned
    if (cleaned.length < 7) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    }
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handlePhoneKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value
    const formatted = formatPhoneNumber(value)
    setPhone(formatted)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || !companyName.trim()) {
      toast.error('Full Name and Company Name are required.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Update Personal Profile
      await updateProfile.mutateAsync({
        displayName: displayName.trim(),
        title: title.trim() || null,
      })

      // 2. Update Organization
      await updateOrg.mutateAsync({
        name: companyName.trim(),
        timezone: timezone.trim() || undefined,
        reviewUrl: reviewUrl.trim() || null,
        logoUrl: logoUrl.trim() || null,
      })

      // 3. Send Invitations
      const validInvites = invites.filter((inv) => inv.email.trim() && inv.email.includes('@'))
      let invitedCount = 0
      for (const inv of validInvites) {
        try {
          await createInvite.mutateAsync({
            email: inv.email.trim(),
            role: inv.role,
          })
          invitedCount++
        } catch (inviteErr) {
          console.warn('Could not invite teammate', inv.email, inviteErr)
        }
      }
      if (invitedCount > 0) {
        toast.success(`Sent ${invitedCount} team invitation${invitedCount > 1 ? 's' : ''}`)
        setInvites([{ email: '', role: 'MEMBER' }])
      }

      // 4. Record onboarding completion & persistence
      if (me?.id) {
        localStorage.setItem(`riverly_onboarding_completed_${me.id}`, 'true')
        localStorage.setItem(`riverly_user_phone_${me.id}`, phone)
      }
      if (org?.id) {
        localStorage.setItem(`riverly_company_trade_${org.id}`, trade || '')
        localStorage.setItem(`riverly_team_size_${org.id}`, teamSize || '')
      }

      const wasCompleted = hasCompletedOnboarding
      setHasCompletedOnboarding(true)

      if (!wasCompleted) {
        toast.success('Workspace configured! Welcome to Riverly.')
        navigate('/', { replace: true })
      } else {
        toast.success('Company workspace and profile saved.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error saving settings. Please check your inputs.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orgQuery.isLoading && !orgQuery.data && !org) {
    return <SkeletonList rows={3} height={120} />
  }

  const firstName = displayName.split(' ')[0] || me?.displayName?.split(' ')[0] || 'Partner'

  return (
    <div className="block gap-6">
      {/* ── Hero Banner ── */}
      <div className="onboarding-hero">
        <div className="onboarding-hero__content">
          <span className="onboarding-eyebrow">Workspace Setup</span>
          <h2 className="onboarding-hero__heading">Welcome, {firstName}</h2>
          <p className="onboarding-hero__lede">
            Configure your contractor company profile, trade focus, and initial team setup.
          </p>
        </div>
        <div className="row gap-2 items-center">
          {hasCompletedOnboarding ? (
            <Badge tone="success">✓ Onboarding Complete</Badge>
          ) : (
            <Badge tone="warning">Setup in Progress</Badge>
          )}
          <Badge tone={isPremium ? 'accent' : 'neutral'}>
            {isPremium ? '✨ Premium Pro' : 'Free CRM'}
          </Badge>
        </div>
      </div>

      {/* ── Main Form Stack ── */}
      <form onSubmit={handleSave} className="stack gap-6">
        {/* Section 1: Personal Profile */}
        <div className="onboarding-panel">
          <div className="onboarding-panel__header">
            <h3 className="heading heading--3">01 · Personal Profile</h3>
            <p className="text text--sm text--muted">
              Your name and role displayed on contacts, job stages, and customer timelines.
            </p>
          </div>

          <div className="grid grid--3 gap-4 mt-4">
            <Field label="Full Name">
              {(id) => (
                <Input
                  id={id}
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Role / Title">
              {(id) => (
                <Input
                  id={id}
                  placeholder="e.g. Founder &amp; Owner, Lead Estimator"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>

            <Field label="Phone">
              {(id) => (
                <Input
                  id={id}
                  type="tel"
                  placeholder="(555) 234-5678"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  onKeyUp={handlePhoneKeyUp}
                />
              )}
            </Field>
          </div>
        </div>

        {/* Section 2: Company & Trade */}
        <div className="onboarding-panel">
          <div className="onboarding-panel__header">
            <h3 className="heading heading--3">02 · Company &amp; Trade</h3>
            <p className="text text--sm text--muted">
              Your business trade focus, team operational scale, and workspace preferences.
            </p>
          </div>

          <div className="grid grid--2 gap-4 mt-4">
            <Field label="Company Name">
              {(id) => (
                <Input
                  id={id}
                  placeholder="e.g. Apex Roofing &amp; Exteriors"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Primary Industry / Trade">
              {(id) => (
                <select
                  id={id}
                  className="input"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                >
                  {TRADES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <div className="grid grid--2 gap-4 mt-4">
            <Field label="Team Size">
              {(id) => (
                <select
                  id={id}
                  className="input"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                >
                  {TEAM_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Timezone" hint="Dates display in this timezone; everything is stored in UTC.">
              {(id) => (
                <Input
                  id={id}
                  placeholder="America/Denver"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="grid grid--2 gap-4 mt-4">
            <Field label="Google Business / Review URL (Optional)" hint="Where review requests send customers (Google, Yelp…). Required for Request review.">
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  placeholder="https://g.page/r/your-business/review"
                  value={reviewUrl}
                  onChange={(e) => setReviewUrl(e.target.value)}
                />
              )}
            </Field>

            <Field label="Company Logo URL (Optional)" hint="Used on header branding, estimates, and documentation.">
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  placeholder="https://"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              )}
            </Field>
          </div>

          {logoUrl ? (
            <div className="mt-3 p-3 row gap-3 items-center" style={{ background: 'var(--color-surface-subtle)', borderRadius: '8px', border: '1px solid var(--color-border)', width: 'fit-content' }}>
              <img
                src={logoUrl}
                alt="Company logo preview"
                style={{ height: 32, maxWidth: 140, objectFit: 'contain' }}
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
              <span className="text text--xs text--muted">Logo preview</span>
            </div>
          ) : null}
        </div>

        {/* Section 3: Team Invites */}
        <div className="onboarding-panel">
          <div className="onboarding-panel__header">
            <h3 className="heading heading--3">03 · Team Invites</h3>
            <p className="text text--sm text--muted">
              Add your estimators, managers, and field crew members, or invite them anytime in Team Settings.
            </p>
          </div>

          <div className="stack gap-3 mt-4">
            {invites.map((inv, idx) => (
              <div key={idx} className="row gap-3 items-center">
                <div style={{ flex: 3 }}>
                  <Input
                    placeholder="teammate@company.com"
                    type="email"
                    value={inv.email}
                    onChange={(e) => handleInviteChange(idx, 'email', e.target.value)}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <select
                    className="input"
                    value={inv.role}
                    onChange={(e) => handleInviteChange(idx, 'role', e.target.value as any)}
                  >
                    <option value="MEMBER">Member (Jobs &amp; Pipeline)</option>
                    <option value="MANAGER">Manager (Workload &amp; Reports)</option>
                  </select>
                </div>
                {invites.length > 1 && (
                  <button
                    type="button"
                    className="button button--ghost button--icon"
                    onClick={() => handleRemoveInviteRow(idx)}
                    aria-label="Remove teammate"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            <div className="row row--between row--wrap gap-3 items-center mt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddInviteRow}
                className="row gap-1 items-center"
              >
                <Plus size={14} />
                <span>Add Another Teammate</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Footer Actions Bar ── */}
        <div className="onboarding-footer-actions">
          <div className="row gap-3 items-center">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!displayName.trim() || !companyName.trim()}
              className="row gap-2 items-center"
            >
              {hasCompletedOnboarding ? (
                <>
                  <Check size={16} />
                  <span>Save Workspace Changes</span>
                </>
              ) : (
                <>
                  <span>Launch Riverly CRM</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>

            {hasCompletedOnboarding && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
              >
                Dashboard
              </Button>
            )}
          </div>

          <span className="text text--xs text--muted">
            Need to manage team permissions or roles? Visit{' '}
            <Link to="/settings/team" className="link font-semibold">
              Team Settings
            </Link>.
          </span>
        </div>

      </form>
    </div>
  )
}
