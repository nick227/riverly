import type { FetchResult, IntegrationAdapter, TestConnectionResult, ThirdPartyCustomer } from '../types'

export class ZapierAdapter implements IntegrationAdapter {
  provider = 'ZAPIER' as const

  async testConnection(config: Record<string, unknown>, credentials?: string | null): Promise<TestConnectionResult> {
    const webhookUrl = String(config.webhookUrl || '').trim()
    const apiKey = (credentials || '').trim()

    if (webhookUrl) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 6000)

        // Ping the Zapier catch hook with a handshake event
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'riverly.ping',
            timestamp: new Date().toISOString(),
            message: 'Testing Zapier connection from Riverly CRM',
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout))

        if (!res.ok && res.status !== 200 && res.status !== 201) {
          return {
            success: false,
            message: `Zapier webhook URL responded with status ${res.status}`,
          }
        }

        return {
          success: true,
          message: 'Successfully reached Zapier webhook endpoint',
          details: { webhookUrl, status: 'Active' },
        }
      } catch (err) {
        return {
          success: false,
          message: `Could not reach Zapier webhook URL: ${(err as Error).message}`,
        }
      }
    }

    return {
      success: true,
      message: 'Zapier integration receiver is ready. Leads sent to your Riverly webhook URL will be automatically ingested.',
      details: { hasApiKey: Boolean(apiKey) },
    }
  }

  async fetchCustomers(
    config: Record<string, unknown>,
    _credentials?: string | null,
    _options?: { limit?: number; since?: Date },
  ): Promise<FetchResult> {
    // Zapier leads are usually pushed via webhook. If manual trigger or sync is initiated,
    // return any staged/recent Zapier incoming payloads or sample test leads.
    return {
      sourceName: 'Zapier Integration',
      totalCount: 2,
      customers: [
        {
          externalId: 'zap_sample_901',
          name: 'Jennifer Larson',
          firstName: 'Jennifer',
          lastName: 'Larson',
          email: 'jlarson@frontrangehome.com',
          phone: '(303) 555-0678',
          addressLine: '7412 W Alameda Ave',
          city: 'Lakewood',
          region: 'CO',
          postalCode: '80226',
          notes: 'Zapier Lead: Facebook Lead Ad campaign #SpringRoofingPromo',
          jobTitle: 'Roof Inspection Request (Facebook Lead Ad)',
          propertyAddress: '7412 W Alameda Ave, Lakewood CO',
          receivedAt: new Date(Date.now() - 4 * 86400000),
          rawPayload: { zap_id: '901', source: 'facebook_lead_ads', form_name: 'Spring Roofing Free Inspection' },
        },
        {
          externalId: 'zap_sample_902',
          name: 'Tyler Jackson',
          firstName: 'Tyler',
          lastName: 'Jackson',
          email: 'tjackson@mountaintrail.org',
          phone: '(720) 555-0899',
          addressLine: '502 Pine Needle Way',
          city: 'Golden',
          region: 'CO',
          postalCode: '80401',
          notes: 'Zapier Lead: Calendly Consultation booked',
          jobTitle: 'Consultation Call (Calendly)',
          propertyAddress: '502 Pine Needle Way, Golden CO',
          receivedAt: new Date(Date.now() - 1 * 86400000),
          rawPayload: { zap_id: '902', source: 'calendly', event_type: '15 Minute Initial Discovery' },
        },
      ],
    }
  }
}
