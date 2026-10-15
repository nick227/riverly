/**
 * Development seed: NV Custom Homes (the pilot-shaped demo company) and Summit Roofing (a
 * second tenant proving isolation). Everything is created through the same services the
 * API uses, under a seeded clock, so history, events and summaries are realistic.
 *
 *   pnpm db:seed            # refuses if demo data already exists
 *   pnpm db:seed --reset    # wipes the dev database first (never in production)
 */
import bcrypt from 'bcryptjs'
import { db } from '@project/db'
import type { OrgRole } from '@project/db'
import { randomUUID } from 'crypto'
import { config } from './lib/config'
import type { AuthContext } from './lib/context'
import { processBatch, setImmediateDevDelivery } from './email/worker'
import { provisionOrganization } from './services/provisioning'
import { ActivityService } from './services/ActivityService'
import { ContactService } from './services/ContactService'
import { EmailService } from './services/EmailService'
import { FieldworkService } from './services/FieldworkService'
import { IntakeService } from './services/IntakeService'
import { OpportunityService } from './services/OpportunityService'
import { ProfileService } from './services/ProfileService'
import { ResourceService } from './services/WorkflowService'

export const DEMO_PASSWORD = 'riverly-demo-2026'

// ── Seeded clock ─────────────────────────────────────────────────────────────
const RealDate = Date
const REAL_NOW = RealDate.now()
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
globalThis.Date = SeedDate as DateConstructor
const HOUR = 3600_000
const DAY = 24 * HOUR
/** Set the clock to `days` ago (fractional) plus `hours`. */
const at = (days: number, hours = 0) => {
  offsetMs = -(days * DAY) + hours * HOUR
}
const realNow = () => {
  offsetMs = 0
}

// ── Services ─────────────────────────────────────────────────────────────────
const contacts = new ContactService()
const jobs = new OpportunityService()
const activity = new ActivityService()
const fieldwork = new FieldworkService()
const email = new EmailService()
const intake = new IntakeService()
const profiles = new ProfileService()
const resources = new ResourceService()
const k = () => randomUUID()

