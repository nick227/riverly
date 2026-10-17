export interface ThirdPartyCustomer {
  externalId: string
  name: string
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  addressLine?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  notes?: string | null
  jobTitle?: string | null
  propertyAddress?: string | null
  inquiry?: string | null
  receivedAt?: Date | null
  rawPayload?: Record<string, unknown>
}

export interface TestConnectionResult {
  success: boolean
  message: string
  details?: Record<string, unknown>
}

export interface FetchResult {
  customers: ThirdPartyCustomer[]
  totalCount?: number
  sourceName: string
}

export interface IntegrationAdapter {
  provider: 'WOOCOMMERCE' | 'HUBSPOT' | 'ZAPIER' | 'EMAIL_SERVER'
  testConnection(config: Record<string, unknown>, credentials?: string | null): Promise<TestConnectionResult>
  fetchCustomers(
    config: Record<string, unknown>,
    credentials?: string | null,
    options?: { limit?: number; since?: Date },
  ): Promise<FetchResult>
}
