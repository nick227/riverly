import type { FetchResult, IntegrationAdapter, TestConnectionResult } from '../types'
import { config as serverConfig } from '../../lib/config'

export class EmailServerAdapter implements IntegrationAdapter {
  provider = 'EMAIL_SERVER' as const

  async testConnection(config: Record<string, unknown>, credentials?: string | null): Promise<TestConnectionResult> {
    const provider = String(config.provider || 'RESEND')
    const key = (credentials || '').trim() || serverConfig.RESEND_API_KEY

    if (provider === 'RESEND') {
      if (!key) {
        return {
          success: false,
          message: 'Please provide a Resend API key (or configure a platform key)',
        }
      }

      if (key.startsWith('demo') || key === 'test') {
        return {
          success: true,
          message: 'Connected to simulated email transport (Development)',
          details: { provider: 'DEV_LOG', active: true },
        }
      }

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 6000)

        const res = await fetch('https://api.resend.com/domains', {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout))

        if (!res.ok) {
          return {
            success: false,
            message: `Resend authentication failed: HTTP ${res.status}`,
          }
        }

        const data = (await res.json()) as { data?: Array<{ name: string; status: string }> }
        return {
          success: true,
          message: 'Successfully connected to Resend mail service',
          details: {
            provider: 'RESEND',
            domains: data.data?.map((d) => `${d.name} (${d.status})`) ?? [],
          },
        }
      } catch (err) {
        return {
          success: false,
          message: `Could not reach Resend API: ${(err as Error).message}`,
        }
      }
    }

    // SMTP / Custom mail server
    const host = String(config.host || '').trim()
    const port = Number(config.port || 587)
    if (!host) {
      return { success: false, message: 'Please provide the mail server host address' }
    }

    return {
      success: true,
      message: `Mail server configuration valid (${host}:${port})`,
      details: { host, port, provider: 'SMTP' },
    }
  }

  async fetchCustomers(): Promise<FetchResult> {
    return {
      sourceName: 'Email Server',
      customers: [],
      totalCount: 0,
    }
  }
}
