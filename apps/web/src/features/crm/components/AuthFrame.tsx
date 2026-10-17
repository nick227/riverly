import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap, Database, Mail } from 'lucide-react'

export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="site-auth-page">
      <div className="site-auth-page__container">
        {/* Left Side: Auth Card & Navigation */}
        <div className="site-auth-page__main">
          <div className="site-auth-page__top">
            <Link to="/" className="site-auth-page__back">
              <ArrowLeft size={14} />
              <span>Back to Riverly</span>
            </Link>
            <Link to="/" className="site-wordmark" aria-label="Riverly home">
              RIVERLY
            </Link>
          </div>

          <div className="site-auth-page__form-box">
            {children}
            {footer ? <div className="site-auth-page__footer">{footer}</div> : null}
          </div>

          <div className="site-auth-page__bottom">
            <span className="text text--xs text--muted">
              © {new Date().getFullYear()} Riverly Inc. All rights reserved.
            </span>
            <div className="row gap-3 text text--xs text--muted">
              <span>SOC2 Certified</span>
              <span>256-Bit TLS</span>
            </div>
          </div>
        </div>

        {/* Right Side: High-End Showcase Panel (Devin / Cursor aesthetic) */}
        <div className="site-auth-page__showcase" aria-hidden="true">
          <div className="site-auth-showcase__content">
            <div className="site-auth-showcase__badge">
              <Zap size={14} className="text--accent" />
              <span>Sales-First CRM Architecture</span>
            </div>

            <h2 className="site-auth-showcase__title">
              Turn Every Inbound Lead Into a Closed Contract
            </h2>

            <p className="site-auth-showcase__desc">
              Riverly provides your sales, field, and operations teams with one real-time command center.
              Eliminate lost opportunities, enforce a 15-minute response SLA, and synchronize accounting effortlessly.
            </p>

            <div className="site-auth-showcase__cards">
              <div className="site-auth-feature-pill">
                <CheckCircle2 size={16} className="text--success" />
                <div className="stack gap-0">
                  <span className="site-auth-feature-pill__title">15-Minute Response SLA</span>
                  <span className="site-auth-feature-pill__desc">Automated alerts ensure zero leads go cold</span>
                </div>
              </div>

              <div className="site-auth-feature-pill">
                <Database size={16} className="text--accent" />
                <div className="stack gap-0">
                  <span className="site-auth-feature-pill__title">Central Data Hub</span>
                  <span className="site-auth-feature-pill__desc">Bi-directional QuickBooks &amp; Zapier sync</span>
                </div>
              </div>

              <div className="site-auth-feature-pill">
                <Mail size={16} className="text--warning" />
                <div className="stack gap-0">
                  <span className="site-auth-feature-pill__title">Automated Email Sequences</span>
                  <span className="site-auth-feature-pill__desc">Multi-step drips &amp; proven contract templates</span>
                </div>
              </div>
            </div>

            <div className="site-auth-showcase__preview">
              <img
                src="/home/sales-command-center.jpg"
                alt=""
                className="site-auth-showcase__img"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
