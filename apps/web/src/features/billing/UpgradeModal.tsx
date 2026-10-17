import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Mail,
  Bot,
  BarChart3,
  Video,
  Shield,
  ArrowRight,
  X,
  Star,
  Users,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { useSession } from '@/lib/session'
import { useSubscription, type BillingCycle, type PaymentDetails } from '@/lib/subscription'
import { StripePaygate } from './StripePaygate'

export interface UpgradeModalProps {
  open?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

export function UpgradeModal({ open: propsOpen, onClose: propsOnClose, onSuccess }: UpgradeModalProps) {
  const navigate = useNavigate()
  const { me, org } = useSession()
  const {
    isUpgradeModalOpen,
    closeUpgradeModal,
    isPostRegistration,
    billingCycle,
    setBillingCycle,
    isPremium,
    plan,
  } = useSubscription()

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
    // If coming from post-registration or user has not completed onboarding, go to Settings - Company
    navigate('/settings/company')
  }

  const handlePaymentSuccess = (payment: PaymentDetails) => {
    setStep('success')
    onSuccess?.()
    setTimeout(() => {
      handleClose()
      navigate('/settings/company')
    }, 1500)
  }

  return (
    <div className="upgrade-overlay" role="dialog" aria-modal="true">
      <div className="upgrade-overlay__backdrop" onClick={handleClose} />

      <div className="upgrade-modal">
        {/* Close button */}
        <button
          type="button"
          className="upgrade-modal__close"
          onClick={handleClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

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
            {/* ── Modal Masthead ── */}
            <div className="upgrade-masthead">
              <div className="upgrade-kicker">
                <Sparkles size={14} className="text--warning" />
                <span>
                  {isPostRegistration
                    ? '🎉 Free Registration Complete · Exclusive Upgrade Offer'
                    : '⚡ Accelerate Your Contracting Revenue'}
                </span>
              </div>

              <h2 className="upgrade-masthead__title">
                Unlock the Full Power of Riverly
              </h2>

              <p className="upgrade-masthead__subtitle">
                {isPostRegistration
                  ? `Your Riverly Free CRM workspace is live. Upgrade to Premium Pro today to automate follow-ups, broadcast live virtual inspections, and unlock executive intelligence.`
                  : `You're currently using the Free CRM tier. Supercharge your workflow with full AI automations, verified email sending, and live video walkthroughs.`}
              </p>

              {/* ── Billing Cycle Toggle Switcher ── */}
              <div className="billing-switcher-wrap">
                <div className="billing-switcher" role="radiogroup" aria-label="Billing cycle">
                  <button
                    type="button"
                    className={`billing-switcher__item ${billingCycle === 'monthly' ? 'is-active' : ''}`}
                    onClick={() => setBillingCycle('monthly')}
                  >
                    Monthly ($49/mo)
                  </button>
                  <button
                    type="button"
                    className={`billing-switcher__item ${billingCycle === 'annual' ? 'is-active' : ''}`}
                    onClick={() => setBillingCycle('annual')}
                  >
                    <span>Annual ($39/mo)</span>
                    <span className="billing-switcher__save">Save 20%</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Side-by-Side Plans Comparison ── */}
            <div className="upgrade-plans-grid">
              {/* ── Free Plan Column ── */}
              <div className="upgrade-plan-card upgrade-plan-card--free">
                <div className="upgrade-plan-card__header">
                  <div className="row row--between items-center mb-1">
                    <span className="upgrade-plan-label">Riverly Core CRM</span>
                    <span className="upgrade-tier-pill upgrade-tier-pill--current">
                      <Check size={12} /> Active Tier
                    </span>
                  </div>
                  <div className="upgrade-plan-price">
                    <span className="price-figure">$0</span>
                    <span className="price-sub">/ forever</span>
                  </div>
                  <p className="upgrade-plan-summary">
                    Standard CRM essentials for tracking inbound leads and managing team contacts.
                  </p>
                </div>

                <div className="upgrade-plan-card__body">
                  <div className="upgrade-features-list">
                    <div className="upgrade-feature-item">
                      <Check size={16} className="text--success" />
                      <span>Unlimited Inbound Leads &amp; Contacts</span>
                    </div>
                    <div className="upgrade-feature-item">
                      <Check size={16} className="text--success" />
                      <span>Visual 6-Stage Roofing Sales Pipeline</span>
                    </div>
                    <div className="upgrade-feature-item">
                      <Check size={16} className="text--success" />
                      <span>Centralized Activity River &amp; Notes</span>
                    </div>
                    <div className="upgrade-feature-item">
                      <Check size={16} className="text--success" />
                      <span>Job Workspaces &amp; Attachments</span>
                    </div>
                    <div className="upgrade-feature-item upgrade-feature-item--locked">
                      <Lock size={15} className="text--muted" />
                      <span>Email Services &amp; 13+ Templates (Locked)</span>
                    </div>
                    <div className="upgrade-feature-item upgrade-feature-item--locked">
                      <Lock size={15} className="text--muted" />
                      <span>AI Automations &amp; Smart Lead Scoring (Locked)</span>
                    </div>
                    <div className="upgrade-feature-item upgrade-feature-item--locked">
                      <Lock size={15} className="text--muted" />
                      <span>Data Reports &amp; Revenue Analytics (Locked)</span>
                    </div>
                    <div className="upgrade-feature-item upgrade-feature-item--locked">
                      <Lock size={15} className="text--muted" />
                      <span>Live Meeting &amp; Inspection Broadcasting (Locked)</span>
                    </div>
                  </div>
                </div>

                <div className="upgrade-plan-card__footer">
                  <Button
                    type="button"
                    variant="secondary"
                    block
                    onClick={handleContinueFree}
                    className="free-plan-button"
                  >
                    <span>Continue with Free CRM</span>
                    <ArrowRight size={14} />
                  </Button>
                  <p className="text text--xs text-center text--muted pt-1">
                    Free forever · Upgrade anytime
                  </p>
                </div>
              </div>

              {/* ── Premium Pro Plan Column (Hero Spotlight) ── */}
              <div className="upgrade-plan-card upgrade-plan-card--pro">
                <div className="upgrade-plan-card__glow" />

                <div className="upgrade-plan-card__header">
                  <div className="row row--between items-center mb-1">
                    <span className="upgrade-plan-label">Riverly Premium Pro</span>
                    <span className="upgrade-tier-pill upgrade-tier-pill--hot">
                      <Zap size={12} /> MOST POPULAR · 10X ROI
                    </span>
                  </div>
                  <div className="upgrade-plan-price">
                    <span className="price-figure">
                      ${billingCycle === 'annual' ? 39 : 49}
                    </span>
                    <span className="price-sub">/ month</span>
                    {billingCycle === 'annual' ? (
                      <span className="price-billed-tag">Billed $468 annually</span>
                    ) : (
                      <span className="price-billed-tag">Billed monthly</span>
                    )}
                  </div>
                  <p className="upgrade-plan-summary">
                    Everything in Free, plus all four high-leverage tools to win and close more jobs:
                  </p>
                </div>

                <div className="upgrade-plan-card__body">
                  <div className="upgrade-features-list">
                    {/* Feature 1: Email services */}
                    <div className="upgrade-pro-feature">
                      <div className="upgrade-pro-feature__icon">
                        <Mail size={18} />
                      </div>
                      <div className="upgrade-pro-feature__content">
                        <strong>Email Services &amp; 13+ Pro Templates</strong>
                        <p>
                          Send verified emails via Resend with 1-click quote follow-ups, review requests, and live delivery tracking.
                        </p>
                      </div>
                    </div>

                    {/* Feature 2: AI Automations */}
                    <div className="upgrade-pro-feature">
                      <div className="upgrade-pro-feature__icon">
                        <Bot size={18} />
                      </div>
                      <div className="upgrade-pro-feature__content">
                        <strong>AI Automations &amp; Smart Lead Scoring</strong>
                        <p>
                          Instant lead qualification, automated quote reminder cadences, and AI-drafted client email replies.
                        </p>
                      </div>
                    </div>

                    {/* Feature 3: Data Reports */}
                    <div className="upgrade-pro-feature">
                      <div className="upgrade-pro-feature__icon">
                        <BarChart3 size={18} />
                      </div>
                      <div className="upgrade-pro-feature__content">
                        <strong>Executive Data Reports &amp; Analytics</strong>
                        <p>
                          Real-time conversion funnels, rep workload balance, revenue forecasting, and close-rate analytics.
                        </p>
                      </div>
                    </div>

                    {/* Feature 4: Live Meeting Broadcasting */}
                    <div className="upgrade-pro-feature">
                      <div className="upgrade-pro-feature__icon">
                        <Video size={18} />
                      </div>
                      <div className="upgrade-pro-feature__content">
                        <strong>Live Meeting &amp; Inspection Broadcasting</strong>
                        <p>
                          Broadcast live roof walkthroughs &amp; storm assessments directly to homeowners&rsquo; phones with recorded sessions.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contractor Testimonial Quote */}
                  <div className="upgrade-testimonial">
                    <div className="row gap-1 items-center mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className="text--warning" fill="currentColor" />
                      ))}
                      <span className="text text--xs font-semibold ml-1">4.9/5 from 420+ contractors</span>
                    </div>
                    <p className="upgrade-testimonial__quote">
                      &ldquo;Riverly Premium paid for itself on day 2. The automated email templates and AI follow-ups closed a $24,000 roof replacement while our team was on another site.&rdquo;
                    </p>
                    <span className="upgrade-testimonial__author">
                      — Marcus Vance, Founder, Peak Point Roofing &amp; Exteriors
                    </span>
                  </div>
                </div>

                <div className="upgrade-plan-card__footer">
                  <Button
                    type="button"
                    variant="primary"
                    block
                    onClick={() => setStep('stripe')}
                    className="upgrade-cta-button"
                  >
                    <Zap size={16} />
                    <span>Upgrade to Premium &amp; Pay via Stripe</span>
                    <ArrowRight size={16} />
                  </Button>

                  <div className="row row--between items-center text--xs text--muted pt-2 px-1">
                    <span className="row gap-1 items-center">
                      <Shield size={12} className="text--success" /> 14-day free trial
                    </span>
                    <span>·</span>
                    <span>100% Money-back guarantee</span>
                    <span>·</span>
                    <span>Cancel in 1 click</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
