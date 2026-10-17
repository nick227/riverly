import type { IntegrationAdapter } from './types'
import { WooCommerceAdapter } from './adapters/WooCommerceAdapter'
import { HubSpotAdapter } from './adapters/HubSpotAdapter'
import { ZapierAdapter } from './adapters/ZapierAdapter'
import { EmailServerAdapter } from './adapters/EmailServerAdapter'

export * from './types'

const adapters: Record<string, IntegrationAdapter> = {
  WOOCOMMERCE: new WooCommerceAdapter(),
  HUBSPOT: new HubSpotAdapter(),
  ZAPIER: new ZapierAdapter(),
  EMAIL_SERVER: new EmailServerAdapter(),
}

export function getAdapter(provider: string): IntegrationAdapter {
  const adapter = adapters[provider.toUpperCase()]
  if (!adapter) throw new Error(`Unsupported integration provider "${provider}"`)
  return adapter
}
