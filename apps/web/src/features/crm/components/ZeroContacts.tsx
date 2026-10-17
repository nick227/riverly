import {
  Check,
  FileSpreadsheet,
  Globe,
  Plus,
  ShoppingBag,
  Upload,
  UserPlus,
  Workflow,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/primitives/Controls'
import type { ImportTabKey } from './ImportDialog'

export interface ZeroContactsProps {
  onImport: (initialTab?: ImportTabKey) => void
  onAddContact: () => void
  canImport?: boolean
  opportunityTerm?: string
}

/**
 * Studio-quality first-time intake view for organizations with zero contacts.
 * Balanced, spacious, and pragmatic with crisp architectural lines and zero visual clutter.
 */
export function ZeroContacts({
  onImport,
  onAddContact,
  canImport = true,
  opportunityTerm = 'job',
}: ZeroContactsProps) {
  const jobTerm = opportunityTerm.toLowerCase()

  return (
    <div className="crm-zero-contacts">
      {/* ── Tier 1: Primary Starting Tracks (50/50 Proportional Split) ── */}
      <div className="crm-zero-contacts__primary-grid">
        {/* Track A: Batch Spreadsheet Import */}
        <div className="crm-zero-contacts__primary-card">
          <div className="crm-zero-contacts__card-header">
            <span className="crm-zero-contacts__tag">Batch import</span>
            <FileSpreadsheet size={16} className="crm-zero-contacts__icon" aria-hidden />
          </div>

          <div className="crm-zero-contacts__card-body">
            <h2 className="crm-zero-contacts__card-title">Spreadsheet or CSV</h2>
            <p className="crm-zero-contacts__card-desc">
              Import existing customer records from Excel, Google Sheets, Jobber, AccuLynx, or QuickBooks.
            </p>

            <ul className="crm-zero-contacts__specs">
              <li>
                <Check size={13} className="crm-zero-contacts__check" aria-hidden />
                <span>Supports .csv and .xlsx files with flexible column mapping</span>
              </li>
              <li>
                <Check size={13} className="crm-zero-contacts__check" aria-hidden />
                <span>Automatic phone and email deduplication against existing records</span>
              </li>
              <li>
                <Check size={13} className="crm-zero-contacts__check" aria-hidden />
                <span>Interactive preview and error validation before committing to pipeline</span>
              </li>
            </ul>
          </div>

          <div className="crm-zero-contacts__card-footer">
            <Button
              variant="primary"
              disabled={!canImport}
              onClick={() => onImport('csv')}
              title={canImport ? undefined : 'Requires Manager or Admin role'}
            >
              <Upload size={14} aria-hidden /> Upload spreadsheet
            </Button>
          </div>
        </div>

        {/* Track B: Direct Manual Entry */}
        <div className="crm-zero-contacts__primary-card">
          <div className="crm-zero-contacts__card-header">
            <span className="crm-zero-contacts__tag">Direct entry</span>
            <UserPlus size={16} className="crm-zero-contacts__icon" aria-hidden />
          </div>

          <div className="crm-zero-contacts__card-body">
            <h2 className="crm-zero-contacts__card-title">Single Contact</h2>
            <p className="crm-zero-contacts__card-desc">
              Record a new customer inquiry directly from a phone call, referral, or site visit.
            </p>

            <ul className="crm-zero-contacts__specs">
              <li>
                <Check size={13} className="crm-zero-contacts__check" aria-hidden />
                <span>Contact details, phone, email, and property address</span>
              </li>
              <li>
                <Check size={13} className="crm-zero-contacts__check" aria-hidden />
                <span>Creates an initial {jobTerm} in your first active pipeline stage</span>
              </li>
              <li>
                <Check size={13} className="crm-zero-contacts__check" aria-hidden />
                <span>Assign sales owner, lead source, and initial inquiry notes</span>
              </li>
            </ul>
          </div>

          <div className="crm-zero-contacts__card-footer">
            <Button variant="secondary" onClick={onAddContact}>
              <Plus size={14} aria-hidden /> Create contact manually
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tier 2: Continuous Sync & Inbound Sources ── */}
      <div className="crm-zero-contacts__secondary-section">
        <div className="crm-zero-contacts__section-header">
          <span className="crm-zero-contacts__section-kicker">Integrations</span>
          <p className="crm-zero-contacts__section-desc">
            Connect your storefront, marketing channels, or web forms for continuous intake.
          </p>
        </div>

        <div className="crm-zero-contacts__secondary-grid">
          {/* WooCommerce */}
          <div className="crm-zero-contacts__secondary-card">
            <div className="crm-zero-contacts__secondary-top">
              <span className="crm-zero-contacts__subtag">E-Commerce</span>
              <ShoppingBag size={15} className="crm-zero-contacts__icon" aria-hidden />
            </div>
            <h3 className="crm-zero-contacts__secondary-title">WooCommerce</h3>
            <p className="crm-zero-contacts__secondary-desc">
              Sync customer profiles, billing addresses, and online estimate orders from WordPress.
            </p>
            <div className="crm-zero-contacts__secondary-action">
              <Button
                variant="ghost"
                size="sm"
                disabled={!canImport}
                onClick={() => onImport('woocommerce')}
                title={canImport ? undefined : 'Requires Manager or Admin role'}
              >
                Connect store &rarr;
              </Button>
            </div>
          </div>

          {/* HubSpot */}
          <div className="crm-zero-contacts__secondary-card">
            <div className="crm-zero-contacts__secondary-top">
              <span className="crm-zero-contacts__subtag">CRM Migration</span>
              <Globe size={15} className="crm-zero-contacts__icon" aria-hidden />
            </div>
            <h3 className="crm-zero-contacts__secondary-title">HubSpot CRM</h3>
            <p className="crm-zero-contacts__secondary-desc">
              Pull contacts, companies, phone numbers, and pipeline deal history via API access token.
            </p>
            <div className="crm-zero-contacts__secondary-action">
              <Button
                variant="ghost"
                size="sm"
                disabled={!canImport}
                onClick={() => onImport('hubspot')}
                title={canImport ? undefined : 'Requires Manager or Admin role'}
              >
                Sync HubSpot &rarr;
              </Button>
            </div>
          </div>

          {/* Zapier */}
          <div className="crm-zero-contacts__secondary-card">
            <div className="crm-zero-contacts__secondary-top">
              <span className="crm-zero-contacts__subtag">Inbound Webhook</span>
              <Zap size={15} className="crm-zero-contacts__icon" aria-hidden />
            </div>
            <h3 className="crm-zero-contacts__secondary-title">Zapier &amp; Webhooks</h3>
            <p className="crm-zero-contacts__secondary-desc">
              Ingest real-time leads from Facebook Ads, Google Forms, Typeform, or custom webhooks.
            </p>
            <div className="crm-zero-contacts__secondary-action">
              <Button
                variant="ghost"
                size="sm"
                disabled={!canImport}
                onClick={() => onImport('zapier')}
                title={canImport ? undefined : 'Requires Manager or Admin role'}
              >
                Configure webhook &rarr;
              </Button>
            </div>
          </div>

          {/* Website Form */}
          <div className="crm-zero-contacts__secondary-card">
            <div className="crm-zero-contacts__secondary-top">
              <span className="crm-zero-contacts__subtag">Public Intake</span>
              <Workflow size={15} className="crm-zero-contacts__icon" aria-hidden />
            </div>
            <h3 className="crm-zero-contacts__secondary-title">Website Estimate Form</h3>
            <p className="crm-zero-contacts__secondary-desc">
              Embed a responsive inquiry form directly on your website to capture inbound requests.
            </p>
            <div className="crm-zero-contacts__secondary-action">
              <Link to="/settings" className="button button--ghost button--sm">
                View lead forms &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
