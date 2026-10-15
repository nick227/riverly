import { db, type OrgRole } from '@project/db'
import { randomUUID } from 'crypto'
import { config } from '../lib/config'
import { processBatch, setImmediateDevDelivery } from '../email/worker'
import { provisionOrganization } from '../services/provisioning'
import { ActivityService } from '../services/ActivityService'
import { ContactService } from '../services/ContactService'
import { FieldworkService } from '../services/FieldworkService'
import { IntakeService } from '../services/IntakeService'
import { ProfileService } from '../services/ProfileService'
import { TeamService } from '../services/TeamService'
import { ResourceService } from '../services/WorkflowService'
import { at, realNow } from './clock'
import {
  DEMO_COMPANY_SLUG,
  DEMO_PASSWORD,
  EXTERNAL_PEOPLE,
  NV_EXTRA_JOBS,
  NV_PEOPLE,
  NV_SCENARIOS,
  PAST_CLIENTS_CSV,
  PENDING_INVITE,
  SECOND_COMPANY_SLUG,
  SUMMIT_PEOPLE,
  SUMMIT_SCENARIOS,
  type Person,
} from './data'
import { Story, type Cast, type Ctx } from './story'

const k = () => randomUUID()
const activity = new ActivityService()
const contacts = new ContactService()
const fieldwork = new FieldworkService()
const intake = new IntakeService()
const profiles = new ProfileService()
const team = new TeamService()
const resources = new ResourceService()

export async function seedAll(passwordHash: string) {
  setImmediateDevDelivery(true)

  // ── NV Custom Homes ──────────────────────────────────────────────────────
  at(90)
  const nv = await company('NV Custom Homes', DEMO_COMPANY_SLUG, 'America/Boise', 'https://g.page/r/nv-custom-homes/review', NV_PEOPLE, passwordHash)
  const c = nv.cast

  for (const r of [
    { label: 'Call guide', url: 'https://example.com/nv/call-guide', stageIds: ['lead', 'called'], description: 'What to ask on the first call' },
    { label: 'Sales playbook', url: 'https://example.com/nv/sales-playbook', stageIds: ['called'] },
    { label: 'Inspection checklist', url: 'https://example.com/nv/inspection-checklist', stageIds: ['inspection'] },
    { label: 'Contract template', url: 'https://example.com/nv/contract-template', stageIds: ['contract'] },
    { label: 'Crew safety plan', url: 'https://example.com/nv/safety', stageIds: ['started'] },
    { label: 'Job completion checklist', url: 'https://example.com/nv/completion-checklist', stageIds: ['completed'] },
  ])
    await resources.create(c.dana!, r)
  const form = await intake.createForm(c.dana!, { label: 'Website inspection request', headline: 'Book a free roof inspection', successMessage: 'Thanks! We’ll call you within one business day.' })
  const externals: Record<string, string> = {}
  for (const p of EXTERNAL_PEOPLE) {
    const created = await fieldwork.createExternalPerson(c.ava!, { displayName: p.displayName, companyName: p.companyName, phone: p.phone, email: p.email })
    externals[p.key] = created.id
  }

  at(80)
  await activity.createPost(c.chris!, { body: 'Welcome to Riverly, team. Log every call — even voicemails — so nothing slips through.', idempotencyKey: k() })

  // Jobs, oldest first so history interleaves naturally.
  const story = new Story(c, externals, form.publicToken)
  const ordered = NV_SCENARIOS.map((s, i) => ({ s, i })).sort((a, b) => b.s.daysAgo - a.s.daysAgo)
  const played: Record<string, { jobId: string; contactId: string }> = {}
  for (const { s, i } of ordered) played[s.name] = await story.play(s, i)

  for (const extra of NV_EXTRA_JOBS) {
    at(extra.daysAgo)
    const owner = extra.owner ? c[extra.owner]! : c.dana!
    await contacts.createOpportunity(owner, played[extra.contact]!.contactId, {
      title: extra.title,
      propertyAddress: `${extra.street}, ${extra.city}`,
      leadSourceOptionId: extra.source,
      ownerId: extra.owner ? c[extra.owner]!.userId : null,
    })
  }

  // Intake: a CSV of past clients (new, linked and an ambiguous match) and an ambiguous web lead.
  at(15)
  await intake.runImport(c.marcus!, { fileName: 'past-clients-2017-2022.csv', csv: PAST_CLIENTS_CSV, sourceName: 'Past clients spreadsheet', createJobs: false })
  at(0.1)
  await intake.submitPublicForm(
    form.publicToken,
    { name: 'Donna Lou', email: 'donlou@example.com', phone: null, address: '123 Maple Ave, Boise', service: 'Skylight leak', message: 'Same household as Don? Skylight is dripping.', consent: true, startedAt: Date.now() - 60_000 },
    '10.9.9.9',
  )

  // Team activity: posts, comments, reactions and recognition.
  const types = await profiles.recognitionTypes(c.marcus!)
  const type = (key: string) => types.find((t) => t.key === key)!.id
  at(40)
  const lou = await activity.createPost(c.nina!, { body: 'Final walk-through at the Lou house — customer is thrilled with the results.', opportunityId: played['Don Lou']!.jobId, idempotencyKey: k() })
  await profiles.give(c.marcus!, { recipientUserId: c.nina!.userId, typeId: type('customer_love'), note: 'The Lou job went flawlessly from first call to final walk-through.' })
  at(12)
  const crewPost = await activity.createPost(c.ava!, { body: 'Two crews out this week: Becker (storm repair) and Novak (full replacement). Weather looks clear through Friday.', idempotencyKey: k() })
  await profiles.give(c.ava!, { recipientUserId: c.owen!.userId, typeId: type('team_player'), note: 'Rebuilt the crew schedule in an hour when the supplier was late.' })
  at(3)
  await profiles.give(c.dana!, { recipientUserId: c.jake!.userId, typeId: type('clutch'), note: 'Got the Becker roof tarped before the storm.' })
  await profiles.give(c.chris!, { recipientUserId: c.sofia!.userId, typeId: type('craftsmanship'), note: 'Spotless estimate package for the Walsh job.' })
  at(1)
  const owenPost = await activity.createPost(c.owen!, { body: 'Reminder: material deliveries now need 48 hours notice. Ping me before booking start dates.', idempotencyKey: k() })
  for (const [post, reactors] of [
    [lou, ['marcus', 'jake', 'sofia', 'chris']],
    [crewPost, ['owen', 'nina']],
    [owenPost, ['ava', 'tyler']],
  ] as const) {
    for (const who of reactors) await activity.toggleReaction(c[who]!, post.id, who === 'chris' || who === 'ava' ? 'clap' : 'heart')
  }
  await activity.createComment(c.marcus!, lou.id, 'Great work, Nina. Let’s use this one as the example for new hires.')
  await activity.createComment(c.tyler!, owenPost.id, 'Got it — I’ll check with you before promising dates.')

  // Team management state: a pending invitation and a deactivated former salesperson.
  realNow()
  await team.createInvitation(c.chris!, PENDING_INVITE)
  await team.updateMember(c.chris!, c.ryan!.userId, { status: 'DEACTIVATED' })

  // ── Summit Roofing (isolation / company switching) ───────────────────────
  at(30)
  const summit = await company('Summit Roofing', SECOND_COMPANY_SLUG, 'America/Denver', 'https://g.page/r/summit-roofing/review', SUMMIT_PEOPLE, passwordHash)
  const summitStory = new Story(summit.cast, {}, null)
  for (const [i, s] of SUMMIT_SCENARIOS.entries()) await summitStory.play(s, 1000 + i)

  realNow()
  await processBatch()

  const orgIds = [nv.orgId, summit.orgId]
  const [jobs, contactCount, events, messages, fileCount] = await Promise.all([
    db.opportunity.count({ where: { organizationId: { in: orgIds } } }),
    db.contact.count({ where: { organizationId: { in: orgIds } } }),
    db.activityEvent.count({ where: { organizationId: { in: orgIds } } }),
    db.outboundMessage.count({ where: { organizationId: { in: orgIds } } }),
    db.attachment.count({ where: { organizationId: { in: orgIds } } }),
  ])
  const logins = [
    ...NV_PEOPLE.map((p) => ({ email: p.email, role: roleText(p), company: 'NV Custom Homes' })),
    ...SUMMIT_PEOPLE.filter((p) => !NV_PEOPLE.some((n) => n.email === p.email)).map((p) => ({ email: p.email, role: roleText(p), company: 'Summit Roofing' })),
  ]
  return { jobs, contacts: contactCount, events, messages, files: fileCount, password: DEMO_PASSWORD, logins, formToken: form.publicToken, invite: PENDING_INVITE.email }
}

