/**
 * Demo seed — loads users for every role, one fully populated company (NV Custom Homes) and a
 * small second company (Summit Roofing) for isolation tests. Everything goes through the real
 * services under a seeded clock, so history, provenance and summaries are realistic.
 *
 *   pnpm db:seed                         # no-op if demo data already exists
 *   pnpm db:seed -- --reset              # wipe the database first (local/dev)
 *
 * Production (e.g. a Railway test environment) additionally requires ALLOW_DEMO_SEED=true, and a
 * reset there also requires --confirm-wipe. See docs/deployment.md#demo-data.
 */
import bcrypt from 'bcryptjs'
import { db } from '@project/db'
import { installSeedClock, realNow } from './clock'

installSeedClock()

const args = new Set(process.argv.slice(2))
const RESET = args.has('--reset')

async function main() {
  // Imported after the clock is installed and env is validated.
  const { config } = await import('../lib/config')
  if (config.isProd && process.env.ALLOW_DEMO_SEED !== 'true') {
    fail('Refusing to seed a production database. Set ALLOW_DEMO_SEED=true on a test/staging environment to allow demo data.')
  }
  if (RESET && config.isProd && !args.has('--confirm-wipe')) {
    fail('--reset in production deletes ALL data. Re-run with --reset --confirm-wipe if this is a disposable test environment.')
  }
  if (RESET) await reset()
  if (await db.organization.findUnique({ where: { slug: (await import('./data')).DEMO_COMPANY_SLUG } })) {
    console.log('Demo data already present — nothing to do. Use `pnpm db:seed -- --reset` to start over.')
    return
  }
  const started = Date.now()
  const { seedAll } = await import('./seed')
  const summary = await seedAll(await bcrypt.hash((await import('./data')).DEMO_PASSWORD, 10))
  realNow()
  printSummary(summary, Date.now() - started)
}

async function reset() {
  const tables = await db.$queryRaw<{ t: string }[]>`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations'`
  await db.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0')
  for (const { t } of tables) await db.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``)
  await db.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1')
  console.log(`Database cleared (${tables.length} tables)`)
}

function printSummary(s: Awaited<ReturnType<typeof import('./seed').seedAll>>, ms: number) {
  console.log(`\n✓ Demo data loaded in ${(ms / 1000).toFixed(1)}s`)
  console.log(`  ${s.jobs} jobs · ${s.contacts} contacts · ${s.events} activity events · ${s.messages} emails · ${s.files} files`)
  console.log(`  Password for every demo user: ${s.password}\n`)
  for (const row of s.logins) console.log(`  ${row.email.padEnd(32)} ${row.role.padEnd(22)} ${row.company}`)
  console.log(`\n  Website form: /f/${s.formToken}`)
  console.log(`  Pending invitation (not accepted): ${s.invite}\n`)
}

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
