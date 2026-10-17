import { db, type IntegrationProvider, type Prisma, type Source, type TimestampProvenance } from '@project/db'
import { normalizeEmail, normalizePhone, type WorkflowDefinition } from '@project/shared'
import { parse } from 'csv-parse/sync'
import { appendActivity, transaction } from '../lib/activity'
import { requireOrg, requirePermission, type AuthContext } from '../lib/context'
import { randomToken, sha256 } from '../lib/crypto'
import { conflict, notFound, unprocessable } from '../lib/errors'
import { rateLimit } from '../lib/rateLimit'
import { currentWorkflow } from '../lib/workflow'
import { cleanContact, findMatches } from './ContactService'
import { createJobTx, type NewJobFields } from './jobs'
import { ensureSource } from './sources'

type Tx = Prisma.TransactionClient

import type { ThirdPartyCustomer } from '../integrations/types'

const IMPORT_TARGETS = [
  'name',
  'firstName',
  'lastName',
  'email',
  'phone',
  'addressLine',
  'city',
  'region',
  'postalCode',
  'notes',
  'jobTitle',
  'propertyAddress',
  'inquiry',
  'receivedAt',
] as const
type Target = (typeof IMPORT_TARGETS)[number]

const SYNONYMS: Record<Target, string[]> = {
  name: ['name', 'full name', 'fullname', 'customer', 'customer name', 'client', 'contact'],
  firstName: ['first name', 'firstname', 'first', 'given name'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel'],
  addressLine: ['address', 'street', 'address 1', 'address line 1', 'street address'],
  city: ['city', 'town'],
  region: ['state', 'region', 'province'],
  postalCode: ['zip', 'zip code', 'postal code', 'postcode'],
  notes: ['notes', 'note', 'comments'],
  jobTitle: ['service', 'job', 'job type', 'project', 'work type'],
  propertyAddress: ['property', 'property address', 'job address', 'site address'],
  inquiry: ['inquiry', 'message', 'request', 'description'],
  receivedAt: ['date', 'created', 'created at', 'lead date', 'received', 'submitted'],
}

const MAX_ROWS = 5000

type Proposed = {
  contact: { name: string; email: string | null; phone: string | null; addressLine?: string | null; city?: string | null; region?: string | null; postalCode?: string | null; notes?: string | null }
  job: NewJobFields | null
  providerTimestamp: Date | null
}

type IngestResult = { status: 'NEW_CONTACT' | 'LINKED_EXISTING' | 'UPDATED_EXISTING' | 'PENDING_REVIEW' | 'DUPLICATE_RECORD'; contactId: string | null; opportunityId: string | null }

type Tally = { rowsSeen: number; created: number; updated: number; linked: number; duplicatesFlagged: number; errors: number; skipped: number }
const TALLY_FOR: Record<IngestResult['status'], keyof Tally> = {
  NEW_CONTACT: 'created',
  UPDATED_EXISTING: 'updated',
  LINKED_EXISTING: 'linked',
  PENDING_REVIEW: 'duplicatesFlagged',
  DUPLICATE_RECORD: 'skipped',
}

export class IntakeService {
  async listSources(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const sources = await db.source.findMany({ where: { organizationId: ctx.orgId }, orderBy: { createdAt: 'asc' } })
    const counts = await Promise.all(
      sources.map((s) =>
        db.contact.count({ where: { organizationId: ctx.orgId, deletedAt: null, sourceLinks: { some: { sourceRecord: { sourceId: s.id } } } } }),
      ),
    )
    return sources.map((s, i) => ({ id: s.id, kind: s.kind, displayName: s.displayName, isActive: s.isActive, contactCount: counts[i]! }))
  }

  async preview(auth: AuthContext, input: { csv: string }) {
    requirePermission(auth, 'imports.run')
    const rows = parseCsv(input.csv)
    const headers = rows[0]!
    const suggestedMapping = suggestMapping(headers)
    return { headers, sampleRows: rows.slice(1, 6), suggestedMapping, rowCount: rows.length - 1, targetFields: [...IMPORT_TARGETS] }
  }

  /**
   * Imports rows as immutable source records. Identical rows from the same source are
   * skipped (replay-safe). Rows whose email *and* name match exactly one contact are linked;
   * any other possible match goes to the review queue. Nothing is merged silently.
   */
  async runImport(
    auth: AuthContext,
    input: { fileName: string; csv: string; mapping?: Record<string, string>; sourceName?: string; createJobs?: boolean; defaultJobTitle?: string },
  ) {
    const ctx = requirePermission(auth, 'imports.run')
    const rows = parseCsv(input.csv)
    const headers = rows[0]!
    const mapping = input.mapping ?? suggestMapping(headers)
    assertMapping(mapping, headers)
    const workflow = await currentWorkflow(ctx.orgId)
    const sourceName = input.sourceName?.trim() || input.fileName
    const source = await db.$transaction((tx) => ensureSource(tx, ctx.orgId, 'CSV', sourceName))
    const run = await db.importRun.create({
      data: {
        organizationId: ctx.orgId,
        sourceId: source.id,
        fileName: input.fileName,
        state: 'RUNNING',
        columnMapping: { mapping, createJobs: !!input.createJobs, defaultJobTitle: input.defaultJobTitle ?? null },
        createdById: ctx.userId,
      },
    })
    const tally: Tally = { rowsSeen: 0, created: 0, updated: 0, linked: 0, duplicatesFlagged: 0, errors: 0, skipped: 0 }
    const defaultJobTitle = input.createJobs ? input.defaultJobTitle?.trim() || 'Imported job' : null
    for (let i = 1; i < rows.length; i++) {
      tally.rowsSeen++
      const raw = Object.fromEntries(headers.map((h, j) => [h, rows[i]![j] ?? '']))
      try {
        const proposed = proposeFromRow(raw, mapping, defaultJobTitle)
        assertImportable(proposed)
        const result = await transaction((tx) =>
          ingest(tx, {
            organizationId: ctx.orgId,
            workflow,
            source,
            externalId: sha256(JSON.stringify(raw)),
            rawPayload: raw,
            proposed,
            importRunId: run.id,
            providerTimestampVia: 'IMPORTED',
            actor: { type: 'USER', userId: ctx.userId },
            announceReview: false,
          }),
        )
        tally[TALLY_FOR[result.status]]++
      } catch (err) {
        tally.errors++
        await db.importIssue.create({
          data: { importRunId: run.id, rowNumber: i + 1, message: (err as Error).message?.slice(0, 500) ?? 'Row failed' },
        })
      }
    }
    const state = runState(tally)
    await transaction(async (tx) => {
      await tx.importRun.update({
        where: { id: run.id },
        data: { state, rowsSeen: tally.rowsSeen, created: tally.created, updated: tally.updated, linked: tally.linked, duplicatesFlagged: tally.duplicatesFlagged, errors: tally.errors, finishedAt: new Date() },
      })
      // One grouped river entry per import run, not one per row.
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'import.completed',
        category: 'SYSTEM',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        importRunId: run.id,
        payload: { importRunId: run.id, fileName: input.fileName, sourceName, state, ...tally },
      })
    })
    return this.importOut(run.id)
  }

  async ingestCustomers(
    auth: AuthContext,
    input: {
      provider: string
      sourceName: string
      customers: ThirdPartyCustomer[]
      updateExisting?: boolean
      createJobs?: boolean
      defaultJobTitle?: string
      integrationId?: string | null
    },
  ) {
    const ctx = requirePermission(auth, 'imports.run')
    const workflow = await currentWorkflow(ctx.orgId)
    const source = await db.$transaction((tx) => ensureSource(tx, ctx.orgId, 'API', input.sourceName))
    const run = await db.importRun.create({
      data: {
        organizationId: ctx.orgId,
        sourceId: source.id,
        fileName: `${input.provider} Sync (${new Date().toLocaleDateString('en-US')})`,
        state: 'RUNNING',
        columnMapping: { provider: input.provider, updateExisting: !!input.updateExisting, createJobs: !!input.createJobs },
        createdById: ctx.userId,
      },
    })
    const tally: Tally = { rowsSeen: 0, created: 0, updated: 0, linked: 0, duplicatesFlagged: 0, errors: 0, skipped: 0 }
    const defaultJobTitle = input.createJobs ? input.defaultJobTitle?.trim() || `${input.provider} lead` : null

    for (let i = 0; i < input.customers.length; i++) {
      tally.rowsSeen++
      const c = input.customers[i]!
      try {
        const proposed: Proposed = {
          contact: {
            name: c.name,
            email: c.email ?? null,
            phone: c.phone ?? null,
            addressLine: c.addressLine ?? null,
            city: c.city ?? null,
            region: c.region ?? null,
            postalCode: c.postalCode ?? null,
            notes: c.notes ?? null,
          },
          job: defaultJobTitle ? { title: c.jobTitle ?? defaultJobTitle, propertyAddress: c.propertyAddress ?? c.addressLine, inquiry: c.inquiry } : null,
          providerTimestamp: c.receivedAt ?? null,
        }
        assertImportable(proposed)
        const result = await transaction((tx) =>
          ingest(tx, {
            organizationId: ctx.orgId,
            workflow,
            source,
            externalId: c.externalId,
            rawPayload: (c.rawPayload ?? c) as Record<string, unknown>,
            proposed,
            importRunId: run.id,
            providerTimestampVia: 'PROVIDER',
            actor: { type: 'INTEGRATION', label: input.provider },
            announceReview: true,
            updateExisting: input.updateExisting ?? true,
            provider: input.provider as IntegrationProvider,
            integrationId: input.integrationId ?? null,
          }),
        )
        tally[TALLY_FOR[result.status]]++
      } catch (err) {
        tally.errors++
        await db.importIssue.create({
          data: { importRunId: run.id, rowNumber: i + 1, message: (err as Error).message?.slice(0, 500) ?? 'Record failed' },
        })
      }
    }
    const state = runState(tally)
    await transaction(async (tx) => {
      await tx.importRun.update({
        where: { id: run.id },
        data: { state, rowsSeen: tally.rowsSeen, created: tally.created, updated: tally.updated, linked: tally.linked, duplicatesFlagged: tally.duplicatesFlagged, errors: tally.errors, finishedAt: new Date() },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'import.completed',
        category: 'SYSTEM',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        importRunId: run.id,
        payload: { importRunId: run.id, provider: input.provider, sourceName: input.sourceName, state, ...tally },
      })
    })
    const out = await this.importOut(run.id)
    return {
      runId: run.id,
      provider: input.provider as any,
      sourceName: input.sourceName,
      state: out.state,
      rowsSeen: out.rowsSeen,
      created: out.created,
      updated: out.updated,
      linked: out.linked,
      duplicatesFlagged: out.duplicatesFlagged,
      skipped: tally.skipped,
      errors: out.errors,
      issues: out.issues,
    }
  }

  async listImports(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const runs = await db.importRun.findMany({ where: { organizationId: ctx.orgId }, orderBy: { startedAt: 'desc' }, take: 50, select: { id: true } })
    return Promise.all(runs.map((r) => this.importOut(r.id)))
  }

  private async importOut(id: string) {
    const r = await db.importRun.findUniqueOrThrow({
      where: { id },
      include: { issues: { orderBy: { rowNumber: 'asc' }, take: 100 } },
    })
    const source = await db.source.findUniqueOrThrow({ where: { id: r.sourceId } })
    return {
      id: r.id,
      fileName: r.fileName,
      sourceName: source.displayName,
      state: r.state,
      rowsSeen: r.rowsSeen,
      created: r.created,
      updated: r.updated,
      linked: r.linked,
      duplicatesFlagged: r.duplicatesFlagged,
      errors: r.errors,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      issues: r.issues.map((i) => ({ rowNumber: i.rowNumber, message: i.message })),
    }
  }

  async reviewQueue(auth: AuthContext) {
    const ctx = requirePermission(auth, 'intake.review')
    const { definition } = await currentWorkflow(ctx.orgId)
    const records = await db.sourceRecord.findMany({
      where: { organizationId: ctx.orgId, dedupeStatus: 'PENDING_REVIEW' },
      include: { source: true, importRun: true },
      orderBy: { receivedAt: 'asc' },
      take: 100,
    })
    return Promise.all(
      records.map(async (r) => {
        const proposed = proposalFor(r, definition)
        return {
          sourceRecordId: r.id,
          sourceName: r.source.displayName,
          sourceKind: r.source.kind,
          receivedAt: r.receivedAt,
          rawPayload: r.rawPayload as Record<string, unknown>,
          proposed: { name: proposed.contact.name, email: proposed.contact.email, phone: proposed.contact.phone },
          candidates: await findMatches(ctx.orgId, proposed.contact),
        }
      }),
    )
  }

  async resolveReview(auth: AuthContext, id: string, input: { action: 'link' | 'create' | 'reject'; contactId?: string | null; createJob?: boolean }) {
    const ctx = requirePermission(auth, 'intake.review')
    const record = await db.sourceRecord.findFirst({ where: { id, organizationId: ctx.orgId }, include: { source: true, importRun: true } })
    if (!record) throw notFound('Review item')
    if (record.dedupeStatus !== 'PENDING_REVIEW') throw conflict('This item was already resolved', 'already_resolved')
    const workflow = await currentWorkflow(ctx.orgId)
    const proposed = proposalFor(record, workflow.definition)
    const wantsJob = input.createJob ?? !!proposed.job
    return transaction(async (tx) => {
      const claimed = await tx.sourceRecord.updateMany({
        where: { id, dedupeStatus: 'PENDING_REVIEW' },
        data: { reviewedById: ctx.userId, reviewedAt: new Date(), dedupeStatus: input.action === 'reject' ? 'REJECTED' : input.action === 'link' ? 'LINKED_EXISTING' : 'NEW_CONTACT' },
      })
      if (claimed.count === 0) throw conflict('This item was already resolved', 'already_resolved')
      if (input.action === 'reject') return { contactId: null, opportunityId: null }
      let contactId: string
      if (input.action === 'link') {
        if (!input.contactId) throw unprocessable('Choose the contact to link to')
        const c = await tx.contact.findFirst({ where: { id: input.contactId, organizationId: ctx.orgId, deletedAt: null } })
        if (!c) throw notFound('Contact')
        contactId = c.id
      } else {
        const c = await tx.contact.create({
          data: { organizationId: ctx.orgId, ...cleanContact(proposed.contact), name: proposed.contact.name, createdById: ctx.userId },
        })
        contactId = c.id
      }
      await tx.sourceRecord.update({ where: { id }, data: { canonicalContactId: contactId } })
      await tx.contactSourceLink.create({
        data: { organizationId: ctx.orgId, contactId, sourceRecordId: id, matchedBy: input.action === 'link' ? 'manual' : 'created', confirmedById: ctx.userId },
      })
      let opportunityId: string | null = null
      if (wantsJob) {
        const job = await createJobTx(tx, {
          organizationId: ctx.orgId,
          workflow: { versionId: workflow.version.id, definition: workflow.definition },
          contactId,
          fields: proposed.job ?? { title: 'New inquiry' },
          actor: { type: 'USER', userId: ctx.userId },
          source: { name: record.source.displayName, kind: record.source.kind, sourceRecordId: id },
          leadReceivedAt: record.providerTimestamp ?? record.receivedAt,
          leadReceivedVia: record.providerTimestampVia ?? 'SYSTEM',
        })
        opportunityId = job.id
      }
      return { contactId, opportunityId }
    })
  }

  async listForms(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const rows = await db.leadForm.findMany({ where: { organizationId: ctx.orgId }, orderBy: { createdAt: 'asc' } })
    return rows.map(formOut)
  }

  async createForm(auth: AuthContext, input: { label: string; headline?: string | null; successMessage?: string | null; isActive?: boolean }) {
    const ctx = requirePermission(auth, 'settings.manage')
    const source = await db.$transaction((tx) => ensureSource(tx, ctx.orgId, 'FORM', 'Website form'))
    const row = await db.leadForm.create({
      data: {
        organizationId: ctx.orgId,
        sourceId: source.id,
        publicToken: randomToken(18),
        label: input.label.trim(),
        headline: input.headline?.trim() || null,
        successMessage: input.successMessage?.trim() || null,
        isActive: input.isActive ?? true,
      },
    })
    return formOut(row)
  }

  async updateForm(auth: AuthContext, id: string, input: { label?: string; headline?: string | null; successMessage?: string | null; isActive?: boolean }) {
    const ctx = requirePermission(auth, 'settings.manage')
    const existing = await db.leadForm.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!existing) throw notFound('Form')
    return formOut(await db.leadForm.update({ where: { id }, data: input }))
  }

  async publicForm(token: string) {
    const form = await db.leadForm.findUnique({ where: { publicToken: token } })
    if (!form || !form.isActive) throw notFound('Form')
    const org = await db.organization.findUniqueOrThrow({ where: { id: form.organizationId } })
    return { companyName: org.name, headline: form.headline, successMessage: form.successMessage }
  }

  /**
   * Public embeddable-form intake. Abuse controls: per-IP rate limit, honeypot field and a
   * minimum fill time. The response is identical whether or not the person already exists.
   */
  async submitPublicForm(
    token: string,
    input: { name: string; email?: string | null; phone?: string | null; address?: string | null; service?: string | null; message?: string | null; consent?: boolean; website?: string | null; startedAt: number },
    ip: string,
  ) {
    const form = await db.leadForm.findUnique({ where: { publicToken: token } })
    if (!form || !form.isActive) throw notFound('Form')
    await rateLimit(`form:${token}:${ip}`, 5, 10 * 60)
    await rateLimit(`form:${token}`, 200, 60 * 60)
    const elapsed = Date.now() - input.startedAt
    // Honeypot or bot-speed submissions are accepted silently and discarded.
    if (input.website?.trim() || elapsed < 3000 || elapsed > 24 * 60 * 60 * 1000) return { received: true }
    if (!normalizeEmail(input.email) && !normalizePhone(input.phone)) throw unprocessable('Please include an email address or phone number')
    if (input.email && !normalizeEmail(input.email)) throw unprocessable('That email address looks invalid')

    const workflow = await currentWorkflow(form.organizationId)
    const source = await db.source.findUniqueOrThrow({ where: { id: form.sourceId } })
    const raw = { ...input, formId: form.id, formLabel: form.label, ip: hashIp(ip) }
    await transaction((tx) =>
      ingest(tx, {
        organizationId: form.organizationId,
        workflow,
        source,
        externalId: `form_${randomToken(12)}`,
        rawPayload: raw,
        proposed: proposeFromForm(raw, workflow.definition),
        importRunId: null,
        providerTimestampVia: 'PROVIDER',
        actor: { type: 'INTEGRATION', label: form.label },
        announceReview: true,
      }),
    )
    return { received: true }
  }

  async ingestSingle(
    orgId: string,
    input: {
      sourceName: string
      externalId: string
      proposed: Proposed
      rawPayload: Record<string, unknown>
      providerTimestampVia?: TimestampProvenance
      actorLabel?: string
      updateExisting?: boolean
      provider?: IntegrationProvider
      integrationId?: string | null
    },
  ) {
    const workflow = await currentWorkflow(orgId)
    const source = await db.$transaction((tx) => ensureSource(tx, orgId, 'API', input.sourceName))
    return transaction((tx) =>
      ingest(tx, {
        organizationId: orgId,
        workflow,
        source,
        externalId: input.externalId,
        rawPayload: input.rawPayload,
        proposed: input.proposed,
        importRunId: null,
        providerTimestampVia: input.providerTimestampVia ?? 'PROVIDER',
        actor: { type: 'INTEGRATION', label: input.actorLabel ?? input.sourceName },
        announceReview: true,
        updateExisting: input.updateExisting ?? true,
        provider: input.provider,
        integrationId: input.integrationId ?? null,
      }),
    )
  }
}

