import type { ReactNode } from 'react'

export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="crm-auth">
      <div className="crm-auth__panel">
        <img src="/favicon.svg" alt="" className="crm-auth__mark" />
        <div className="stack gap-2">
          <h1 className="heading heading--2">{title}</h1>
          {subtitle ? <p className="text text--sm text--muted">{subtitle}</p> : null}
        </div>
        {children}
        {footer ? <div className="text text--sm text--muted">{footer}</div> : null}
      </div>
    </main>
  )
}
