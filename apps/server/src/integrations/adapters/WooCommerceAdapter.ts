import type { FetchResult, IntegrationAdapter, TestConnectionResult, ThirdPartyCustomer } from '../types'

export class WooCommerceAdapter implements IntegrationAdapter {
  provider = 'WOOCOMMERCE' as const

  async testConnection(config: Record<string, unknown>, credentials?: string | null): Promise<TestConnectionResult> {
    const siteUrl = String(config.siteUrl || '').trim().replace(/\/+$/, '')
    const username = String(config.username || '').trim()
    const password = (credentials || '').trim()

    if (!siteUrl) return { success: false, message: 'Please provide the WordPress / WooCommerce site URL' }
    if (!username) return { success: false, message: 'Please provide the username or email' }
    if (!password) return { success: false, message: 'Please enter the Application Password' }

    // Built-in simulator / sandbox for testing without external live store
    if (siteUrl.includes('demo') || siteUrl.includes('example.com') || siteUrl === 'test') {
      return {
        success: true,
        message: 'Connected successfully to WooCommerce demo environment',
        details: { storeName: 'Demo Roofing Supply & Services', version: '8.9.1', customersFound: 12 },
      }
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      const testUrl = `${siteUrl}/wp-json/wc/v3/customers?per_page=1`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(testUrl, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'User-Agent': 'Riverly-CRM/1.0',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            message: 'Authentication failed. Please verify the Application Password and user permissions in WordPress.',
          }
        }
        if (res.status === 404) {
          return {
            success: false,
            message: `WooCommerce REST API not found at ${siteUrl}. Ensure WooCommerce is active and REST API is enabled.`,
          }
        }
        return {
          success: false,
          message: `WooCommerce responded with HTTP ${res.status}: ${res.statusText}`,
        }
      }

      const totalCount = res.headers.get('x-wp-total')
      return {
        success: true,
        message: 'Successfully connected to WooCommerce store',
        details: {
          siteUrl,
          totalCustomers: totalCount ? parseInt(totalCount, 10) : undefined,
        },
      }
    } catch (err) {
      // In development / offline testing, if host is unreachable, report clear helpful message
      const msg = (err as Error).message
      return {
        success: false,
        message: `Could not connect to ${siteUrl}: ${msg}`,
      }
    }
  }

  async fetchCustomers(
    config: Record<string, unknown>,
    credentials?: string | null,
    options?: { limit?: number; since?: Date },
  ): Promise<FetchResult> {
    const siteUrl = String(config.siteUrl || '').trim().replace(/\/+$/, '')
    const username = String(config.username || '').trim()
    const password = (credentials || '').trim()
    const limit = options?.limit ?? 100

    if (!siteUrl || !username || !password) {
      throw new Error('WooCommerce connection credentials are required to sync')
    }

    // Demo / mock data for POC verification or demo store URLs
    if (siteUrl.includes('demo') || siteUrl.includes('example.com') || siteUrl === 'test') {
      return {
        sourceName: `WooCommerce (${siteUrl || 'demo'})`,
        totalCount: 5,
        customers: generateDemoWooCommerceCustomers(),
      }
    }

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    const fetchUrl = `${siteUrl}/wp-json/wc/v3/customers?per_page=${Math.min(limit, 100)}&orderby=registered_date&order=desc`

    try {
      const res = await fetch(fetchUrl, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'User-Agent': 'Riverly-CRM/1.0',
        },
      })

      if (!res.ok) {
        throw new Error(`WooCommerce API request failed (${res.status}): ${await res.text().catch(() => res.statusText)}`)
      }

      const rawCustomers = (await res.json()) as Array<Record<string, unknown>>
      const customers: ThirdPartyCustomer[] = rawCustomers.map((c) => {
        const id = String(c.id ?? '')
        const billing = (c.billing as Record<string, unknown>) || {}
        const firstName = String(c.first_name || billing.first_name || '').trim()
        const lastName = String(c.last_name || billing.last_name || '').trim()
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || String(c.username || c.email || `Customer #${id}`)
        const email = String(c.email || billing.email || '').trim().toLowerCase() || null
        const phone = String(billing.phone || '').trim() || null
        const address1 = String(billing.address_1 || '').trim()
        const address2 = String(billing.address_2 || '').trim()
        const addressLine = [address1, address2].filter(Boolean).join(', ') || null
        const city = String(billing.city || '').trim() || null
        const region = String(billing.state || '').trim() || null
        const postalCode = String(billing.postcode || '').trim() || null
        const isPaying = Boolean(c.is_paying_customer)
        const dateCreated = c.date_created ? new Date(String(c.date_created)) : null

        return {
          externalId: `wc_cust_${id}`,
          name: fullName,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email,
          phone,
          addressLine,
          city,
          region,
          postalCode,
          notes: isPaying ? 'WooCommerce Verified Buyer' : 'WooCommerce Registered Account',
          jobTitle: isPaying ? 'WooCommerce Client' : null,
          propertyAddress: addressLine,
          receivedAt: dateCreated,
          rawPayload: c,
        }
      })

      return {
        sourceName: `WooCommerce (${siteUrl})`,
        customers,
        totalCount: customers.length,
      }
    } catch (err) {
      // If live connection fails with network error during dev testing, give detailed error
      throw new Error(`Failed to fetch WooCommerce customers from ${siteUrl}: ${(err as Error).message}`)
    }
  }
}