/** Shared ingestion for CSV rows and form submissions. */
/** Maps file headers to import fields by common column names. */
function suggestMapping(headers: string[]) {
  const mapping: Record<string, string> = {}
  for (const target of IMPORT_TARGETS) {
    const header = headers.find((h) => SYNONYMS[target].includes(h.trim().toLowerCase()))
    if (header) mapping[target] = header
  }
  return mapping
}

function assertMapping(mapping: Record<string, string>, headers: string[]) {
  for (const [target, header] of Object.entries(mapping)) {
    if (!(IMPORT_TARGETS as readonly string[]).includes(target)) throw unprocessable(`Unknown import field "${target}"`)
    if (!headers.includes(header)) throw unprocessable(`Column "${header}" is not in the file`)
  }
  if (!mapping.name && !mapping.firstName) throw unprocessable('Map a column to Name (or First name)')
}

function assertImportable({ contact }: Proposed) {
  if (!contact.name) throw unprocessable('Row has no name')
  if (!contact.email && !contact.phone && !contact.addressLine) throw unprocessable('Row needs an email, phone or address')
}

function runState(tally: Tally) {
  if (tally.errors === 0) return 'SUCCEEDED' as const
  return tally.errors === tally.rowsSeen ? ('FAILED' as const) : ('PARTIALLY_COMPLETED' as const)
}