function roleText(p: Person) {
  const multi = p.key === 'alex' ? ' (+ Summit manager)' : ''
  return `${p.role.toLowerCase()}${p.status === 'DEACTIVATED' ? ' (deactivated)' : ''}${multi}`
}

/** Creates (or reuses) users, a company with the roofing workflow, and memberships. */
async function company(name: string, slug: string, timezone: string, reviewUrl: string, people: Person[], passwordHash: string) {
  const org = await db.organization.create({ data: { name, slug, timezone, reviewUrl, createdAt: new Date() } })
  const cast: Cast = {}
  for (const p of people) {
    const user =
      (await db.user.findUnique({ where: { email: p.email } })) ??
      (await db.user.create({
        data: { email: p.email, passwordHash, displayName: p.name, title: p.title, bio: p.bio ?? null, slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), createdAt: new Date() },
      }))
    await db.membership.create({ data: { organizationId: org.id, userId: user.id, role: p.role as OrgRole, createdAt: new Date() } })
    cast[p.key] = { userId: user.id, sessionId: 'seed', orgId: org.id, role: p.role } as Ctx
  }
  await db.$transaction((tx) => provisionOrganization(tx, org.id, cast[people[0]!.key]!.userId))
  // Demo companies always get the simulated sender so seeded and test emails never leave
  // the system — including on Railway, where the dev transport is otherwise disabled.
  if (!config.devEmailAllowed) {
    await db.senderIdentity.create({
      data: {
        organizationId: org.id,
        provider: 'DEV_LOG',
        fromName: `${name} (demo)`,
        fromEmail: `demo@${slug}.riverly.local`,
        verification: 'VERIFIED',
        verifiedAt: new Date(),
        verificationDetail: 'Demo data — simulated delivery only. Connect a Resend sender for real email.',
        isDefault: true,
      },
    })
  }
  return { orgId: org.id, cast }
}
