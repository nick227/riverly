import { CreditCard, Check, ShieldCheck, Zap, Sparkles, Lock, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader, CardSection } from '@/components/patterns/Card'
import { toast } from '@/components/patterns/Toast'
import { useSubscription, PREMIUM_PRICE } from '@/lib/subscription'

export function BillingSettings() {
  const {
    plan,
    isPremium,
    billingCycle,
    paymentDetails,
    openUpgradeModal,
    downgradeToFree,
    setBillingCycle,
  } = useSubscription()

  const handleDowngrade = () => {
    if (window.confirm('Are you sure you want to cancel Premium? You will retain standard Free CRM features.')) {
      downgradeToFree()
      toast.success('Plan switched to Free CRM tier.')
    }
  }

  return (
    <div className="stack gap-5">
      {/* ── Current Plan Card ── */}
      <Card>
        <CardHeader
          title="Subscription & Membership"
          actions={
            isPremium ? (
              <Badge tone="success">✨ Premium Pro Active</Badge>
            ) : (
              <Badge tone="neutral">Free CRM Tier</Badge>
            )
          }
        />
        <CardSection>
          <div className="stack gap-4">
            <div className="row row--between items-center p-3" style={{ background: 'var(--color-surface-subtle)', borderRadius: '8px' }}>
              <div>
                <div className="row gap-2 items-center">
                  <h4 className="heading heading--4" style={{ margin: 0 }}>
                    {isPremium ? 'Riverly Premium Pro' : 'Riverly Free CRM'}
                  </h4>
                  {isPremium ? (
                    <span className="badge badge--success">Active</span>
                  ) : (
                    <span className="badge badge--neutral">Active (Free)</span>
                  )}
                </div>
                <p className="text text--xs text--muted mt-1">
                  {isPremium
                    ? `Billed ${billingCycle === 'annual' ? `$${PREMIUM_PRICE.annual.billed}/year ($${PREMIUM_PRICE.annual.perMonth}/mo)` : `$${PREMIUM_PRICE.monthly.billed}/month`} via Stripe. 14-day money-back guarantee.`
                    : 'Basic pipeline and lead tracking. Upgrade to unlock email services, AI, reports, and live broadcasting.'}
                </p>
              </div>

              <div>
                {isPremium ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleDowngrade}
                  >
                    Cancel Premium
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => openUpgradeModal('settings')}
                    className="row gap-1 items-center"
                  >
                    <Zap size={14} />
                    <span>Upgrade to Premium</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Payment Method / Stripe Details */}
            {paymentDetails ? (
              <div className="p-3 border rounded-md" style={{ borderColor: 'var(--color-border)', borderRadius: '8px' }}>
                <div className="row row--between items-center">
                  <div className="row gap-3 items-center">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: 'var(--color-surface-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CreditCard size={20} className="text--muted" />
                    </div>
                    <div>
                      <span className="font-semibold text--sm block">
                        {paymentDetails.brand.toUpperCase()} ending in {paymentDetails.last4}
                      </span>
                      <span className="text text--xs text--muted">
                        Expires {paymentDetails.expMonth}/{paymentDetails.expYear} · Processed securely via Stripe
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openUpgradeModal('settings_payment_update')}
                  >
                    Update Card
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardSection>
      </Card>

      {/* ── Feature Comparison Matrix ── */}
      <Card>
        <CardHeader
          title="Plan Capabilities & Unlocks"
        />
        <CardSection>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Feature Capability</th>
                  <th style={{ width: '140px' }}>Free Plan</th>
                  <th style={{ width: '160px' }}>Premium Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Core CRM &amp; Pipeline</strong>
                    <br />
                    <span className="text--xs text--muted">Unlimited contacts, deals, 6 pipeline stages</span>
                  </td>
                  <td>
                    <Check size={16} className="text--success" />
                  </td>
                  <td>
                    <Check size={16} className="text--success" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Email Services &amp; 13+ Templates</strong>
                    <br />
                    <span className="text--xs text--muted">Resend verified delivery, tracking, batch outreach</span>
                  </td>
                  <td>
                    <span className="text--xs text--muted">Locked</span>
                  </td>
                  <td>
                    <Check size={16} className="text--success" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>AI Automations &amp; Lead Scoring</strong>
                    <br />
                    <span className="text--xs text--muted">Auto-drafted replies, quote reminders, lead intake</span>
                  </td>
                  <td>
                    <span className="text--xs text--muted">Locked</span>
                  </td>
                  <td>
                    <Check size={16} className="text--success" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Executive Data Reports &amp; Analytics</strong>
                    <br />
                    <span className="text--xs text--muted">Revenue forecasts, pipeline velocity, rep performance</span>
                  </td>
                  <td>
                    <span className="text--xs text--muted">Locked</span>
                  </td>
                  <td>
                    <Check size={16} className="text--success" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Live Meeting &amp; Inspection Broadcasting</strong>
                    <br />
                    <span className="text--xs text--muted">Stream virtual inspections directly to homeowner phones</span>
                  </td>
                  <td>
                    <span className="text--xs text--muted">Locked</span>
                  </td>
                  <td>
                    <Check size={16} className="text--success" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {!isPremium && (
            <div className="pt-4 text-center">
              <Button
                type="button"
                variant="primary"
                onClick={() => openUpgradeModal('settings_compare')}
                className="row gap-2 items-center"
              >
                <Zap size={16} />
                <span>Unlock Premium Features with Stripe</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </CardSection>
      </Card>
    </div>
  )
}
