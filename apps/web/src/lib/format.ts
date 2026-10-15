const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const money = (cents: number | null | undefined) => (cents === null || cents === undefined ? null : money0.format(cents / 100))

/** Display in the company's timezone; storage is always UTC. */
export function dateTime(iso: string | Date | null | undefined, tz?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: sameYear(iso) ? undefined : 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function dateOnly(iso: string | Date | null | undefined, tz?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: sameYear(iso) ? undefined : 'numeric' })
}

const sameYear = (iso: string | Date) => new Date(iso).getFullYear() === new Date().getFullYear()

export function relative(iso: string | Date | null | undefined) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const future = diff < 0
  const fmt = (n: number, unit: string) => (future ? `in ${n}${unit}` : `${n}${unit} ago`)
  if (abs < 60_000) return future ? 'in a moment' : 'just now'
  if (abs < 3600_000) return fmt(Math.round(abs / 60_000), 'm')
  if (abs < 86_400_000) return fmt(Math.round(abs / 3600_000), 'h')
  if (abs < 7 * 86_400_000) return fmt(Math.round(abs / 86_400_000), 'd')
  return dateOnly(iso)
}

export function daysSince(iso: string | Date) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

/** `<input type="datetime-local">` value for an ISO instant in the browser's zone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null)

export function dollarsToCents(value: string) {
  const n = Number(value.replace(/[^0-9.]/g, ''))
  return value.trim() === '' || Number.isNaN(n) ? null : Math.round(n * 100)
}

export const centsToDollars = (cents: number | null | undefined) => (cents === null || cents === undefined ? '' : String(cents / 100))

export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)