async function ingest(
  tx: Tx,
  a: {
    organizationId: string
    workflow: Awaited<ReturnType<typeof currentWorkflow>>
    source: Source
    externalId: string
    rawPayload?: Record<string, unknown>
    proposed: Proposed
    importRunId: string | null
    providerTimestampVia: TimestampProvenance
    actor: { type: 'USER'; userId: string } | { type: 'INTEGRATION'; label: string }
    announceReview: boolean
    updateExisting?: boolean
    provider?: IntegrationProvider
    integrationId?: string | null
  },
): Promise<IngestResult> {
  const safePayload = a.rawPayload ?? {}
  const contentHash = sha256(JSON.stringify(safePayload))
  const providerTimestamp = a.proposed.providerTimestamp ?? (a.providerTimestampVia === 'PROVIDER' ? new Date() : null)

  // 1. Check if a ContactProvenance record already exists for this external provider + ID
  let existingProv: (Awaited<ReturnType<typeof tx.contactProvenance.findUnique>> & { contact?: any }) | null = null
  if (a.provider) {
    existingProv = await tx.contactProvenance.findUnique({
      where: {
        organizationId_provider_externalId: {
          organizationId: a.organizationId,
          provider: a.provider,
          externalId: a.externalId,
        },
      },
      include: { contact: true },
    })
  }

  // 2. If provenance exists and contact is active, we have a deterministic 100% match!
  if (existingProv && existingProv.contact && !existingProv.contact.deletedAt) {
    const current = existingProv.contact
    const updates: Record<string, unknown> = {}
    if (a.updateExisting) {
      if (a.proposed.contact.phone && !current.phone) updates.phone = a.proposed.contact.phone
      if (a.proposed.contact.addressLine && !current.addressLine) updates.addressLine = a.proposed.contact.addressLine
      if (a.proposed.contact.city && !current.city) updates.city = a.proposed.contact.city
      if (a.proposed.contact.region && !current.region) updates.region = a.proposed.contact.region
      if (a.proposed.contact.postalCode && !current.postalCode) updates.postalCode = a.proposed.contact.postalCode
      if (a.proposed.contact.notes) {
        const note = a.proposed.contact.notes.trim()
        if (!current.notes) {
          updates.notes = note
        } else if (!current.notes.includes(note)) {
          updates.notes = `${current.notes}\n${note}`
        }
      }
    }
    const hasChanges = Object.keys(updates).length > 0
    if (hasChanges) {
      await tx.contact.update({ where: { id: current.id }, data: cleanContact(updates) })
    }
    await tx.contactProvenance.update({
      where: { id: existingProv.id },
      data: {
        lastSyncedAt: new Date(),
        externalData: a.rawPayload as Prisma.InputJsonValue,
        integrationId: a.integrationId !== undefined ? a.integrationId : existingProv.integrationId,
      },
    })
    const exists = await tx.sourceRecord.findUnique({
      where: { organizationId_sourceId_entityKind_externalId: { organizationId: a.organizationId, sourceId: a.source.id, entityKind: 'lead', externalId: a.externalId } },
    })
    if (exists) {
      await tx.sourceRecord.update({
        where: { id: exists.id },
        data: { rawPayload: a.rawPayload as Prisma.InputJsonValue, contentHash, providerTimestamp, receivedAt: new Date() },
      })
    }
    return { status: hasChanges ? 'UPDATED_EXISTING' : 'LINKED_EXISTING', contactId: current.id, opportunityId: null }
  }

  // 3. Check for existing SourceRecord (e.g. CSV duplicate or previous import run)
  const exists = await tx.sourceRecord.findUnique({
    where: { organizationId_sourceId_entityKind_externalId: { organizationId: a.organizationId, sourceId: a.source.id, entityKind: 'lead', externalId: a.externalId } },
  })

  if (exists) {
    if (a.updateExisting && exists.canonicalContactId) {
      const current = await tx.contact.findFirst({ where: { id: exists.canonicalContactId, organizationId: a.organizationId, deletedAt: null } })
      if (current) {
        const updates: Record<string, unknown> = {}
        if (a.proposed.contact.phone && !current.phone) updates.phone = a.proposed.contact.phone
        if (a.proposed.contact.addressLine && !current.addressLine) updates.addressLine = a.proposed.contact.addressLine
        if (a.proposed.contact.city && !current.city) updates.city = a.proposed.contact.city
        if (a.proposed.contact.region && !current.region) updates.region = a.proposed.contact.region
        if (a.proposed.contact.postalCode && !current.postalCode) updates.postalCode = a.proposed.contact.postalCode
        if (a.proposed.contact.notes) {
          const note = a.proposed.contact.notes.trim()
          if (!current.notes) {
            updates.notes = note
          } else if (!current.notes.includes(note)) {
            updates.notes = `${current.notes}\n${note}`
          }
        }
        const hasChanges = Object.keys(updates).length > 0
        if (hasChanges) {
          await tx.contact.update({ where: { id: current.id }, data: cleanContact(updates) })
        }
        await tx.sourceRecord.update({
          where: { id: exists.id },
          data: { rawPayload: a.rawPayload as Prisma.InputJsonValue, contentHash, providerTimestamp, receivedAt: new Date() },
        })
        if (a.provider) {
          await tx.contactProvenance.upsert({
            where: {
              organizationId_provider_externalId: {
                organizationId: a.organizationId,
                provider: a.provider,
                externalId: a.externalId,
              },
            },
            create: {
              organizationId: a.organizationId,
              contactId: current.id,
              provider: a.provider,
              integrationId: a.integrationId ?? null,
              externalId: a.externalId,
              externalData: a.rawPayload as Prisma.InputJsonValue,
              lastSyncedAt: new Date(),
            },
            update: {
              contactId: current.id,
              lastSyncedAt: new Date(),
              externalData: a.rawPayload as Prisma.InputJsonValue,
              integrationId: a.integrationId !== undefined ? a.integrationId : undefined,
            },
          })
        }
        return { status: hasChanges ? 'UPDATED_EXISTING' : 'LINKED_EXISTING', contactId: current.id, opportunityId: null }
      }
    }
    return { status: 'DUPLICATE_RECORD', contactId: exists.canonicalContactId, opportunityId: null }
  }

  // 4. Candidate matching for new rows
  const candidates = await findMatches(a.organizationId, a.proposed.contact)
  const confident = candidates.length === 1 && candidates[0]!.matchedOn.includes('email') && candidates[0]!.matchedOn.includes('name')
  const status = candidates.length === 0 ? 'NEW_CONTACT' : confident ? (a.updateExisting ? 'UPDATED_EXISTING' : 'LINKED_EXISTING') : 'PENDING_REVIEW'

  const record = await tx.sourceRecord.create({
    data: {
      organizationId: a.organizationId,
      sourceId: a.source.id,
      externalId: a.externalId,
      importRunId: a.importRunId,
      rawPayload: a.rawPayload as Prisma.InputJsonValue,
      contentHash,
      providerTimestamp,
      providerTimestampVia: providerTimestamp ? a.providerTimestampVia : null,
      receivedAt: new Date(),
      dedupeStatus: status === 'UPDATED_EXISTING' ? 'LINKED_EXISTING' : status,
      matchCandidateIds: candidates.map((c) => c.contact.id),
    },
  })

  if (status === 'PENDING_REVIEW') {
    if (a.announceReview) {
      await appendActivity(tx, {
        organizationId: a.organizationId,
        type: 'intake.review_needed',
        category: 'SYSTEM',
        actorType: 'SYSTEM',
        actorLabel: 'Intake',
        verification: 'SYSTEM_RECORDED',
        payload: { sourceRecordId: record.id, sourceName: a.source.displayName, name: a.proposed.contact.name, possibleMatches: candidates.length },
      })
    }
    return { status, contactId: null, opportunityId: null }
  }

  let contactId: string
  if (status === 'LINKED_EXISTING' || status === 'UPDATED_EXISTING') {
    contactId = candidates[0]!.contact.id
    if (status === 'UPDATED_EXISTING') {
      const current = candidates[0]!.contact
      const updates: Record<string, unknown> = {}
      if (a.proposed.contact.phone && !current.phone) updates.phone = a.proposed.contact.phone
      if (a.proposed.contact.addressLine && !current.addressLine) updates.addressLine = a.proposed.contact.addressLine
      if (a.proposed.contact.city && !current.city) updates.city = a.proposed.contact.city
      if (a.proposed.contact.region && !current.region) updates.region = a.proposed.contact.region
      if (a.proposed.contact.postalCode && !current.postalCode) updates.postalCode = a.proposed.contact.postalCode
      if (a.proposed.contact.notes) {
        const note = a.proposed.contact.notes.trim()
        if (!current.notes) {
          updates.notes = note
        } else if (!current.notes.includes(note)) {
          updates.notes = `${current.notes}\n${note}`
        }
      }
      if (Object.keys(updates).length > 0) {
        await tx.contact.update({ where: { id: current.id }, data: cleanContact(updates) })
      }
    }
    if (a.provider) {
      await tx.contactProvenance.upsert({
        where: {
          organizationId_provider_externalId: {
            organizationId: a.organizationId,
            provider: a.provider,
            externalId: a.externalId,
          },
        },
        create: {
          organizationId: a.organizationId,
          contactId,
          provider: a.provider,
          integrationId: a.integrationId ?? null,
          externalId: a.externalId,
          externalData: a.rawPayload as Prisma.InputJsonValue,
          lastSyncedAt: new Date(),
        },
        update: {
          contactId,
          lastSyncedAt: new Date(),
          externalData: a.rawPayload as Prisma.InputJsonValue,
          integrationId: a.integrationId !== undefined ? a.integrationId : undefined,
        },
      })
    }
  } else {
    const created = await tx.contact.create({
      data: {
        organizationId: a.organizationId,
        ...cleanContact(a.proposed.contact),
        name: a.proposed.contact.name,
        createdById: a.actor.type === 'USER' ? a.actor.userId : null,
        createdAt: new Date(),
      },
    })
    contactId = created.id

    if (a.provider) {
      await tx.contactProvenance.create({
        data: {
          organizationId: a.organizationId,
          contactId,
          provider: a.provider,
          integrationId: a.integrationId ?? null,
          externalId: a.externalId,
          externalData: a.rawPayload as Prisma.InputJsonValue,
          lastSyncedAt: new Date(),
        },
      })
    }
  }

  await tx.sourceRecord.update({ where: { id: record.id }, data: { canonicalContactId: contactId } })
  await tx.contactSourceLink.create({
    data: { organizationId: a.organizationId, contactId, sourceRecordId: record.id, matchedBy: status === 'NEW_CONTACT' ? 'created' : 'email+name' },
  })
  let opportunityId: string | null = null
  if (a.proposed.job) {
    const job = await createJobTx(tx, {
      organizationId: a.organizationId,
      workflow: { versionId: a.workflow.version.id, definition: a.workflow.definition },
      contactId,
      fields: a.proposed.job,
      actor: a.actor,
      source: { name: a.source.displayName, kind: a.source.kind, sourceRecordId: record.id },
      leadReceivedAt: providerTimestamp ?? record.receivedAt,
      leadReceivedVia: providerTimestamp ? a.providerTimestampVia : 'SYSTEM',
    })
    opportunityId = job.id
  }
  return { status, contactId, opportunityId }
}

