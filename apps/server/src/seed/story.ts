import { db } from '@project/db'
import { randomUUID } from 'crypto'
import type { AuthContext } from '../lib/context'
import { processBatch } from '../email/worker'
import { ActivityService } from '../services/ActivityService'
import { AttachmentService } from '../services/AttachmentService'
import { ContactService } from '../services/ContactService'
import { EmailService } from '../services/EmailService'
import { FieldworkService } from '../services/FieldworkService'
import { IntakeService } from '../services/IntakeService'
import { OpportunityService } from '../services/OpportunityService'
import { at, REAL_NOW, DAY, HOUR } from './clock'
import { STAGES, type Scenario } from './data'
import { roofPhoto, simplePdf } from './media'

export type Ctx = AuthContext & { orgId: string }
export type Cast = Record<string, Ctx>

const contacts = new ContactService()
const jobs = new OpportunityService()
const activity = new ActivityService()
const fieldwork = new FieldworkService()
const email = new EmailService()
const intake = new IntakeService()
const files = new AttachmentService()
const k = () => randomUUID()

/** Small deterministic PRNG so every seed run produces the same demo data. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Plays one scenario through the real services. Stage k is entered at
 * t_k = D·(1 − k/(T+1)) days ago; every action inside a stage happens between t_k and
 * t_{k+1}, so the history is always in order and nothing lands in the future.
 */
export class Story {
  private photoSeed = 1

  constructor(
    private cast: Cast,
    private externals: Record<string, string>,
    private formToken: string | null,
  ) {}

