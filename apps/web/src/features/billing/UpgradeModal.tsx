import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Mail, Bot, BarChart3, Video, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/primitives/Controls'
import { useSession } from '@/lib/session'
import {
  useSubscription,
  PREMIUM_PRICE,
  ANNUAL_SAVINGS_PERCENT,
  type PaymentDetails,
} from '@/lib/subscription'
import { StripePaygate } from './StripePaygate'

export interface UpgradeModalProps {
  open?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

const FREE_FEATURES = [
  'Unlimited contacts and jobs',
  'Six-stage roofing pipeline with logged stage changes',
  'One Activity history per job: calls, notes, posts and files',
  'Lead intake by hand, CSV import or embeddable web form',
  'Duplicate review on import',
  'Team invites with Member, Manager and Admin roles',
]

interface PremiumFeature {
  icon: ReactNode
  title: string
  details: string[]
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: <Mail size={18} />,
    title: 'Email sending',
    details: [
      'Send from your own domain through Resend, straight from the job.',
      '13 roofing templates: inspection confirmation, estimate follow-up, contract, crew scheduling, completion and review request.',
      'Delivery status lands on the job’s Activity history, so everyone can see what was sent.',
    ],
  },
  {
    icon: <Bot size={18} />,
    title: 'Follow-up automations',
    details: [
      'Reminders when a lead or an estimate has gone quiet for too long.',
      'Stage-based sequences, for example a nudge 3 and 7 days after an estimate goes out.',
      'Drafted replies and job summaries built from the Activity history, for you to review before sending.',
    ],
  },
  {
    icon: <BarChart3 size={18} />,
    title: 'Pipeline and team reports',
    details: [
      'Conversion at each stage and by lead source.',
      'Open jobs per rep, neglected leads and upcoming inspections in one view.',
      'Close rate and won job value by month.',
    ],
  },
  {
    icon: <Video size={18} />,
    title: 'Live roof inspections',
    details: [
      'Stream a walkthrough to the homeowner’s phone from a link, with no app to install.',
      'Recordings are saved to the job’s files and Activity history.',
      'Bring in outside inspectors and crews as participants without giving them a login.',
    ],
  },
]

