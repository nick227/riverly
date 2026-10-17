import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, useApp } from './helpers'

const t = useApp()

describe('Integrations API', () => {
  it('requires authentication for integrations endpoints', async () => {
    await call(t.app, 'listIntegrations', { method: 'GET', url: '/integrations' }, 401)
  })

  it('lists available integrations including disconnected providers', async () => {
    const res = await call(
      t.app,
      'listIntegrations',
      { method: 'GET', url: '/integrations', headers: t.world.a.admin.headers },
      200,
    )
    expect(res.data).toHaveLength(4)
    const providers = res.data.map((i: any) => i.provider)
    expect(providers).toContain('WOOCOMMERCE')
    expect(providers).toContain('HUBSPOT')
    expect(providers).toContain('ZAPIER')
    expect(providers).toContain('EMAIL_SERVER')
  })

  it('configures, tests and syncs WooCommerce integration with upsert deduplication', async () => {
    // 1. Configure WooCommerce with demo site and credentials
    const updateRes = await call(
      t.app,
      'updateIntegration',
      {
        method: 'PUT',
        url: '/integrations/WOOCOMMERCE',
        headers: t.world.a.admin.headers,
        payload: {
          name: 'Peak Ridge Demo Store',
          config: { siteUrl: 'https://demo.peakridgeroofing.test', username: 'admin' },
          credentials: 'demo-app-password-1234',
        },
      },
      200,
    )
    expect(updateRes.data.status).toBe('CONNECTED')
    expect(updateRes.data.hasCredentials).toBe(true)

    // 2. Test connection
    const testRes = await call(
      t.app,
      'testIntegration',
      {
        method: 'POST',
        url: '/integrations/WOOCOMMERCE/test',
        headers: t.world.a.admin.headers,
      },
      200,
    )
    expect(testRes.data.success).toBe(true)
    expect(testRes.data.message).toContain('Connected')

    // 3. First Sync: Initial user dump
    const syncRes1 = await call(
      t.app,
      'syncIntegration',
      {
        method: 'POST',
        url: '/integrations/WOOCOMMERCE/sync',
        headers: t.world.a.manager.headers,
        payload: {
          updateExisting: true,
          createJobs: true,
          defaultJobTitle: 'WooCommerce Inquiry',
        },
      },
      200,
    )
    expect(syncRes1.data.created).toBe(5)
    expect(syncRes1.data.errors).toBe(0)

    // Verify contact in DB
    const marcus = await db.contact.findFirstOrThrow({
      where: { organizationId: t.world.a.org.id, name: 'Marcus Vance' },
    })
    expect(marcus.email).toBe('marcus.vance@peakridgehomes.com')
    expect(marcus.phone).toBe('(303) 555-0142')

    // Verify opportunity created
    const job = await db.opportunity.findFirst({
      where: { organizationId: t.world.a.org.id, contactId: marcus.id },
    })
    expect(job).toBeTruthy()

    // 4. Re-sync later: Updates existing records and skips unchanged without duplicates!
    const syncRes2 = await call(
      t.app,
      'syncIntegration',
      {
        method: 'POST',
        url: '/integrations/WOOCOMMERCE/sync',
        headers: t.world.a.manager.headers,
        payload: {
          updateExisting: true,
          createJobs: false,
        },
      },
      200,
    )
    // No new contacts created; duplicates/replays skipped or updated
    expect(syncRes2.data.created).toBe(0)
    expect(await db.contact.count({ where: { organizationId: t.world.a.org.id, name: 'Marcus Vance' } })).toBe(1)

    // 5. Disconnect
    const disconnectRes = await call(
      t.app,
      'disconnectIntegration',
      {
        method: 'DELETE',
        url: '/integrations/WOOCOMMERCE',
        headers: t.world.a.admin.headers,
      },
      200,
    )
    expect(disconnectRes.data.status).toBe('DISCONNECTED')
    expect(disconnectRes.data.hasCredentials).toBe(false)
  })

  it('receives lead via Zapier webhook and links/creates contact', async () => {
    // Get zapier config to find webhookToken
    const getRes = await call(
      t.app,
      'getIntegration',
      { method: 'GET', url: '/integrations/ZAPIER', headers: t.world.a.admin.headers },
      200,
    )
    const token = getRes.data.config.webhookToken

    const hookRes = await call(
      t.app,
      'handleZapierWebhook',
      {
        method: 'POST',
        url: `/integrations/zapier/webhook?token=${token}`,
        payload: {
          name: 'Zachary Taylor',
          email: 'ztaylor@zapier-lead.test',
          phone: '(303) 555-9876',
          address: '400 Mountain Rd, Golden CO',
          service: 'Emergency Storm Damage Inspection',
          notes: 'Source: Facebook Lead Ads',
        },
      },
      202,
    )
    expect(hookRes.data.received).toBe(true)
    expect(hookRes.data.status).toBe('NEW_CONTACT')

    const contact = await db.contact.findFirst({
      where: { organizationId: t.world.a.org.id, email: 'ztaylor@zapier-lead.test' },
    })
    expect(contact).toBeTruthy()
    expect(contact?.name).toBe('Zachary Taylor')
  })

  it('preserves many-to-many contact provenance and non-destructively merges multi-source overlaps', async () => {
    // 1. Configure both WooCommerce and HubSpot for Org A
    const wcRes = await call(
      t.app,
      'updateIntegration',
      {
        method: 'PUT',
        url: '/integrations/WOOCOMMERCE',
        headers: t.world.a.admin.headers,
        payload: {
          name: 'WooCommerce Store',
          config: { siteUrl: 'https://demo.peakridgeroofing.test', username: 'admin' },
          credentials: 'demo-app-password-1234',
        },
      },
      200,
    )

    const hsRes = await call(
      t.app,
      'updateIntegration',
      {
        method: 'PUT',
        url: '/integrations/HUBSPOT',
        headers: t.world.a.admin.headers,
        payload: {
          name: 'HubSpot Main Portal',
          config: { portalId: '1984201' },
          credentials: 'demo-access-token-5678',
        },
      },
      200,
    )

    const { IntakeService } = await import('../services/IntakeService')
    const intake = new IntakeService()
    const authAdmin = {
      userId: t.world.a.admin.id,
      sessionId: 'test_session_id',
      orgId: t.world.a.org.id,
      role: 'ADMIN',
    } as any

    // 2. Import Samantha Cross from WooCommerce with phone and order notes
    const wcImport = await intake.ingestCustomers(authAdmin, {
      provider: 'WOOCOMMERCE',
      sourceName: 'WooCommerce Store',
      integrationId: wcRes.data.id,
      customers: [
        {
          externalId: 'wc_cust_overlap_100',
          name: 'Samantha Cross',
          email: 'scross@overlap-roofing.test',
          phone: '(303) 555-4321',
          notes: 'Customer notes from WooCommerce order #100',
        },
      ],
    })
    expect(wcImport.created).toBe(1)

    const initialContact = await db.contact.findFirstOrThrow({
      where: { organizationId: t.world.a.org.id, email: 'scross@overlap-roofing.test' },
      include: { provenances: true },
    })
    expect(initialContact.phone).toBe('(303) 555-4321')
    expect(initialContact.notes).toBe('Customer notes from WooCommerce order #100')
    expect(initialContact.provenances).toHaveLength(1)
    expect(initialContact.provenances[0]?.provider).toBe('WOOCOMMERCE')
    expect(initialContact.provenances[0]?.externalId).toBe('wc_cust_overlap_100')
    expect(initialContact.provenances[0]?.integrationId).toBe(wcRes.data.id)

    // 3. Import Samantha Cross from HubSpot with different external ID, null phone, but has address and CRM notes
    const hsImport = await intake.ingestCustomers(authAdmin, {
      provider: 'HUBSPOT',
      sourceName: 'HubSpot Main Portal',
      integrationId: hsRes.data.id,
      customers: [
        {
          externalId: 'hs_contact_overlap_200',
          name: 'Samantha Cross',
          email: 'scross@overlap-roofing.test',
          phone: null, // Note: empty phone in HubSpot
          addressLine: '950 Boulder Peak Way',
          city: 'Boulder',
          region: 'CO',
          postalCode: '80302',
          notes: 'HubSpot Opportunity: Commercial flat roof remodel',
        },
      ],
    })
    expect(hsImport.updated).toBe(1)
    expect(hsImport.created).toBe(0)

    // 4. Verify contact non-destructive field merge & many-to-many provenance
    const contacts = await db.contact.findMany({
      where: { organizationId: t.world.a.org.id, email: 'scross@overlap-roofing.test' },
      include: { provenances: { orderBy: { provider: 'asc' } } },
    })
    expect(contacts).toHaveLength(1)
    const mergedContact = contacts[0]!

    // Phone from WooCommerce was NOT overwritten by null from HubSpot
    expect(mergedContact.phone).toBe('(303) 555-4321')
    // Address was populated from HubSpot
    expect(mergedContact.addressLine).toBe('950 Boulder Peak Way')
    expect(mergedContact.city).toBe('Boulder')
    expect(mergedContact.region).toBe('CO')
    expect(mergedContact.postalCode).toBe('80302')
    // Notes preserved both sources without wiping
    expect(mergedContact.notes).toContain('Customer notes from WooCommerce order #100')
    expect(mergedContact.notes).toContain('HubSpot Opportunity: Commercial flat roof remodel')

    // Many-to-many provenance preserved for both integrations
    expect(mergedContact.provenances).toHaveLength(2)
    const hsProv = mergedContact.provenances.find((p) => p.provider === 'HUBSPOT')
    const wcProv = mergedContact.provenances.find((p) => p.provider === 'WOOCOMMERCE')

    expect(hsProv).toBeDefined()
    expect(hsProv?.externalId).toBe('hs_contact_overlap_200')
    expect(hsProv?.integrationId).toBe(hsRes.data.id)
    expect(hsProv?.lastSyncedAt).toBeInstanceOf(Date)

    expect(wcProv).toBeDefined()
    expect(wcProv?.externalId).toBe('wc_cust_overlap_100')
    expect(wcProv?.integrationId).toBe(wcRes.data.id)
    expect(wcProv?.lastSyncedAt).toBeInstanceOf(Date)

    // 5. Repeated Sync Idempotency: Re-syncing WooCommerce updates sync timestamps without duplicating
    const prevSyncTime = wcProv!.lastSyncedAt
    await intake.ingestCustomers(authAdmin, {
      provider: 'WOOCOMMERCE',
      sourceName: 'WooCommerce Store',
      integrationId: wcRes.data.id,
      customers: [
        {
          externalId: 'wc_cust_overlap_100',
          name: 'Samantha Cross',
          email: 'scross@overlap-roofing.test',
          phone: '(303) 555-4321',
        },
      ],
    })

    const finalCount = await db.contact.count({
      where: { organizationId: t.world.a.org.id, email: 'scross@overlap-roofing.test' },
    })
    expect(finalCount).toBe(1)

    const refreshedWcProv = await db.contactProvenance.findUniqueOrThrow({
      where: {
        organizationId_provider_externalId: {
          organizationId: t.world.a.org.id,
          provider: 'WOOCOMMERCE',
          externalId: 'wc_cust_overlap_100',
        },
      },
    })
    expect(refreshedWcProv.lastSyncedAt.getTime()).toBeGreaterThanOrEqual(prevSyncTime.getTime())
  })

  it('enforces tenant isolation and isolates integration configurations between organizations', async () => {
    // Org A has configured WooCommerce in earlier tests
    const orgARes = await call(
      t.app,
      'getIntegration',
      { method: 'GET', url: '/integrations/WOOCOMMERCE', headers: t.world.a.admin.headers },
      200,
    )
    expect(orgARes.data.status).toBe('CONNECTED')
    expect(orgARes.data.hasCredentials).toBe(true)

    // Org B owner views WooCommerce -> must be completely isolated and DISCONNECTED
    const orgBRes = await call(
      t.app,
      'getIntegration',
      { method: 'GET', url: '/integrations/WOOCOMMERCE', headers: t.world.b.owner.headers },
      200,
    )
    expect(orgBRes.data.status).toBe('DISCONNECTED')
    expect(orgBRes.data.hasCredentials).toBe(false)
    expect(orgBRes.data.config).toBeNull()
  })

  it('handles failed connection tests, updates status to ERROR, and redacts sensitive credentials from messages', async () => {
    const secretPassword = 'my_super_secret_api_key_xyz987'
    const testRes = await call(
      t.app,
      'testIntegration',
      {
        method: 'POST',
        url: '/integrations/WOOCOMMERCE/test',
        headers: t.world.a.admin.headers,
        payload: {
          config: { siteUrl: 'https://unreachable-domain-12345678.test', username: 'admin' },
          credentials: secretPassword,
        },
      },
      200,
    )
    expect(testRes.data.success).toBe(false)
    // Ensure sensitive credential does not leak in error response
    expect(testRes.data.message).not.toContain(secretPassword)

    // Verify DB integration status was set to ERROR and redacted
    const integ = await db.integration.findUnique({
      where: { organizationId_provider: { organizationId: t.world.a.org.id, provider: 'WOOCOMMERCE' } },
    })
    expect(integ?.status).toBe('ERROR')
    if (integ?.errorMessage) {
      expect(integ.errorMessage).not.toContain(secretPassword)
    }
  })

  it('handles partial imports with ambiguous records routed to duplicate review queue', async () => {
    const { IntakeService } = await import('../services/IntakeService')
    const intake = new IntakeService()
    const authAdmin = {
      userId: t.world.a.admin.id,
      sessionId: 'test_session_id',
      orgId: t.world.a.org.id,
      role: 'ADMIN',
    } as any

    // Create an existing contact with known phone
    const { cleanContact } = await import('../services/ContactService')
    const existing = await db.contact.create({
      data: {
        organizationId: t.world.a.org.id,
        ...cleanContact({
          name: 'Jordan Miller',
          email: 'jmiller@existing-lead.test',
          phone: '(303) 555-7788',
        }),
        name: 'Jordan Miller',
      },
    })

    // Import a batch with 1 clean contact and 1 conflicting contact
    // The conflict shares the phone number '(303) 555-7788' but has completely different name and email!
    const batchResult = await intake.ingestCustomers(authAdmin, {
      provider: 'WOOCOMMERCE',
      sourceName: 'WooCommerce Batch',
      customers: [
        {
          externalId: 'wc_batch_clean_1',
          name: 'Nora Clean',
          email: 'nora.clean@batch-import.test',
          phone: '(303) 555-1200',
        },
        {
          externalId: 'wc_batch_conflict_2',
          name: 'Completely Different Person',
          email: 'different@batch-import.test',
          phone: '(303) 555-7788', // Matches Jordan Miller's phone!
        },
      ],
    })

    expect(batchResult.created).toBe(1)
    expect(batchResult.duplicatesFlagged).toBe(1)

    // Verify the conflict was NOT merged or overwritten blindly
    const originalJordan = await db.contact.findUniqueOrThrow({ where: { id: existing.id } })
    expect(originalJordan.name).toBe('Jordan Miller')
    expect(originalJordan.email).toBe('jmiller@existing-lead.test')

    // Verify it was routed to the review queue
    const reviewQueue = await intake.reviewQueue(authAdmin)
    const reviewItem = reviewQueue.find((item) => item.proposed.email === 'different@batch-import.test')
    expect(reviewItem).toBeDefined()
    expect(reviewItem?.candidates.some((c) => c.contact.id === existing.id)).toBe(true)
  })

  it('enforces webhook authentication and replay protection on Zapier endpoints', async () => {
    // 1. Missing token rejected with 422
    const missingTokenRes = await t.app.inject({
      method: 'POST',
      url: '/integrations/zapier/webhook',
      payload: { name: 'Unauthorized Lead' },
    })
    expect(missingTokenRes.statusCode).toBe(422)

    // Invalid non-existent org token rejected with 404
    const badOrgRes = await t.app.inject({
      method: 'POST',
      url: '/integrations/zapier/webhook?token=invalidorg_token_xyz',
      payload: { name: 'Unauthorized Lead' },
    })
    expect(badOrgRes.statusCode).toBe(404)

    // 2. Valid token for Org A
    const getRes = await call(
      t.app,
      'getIntegration',
      { method: 'GET', url: '/integrations/ZAPIER', headers: t.world.a.admin.headers },
      200,
    )
    const token = getRes.data.config.webhookToken

    const hookPayload = {
      lead_id: 'zap_replay_test_101',
      name: 'Replay Test Lead',
      email: 'replay@zapier-test.local',
      phone: '(303) 555-9090',
    }

    // First delivery -> Creates contact
    const res1 = await call(
      t.app,
      'handleZapierWebhook',
      {
        method: 'POST',
        url: `/integrations/zapier/webhook?token=${token}`,
        payload: hookPayload,
      },
      202,
    )
    expect(res1.data.received).toBe(true)
    expect(res1.data.status).toBe('NEW_CONTACT')

    const contactCount1 = await db.contact.count({
      where: { organizationId: t.world.a.org.id, email: 'replay@zapier-test.local' },
    })
    expect(contactCount1).toBe(1)

    // Replay delivery with exact same payload -> Idempotent handling without creating extra contact
    const res2 = await call(
      t.app,
      'handleZapierWebhook',
      {
        method: 'POST',
        url: `/integrations/zapier/webhook?token=${token}`,
        payload: hookPayload,
      },
      202,
    )
    expect(res2.data.received).toBe(true)

    const contactCount2 = await db.contact.count({
      where: { organizationId: t.world.a.org.id, email: 'replay@zapier-test.local' },
    })
    expect(contactCount2).toBe(1)
  })
})