  async play(s: Scenario, index: number) {
    const rand = rng(index * 7919 + 17)
    const T = STAGES.indexOf(s.stage)
    const D = s.daysAgo
    const t = (k: number) => (k > T ? 0 : D * (1 - k / (T + 1)))
    const phase = (k: number, frac: number) => at(t(k) - (t(k) - t(k + 1)) * frac)
    const owner = s.owner ? this.cast[s.owner]! : null
    const actor = owner ?? this.cast.dana!

    // ── Lead arrives ──
    phase(0, 0)
    let jobId: string
    let contactId: string
    if (s.source === 'web_form' && !owner && this.formToken) {
      await intake.submitPublicForm(
        this.formToken,
        { name: s.name, email: s.email ?? null, phone: s.phone ?? null, address: `${s.street}, ${s.city}`, service: s.title, message: s.inquiry ?? null, consent: true, startedAt: Date.now() - 45_000 },
        `10.0.${index}.1`,
      )
      const job = await db.opportunity.findFirstOrThrow({ where: { organizationId: actor.orgId, contact: { name: s.name } }, orderBy: { createdAt: 'desc' } })
      jobId = job.id
      contactId = job.contactId
    } else {
      const created = await contacts.create(actor, {
        name: s.name,
        email: s.email ?? null,
        phone: s.phone ?? null,
        addressLine: s.street,
        city: s.city,
        region: s.zip.startsWith('80') ? 'CO' : 'ID',
        postalCode: s.zip,
        job: {
          title: s.title,
          propertyAddress: `${s.street}, ${s.city}`,
          leadSourceOptionId: s.source,
          urgencyOptionId: s.urgency ?? null,
          inquiry: s.inquiry ?? null,
          ownerId: owner?.userId ?? null,
        },
      })
      jobId = created.opportunities[0]!.id
      contactId = created.id
    }
    if (s.noOutreach) return { jobId, contactId }

    // ── New Lead phase ──
    if (s.email && rand() < 0.7) {
      phase(0, 0.05)
      await this.send(actor, contactId, jobId, 'welcome')
    }
    if (T === 0) {
      const attempts = s.status?.to === 'LOST' ? 5 : 1
      for (let i = 0; i < attempts; i++) {
        phase(0, 0.15 + (0.6 * i) / attempts)
        await this.attempt(actor, jobId, 'lead', i === 1 ? 'sms' : 'phone', attempts > 1 && i === 2 ? 'voicemail' : 'no_answer', null, s.overdueFollowUp ? -1 : 1)
      }
    } else {
      const outcomes = rand() < 0.5 ? ['no_answer', 'voicemail', 'spoke'] : rand() < 0.5 ? ['voicemail', 'spoke'] : ['spoke']
      for (const [i, outcome] of outcomes.entries()) {
        phase(0, 0.2 + 0.6 * (i / outcomes.length))
        await this.attempt(actor, jobId, 'lead', 'phone', outcome, outcome === 'spoke' ? pick(rand, SPOKE_NOTES) : null)
      }
    }

    // ── Called ──
    if (T >= 1) {
      phase(1, 0)
      await this.move(actor, jobId, 'called')
      await jobs.setField(actor, jobId, 'interest', T >= 2 ? 'interested' : pick(rand, ['interested', 'undecided']))
      if (T === 1) {
        phase(1, 0.4)
        await this.attempt(actor, jobId, 'called', rand() < 0.5 ? 'sms' : 'phone', rand() < 0.5 ? 'voicemail' : 'sent', 'Offered Thursday or Friday for an inspection.', s.overdueFollowUp ? -1.5 : 2)
        if (s.email) {
          phase(1, 0.6)
          await this.send(actor, contactId, jobId, 'follow_up')
        }
        if (rand() < 0.5) await jobs.setField(actor, jobId, 'sales_notes', pick(rand, SALES_NOTES))
      }
    }

    // ── Inspection ──
    if (T >= 2) {
      phase(2, 0)
      await this.move(actor, jobId, 'inspection')
      const inspector = this.externals[rand() < 0.6 ? 'ivan' : 'grace'] ?? null
      if (inspector) await fieldwork.addParticipant(actor, jobId, { roleKey: 'inspector', stageId: 'inspection', externalPersonId: inspector })
      const upcoming = T === 2 && s.upcomingInspectionInDays
      const startsAt = upcoming ? new Date(REAL_NOW + s.upcomingInspectionInDays! * DAY + 10 * HOUR) : new Date(Date.now() + (t(2) - t(3)) * 0.4 * DAY)
      phase(2, 0.1)
      const appt = await fieldwork.createAppointment(actor, jobId, { stageId: 'inspection', startsAt: roundToHour(startsAt).toISOString(), externalPersonId: inspector, notes: upcoming ? 'Gate code at the side yard.' : null })
      if (s.email) await this.send(actor, contactId, jobId, 'inspection_confirmation')
      if (!upcoming) {
        phase(2, 0.45)
        await fieldwork.updateAppointment(actor, appt.id, { status: 'COMPLETED' })
        if (s.photos) for (let i = 0; i < 3; i++) await this.upload(actor, jobId, 'inspection_photos', `inspection-${i + 1}.png`, 'image/png', roofPhoto(this.photoSeed++))
        await this.upload(actor, jobId, 'inspection_report', 'inspection-report.pdf', 'application/pdf', simplePdf(`Roof inspection — ${s.street}`, INSPECTION_LINES))
        await activity.log(actor, jobId, { kind: 'note', stageId: 'inspection', note: s.note ?? pick(rand, FINDINGS), idempotencyKey: k() })
        if (s.estimate) {
          phase(2, 0.6)
          await jobs.update(actor, jobId, { estimatedValueCents: s.estimate * 100 })
          if (s.email) await this.send(actor, contactId, jobId, 'inspection_complete')
          if (s.email && T >= 3) await this.send(actor, contactId, jobId, 'estimate_ready')
        }
      }
    }

    // ── Contract signed ──
    if (T >= 3) {
      phase(3, 0)
      await this.move(actor, jobId, 'contract')
      const value = (s.estimate ?? 15_000) * 100
      await jobs.update(actor, jobId, { contractValueCents: value })
      await jobs.setField(actor, jobId, 'signature_status', 'signed')
      await this.upload(actor, jobId, 'contract_file', 'signed-contract.pdf', 'application/pdf', simplePdf(`Contract — ${s.name}`, [`Scope: ${s.title}`, `Property: ${s.street}, ${s.city}`, `Contract value: $${(value / 100).toLocaleString('en-US')}`, 'Signed by homeowner and NV Custom Homes.']))
      phase(3, 0.2)
      await fieldwork.createExternalLink(actor, jobId, {
        kind: 'DEPOSIT',
        label: 'Deposit invoice',
        url: `https://pay.example.com/nv/${jobId.slice(-6)}/deposit`,
        amountCents: Math.round(value * 0.3),
        statusLabel: T > 3 ? 'Paid' : 'Requested',
      })
      if (s.email) await this.send(actor, contactId, jobId, 'thank_you_signing')
    }

    // ── Job started ──
    if (T >= 4) {
      phase(4, 0)
      await this.move(actor, jobId, 'started')
      await jobs.setField(actor, jobId, 'start_date', new Date().toISOString().slice(0, 10))
      const crew = this.cast.ava ?? actor
      const crewPerson = this.externals[rand() < 0.5 ? 'luis' : 'dmitri']
      if (crewPerson) await fieldwork.addParticipant(crew, jobId, { roleKey: 'crew', stageId: 'started', externalPersonId: crewPerson })
      if (s.email) await this.send(actor, contactId, jobId, 'work_started')
      phase(4, 0.3)
      await activity.log(crew, jobId, { kind: 'progress', stageId: 'started', note: 'Crew on site. Tear-off underway; dumpster in the driveway.', idempotencyKey: k() })
      phase(4, 0.6)
      await activity.log(crew, jobId, { kind: 'progress', stageId: 'started', note: pick(rand, PROGRESS), idempotencyKey: k() })
    }

    // ── Job completed ──
    if (T >= 5) {
      phase(5, 0)
      await this.move(actor, jobId, 'completed')
      if (s.photos) for (let i = 0; i < 4; i++) await this.upload(this.cast.ava ?? actor, jobId, 'final_photos', `final-${i + 1}.png`, 'image/png', roofPhoto(this.photoSeed++))
      await this.upload(this.cast.ava ?? actor, jobId, 'completion_report', 'completion-report.pdf', 'application/pdf', simplePdf(`Completion report — ${s.street}`, ['Final walk-through completed with homeowner.', 'Magnetic sweep of yard and driveway done.', 'Warranty registration submitted.']))
      const value = (s.estimate ?? 15_000) * 100
      const invoice = await fieldwork.createExternalLink(actor, jobId, {
        kind: 'INVOICE',
        label: `Final invoice INV-${String(1000 + index)}`,
        url: `https://pay.example.com/nv/${jobId.slice(-6)}/final`,
        amountCents: Math.round(value * 0.7),
        statusLabel: 'Sent',
      })
      if (s.email) await this.send(actor, contactId, jobId, 'job_completed')
      if (s.paid) {
        phase(5, 0.3)
        await fieldwork.updateExternalLink(actor, invoice.id, { statusLabel: 'Paid' })
      }
      if (s.reviewRequested && s.email) {
        phase(5, 0.5)
        await this.send(actor, contactId, jobId, 'review_request')
      }
    }

    // ── Lifecycle status (lost / on hold / canceled) ──
    if (s.status) {
      phase(T, 0.9)
      await jobs.setStatus(actor, jobId, { status: s.status.to, reason: s.status.reason, idempotencyKey: k() })
    }
    return { jobId, contactId }
  }

