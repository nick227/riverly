import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Database,
  FileText,
  Mail,
  MailCheck,
  Send,
  ShieldCheck,
  Smartphone,
  Star,
  Zap,
} from 'lucide-react'
import { usePageTitle } from '@/lib/pageTitle'
import { AuthCard } from '../components/AuthCard'

export function LandingView() {
  usePageTitle({
    rawTitle: 'Riverly — The Sales-First CRM for Specialty Contractors',
    description:
      'Riverly gives contractors and service businesses a clean, focused command center to track inbound leads, automate follow-ups, and keep QuickBooks in sync.',
  })

  const location = useLocation()
  const [authTab, setAuthTab] = useState<'login' | 'signup'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#signin') {
      return 'login'
    }
    return 'signup'
  })

  useEffect(() => {
    if (location.hash === '#signin') {
      setAuthTab('login')
      const el = document.getElementById('auth')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    } else if (location.hash === '#auth') {
      setAuthTab('signup')
      const el = document.getElementById('auth')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [location.hash])

  const scrollToAuth = (tab: 'login' | 'signup') => {
    setAuthTab(tab)
    const el = document.getElementById('auth')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      const input = el.querySelector('input')
      input?.focus()
    }
  }

  return (
    <div className="site">
      {/* ── ONE Simple Header (No multi-category noise) ── */}
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="site-wordmark" aria-label="Riverly home">
            <span>RIVERLY</span>
          </Link>

          <div className="site-header__actions">
            <a href="#features" className="site-header__nav-link">
              Features
            </a>
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => scrollToAuth('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="button button--primary button--sm"
              onClick={() => scrollToAuth('signup')}
            >
              Create Workspace
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Center-Aligned Minimal Hero Masthead ── */}
        <section className="site-hero site-hero--centered">
          <div className="site-hero__masthead">
            <span className="site-hero__pill">
              Sales-first CRM for contractors &amp; service teams
            </span>

            <h1 className="site-hero__title">
              The straightforward CRM built to win more jobs.
            </h1>

            <p className="site-hero__lede">
              Track inbound leads from first call to signed contract, automate your email follow-ups,
              and keep customer notes and QuickBooks in sync — without bloated menus or complicated setups.
            </p>
          </div>

          {/* Centered Inline Auth Card for immediate workspace creation or sign in */}
          <div className="site-hero__auth-wrap">
            <AuthCard
              initialTab={authTab}
              onTabChange={setAuthTab}
            />
          </div>
        </section>

        {/* ── Subtle Everyday Integrations Strip ── */}
        <div className="site-integrations-bar">
          <span className="site-integrations-bar__label">
            Works alongside the tools your business already uses
          </span>
          <div className="site-integrations-bar__list">
            <span>QuickBooks Online</span>
            <span className="site-dot" />
            <span>Google Workspace</span>
            <span className="site-dot" />
            <span>Microsoft Outlook</span>
            <span className="site-dot" />
            <span>Stripe Payments</span>
            <span className="site-dot" />
            <span>Zapier</span>
          </div>
        </div>

        {/* ── Top Features: Pragmatic, Accessible, and Spacious ── */}
        <div id="features" className="site-features-wrap">
          {/* Feature 1: Visual Sales Pipeline */}
          <section className="site-section site-pillar">
            <div className="site-pillar__content">
              <div className="site-eyebrow">
                <Zap size={14} />
                <span>01 · Sales Pipeline</span>
              </div>

              <h2 className="site-pillar__heading">
                Never lose track of an estimate or active deal
              </h2>

              <p className="site-pillar__desc">
                When homeowners and commercial clients ask for estimates, speed and follow-through win the contract.
                Riverly displays every opportunity on a clear visual pipeline so you know exactly who needs a call,
                which quotes are pending review, and what revenue is closing this month.
              </p>

              <div className="site-pillar__list">
                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Visual drag-and-drop stages</span>
                    <span className="site-pillar__item-desc">
                      Move jobs from lead to inspection, estimate sent, and contract won with one drag.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Clear rep accountability</span>
                    <span className="site-pillar__item-desc">
                      Assign leads to sales reps, track individual close rates, and set automatic reminders for overdue quotes.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Stale deal notifications</span>
                    <span className="site-pillar__item-desc">
                      Highlights opportunities that have gone quiet for more than 5 days so nothing slips through the cracks.
                    </span>
                  </div>
                </div>
              </div>

              <div className="site-pillar__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => scrollToAuth('signup')}
                >
                  <span>Start Free Workspace</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className="site-pillar__visual">
              <div className="site-window">
                <div className="site-window__header">
                  <div className="site-window__dots">
                    <span className="site-window__dot site-window__dot--red" />
                    <span className="site-window__dot site-window__dot--yellow" />
                    <span className="site-window__dot site-window__dot--green" />
                  </div>
                  <div className="site-window__url">riverly.app/sales/pipeline</div>
                  <div className="site-window__badge">Active Deals</div>
                </div>
                <div className="site-window__body">
                  <img
                    src="/home/sales-command-center.jpg"
                    alt="Riverly Sales Command Center Pipeline"
                    className="site-window__img"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Feature 2: Automated Follow-Ups */}
          <section className="site-section site-pillar site-pillar--reverse">
            <div className="site-pillar__visual">
              <div className="site-window">
                <div className="site-window__header">
                  <div className="site-window__dots">
                    <span className="site-window__dot site-window__dot--red" />
                    <span className="site-window__dot site-window__dot--yellow" />
                    <span className="site-window__dot site-window__dot--green" />
                  </div>
                  <div className="site-window__url">riverly.app/email/automations</div>
                  <div className="site-window__badge">Automations Active</div>
                </div>
                <div className="site-window__body">
                  <img
                    src="/home/email-automation-hub.jpg"
                    alt="Email Automation and Templates"
                    className="site-window__img"
                  />
                </div>
              </div>
            </div>

            <div className="site-pillar__content">
              <div className="site-eyebrow">
                <Mail size={14} />
                <span>02 · Automated Follow-Ups</span>
              </div>

              <h2 className="site-pillar__heading">
                Follow up with every customer automatically
              </h2>

              <p className="site-pillar__desc">
                Sending quotes is only half the battle. Most deals close after two or three friendly follow-ups.
                Riverly automatically sends polite, professional check-in emails when an estimate hasn&rsquo;t been
                approved, saving your staff hours of manual typing.
              </p>

              <div className="site-pillar__list">
                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Pre-built contractor templates</span>
                    <span className="site-pillar__item-desc">
                      Ready-to-use email templates for estimate deliveries, 48-hour check-ins, and 5-star review requests.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Automatic stop on reply</span>
                    <span className="site-pillar__item-desc">
                      The moment a client responds or signs the proposal, automated sequences stop immediately.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Connects to your existing email</span>
                    <span className="site-pillar__item-desc">
                      Emails send directly from your Google Workspace or Microsoft 365 address so they land in primary inboxes.
                    </span>
                  </div>
                </div>
              </div>

              <div className="site-pillar__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => scrollToAuth('signup')}
                >
                  <span>Explore Templates</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </div>
          </section>

          {/* Feature 3: Central Customer Hub & Accounting */}
          <section className="site-section site-pillar">
            <div className="site-pillar__content">
              <div className="site-eyebrow">
                <Database size={14} />
                <span>03 · Customer Records &amp; Invoicing</span>
              </div>

              <h2 className="site-pillar__heading">
                Keep customer notes, files, and QuickBooks in sync
              </h2>

              <p className="site-pillar__desc">
                Stop hunting through text messages, sticky notes, and separate accounting portals.
                Every customer address, takeoff file, invoice, and phone note lives in one clean timeline
                that estimators, project managers, and office staff can access anytime.
              </p>

              <div className="site-pillar__list">
                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Two-way QuickBooks Online sync</span>
                    <span className="site-pillar__item-desc">
                      Customer profiles, estimates, and invoices stay synced with your accounting books without double entry.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Inspection files &amp; photos attached</span>
                    <span className="site-pillar__item-desc">
                      Store roof measurements, site photos, adjuster paperwork, and contracts directly on the job record.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">15 Ready-to-use business reports</span>
                    <span className="site-pillar__item-desc">
                      Download clean reports on pipeline volume, close rates by rep, and top referral sources with one click.
                    </span>
                  </div>
                </div>
              </div>

              <div className="site-pillar__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => scrollToAuth('signup')}
                >
                  <span>Set Up Central Hub</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className="site-pillar__visual">
              <div className="site-window">
                <div className="site-window__header">
                  <div className="site-window__dots">
                    <span className="site-window__dot site-window__dot--red" />
                    <span className="site-window__dot site-window__dot--yellow" />
                    <span className="site-window__dot site-window__dot--green" />
                  </div>
                  <div className="site-window__url">riverly.app/hub/records</div>
                  <div className="site-window__badge">Customer Sync</div>
                </div>
                <div className="site-window__body">
                  <img
                    src="/home/data-hub-integrations.jpg"
                    alt="Central Data Hub and Integrations"
                    className="site-window__img"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Feature 4: Email Built Into the Pipeline */}
          <section className="site-section site-pillar site-pillar--reverse">
            <div className="site-pillar__visual">
              <div className="site-window">
                <div className="site-window__header">
                  <div className="site-window__dots">
                    <span className="site-window__dot site-window__dot--red" />
                    <span className="site-window__dot site-window__dot--yellow" />
                    <span className="site-window__dot site-window__dot--green" />
                  </div>
                  <div className="site-window__url">riverly.app/jobs/hale-roof-replacement</div>
                  <div className="site-window__badge">Contract stage</div>
                </div>
                <div className="site-window__body">
                  <div className="site-mail-mock" aria-hidden>
                    <div className="site-mail-mock__templates">
                      <span className="site-mail-mock__label">Suggested for this stage</span>
                      <span className="site-mail-mock__template site-mail-mock__template--active">
                        Estimate ready
                      </span>
                      <span className="site-mail-mock__template">Estimate follow-up</span>
                      <span className="site-mail-mock__template">Thank you for signing</span>
                      <span className="site-mail-mock__label">All templates</span>
                      <span className="site-mail-mock__template">Schedule change</span>
                      <span className="site-mail-mock__template">Review request</span>
                    </div>
                    <div className="site-mail-mock__compose">
                      <div className="site-mail-mock__field">
                        <span>To</span>
                        <strong>Robert Hale</strong>
                      </div>
                      <div className="site-mail-mock__field">
                        <span>From</span>
                        <strong>Maria Santos · office@yourroofing.com</strong>
                      </div>
                      <div className="site-mail-mock__field">
                        <span>Subject</span>
                        <strong>Your estimate is ready</strong>
                      </div>
                      <p className="site-mail-mock__body">
                        Hi <mark>Robert</mark>,<br />
                        Your estimate for <mark>Full roof replacement</mark> is ready:{' '}
                        <mark>$18,400</mark>. I&rsquo;m happy to walk through it with you.
                      </p>
                      <div className="site-mail-mock__status">
                        <span className="site-mail-mock__pill site-mail-mock__pill--done">Sent</span>
                        <span className="site-mail-mock__pill site-mail-mock__pill--done">Delivered</span>
                        <span className="site-mail-mock__pill">Logged to Activity</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="site-pillar__content">
              <div className="site-eyebrow">
                <Send size={14} />
                <span>04 · Email Built Into the Pipeline</span>
              </div>

              <h2 className="site-pillar__heading">
                The right email for every stage, one click from the job
              </h2>

              <p className="site-pillar__desc">
                Email lives inside the job, not in a separate inbox. Open any job and Riverly suggests the
                templates that fit its current stage, fills in the customer&rsquo;s name, address, and estimate
                from the record, and sends from your company&rsquo;s own address. Every message lands in the
                job&rsquo;s Activity history so the whole team sees what was said and when.
              </p>

              <div className="site-pillar__list">
                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <FileText size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">13 roofing templates, matched to each stage</span>
                    <span className="site-pillar__item-desc">
                      Welcome, inspection confirmation, estimate ready, work started, payment request, and more.
                      Admins can edit the wording to sound like your company.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <MailCheck size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Delivery tracking on every message</span>
                    <span className="site-pillar__item-desc">
                      See whether each email was sent, delivered, or bounced, right on the job timeline.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Star size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">One-click review requests</span>
                    <span className="site-pillar__item-desc">
                      When a job is completed, ask the homeowner for a review with your review link already filled in.
                    </span>
                  </div>
                </div>
              </div>

              <div className="site-pillar__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => scrollToAuth('signup')}
                >
                  <span>Send Your First Email</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </div>
          </section>

          {/* Feature 5: Reviews & Reputation */}
          <section className="site-section site-pillar">
            <div className="site-pillar__content">
              <div className="site-eyebrow">
                <Star size={14} />
                <span>05 · Reviews &amp; Reputation</span>
              </div>

              <h2 className="site-pillar__heading">
                Turn every finished roof into your next five-star review
              </h2>

              <p className="site-pillar__desc">
                Homeowners pick contractors by what they read online, and the best time to ask for a review is the
                week the job wraps up. Riverly puts the ask right on the completed job and sends customers straight
                to your Google Business Profile or any review page you choose. Over time, that builds the online
                reputation that brings in the next lead.
              </p>

              <div className="site-pillar__list">
                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Ask at the right moment</span>
                    <span className="site-pillar__item-desc">
                      A Request review button sits on every job&rsquo;s Completed stage, so asking becomes part of
                      closing out the job instead of an afterthought.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Know who&rsquo;s been asked</span>
                    <span className="site-pillar__item-desc">
                      Each job shows when a review was requested, by whom, and whether the email was delivered, so
                      no customer gets asked twice by accident or not at all.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Turn website visitors into leads</span>
                    <span className="site-pillar__item-desc">
                      Add Riverly&rsquo;s lead form to your website. New inquiries land in your pipeline automatically,
                      ready for a first call.
                    </span>
                  </div>
                </div>
              </div>

              <div className="site-pillar__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => scrollToAuth('signup')}
                >
                  <span>Start Collecting Reviews</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className="site-pillar__visual">
              <div className="site-window">
                <div className="site-window__header">
                  <div className="site-window__dots">
                    <span className="site-window__dot site-window__dot--red" />
                    <span className="site-window__dot site-window__dot--yellow" />
                    <span className="site-window__dot site-window__dot--green" />
                  </div>
                  <div className="site-window__url">riverly.app/contacts?stage=completed</div>
                  <div className="site-window__badge">Completed</div>
                </div>
                <div className="site-window__body">
                  <div className="site-review-mock" aria-hidden>
                    <div className="site-review-mock__email">
                      <span className="site-review-mock__subject">How did we do?</span>
                      <p>
                        Thank you for choosing Summit Roofing. If you have a moment, we&rsquo;d appreciate hearing
                        about your experience.
                      </p>
                      <span className="site-review-mock__stars">★★★★★</span>
                      <span className="site-review-mock__cta">Leave a review on Google</span>
                    </div>
                    <ul className="site-review-mock__jobs">
                      <li>
                        <strong>Vance · Full shingle install</strong>
                        <span className="site-mail-mock__pill site-mail-mock__pill--done">Requested · Delivered</span>
                      </li>
                      <li>
                        <strong>Ruiz · Storm damage repair</strong>
                        <span className="site-mail-mock__pill site-mail-mock__pill--done">Requested · Delivered</span>
                      </li>
                      <li>
                        <strong>Hale · Roof replacement</strong>
                        <span className="site-review-mock__ask">
                          <Star size={11} /> Request review
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature 6: Mobile App & Push Alerts */}
          <section className="site-section site-pillar site-pillar--reverse">
            <div className="site-pillar__visual">
              <div className="site-phone-mock" aria-hidden>
                <div className="site-phone-mock__screen">
                  <div className="site-phone-mock__notice">
                    <Bell size={14} />
                    <div className="stack gap-0">
                      <strong>New inquiry · Web form</strong>
                      <span>Dana Brooks · Roof leak after storm</span>
                    </div>
                  </div>
                  <div className="site-phone-mock__card">
                    <span className="site-phone-mock__stage">Called</span>
                    <strong>Brooks · Leak repair</strong>
                    <span>412 Cedar Ln</span>
                    <div className="site-phone-mock__actions">
                      <span>Call</span>
                      <span>Text</span>
                      <span>Add photos</span>
                    </div>
                  </div>
                  <div className="site-phone-mock__card site-phone-mock__card--muted">
                    <span className="site-phone-mock__stage">Inspection</span>
                    <strong>Hale · Roof replacement</strong>
                    <span>Today, 2:30 PM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="site-pillar__content">
              <div className="site-eyebrow">
                <Smartphone size={14} />
                <span>06 · Mobile App &amp; Push Alerts</span>
              </div>

              <h2 className="site-pillar__heading">
                Your whole pipeline, from the truck or the roof
              </h2>

              <p className="site-pillar__desc">
                Estimators and owners spend most of the day away from a desk. Riverly works on any phone, so the
                job details, customer history, and next step are in your pocket on every site visit.
              </p>

              <div className="site-pillar__list">
                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Works in your phone&rsquo;s browser today</span>
                    <span className="site-pillar__item-desc">
                      Pipeline, job details, and the Activity history, laid out for small screens. Nothing to install.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Call, text, and add photos on site</span>
                    <span className="site-pillar__item-desc">
                      Tap to call or text a customer, then upload roof photos straight to the job&rsquo;s current stage.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Bell size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">
                      Native app &amp; push alerts <span className="site-soon">Coming soon</span>
                    </span>
                    <span className="site-pillar__item-desc">
                      Get an instant alert the moment a new inquiry comes in, so you can be first to call back.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature 7: Reporting */}
          <section className="site-section site-pillar">
            <div className="site-pillar__content">
              <div className="site-eyebrow">
                <BarChart3 size={14} />
                <span>07 · Reporting</span>
              </div>

              <h2 className="site-pillar__heading">
                Reports that answer the questions you actually ask
              </h2>

              <p className="site-pillar__desc">
                Riverly pulls your leads together from spreadsheets, your website form, HubSpot, WooCommerce, and
                Zapier, then works through all of it in the background. When it&rsquo;s done, you get detailed reports
                in plain language that show where your sales are won and where they slip away.
              </p>

              <div className="site-pillar__list">
                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">How fast you call new leads back</span>
                    <span className="site-pillar__item-desc">
                      See the time from each new inquiry to its first call, for every rep and every lead source.
                      Homeowners usually hire whoever calls first.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Which lead sources bring in signed work</span>
                    <span className="site-pillar__item-desc">
                      Compare referrals, Google, door knocking, and every other source by jobs won and contract dollars,
                      so you know where your marketing money pays off.
                    </span>
                  </div>
                </div>

                <div className="site-pillar__item">
                  <div className="site-pillar__item-icon">
                    <Check size={16} />
                  </div>
                  <div className="stack gap-0">
                    <span className="site-pillar__item-title">Where jobs stall before the contract</span>
                    <span className="site-pillar__item-desc">
                      Follow every lead from first call to completed job and see the exact stage where most of them go
                      quiet, so your team knows what to fix first.
                    </span>
                  </div>
                </div>
              </div>

              <div className="site-pillar__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => scrollToAuth('signup')}
                >
                  <span>See Your Numbers</span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className="site-pillar__visual">
              <div className="site-window">
                <div className="site-window__header">
                  <div className="site-window__dots">
                    <span className="site-window__dot site-window__dot--red" />
                    <span className="site-window__dot site-window__dot--yellow" />
                    <span className="site-window__dot site-window__dot--green" />
                  </div>
                  <div className="site-window__url">riverly.app/settings/reports</div>
                  <div className="site-window__badge">90 days</div>
                </div>
                <div className="site-window__body">
                  <div className="site-report-mock" aria-hidden>
                    <div className="site-report-mock__stats">
                      <div><strong>1h 42m</strong><span>Avg. time to first call</span></div>
                      <div><strong>Referrals</strong><span>Most signed work</span></div>
                      <div><strong>44%</strong><span>Stall after inspection</span></div>
                    </div>
                    <span className="site-mail-mock__label">Leads that reached each stage</span>
                    {[
                      ['Lead', 100],
                      ['Called', 82],
                      ['Inspection', 61],
                      ['Contract', 34],
                      ['Started', 27],
                      ['Completed', 22],
                    ].map(([label, pct]) => (
                      <div key={label} className="site-report-mock__row">
                        <span>{label}</span>
                        <span className="site-report-mock__bar">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                        <span>{pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Sales closer: platform strengths ── */}
        <section className="site-section site-closer">
          <div className="site-section__head site-closer__head">
            <h2 className="site-title">Every lead tracked from first call to finished job.</h2>
            <p className="site-lede">
              Riverly keeps each inquiry, call, email, and estimate in one place and shows your team the next step on
              every open deal, so follow-ups happen on time and sales don&rsquo;t slip away.
            </p>
          </div>

          <div className="site-closer__grid">
            <article className="site-closer__card">
              <h3 className="site-closer__who">Every open lead shows its owner and next follow-up</h3>
              <p className="site-closer__desc">
                Leads move through clear stages, from new inquiry to completed job. Each one shows who is responsible
                and when the next follow-up is due, so nothing depends on someone remembering.
              </p>
            </article>

            <article className="site-closer__card">
              <h3 className="site-closer__who">The full customer history on one page</h3>
              <p className="site-closer__desc">
                Calls, emails, notes, photos, and stage changes are recorded on the job as they happen. Anyone on your
                team can open it and pick up the conversation without asking who spoke to the customer last.
              </p>
            </article>

            <article className="site-closer__card">
              <h3 className="site-closer__who">Missed follow-ups flagged automatically</h3>
              <p className="site-closer__desc">
                One click shows leads nobody has contacted yet, follow-ups that are overdue, appointments coming up,
                and jobs that have been quiet for a week, so you can act before a customer moves on.
              </p>
            </article>
          </div>
        </section>

        {/* ── Simple, Focused Bottom Call-to-Action ── */}
        <div className="site-cta-banner">
          <h2 className="site-cta-banner__title">
            Ready to get your sales pipeline organized?
          </h2>
          <p className="site-cta-banner__desc">
            Start your company workspace in under two minutes. No credit card required.
          </p>
          <div className="site-cta-banner__actions">
            <button
              type="button"
              className="button button--primary button--lg"
              onClick={() => scrollToAuth('signup')}
            >
              <span>Create Workspace</span>
              <ArrowRight size={16} aria-hidden />
            </button>
            <button
              type="button"
              className="button button--secondary button--lg"
              onClick={() => scrollToAuth('login')}
            >
              Sign In
            </button>
          </div>
        </div>
      </main>

      {/* ── Clean, Minimal Footer ── */}
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__simplified">
            <div className="stack gap-1">
              <Link to="/" className="site-wordmark">
                RIVERLY
              </Link>
              <p className="site-note">
                A straightforward sales-first CRM for specialty contractors and service businesses.
              </p>
            </div>

            <div className="site-footer__meta">
              <span className="row gap-2 items-center">
                <ShieldCheck size={14} className="text--success" />
                <span>Bank-level 256-bit encryption · Secure automated backups</span>
              </span>
              <span className="site-note">&copy; {new Date().getFullYear()} Riverly Inc. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