async function main() {
  if (config.isProd) throw new Error('Refusing to seed a production database')
  if (process.argv.includes('--reset')) await reset()
  if (await db.organization.findUnique({ where: { slug: 'nv-custom-homes' } })) {
    console.log('Demo data already present. Run `pnpm db:seed --reset` to start over.')
    return
  }
  setImmediateDevDelivery(true)
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10)

  // ── Company A ──────────────────────────────────────────────────────────────
  at(60)
  const nv = await company('NV Custom Homes', 'nv-custom-homes', 'America/Boise', 'https://g.page/r/nv-custom-homes/review', hash, [
    ['Chris Harper', 'chris@nvcustomhomes.test', 'OWNER', 'Owner'],
    ['Dana Price', 'dana@nvcustomhomes.test', 'ADMIN', 'Office manager'],
    ['Marcus Webb', 'marcus@nvcustomhomes.test', 'MANAGER', 'Sales manager'],
    ['Nina Ortiz', 'nina@nvcustomhomes.test', 'MEMBER', 'Salesperson'],
    ['Jake Turner', 'jake@nvcustomhomes.test', 'MEMBER', 'Salesperson'],
  ])
  const { chris, dana, marcus, nina, jake } = nv.people
  await db.user.update({ where: { id: nina.userId }, data: { bio: 'Twelve years helping Treasure Valley homeowners get the roof they actually need.' } })

  for (const r of [
    { label: 'Call guide', url: 'https://example.com/nv/call-guide', stageIds: ['lead', 'called'], description: 'What to ask on the first call' },
    { label: 'Inspection checklist', url: 'https://example.com/nv/inspection-checklist', stageIds: ['inspection'] },
    { label: 'Contract template', url: 'https://example.com/nv/contract-template', stageIds: ['contract'] },
    { label: 'Job completion checklist', url: 'https://example.com/nv/completion-checklist', stageIds: ['completed'] },
  ])
    await resources.create(dana, r)
  const form = await intake.createForm(dana, { label: 'Website inspection request', headline: 'Book a free roof inspection', successMessage: 'Thanks! We’ll call you within one business day.' })
  const ivan = await fieldwork.createExternalPerson(marcus, { displayName: 'Ivan Petrov', companyName: 'Treasure Valley Inspections', phone: '(208) 555-0142' })
  const crewLead = await fieldwork.createExternalPerson(marcus, { displayName: 'Luis Romero', companyName: 'Romero Roofing Crew', phone: '(208) 555-0177' })

  // Don Lou — first job, full lifecycle (45 → 3 days ago)
  at(45)
  const don = await contacts.create(nina, {
    name: 'Don Lou', email: 'donlou@example.com', phone: '(555) 123-4567', addressLine: '123 Maple Ave', city: 'Boise', region: 'ID', postalCode: '83704',
    notes: 'Prefers detailed explanations and photos.',
    job: { title: 'Roof replacement', propertyAddress: '123 Maple Ave, Boise, ID 83704', leadSourceOptionId: 'google_ad', urgencyOptionId: 'quarter', inquiry: 'Shingles lifting after the spring storm; wants a full replacement quote.', ownerId: nina.userId },
  })
  const donJob = don.opportunities[0]!.id
  await send(nina, don.id, donJob, 'welcome')
  at(44, 2)
  await call(nina, donJob, 'phone', 'no_answer')
  at(44, 6)
  await call(nina, donJob, 'phone', 'voicemail', 'Left a voicemail with my direct line.')
  at(43, 1)
  await call(nina, donJob, 'phone', 'spoke', 'Wants an inspection next week. Has two estimates already.', 2)
  await move(nina, donJob, 'called')
  await jobs.setField(nina, donJob, 'interest', 'interested')
  at(42)
  await move(nina, donJob, 'inspection')
  const donInspection = await fieldwork.createAppointment(nina, donJob, { stageId: 'inspection', startsAt: new Date(Date.now() + 2 * DAY).toISOString(), externalPersonId: ivan.id })
  await fieldwork.addParticipant(nina, donJob, { roleKey: 'inspector', stageId: 'inspection', externalPersonId: ivan.id })
  await send(nina, don.id, donJob, 'inspection_confirmation')
  at(40)
  await fieldwork.updateAppointment(nina, donInspection.id, { status: 'COMPLETED' })
  await note(nina, donJob, 'Decking soft near the north valley; recommend full tear-off. Photos uploaded to the shared drive.', 'inspection')
  await jobs.update(nina, donJob, { estimatedValueCents: 2_840_000 })
  await send(nina, don.id, donJob, 'inspection_complete')
  at(36)
  await move(nina, donJob, 'contract')
  await jobs.update(nina, donJob, { contractValueCents: 2_840_000 })
  await jobs.setField(nina, donJob, 'signature_status', 'signed')
  await fieldwork.createExternalLink(nina, donJob, { kind: 'DEPOSIT', label: 'Deposit invoice', url: 'https://example.com/pay/nv-1042-deposit', amountCents: 500_000, statusLabel: 'Paid' })
  await send(nina, don.id, donJob, 'thank_you_signing')
  at(25)
  await move(nina, donJob, 'started')
  await jobs.setField(nina, donJob, 'start_date', isoDate(new Date()))
  await fieldwork.addParticipant(nina, donJob, { roleKey: 'crew', stageId: 'started', externalPersonId: crewLead.id })
  await activity.log(nina, donJob, { kind: 'progress', stageId: 'started', note: 'Tear-off complete. Replaced 6 sheets of decking.', idempotencyKey: k() })
  await send(nina, don.id, donJob, 'work_started')
  at(22)
  await activity.log(nina, donJob, { kind: 'progress', stageId: 'started', note: 'Underlayment and shingles installed. Ridge vent tomorrow.', idempotencyKey: k() })
  at(20)
  await move(nina, donJob, 'completed')
  const finalInvoice = await fieldwork.createExternalLink(nina, donJob, { kind: 'INVOICE', label: 'Final invoice INV-0042', url: 'https://example.com/pay/nv-0042', amountCents: 2_340_000, statusLabel: 'Sent' })
  await send(nina, don.id, donJob, 'job_completed')
  await activity.createPost(nina, { body: 'Final walk-through at the Lou house done — customer is thrilled with the results.', opportunityId: donJob, idempotencyKey: k() })
  at(17)
  await fieldwork.updateExternalLink(nina, finalInvoice.id, { statusLabel: 'Paid' })
  at(3)
  await send(nina, don.id, donJob, 'review_request')

  // Don Lou — second, independent job (today, unassigned)
  at(0, -5)
  await contacts.createOpportunity(jake, don.id, { title: 'Gutter replacement', propertyAddress: '88 Ridge Rd, Eagle, ID 83616', leadSourceOptionId: 'repeat_customer', inquiry: 'Rental property gutters pulling away from the fascia.' })

  // Maria Santos — Called (4 days)
  at(4)
  const maria = await contacts.create(jake, {
    name: 'Maria Santos', email: 'maria.santos@example.com', phone: '(208) 555-0199', addressLine: '42 Cedar Ln', city: 'Meridian', region: 'ID', postalCode: '83642',
    job: { title: 'Roof repair', propertyAddress: '42 Cedar Ln, Meridian, ID 83642', leadSourceOptionId: 'local_services_ad', urgencyOptionId: 'asap', inquiry: 'Leak above the kitchen after heavy rain.', ownerId: jake.userId },
  })
  const mariaJob = maria.opportunities[0]!.id
  at(4, 1)
  await call(jake, mariaJob, 'phone', 'no_answer')
  await move(jake, mariaJob, 'called')
  at(3, 3)
  await call(jake, mariaJob, 'phone', 'voicemail', 'Second try. Will text tomorrow morning.', 1)
  at(2)
  await call(jake, mariaJob, 'sms', 'sent', 'Texted to offer Thursday or Friday for an inspection.')
  await send(jake, maria.id, mariaJob, 'follow_up')

  // Robert Hale — Inspection scheduled (11 days)
  at(11)
  const robert = await contacts.create(nina, {
    name: 'Robert Hale', email: 'rhale@example.com', phone: '(208) 555-0123', addressLine: '7 Bluff View', city: 'Boise', region: 'ID', postalCode: '83702',
    job: { title: 'Roof replacement', propertyAddress: '7 Bluff View, Boise, ID 83702', leadSourceOptionId: 'referral', urgencyOptionId: 'flexible', inquiry: 'Referred by the Lous. 25-year-old roof, considering metal.', ownerId: nina.userId },
  })
  const robertJob = robert.opportunities[0]!.id
  at(10)
  await call(nina, robertJob, 'phone', 'spoke', 'Interested in metal vs. architectural shingle comparison.')
  await move(nina, robertJob, 'called')
  await jobs.setField(nina, robertJob, 'interest', 'undecided')
  at(1)
  await move(nina, robertJob, 'inspection')
  await fieldwork.createAppointment(nina, robertJob, { stageId: 'inspection', startsAt: new Date(REAL_NOW + 2 * DAY + 3 * HOUR).toISOString(), externalPersonId: ivan.id, notes: 'Bring metal samples.' })
  await fieldwork.addParticipant(nina, robertJob, { roleKey: 'inspector', stageId: 'inspection', externalPersonId: ivan.id })

  // Angela Ruiz — Contract signed (25 days)
  at(25)
  const angela = await contacts.create(jake, {
    name: 'Angela Ruiz', email: 'angela.ruiz@example.com', phone: '(208) 555-0168', addressLine: '310 Willow Way', city: 'Nampa', region: 'ID', postalCode: '83651',
    job: { title: 'Roof replacement', propertyAddress: '310 Willow Way, Nampa, ID 83651', leadSourceOptionId: 'google_ad', urgencyOptionId: 'quarter', ownerId: jake.userId },
  })
  const angelaJob = angela.opportunities[0]!.id
  at(24)
  await call(jake, angelaJob, 'phone', 'spoke')
  await move(jake, angelaJob, 'called')
  at(20)
  await move(jake, angelaJob, 'inspection')
  at(15)
  await jobs.update(jake, angelaJob, { estimatedValueCents: 2_840_000 })
  await send(jake, angela.id, angelaJob, 'estimate_ready')
  at(6)
  await move(jake, angelaJob, 'contract')
  await jobs.update(jake, angelaJob, { contractValueCents: 2_840_000 })
  await jobs.setField(jake, angelaJob, 'signature_status', 'signed')
  await fieldwork.createExternalLink(jake, angelaJob, { kind: 'DEPOSIT', label: 'Deposit', url: 'https://example.com/pay/nv-1055-deposit', amountCents: 710_000, statusLabel: 'Requested' })

  // Tom Becker — Job started (18 days)
  at(18)
  const tom = await contacts.create(marcus, {
    name: 'Tom Becker', email: 'tom.becker@example.com', phone: '(208) 555-0110', addressLine: '5 Harbor Ct', city: 'Eagle', region: 'ID', postalCode: '83616',
    job: { title: 'Storm damage repair', propertyAddress: '5 Harbor Ct, Eagle, ID 83616', leadSourceOptionId: 'referral', urgencyOptionId: 'asap', ownerId: jake.userId },
  })
  const tomJob = tom.opportunities[0]!.id
  await call(jake, tomJob, 'phone', 'spoke')
  await move(jake, tomJob, 'called')
  at(16)
  await move(jake, tomJob, 'inspection')
  at(12)
  await move(jake, tomJob, 'contract')
  await jobs.update(jake, tomJob, { contractValueCents: 1_420_000 })
  at(2)
  await move(jake, tomJob, 'started')
  await fieldwork.addParticipant(jake, tomJob, { roleKey: 'crew', stageId: 'started', externalPersonId: crewLead.id })
  await activity.log(jake, tomJob, { kind: 'progress', stageId: 'started', note: 'Crew on site. Tarping the north slope before rain.', idempotencyKey: k() })

  // Lena Ford — lost (9 days)
  at(9)
  const lena = await contacts.create(jake, {
    name: 'Lena Ford', email: 'lena.ford@example.com', phone: '(208) 555-0155',
    job: { title: 'Roof repair', leadSourceOptionId: 'google_ad', ownerId: jake.userId },
  })
  const lenaJob = lena.opportunities[0]!.id
  await call(jake, lenaJob, 'phone', 'spoke')
  await move(jake, lenaJob, 'called')
  at(7)
  await jobs.setStatus(jake, lenaJob, { status: 'LOST', reason: 'Chose a lower bid from another contractor.', idempotencyKey: k() })

  // Website leads (today): one clean, one ambiguous → review queue
  realNow()
  await intake.submitPublicForm(form.publicToken, { name: 'Priya Shah', email: 'priya.shah@example.com', phone: '(208) 555-0133', address: '19 Aspen Dr, Boise, ID', service: 'Roof inspection', message: 'Buying this house — want an inspection before closing.', startedAt: Date.now() - 40_000 }, '127.0.0.1')
  await intake.submitPublicForm(form.publicToken, { name: 'Donna Lou', email: 'donlou@example.com', phone: null, service: 'Skylight leak', message: 'Same household as Don?', startedAt: Date.now() - 30_000 }, '127.0.0.2')

  // Team activity
  at(30)
  await activity.createPost(chris, { body: 'Welcome to Riverly, team. Log every call — even voicemails — so nothing slips.', idempotencyKey: k() })
  at(19)
  const types = await profiles.recognitionTypes(marcus)
  await profiles.give(marcus, { recipientUserId: nina.userId, typeId: types.find((t) => t.key === 'customer_love')!.id, note: 'The Lou job went flawlessly from first call to final walk-through.' })
  at(1, 4)
  await profiles.give(dana, { recipientUserId: jake.userId, typeId: types.find((t) => t.key === 'clutch')!.id, note: 'Got the Becker roof tarped before the storm.' })
  const posts = await db.activityEvent.findMany({ where: { organizationId: nv.orgId, type: 'post.created' } })
  for (const p of posts) {
    await activity.toggleReaction(marcus, p.id, 'heart')
    await activity.toggleReaction(jake, p.id, 'clap')
  }
  await activity.createComment(marcus, posts[0]!.id, 'Great work, Nina.')

  // ── Company B (isolation) ──────────────────────────────────────────────────
  at(10)
  const summit = await company('Summit Roofing', 'summit-roofing', 'America/Denver', null, hash, [['Sara Kim', 'sara@summitroofing.test', 'OWNER', 'Owner']])
  await contacts.create(summit.people.sara, {
    name: 'Walter Grey', email: 'walter@example.com', phone: '(303) 555-0101',
    job: { title: 'Roof replacement', leadSourceOptionId: 'referral', ownerId: summit.people.sara.userId },
  })

  realNow()
  await processBatch()
  console.log(`
✓ Seeded demo data
  NV Custom Homes  → chris@ (owner) · dana@ (admin) · marcus@ (manager) · nina@ / jake@ (members)  @nvcustomhomes.test
  Summit Roofing   → sara@summitroofing.test (separate company, isolation check)
  Password for all demo users: ${DEMO_PASSWORD}
  Website form: /f/${form.publicToken}
`)
  void dana
}