  private async move(ctx: Ctx, jobId: string, toStageId: string) {
    await jobs.transition(ctx, jobId, { toStageId, idempotencyKey: k() })
  }

  private async attempt(ctx: Ctx, jobId: string, stageId: string, methodId: string, outcomeId: string, note: string | null, followUpDays?: number) {
    await activity.log(ctx, jobId, {
      kind: 'contact_attempt',
      stageId,
      methodId,
      outcomeId,
      note,
      nextFollowUpAt: followUpDays !== undefined ? new Date((followUpDays < 0 ? REAL_NOW : Date.now()) + followUpDays * DAY).toISOString() : null,
      idempotencyKey: k(),
    })
  }

  private async upload(ctx: Ctx, jobId: string, fieldId: string, filename: string, mimetype: string, buffer: Buffer) {
    await files.upload(ctx, { filename, mimetype, buffer }, { opportunityId: jobId, fieldId })
  }

  /** Renders the stock template against real records, queues it and lets the worker deliver it. */
  async send(ctx: Ctx, contactId: string, opportunityId: string | null, templateKey: string) {
    const template = await db.emailTemplate.findFirstOrThrow({ where: { organizationId: ctx.orgId, stableKey: templateKey } })
    const r = await email.render(ctx, { templateId: template.id, contactId, opportunityId })
    if (r.unresolved.length || r.blockers.length) throw new Error(`Seed email "${templateKey}" not sendable: ${[...r.unresolved, ...r.blockers].join(', ')}`)
    await email.send(ctx, { templateId: template.id, contactId, opportunityId, subject: r.subject, body: r.body, idempotencyKey: k() })
    await processBatch()
  }
}

const pick = <T>(rand: () => number, list: T[]) => list[Math.floor(rand() * list.length)]!
const roundToHour = (d: Date) => new Date(Math.round(d.getTime() / HOUR) * HOUR)

const SPOKE_NOTES = [
  'Wants an inspection this week. Has one other estimate.',
  'Insurance claim likely — asked us to document everything.',
  'Comparing architectural shingle vs. metal.',
  'Prefers texts during the day; calls after 5pm.',
  'Neighbor recommended us. Ready to move quickly.',
]
const SALES_NOTES = ['Budget around $20k. Financing questions.', 'Decision maker is the spouse — include both on emails.', 'HOA approval needed for color change.']
const FINDINGS = [
  'Granule loss across the south slope; two cracked boot flashings.',
  'Soft decking near the north valley; recommend full tear-off.',
  'Hail bruising on ridge caps and vents. Documented for the adjuster.',
  'Underlayment exposed at three spots. Gutters pulling away on the east side.',
]
const PROGRESS = ['Underlayment and drip edge done. Shingles tomorrow.', 'Shingles installed; ridge vent and cleanup tomorrow.', 'Replaced 6 sheets of decking. Back on schedule.']
const INSPECTION_LINES = ['Roof age: ~22 years', 'Material: asphalt 3-tab, one layer', 'Findings: granule loss, lifted tabs, flashing wear', 'Recommendation: full replacement', 'Photos attached in Riverly']