function generateDemoWooCommerceCustomers(): ThirdPartyCustomer[] {
  return [
    {
      externalId: 'wc_cust_101',
      name: 'Marcus Vance',
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'marcus.vance@peakridgehomes.com',
      phone: '(303) 555-0142',
      addressLine: '842 Skyline Ridge Way',
      city: 'Denver',
      region: 'CO',
      postalCode: '80202',
      notes: 'WooCommerce Order #1049 · GAF Timberline HDZ Shingles order',
      jobTitle: 'Roof Replacement - Timberline HDZ',
      propertyAddress: '842 Skyline Ridge Way, Denver CO',
      receivedAt: new Date(Date.now() - 30 * 86400000),
      rawPayload: { id: 101, username: 'mvance', total_spent: '4820.00', orders_count: 2 },
    },
    {
      externalId: 'wc_cust_102',
      name: 'Sarah Chen',
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'schen@aspenproperties.net',
      phone: '(720) 555-0188',
      addressLine: '1240 Pinecrest Terrace',
      city: 'Boulder',
      region: 'CO',
      postalCode: '80302',
      notes: 'WooCommerce Order #1082 · Metal seam roof inspection deposit',
      jobTitle: 'Standing Seam Metal Inspection',
      propertyAddress: '1240 Pinecrest Terrace, Boulder CO',
      receivedAt: new Date(Date.now() - 14 * 86400000),
      rawPayload: { id: 102, username: 'schen', total_spent: '250.00', orders_count: 1 },
    },
    {
      externalId: 'wc_cust_103',
      name: 'David & Elena Miller',
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.miller@frontrange.org',
      phone: '(303) 555-0219',
      addressLine: '315 Meadowlark Dr',
      city: 'Lakewood',
      region: 'CO',
      postalCode: '80226',
      notes: 'WooCommerce Order #1095 · Hail damage emergency repair dispatch',
      jobTitle: 'Hail Damage Repair',
      propertyAddress: '315 Meadowlark Dr, Lakewood CO',
      receivedAt: new Date(Date.now() - 5 * 86400000),
      rawPayload: { id: 103, username: 'dmiller', total_spent: '1200.00', orders_count: 1 },
    },
    {
      externalId: 'wc_cust_104',
      name: 'Elena Rostova',
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@summitcrest.com',
      phone: '(970) 555-0371',
      addressLine: '55 Foothills Blvd',
      city: 'Golden',
      region: 'CO',
      postalCode: '80401',
      notes: 'WooCommerce Registered Client · Inquired about commercial TPO membrane',
      jobTitle: 'Commercial TPO Membrane Service',
      propertyAddress: '55 Foothills Blvd, Golden CO',
      receivedAt: new Date(Date.now() - 2 * 86400000),
      rawPayload: { id: 104, username: 'erostova', total_spent: '0.00', orders_count: 0 },
    },
    {
      externalId: 'wc_cust_105',
      name: 'Robert Thornton',
      firstName: 'Robert',
      lastName: 'Thornton',
      email: 'rthornton@timberlineroofing.biz',
      phone: '(303) 555-0455',
      addressLine: '9001 West Colfax Ave',
      city: 'Lakewood',
      region: 'CO',
      postalCode: '80215',
      notes: 'WooCommerce Subcontractor / Partner Material Order #1114',
      jobTitle: 'Flashing & Vent Kit Supply',
      propertyAddress: '9001 West Colfax Ave',
      receivedAt: new Date(Date.now() - 1 * 86400000),
      rawPayload: { id: 105, username: 'rthornton', total_spent: '3450.00', orders_count: 3 },
    },
  ]
}
