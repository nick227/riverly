import { db, type Integration, type IntegrationProvider, type IntegrationStatus } from '@project/db'
import { getAdapter } from '../integrations'
import { requireOrg, requirePermission, type AuthContext } from '../lib/context'
import { decryptSecret, encryptSecret, randomToken, sha256 } from '../lib/crypto'
import { notFound, unprocessable } from '../lib/errors'
import { IntakeService } from './IntakeService'

const ALL_PROVIDERS: readonly IntegrationProvider[] = ['WOOCOMMERCE', 'HUBSPOT', 'ZAPIER', 'EMAIL_SERVER']

const PROVIDER_NAMES: Record<IntegrationProvider, string> = {
  WOOCOMMERCE: 'WooCommerce Store',
  HUBSPOT: 'HubSpot CRM',
  ZAPIER: 'Zapier Integration',
  EMAIL_SERVER: 'Mail Server Connection',
}

export class IntegrationService {
  constructor(private intake = new IntakeService()) {}

  async list(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const existing = await db.integration.findMany({ where: { organizationId: ctx.orgId } })
    const existingMap = new Map(existing.map((e) => [e.provider, e]))

    return ALL_PROVIDERS.map((provider) => {
      const row = existingMap.get(provider)
      if (row) return sanitizeIntegration(row)
      return {
        id: `virtual_${provider.toLowerCase()}`,
        provider,
        name: PROVIDER_NAMES[provider],
        status: 'DISCONNECTED' as IntegrationStatus,
        config: provider === 'ZAPIER' ? { webhookToken: `${ctx.orgId}_${randomToken(12)}` } : null,
        hasCredentials: false,
        lastSyncedAt: null,
        lastTestedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })
  }

  async get(auth: AuthContext, provider: IntegrationProvider) {
    const ctx = requireOrg(auth)
    const row = await db.integration.findUnique({
      where: { organizationId_provider: { organizationId: ctx.orgId, provider } },
    })
    if (!row) {
      return {
        id: `virtual_${provider.toLowerCase()}`,
        provider,
        name: PROVIDER_NAMES[provider],
        status: 'DISCONNECTED' as IntegrationStatus,
        config: provider === 'ZAPIER' ? { webhookToken: `${ctx.orgId}_${randomToken(12)}` } : null,
        hasCredentials: false,
        lastSyncedAt: null,
        lastTestedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
    return sanitizeIntegration(row)
  }

  async update(
    auth: AuthContext,
    provider: IntegrationProvider,
    input: { name: string; config?: Record<string, unknown>; credentials?: string },
  ) {
    const ctx = requirePermission(auth, 'settings.manage')
    const existing = await db.integration.findUnique({
      where: { organizationId_provider: { organizationId: ctx.orgId, provider } },
    })

    const config = { ...(existing?.config as Record<string, unknown> | null), ...input.config }
    if (provider === 'ZAPIER' && !config.webhookToken) {
      config.webhookToken = `${ctx.orgId}_${randomToken(12)}`
    }

    const credentialCiphertext = input.credentials
      ? encryptSecret(input.credentials.trim())
      : existing?.credentialCiphertext ?? null

    const row = await db.integration.upsert({
      where: { organizationId_provider: { organizationId: ctx.orgId, provider } },
      create: {
        organizationId: ctx.orgId,
        provider,
        name: input.name.trim() || PROVIDER_NAMES[provider],
        status: credentialCiphertext || config.webhookUrl ? 'CONNECTED' : 'DISCONNECTED',
        config: config as any,
        credentialCiphertext,
      },
      update: {
        name: input.name.trim() || PROVIDER_NAMES[provider],
        config: config as any,
        credentialCiphertext,
        status: credentialCiphertext || config.webhookUrl ? 'CONNECTED' : 'DISCONNECTED',
      },
    })

    return sanitizeIntegration(row)
  }

  async test(
    auth: AuthContext,
    provider: IntegrationProvider,
    input?: { config?: Record<string, unknown>; credentials?: string },
  ) {
    const ctx = requireOrg(auth)
    const existing = await db.integration.findUnique({
      where: { organizationId_provider: { organizationId: ctx.orgId, provider } },
    })

    const config = input?.config ?? (existing?.config as Record<string, unknown> | null) ?? {}
    const credentials = input?.credentials ?? (existing?.credentialCiphertext ? decryptSecret(existing.credentialCiphertext) : null)

    const adapter = getAdapter(provider)
    let res
    try {
      res = await adapter.testConnection(config, credentials)
      if (res.message) res.message = sanitizeErrorMessage(res.message)
    } catch (err) {
      res = { success: false, message: sanitizeErrorMessage((err as Error).message || 'Connection test failed') }
    }

    if (existing) {
      await db.integration.update({
        where: { id: existing.id },
        data: {
          status: res.success ? 'CONNECTED' : 'ERROR',
          lastTestedAt: new Date(),
          errorMessage: res.success ? null : res.message,
        },
      })
    }

    return res
  }

  async sync(
    auth: AuthContext,
    provider: IntegrationProvider,
    input?: {
      updateExisting?: boolean
      createJobs?: boolean
      defaultJobTitle?: string
      config?: Record<string, unknown>
      credentials?: string
    },
  ) {
    const ctx = requirePermission(auth, 'imports.run')
    const existing = await db.integration.findUnique({
      where: { organizationId_provider: { organizationId: ctx.orgId, provider } },
    })

    const config = input?.config ?? (existing?.config as Record<string, unknown> | null) ?? {}
    const credentials = input?.credentials ?? (existing?.credentialCiphertext ? decryptSecret(existing.credentialCiphertext) : null)

    const adapter = getAdapter(provider)
    let fetchRes
    try {
      fetchRes = await adapter.fetchCustomers(config, credentials, { limit: 100 })
    } catch (err) {
      const sanitized = sanitizeErrorMessage((err as Error).message || 'Sync failed')
      if (existing) {
        await db.integration.update({
          where: { id: existing.id },
          data: { status: 'ERROR', errorMessage: sanitized },
        })
      }
      throw unprocessable(sanitized)
    }

    if (provider === 'EMAIL_SERVER') {
      return {
        runId: '',
        provider,
        sourceName: 'Email Server',
        state: 'SUCCEEDED' as const,
        rowsSeen: 0,
        created: 0,
        updated: 0,
        linked: 0,
        duplicatesFlagged: 0,
        skipped: 0,
        errors: 0,
        issues: [],
      }
    }

    const syncResult = await this.intake.ingestCustomers(auth, {
      provider,
      sourceName: fetchRes.sourceName,
      customers: fetchRes.customers,
      updateExisting: input?.updateExisting ?? true,
      createJobs: input?.createJobs ?? false,
      defaultJobTitle: input?.defaultJobTitle,
      integrationId: existing?.id ?? null,
    })

    if (existing) {
      await db.integration.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          lastSyncedAt: new Date(),
          errorMessage: null,
        },
      })
    }

    return syncResult
  }