function parseCsv(csv: string): string[][] {
  let rows: string[][]
  try {
    rows = parse(csv, { bom: true, skip_empty_lines: true, relax_column_count: true, trim: true }) as string[][]
  } catch (err) {
    throw unprocessable(`Could not read the CSV: ${(err as Error).message}`)
  }
  if (rows.length < 2) throw unprocessable('The file needs a header row and at least one data row')
  if (rows.length - 1 > MAX_ROWS) throw unprocessable(`Import up to ${MAX_ROWS} rows at a time`)
  return rows
}

function proposeFromRow(raw: Record<string, string>, mapping: Record<string, string>, jobTitle: string | null): Proposed {
  const get = (t: Target) => (mapping[t] ? raw[mapping[t]!]?.trim() || null : null)
  const name = get('name') ?? [get('firstName'), get('lastName')].filter(Boolean).join(' ')
  const receivedAt = get('receivedAt')
  const parsedTime = receivedAt && !Number.isNaN(Date.parse(receivedAt)) ? new Date(receivedAt) : null
  return {
    contact: {
      name: name ?? '',
      email: get('email'),
      phone: get('phone'),
      addressLine: get('addressLine'),
      city: get('city'),
      region: get('region'),
      postalCode: get('postalCode'),
      notes: get('notes'),
    },
    job: jobTitle
      ? { title: get('jobTitle') ?? jobTitle, propertyAddress: get('propertyAddress') ?? get('addressLine'), inquiry: get('inquiry') }
      : null,
    providerTimestamp: parsedTime && parsedTime.getTime() <= Date.now() ? parsedTime : null,
  }
}

