import type { FetchResult, IntegrationAdapter, TestConnectionResult, ThirdPartyCustomer } from '../types'

export class HubSpotAdapter implements IntegrationAdapter {
  provider = 'HUBSPOT' as const

  async testConnection(config: Record<string, unknown>, credentials?: string | null): Promise<TestConnectionResult> {
    const token = (credentials || '').trim()
    const portalId = String(config.portalId || '').trim()

    if (!token) {
      return { success: false, message: 'Please provide a HubSpot Private App Access Token' }
    }

    if (token.startsWith('demo') || token === 'test') {
      return {
        success: true,
        message: 'Connected successfully to HubSpot demo account',
        details: { portalId: portalId || '1984201', contactsFound: 4 },
      }
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))

      if (!res.ok) {
        if (res.status === 401) {
          return { success: false, message: 'Invalid HubSpot Access Token. Please check token permissions.' }
        }
        return { success: false, message: `HubSpot API responded with HTTP ${res.status}: ${res.statusText}` }
      }

      const body = (await res.json()) as { total?: number }
      return {
        success: true,
        message: 'Successfully connected to HubSpot CRM',
        details: { portalId, contactsFound: body.total },
      }
    } catch (err) {
      return { success: false, message: `Failed to connect to HubSpot: ${(err as Error).message}` }
    }
  }

  async fetchCustomers(
    config: Record<string, unknown>,
    credentials?: string | null,
    options?: { limit?: number; since?: Date },
  ): Promise<FetchResult> {
    const token = (credentials || '').trim()
    const limit = options?.limit ?? 100

    if (!token) throw new Error('HubSpot Access Token is required to sync')

    if (token.startsWith('demo') || token === 'test') {
      return {
        sourceName: 'HubSpot CRM (Demo)',
        totalCount: 3,
        customers: [
          {
            externalId: 'hs_contact_501',
            name: 'Patricia Morales',
            firstName: 'Patricia',
            lastName: 'Morales',
            email: 'pmorales@rockymountainholdings.com',
            phone: '(303) 555-0812',
            addressLine: '4200 Cherry Creek Drive',
            city: 'Denver',
            region: 'CO',
            postalCode: '80246',
            notes: 'HubSpot Lifecycle Stage: Opportunity · High value commercial account',
            jobTitle: 'Commercial Flat Roof Consultation',
            propertyAddress: '4200 Cherry Creek Drive, Denver CO',
            receivedAt: new Date(Date.now() - 20 * 86400000),
            rawPayload: { id: '501', company: 'Rocky Mountain Holdings', lifecyclestage: 'opportunity' },
          },
          {
            externalId: 'hs_contact_502',
            name: 'Kenneth Wright',
            firstName: 'Kenneth',
            lastName: 'Wright',
            email: 'kwright@wrightarchitects.com',
            phone: '(720) 555-0934',
            addressLine: '1725 15th St',
            city: 'Boulder',
            region: 'CO',
            postalCode: '80302',
            notes: 'HubSpot Lifecycle Stage: Lead · Architectural spec partnership inquiry',
            jobTitle: 'Architectural Spec Review',
            propertyAddress: '1725 15th St, Boulder CO',
            receivedAt: new Date(Date.now() - 7 * 86400000),
            rawPayload: { id: '502', company: 'Wright Architects' },
          },
          {
            externalId: 'hs_contact_503',
            name: 'Alison Bell',
            firstName: 'Alison',
            lastName: 'Bell',
            email: 'alison.bell@highlanddevelop.com',
            phone: '(303) 555-0761',
            addressLine: '2288 Highland Ave',
            city: 'Denver',
            region: 'CO',
            postalCode: '80205',
            notes: 'HubSpot Lifecycle Stage: Customer · Multi-family roof replacement',
            jobTitle: 'Multi-Family Roof Assessment',
            propertyAddress: '2288 Highland Ave, Denver CO',
            receivedAt: new Date(Date.now() - 3 * 86400000),
            rawPayload: { id: '503', company: 'Highland Developments' },
          },
        ],
      }
    }

    const properties = 'firstname,lastname,email,phone,address,city,state,zip,company,createdate'
    const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=${Math.min(limit, 100)}&properties=${properties}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`HubSpot API failed (${res.status}): ${await res.text().catch(() => res.statusText)}`)
    }

    const data = (await res.json()) as { results: Array<{ id: string; properties: Record<string, string | null>; createdAt?: string }> }
    const customers: ThirdPartyCustomer[] = (data.results || []).map((r) => {
      const p = r.properties || {}
      const firstName = (p.firstname || '').trim()
      const lastName = (p.lastname || '').trim()
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || p.email || `HubSpot Contact #${r.id}`
      return {
        externalId: `hs_contact_${r.id}`,
        name: fullName,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: (p.email || '').trim().toLowerCase() || null,
        phone: (p.phone || '').trim() || null,
        addressLine: (p.address || '').trim() || null,
        city: (p.city || '').trim() || null,
        region: (p.state || '').trim() || null,
        postalCode: (p.zip || '').trim() || null,
        notes: p.company ? `Company: ${p.company}` : null,
        jobTitle: 'HubSpot Inquiry',
        propertyAddress: (p.address || '').trim() || null,
        receivedAt: p.createdate ? new Date(p.createdate) : new Date(),
        rawPayload: r,
      }
    })

    return {
      sourceName: 'HubSpot CRM',
      customers,
      totalCount: customers.length,
    }
  }
}
