// Seeded clock: services call `new Date()` / `Date.now()`, so moving this clock places each
// action at a realistic point in the past without special seeding code paths.
export const HOUR = 3600_000
export const DAY = 24 * HOUR

const RealDate = Date
export const REAL_NOW = RealDate.now()
let offsetMs = 0

class SeedDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(RealDate.now() + offsetMs)
    else super(...(args as [string]))
  }
  static now() {
    return RealDate.now() + offsetMs
  }
}

export function installSeedClock() {
  globalThis.Date = SeedDate as DateConstructor
}

/** Move the clock to `daysAgo` days in the past (fractions allowed; never into the future). */
export function at(daysAgo: number) {
  offsetMs = -Math.max(daysAgo, 0.0005) * DAY
}

export function realNow() {
  offsetMs = 0
}