export function UpgradeModal({ open: propsOpen, onClose: propsOnClose, onSuccess }: UpgradeModalProps) {
  const navigate = useNavigate()
  const { me } = useSession()
  const { isUpgradeModalOpen, closeUpgradeModal, isPostRegistration, billingCycle, setBillingCycle } =
    useSubscription()

  const isOpen = propsOpen !== undefined ? propsOpen : isUpgradeModalOpen
  const handleClose = propsOnClose || closeUpgradeModal

  // Step inside modal: 'compare' | 'stripe' | 'success'
  const [step, setStep] = useState<'compare' | 'stripe' | 'success'>('compare')

  // Reset step whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('compare')
    }
  }, [isOpen])

  // Prevent background scroll when open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleContinueFree = () => {
    handleClose()
    navigate('/settings/company')
  }

  const handlePaymentSuccess = (_payment: PaymentDetails) => {
    setStep('success')
    onSuccess?.()
    setTimeout(() => {
      handleClose()
      navigate('/settings/company')
    }, 1500)
  }

  const price = PREMIUM_PRICE[billingCycle]

  return (
    <div className="upgrade-overlay" role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
      <div className="upgrade-overlay__backdrop" onClick={handleClose} />

      <div className="upgrade-modal">
        <header className="upgrade-modal__brandbar">
          <span className="upgrade-brand">
            <svg className="upgrade-brand__mark" viewBox="0 0 32 32" aria-hidden>
              <rect width="32" height="32" rx="7" />
              <path d="M7 20c4-6 7 2 11-4s6-2 7-3" />
            </svg>
            <span className="upgrade-brand__wordmark">RIVERLY</span>
          </span>
          <button type="button" className="upgrade-modal__close" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {step === 'stripe' ? (
          <div className="upgrade-modal__stripe-view">
            <StripePaygate
              billingCycle={billingCycle}
              onBack={() => setStep('compare')}
              onSuccess={handlePaymentSuccess}
              customerEmail={me?.email}
            />
          </div>
        ) : (
          <div className="upgrade-modal__content">
            <div className="upgrade-masthead">
              <div>
                <h2 id="upgrade-modal-title" className="upgrade-masthead__title">
                  {isPostRegistration ? 'Your workspace is ready. Pick a plan.' : 'Riverly plans'}
                </h2>
                <p className="upgrade-masthead__subtitle">
                  Free covers the pipeline and job history. Premium adds email sending, follow-up
                  automations, reports and live inspections. You can change plans at any time.
                </p>
              </div>

              <div className="billing-switcher" role="radiogroup" aria-label="Billing cycle">
                <button
                  type="button"
                  role="radio"
                  aria-checked={billingCycle === 'monthly'}
                  className={`billing-switcher__item ${billingCycle === 'monthly' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={billingCycle === 'annual'}
                  className={`billing-switcher__item ${billingCycle === 'annual' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('annual')}
                >
                  <span>Yearly</span>
                  <span className="billing-switcher__save">Save {ANNUAL_SAVINGS_PERCENT}%</span>
                </button>
              </div>
            </div>

            <div className="upgrade-plans-grid">
              {/* ── Free ── */}
              <section className="upgrade-plan-card upgrade-plan-card--free" aria-label="Free plan">
                <div className="upgrade-plan-card__header">
                  <div className="upgrade-plan-card__titlerow">
                    <h3 className="upgrade-plan-label">Free</h3>
                    <span className="upgrade-tier-pill">Current plan</span>
                  </div>
                  <div className="upgrade-plan-price">
                    <span className="price-figure">$0</span>
                    <span className="price-sub">per month</span>
                  </div>
                  <p className="upgrade-plan-summary">Everything you need to run the pipeline.</p>
                </div>

                <ul className="upgrade-features-list">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="upgrade-feature-item">
                      <Check size={16} className="upgrade-feature-item__check" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="upgrade-plan-card__footer">
                  <Button type="button" variant="secondary" block onClick={handleContinueFree}>
                    Continue with Free
                  </Button>
                </div>
              </section>

              {/* ── Premium ── */}
              <section className="upgrade-plan-card upgrade-plan-card--pro" aria-label="Premium plan">
                <div className="upgrade-plan-card__header">
                  <div className="upgrade-plan-card__titlerow">
                    <h3 className="upgrade-plan-label">Premium</h3>
                  </div>
                  <div className="upgrade-plan-price">
                    <span className="price-figure">${price.perMonth}</span>
                    <span className="price-sub">per month</span>
                    <span className="price-billed-tag">
                      {billingCycle === 'annual'
                        ? `$${price.billed} billed yearly`
                        : 'Billed monthly'}
                    </span>
                  </div>
                  <p className="upgrade-plan-summary">Everything in Free, plus:</p>
                </div>

                <div className="upgrade-pro-features">
                  {PREMIUM_FEATURES.map((feature) => (
                    <div key={feature.title} className="upgrade-pro-feature">
                      <div className="upgrade-pro-feature__head">
                        <span className="upgrade-pro-feature__icon">{feature.icon}</span>
                        <h4 className="upgrade-pro-feature__title">{feature.title}</h4>
                      </div>
                      <ul className="upgrade-pro-feature__details">
                        {feature.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="upgrade-plan-card__footer upgrade-plan-card__footer--pro">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setStep('stripe')}
                    className="upgrade-cta-button"
                  >
                    <span>Continue to payment</span>
                    <ArrowRight size={16} />
                  </Button>
                  <p className="upgrade-fineprint">
                    Paid securely through Stripe. 14-day money-back guarantee. Cancel any time from
                    Settings.
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