// ── helpers ──────────────────────────────────────────────────────────────────
async function company(name: string, slug: string, timezone: string, reviewUrl: string | null, passwordHash: string, people: [string, string, OrgRole, string][]) {
  const org = await db.organization.create({ data: { name, slug, timezone, reviewUrl } })
  const out: Record<string, AuthContext & { orgId: string; role: OrgRole }> = {}
  for (const [displayName, emailAddr, role, title] of people) {
    const user = await db.user.create({
      data: { email: emailAddr, passwordHash, displayName, title, slug: displayName.toLowerCase().replace(/\s+/g, '-') },
    })
    await db.membership.create({ data: { organizationId: org.id, userId: user.id, role, createdAt: new Date() } })
    out[displayName.split(' ')[0]!.toLowerCase()] = { userId: user.id, sessionId: 'seed', orgId: org.id, role }
  }
  await db.$transaction((tx) => provisionOrganization(tx, org.id, Object.values(out)[0]!.userId))
  return { orgId: org.id, people: out }
}

async function move(ctx: AuthContext, jobId: string, toStageId: string) {
  await jobs.transition(ctx, jobId, { toStageId, idempotencyKey: k() })
}

async function call(ctx: AuthContext, jobId: string, methodId: string, outcomeId: string, note?: string, followUpDays?: number) {
  await activity.log(ctx, jobId, {
    kind: 'contact_attempt',
    methodId,
    outcomeId,
    note: note ?? null,
    nextFollowUpAt: followUpDays ? new Date(Date.now() + followUpDays * DAY).toISOString() : null,
    idempotencyKey: k(),
  })
}

async function note(ctx: AuthContext, jobId: string, text: string, stageId?: string) {
  await activity.log(ctx, jobId, { kind: 'note', note: text, stageId, idempotencyKey: k() })
}

/** Renders the stock template against real records, then queues and dispatches it. */
async function send(ctx: AuthContext, contactId: string, opportunityId: string, templateKey: string) {
  const template = await db.emailTemplate.findFirstOrThrow({ where: { organizationId: ctx.orgId!, stableKey: templateKey } })
  const r = await email.render(ctx, { templateId: template.id, contactId, opportunityId })
  if (r.unresolved.length || r.blockers.length) throw new Error(`Seed email ${templateKey} not sendable: ${[...r.unresolved, ...r.blockers].join(', ')}`)
  await email.send(ctx, { templateId: template.id, contactId, opportunityId, subject: r.subject, body: r.body, idempotencyKey: k() })
  await processBatch()
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

async function reset() {
  const tables = await db.$queryRaw<{ t: string }[]>`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations'`
  await db.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0')
  for (const { t } of tables) await db.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``)
  await db.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1')
  console.log('Database cleared')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
