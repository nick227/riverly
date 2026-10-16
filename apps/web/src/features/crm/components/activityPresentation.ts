import type { ActivityItem as Item } from '@project/sdk'

/** Muted colour family for an event's icon; routine items stay quiet, milestones get a tint. */
export type Tone = 'call' | 'email' | 'lead' | 'appointment' | 'stage' | 'neutral'

// Roofing template stage IDs (stable across label edits) that deserve a celebration.
const MILESTONE_STAGES: Record<string, string> = { contract: 'Contract signed', completed: 'Job completed' }
const GROUP_MIN = 3

export function activityTone(item: Item): Tone {
  const t = item.type
  if (t === 'contact.attempt') return 'call'
  if (t === 'email.message' || t === 'review.requested') return 'email'
  if (t === 'lead.received' || t === 'contact.created' || t === 'import.completed' || t === 'intake.review_needed') return 'lead'
  if (t.startsWith('appointment.')) return 'appointment'
  if (t === 'stage.changed' || t === 'status.changed') return 'stage'
  return 'neutral'
}

/**
 * Eyebrow label for wins worth celebrating, or null for routine activity. New leads keep
 * their amber icon only: they arrive too often to stand out without drowning the river.
 */
export function milestoneLabel(item: Item): string | null {
  const p = (item.payload ?? {}) as Record<string, unknown>
  if (item.type === 'appointment.scheduled' && p.kind === 'inspection') return 'Inspection booked'
  if (item.type === 'stage.changed' && p.kind === 'FORWARD') return MILESTONE_STAGES[p.toStageId as string] ?? null
  if (item.type === 'status.changed' && p.toStatus === 'WON') return 'Job won'
  return null
}

export type RiverRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'item'; key: string; item: Item }
  | { kind: 'group'; key: string; items: Item[] }

/**
 * Lays out a page of events for reading: a separator per calendar day (company timezone)
 * and runs of three or more contact attempts by the same person collapsed into one row.
 */
export function riverRows(items: Item[], timezone?: string, now = new Date()): RiverRow[] {
  const rows: RiverRow[] = []
  const today = dayKey(now, timezone)
  let currentDay: string | null = null
  let run: Item[] = []
  const flush = () => {
    if (run.length >= GROUP_MIN) rows.push({ kind: 'group', key: `g_${run[0]!.id}`, items: run })
    else for (const item of run) rows.push({ kind: 'item', key: item.id, item })
    run = []
  }
  for (const item of items) {
    const day = dayKey(new Date(item.occurredAt), timezone)
    if (day !== currentDay) {
      flush()
      currentDay = day
      rows.push({ kind: 'day', key: `d_${day}`, label: dayLabel(day, today) })
    }
    if (groupable(item) && run.length && run[0]!.actor?.id === item.actor?.id) {
      run.push(item)
      continue
    }
    flush()
    if (groupable(item)) run.push(item)
    else rows.push({ kind: 'item', key: item.id, item })
  }
  flush()
  return rows
}

/** Plain logged attempts only; anything with discussion or files stays on its own row. */
function groupable(item: Item) {
  return item.type === 'contact.attempt' && !!item.actor && !item.commentCount && !item.reactions.length && !item.attachments.length
}

/** Calendar day (YYYY-MM-DD) of an instant in the given zone. */
function dayKey(at: Date, timezone?: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

function dayLabel(day: string, today: string) {
  const diff = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  // Noon UTC on that calendar date formats to the same date in any zone within ±12h.
  const noon = new Date(`${day}T12:00:00Z`)
  if (diff > 1 && diff < 7) return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(noon)
  const sameYear = day.slice(0, 4) === today.slice(0, 4)
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(noon)
}
