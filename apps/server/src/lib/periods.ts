const DAY = 24 * 60 * 60 * 1000

export type BoardPeriod = 'today' | 'week'

/** Minutes the zone is ahead of UTC at `at` (e.g. -300 for America/Chicago in winter). */
function zoneOffsetMinutes(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!, +parts.second!)
  return Math.round((asUtc - at.getTime()) / 60000)
}

/** The UTC instant of local midnight on the calendar day containing `at` in `timeZone`. */
export function startOfLocalDay(at: Date, timeZone: string) {
  const offset = zoneOffsetMinutes(at, timeZone)
  const local = new Date(at.getTime() + offset * 60000)
  const midnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  // Re-read the offset at the guessed midnight, so DST-change days land on the real midnight.
  const guess = new Date(midnightAsUtc - offset * 60000)
  return new Date(midnightAsUtc - zoneOffsetMinutes(guess, timeZone) * 60000)
}

/**
 * Current window for the sales board in the company's timezone: today since local midnight,
 * or this week since Monday's local midnight. `previous` is the same span one day/week
 * earlier, cut at the same elapsed time so "so far today vs. by this time yesterday" is fair.
 */
export function boardWindow(period: BoardPeriod, now: Date, timeZone: string) {
  const today = startOfLocalDay(now, timeZone)
  let from = today
  if (period === 'week') {
    const local = new Date(now.getTime() + zoneOffsetMinutes(now, timeZone) * 60000)
    const daysSinceMonday = (local.getUTCDay() + 6) % 7
    from = startOfLocalDay(new Date(today.getTime() - daysSinceMonday * DAY + 12 * 60 * 60 * 1000), timeZone)
  }
  const span = period === 'week' ? 7 : 1
  // Step back by calendar days (via local noon) so DST weeks still start at local midnight.
  const previousFrom = startOfLocalDay(new Date(from.getTime() - span * DAY + 12 * 60 * 60 * 1000), timeZone)
  const elapsed = now.getTime() - from.getTime()
  return { from, to: now, previous: { from: previousFrom, to: new Date(previousFrom.getTime() + elapsed) } }
}
