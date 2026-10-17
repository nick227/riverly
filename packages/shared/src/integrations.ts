export type IntegrationCategory = 'FULL_SYNC' | 'INBOUND_EVENT' | 'COMMUNICATION'

export interface IntegrationProviderMeta {
  provider: 'WOOCOMMERCE' | 'HUBSPOT' | 'ZAPIER' | 'EMAIL_SERVER'
  displayName: string
  category: IntegrationCategory
  supportsBatchSync: boolean
  supportsInboundWebhooks: boolean
  description: string
}

export const INTEGRATION_PROVIDERS_META: Record<'WOOCOMMERCE' | 'HUBSPOT' | 'ZAPIER' | 'EMAIL_SERVER', IntegrationProviderMeta> = {
  WOOCOMMERCE: {
    provider: 'WOOCOMMERCE',
    displayName: 'WooCommerce',
    category: 'FULL_SYNC',
    supportsBatchSync: true,
    supportsInboundWebhooks: false,
    description: 'Batch customer sync using WordPress Application Passwords.',
  },
  HUBSPOT: {
    provider: 'HUBSPOT',
    displayName: 'HubSpot CRM',
    category: 'FULL_SYNC',
    supportsBatchSync: true,
    supportsInboundWebhooks: false,
    description: 'Full contacts synchronization using Private App Token.',
  },
  ZAPIER: {
    provider: 'ZAPIER',
    displayName: 'Zapier',
    category: 'INBOUND_EVENT',
    supportsBatchSync: false,
    supportsInboundWebhooks: true,
    description: 'Event-driven inbound webhook receiver for real-time lead capture.',
  },
  EMAIL_SERVER: {
    provider: 'EMAIL_SERVER',
    displayName: 'Mail Server',
    category: 'COMMUNICATION',
    supportsBatchSync: false,
    supportsInboundWebhooks: false,
    description: 'Mail server delivery transport (SMTP / Resend) configured at the integration level.',
  },
}