  async disconnect(auth: AuthContext, provider: IntegrationProvider) {
    const ctx = requirePermission(auth, 'settings.manage')
    const existing = await db.integration.findUnique({
      where: { organizationId_provider: { organizationId: ctx.orgId, provider } },
    })
    if (!existing) {
      return {
        id: `virtual_${provider.toLowerCase()}`,
        provider,
        name: PROVIDER_NAMES[provider],
        status: 'DISCONNECTED' as IntegrationStatus,
        config: null,
        hasCredentials: false,
        lastSyncedAt: null,
        lastTestedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    const updated = await db.integration.update({
      where: { id: existing.id },
      data: {
        credentialCiphertext: null,
        status: 'DISCONNECTED',
        errorMessage: null,
      },
    })
    return sanitizeIntegration(updated)
  }

  async handleZapierWebhook(token: string | undefined, payload: Record<string, unknown>) {
    if (!token || typeof token !== 'string') throw unprocessable('Missing Zapier webhook token')
    const orgId = token.split('_')[0]
    if (!orgId) throw unprocessable('Invalid Zapier webhook token format')

    // Strict tenant isolation: verify that the organization exists
    const org = await db.organization.findUnique({ where: { id: orgId } })
    if (!org) throw notFound('Organization not found')

    const integration = await db.integration.findFirst({
      where: { organizationId: orgId, provider: 'ZAPIER' },
    })

    const config = (integration?.config as Record<string, unknown> | null) ?? {}
    if (config.webhookToken && config.webhookToken !== token) {
      throw unprocessable('Invalid Zapier webhook token')
    }

    const s = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string).trim() || null : null)
    const firstName = s('firstName') || s('first_name') || s('given_name')
    const lastName = s('lastName') || s('last_name') || s('family_name')
    const name = s('name') || s('full_name') || [firstName, lastName].filter(Boolean).join(' ') || s('email') || 'Zapier Lead'
    const email = s('email')
    const phone = s('phone') || s('mobile') || s('cell')
    const addressLine = s('address') || s('street') || s('addressLine')
    const city = s('city')
    const region = s('state') || s('region')
    const postalCode = s('zip') || s('postalCode') || s('postcode')
    const service = s('service') || s('jobTitle') || s('job_title') || 'Zapier Inbound Lead'
    const notes = s('notes') || s('message') || s('inquiry')

    // Replay protection: if payload specifies an event or lead ID, use it.
    // Otherwise derive deterministic content hash so replayed deliveries are idempotent.
    const explicitId = s('id') || s('lead_id') || s('event_id') || s('eventId')
    const contentHash = sha256(JSON.stringify(payload)).slice(0, 16)
    const externalId = explicitId ? `zap_${explicitId}` : `zap_hash_${contentHash}`

    const result = await this.intake.ingestSingle(orgId, {
      sourceName: 'Zapier Webhook',
      externalId,
      proposed: {
        contact: { name, email, phone, addressLine, city, region, postalCode, notes },
        job: { title: service, propertyAddress: addressLine, inquiry: notes },
        providerTimestamp: new Date(),
      },
      rawPayload: payload,
      updateExisting: true,
      actorLabel: 'Zapier',
      provider: 'ZAPIER',
      integrationId: integration?.id ?? null,
    })

    return { received: true, status: result.status, contactId: result.contactId }
  }
}

function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(?:password|secret|token|key|consumer_secret)=[^&\s]+/gi, '$1=[REDACTED]')
}

function sanitizeIntegration(row: Integration) {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    status: row.status,
    config: row.config as Record<string, unknown> | null,
    hasCredentials: Boolean(row.credentialCiphertext),
    lastSyncedAt: row.lastSyncedAt,
    lastTestedAt: row.lastTestedAt,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
