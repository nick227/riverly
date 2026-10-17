import type { ReactNode } from 'react'

export function Stat({ value, label, hint }: { value: ReactNode; label: ReactNode; hint?: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
      {hint ? <span className="stat__hint">{hint}</span> : null}
    </div>
  )
}