function proposeFromForm(raw: Record<string, unknown>, def: WorkflowDefinition): Proposed {
  const s = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string).trim() || null : null)
  const leadSource = def.fields.find((f) => f.binding === 'opportunity.leadSourceOptionId')
  const webForm = leadSource?.options?.find((o) => o.id === 'web_form' && !o.retired)
  const fullName = s('name') || [s('firstName'), s('lastName')].filter(Boolean).join(' ') || ''
  return {
    contact: {
      name: fullName,
      email: s('email'),
      phone: s('phone') || s('mobile') || s('cell'),
      addressLine: s('address') || s('addressLine'),
      city: s('city'),
      region: s('region') || s('state'),
      postalCode: s('postalCode') || s('zip'),
      notes: s('notes'),
    },
    job: {
      title: s('service') ?? s('jobTitle') ?? 'Inbound inquiry',
      propertyAddress: s('propertyAddress') || s('address') || s('addressLine'),
      inquiry: s('inquiry') || s('notes') || s('message'),
      leadSourceOptionId: webForm?.id ?? null,
    },
    providerTimestamp: null,
  }
}

/** Rebuilds the proposal for a pending record from its immutable raw payload. */
function proposalFor(r: { rawPayload: unknown; importRun: { columnMapping: unknown } | null }, def: WorkflowDefinition): Proposed {
  const raw = r.rawPayload as Record<string, unknown>
  if (r.importRun) {
    const cm = r.importRun.columnMapping as { mapping?: Record<string, string>; createJobs?: boolean; defaultJobTitle?: string | null; provider?: string } | null
    if (cm?.mapping) {
      return proposeFromRow(raw as Record<string, string>, cm.mapping, cm.createJobs ? cm.defaultJobTitle || 'Imported job' : null)
    }
  }
  return proposeFromForm(raw, def)
}

function formOut(f: { id: string; label: string; headline: string | null; successMessage: string | null; isActive: boolean; publicToken: string; sourceId: string; createdAt: Date }) {
  return { id: f.id, label: f.label, headline: f.headline, successMessage: f.successMessage, isActive: f.isActive, publicToken: f.publicToken, sourceId: f.sourceId, createdAt: f.createdAt }
}

const hashIp = (ip: string) => sha256(`ip:${ip}`).slice(0, 16)
