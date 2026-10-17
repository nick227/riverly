import { useState, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Check, CheckCircle2, Copy, CreditCard, ExternalLink, Globe, Key, Layers, Mail, Receipt, RefreshCw, Send, ShoppingBag, Store, Zap } from 'lucide-react'
import type { Integration } from '@project/sdk'
import { useDisconnectIntegration, useIntegrations, useSyncIntegration, useTestIntegration, useUpdateIntegration } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Badge, type BadgeTone } from '@/components/patterns/Badge'
import { Card } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Notice, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { relative } from '@/lib/format'

type Provider = Integration['provider']
type Config = Record<string, string>

/** Badge tone and label for a connector, decided once for every card. */
function integrationStatus(status: Integration['status'] | undefined): { tone: BadgeTone; label: string; live: boolean } {
  if (status === 'CONNECTED') return { tone: 'success', label: 'Connected', live: true }
  if (status === 'ERROR') return { tone: 'danger', label: 'Error', live: false }
  return { tone: 'neutral', label: 'Not connected', live: false }
}

/**
 * Pull connectors share one card: config fields, an encrypted secret, then save / test /
 * sync / disconnect. Each provider is just a description of its fields.
 */
type SyncConnector = {
  provider: Provider
  name: string
  savedName: string
  icon: ReactNode
  description: string
  fields: { key: string; label: string; hint: string | ((hasSecret: boolean) => string); placeholder: string | ((hasSecret: boolean) => string); initial?: string; secret?: boolean; wide?: boolean }[]
}

const WOOCOMMERCE: SyncConnector = {
  provider: 'WOOCOMMERCE',
  name: 'WooCommerce',
  savedName: 'WooCommerce Store',
  icon: <ShoppingBag />,
  description: 'Sync customer accounts and orders via WordPress Application Password.',
  fields: [
    { key: 'siteUrl', label: 'WordPress / Store URL', hint: 'Store base URL', placeholder: 'https://mystore.com', initial: 'https://demo.peakridgeroofing.test' },
    { key: 'username', label: 'WordPress Username', hint: 'WordPress login username (e.g. admin) or account email — not the Application Password label', placeholder: 'admin', initial: 'admin' },
    {
      key: 'password',
      label: 'Application Password',
      secret: true,
      wide: true,
      hint: (has) => (has ? 'Stored encrypted. Enter new password only to update.' : 'Generated in WordPress: Users → Profile → Application Passwords'),
      placeholder: (has) => (has ? '••••••••••••••••' : 'abcd efgh ijkl mnop'),
    },
  ],
}

const HUBSPOT: SyncConnector = {
  provider: 'HUBSPOT',
  name: 'HubSpot CRM',
  savedName: 'HubSpot CRM',
  icon: <Globe />,
  description: 'Pull contacts, companies, and lifecycle stages via HubSpot Private App Token.',
  fields: [
    {
      key: 'token',
      label: 'Private App Access Token',
      secret: true,
      hint: (has) => (has ? 'Stored encrypted' : 'Scope: crm.objects.contacts.read (or "demo")'),
      placeholder: (has) => (has ? '••••••••••••••••' : 'pat-na1-…'),
    },
    { key: 'portalId', label: 'Portal / Hub ID (optional)', hint: 'Your 7-8 digit HubSpot account ID', placeholder: '1984201' },
  ],
}

const PLANNED = [
  { name: 'QuickBooks', category: 'Accounting', icon: <Receipt /> },
  { name: 'Shopify', category: 'E-Commerce', icon: <Store /> },
  { name: 'Stripe', category: 'Payments', icon: <CreditCard /> },
  { name: 'Salesforce', category: 'Enterprise CRM', icon: <Layers /> },
]

export function IntegrationsSettings() {
  const integrations = useIntegrations()
  if (integrations.isLoading) return <SkeletonList rows={4} />
  const list = integrations.data ?? []
  const find = (provider: Provider) => list.find((i) => i.provider === provider)
  const connected = list.filter((i) => i.status === 'CONNECTED').length

  return (
    <div className="stack gap-6">
      <Card variant="compact">
        <div className="row row--between">
          <div className="stack gap-1">
            <h1 className="heading heading--4">Integrations</h1>
            <p className="text text--xs text--muted">Connect external services to synchronize contacts, leads, and orders with automated deduplication.</p>
          </div>
          <Badge tone={connected ? 'success' : 'neutral'}>
            {connected ? <span className="connector__dot" aria-hidden /> : null}
            {connected} of {list.length || 4} Connected
          </Badge>
        </div>
      </Card>

      <SyncConnectorCard connector={WOOCOMMERCE} integration={find('WOOCOMMERCE')} />
      <SyncConnectorCard connector={HUBSPOT} integration={find('HUBSPOT')} />
      <ZapierCard integration={find('ZAPIER')} />
      <EmailServerCard integration={find('EMAIL_SERVER')} />
      <PlannedConnectors />
    </div>
  )
}

/** Shared shell: icon, name, category and status in the header; errors make the card loud. */
function ConnectorCard({
  icon,
  name,
  category,
  status,
  badge,
  description,
  children,
}: {
  icon: ReactNode
  name: string
  category: string
  status?: Integration['status']
  badge?: ReactNode
  description: string
  children: ReactNode
}) {
  const s = integrationStatus(status)
  return (
    <Card className={cx('connector', status === 'ERROR' && 'connector--error')}>
      <div className="connector__head">
        <span className="connector__icon">{icon}</span>
        <span className="connector__name">{name}</span>
        <Badge tone="outline">{category}</Badge>
        <span className="grow" />
        {badge ?? (
          <Badge tone={s.tone}>
            {s.live ? <span className="connector__dot" aria-hidden /> : status === 'ERROR' ? <AlertCircle aria-hidden /> : null}
            {s.label}
          </Badge>
        )}
      </div>
      <div className="stack gap-4">
        <p className="text text--xs text--muted">{description}</p>
        {children}
      </div>
    </Card>
  )
}

function SyncConnectorCard({ connector: c, integration }: { connector: SyncConnector; integration?: Integration }) {
  const update = useUpdateIntegration()
  const test = useTestIntegration()
  const sync = useSyncIntegration()
  const disconnect = useDisconnectIntegration()
  const saved = (integration?.config as Config | null) ?? {}
  const hasSecret = !!integration?.hasCredentials
  const [values, setValues] = useState<Config>(() => Object.fromEntries(c.fields.filter((f) => !f.secret).map((f) => [f.key, saved[f.key] ?? f.initial ?? ''])))
  const [secret, setSecret] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const payload = { provider: c.provider, config: values, credentials: secret || undefined }
  const resolve = (v: string | ((has: boolean) => string)) => (typeof v === 'function' ? v(hasSecret) : v)

  useEffect(() => {
    if (integration?.config) {
      const cfg = integration.config as Config
      setValues((prev) => {
        const next = { ...prev }
        let changed = false
        for (const f of c.fields) {
          if (!f.secret && cfg[f.key] && prev[f.key] !== cfg[f.key]) {
            next[f.key] = cfg[f.key]!
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
  }, [integration?.config])

  const save = () =>
    update.mutate({ ...payload, name: c.savedName }, { onSuccess: () => toast.success(`${c.name} settings saved`), onError: (e) => toast.error(e) })
  const runTest = () => {
    setResult(null)
    test.mutate(payload, {
      onSuccess: (res) => {
        setResult(res)
        if (res.success) toast.success(res.message)
        else toast.error(new Error(res.message))
      },
      onError: (e) => toast.error(e),
    })
  }
  const runSync = () => {
    setResult(null)
    sync.mutate(
      { ...payload, updateExisting: true, createJobs: false },
      {
        onSuccess: (res) => {
          const message = `Sync finished: ${res.created} new contacts, ${res.updated} updated, ${res.duplicatesFlagged} need review.`
          setResult({ success: true, message })
          toast.success(message)
        },
        onError: (e) => toast.error(e),
      },
    )
  }

  return (
    <ConnectorCard icon={c.icon} name={c.name} category="Full Sync" status={integration?.status} description={c.description}>
      <div className="grid grid--2 gap-4">
        {c.fields.map((f) => (
          <Field key={f.key} label={f.label} hint={resolve(f.hint)} className={cx(f.wide && 'connector__wide')}>
            {(id) =>
              f.secret ? (
                <Input id={id} type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={resolve(f.placeholder)} />
              ) : (
                <Input id={id} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} placeholder={resolve(f.placeholder)} />
              )
            }
          </Field>
        ))}
      </div>
      {result ? (
        <Notice tone={result.success ? undefined : 'danger'}>
          <span className="row gap-2 text text--xs">
            {result.success ? <CheckCircle2 size={16} className="text--success" aria-hidden /> : <AlertCircle size={16} className="text--danger" aria-hidden />}
            {result.message}
          </span>
        </Notice>
      ) : null}
      <div className="action-bar">
        <Button variant="primary" loading={update.isPending} onClick={save}>
          Save settings
        </Button>
        <Button variant="ghost" loading={test.isPending} onClick={runTest}>
          <Key aria-hidden /> Test connection
        </Button>
        <Button variant="ghost" loading={sync.isPending} onClick={runSync}>
          <RefreshCw aria-hidden /> Sync contacts
        </Button>
        {integration?.status === 'CONNECTED' ? (
          <Button variant="ghost" loading={disconnect.isPending} onClick={() => disconnect.mutate(c.provider, { onSuccess: () => toast.success('Disconnected') })}>
            Disconnect
          </Button>
        ) : null}
      </div>
      <div className="connector__footer">
        <span>Last tested: {integration?.lastTestedAt ? relative(integration.lastTestedAt) : 'Never'}</span>
        <span>Last synced: {integration?.lastSyncedAt ? relative(integration.lastSyncedAt) : 'Never'}</span>
        {integration?.errorMessage ? <span className="text--danger">Error: {integration.errorMessage}</span> : null}
      </div>
    </ConnectorCard>
  )
}

function ZapierCard({ integration }: { integration?: Integration }) {
  const update = useUpdateIntegration()
  const test = useTestIntegration()
  const [copied, setCopied] = useState(false)
  const config = (integration?.config as Config | null) ?? {}
  const webhookToken = config.webhookToken || 'default_token'
  const webhookUrl = `${window.location.origin}/api/integrations/zapier/webhook?token=${webhookToken}`
  const [outboundUrl, setOutboundUrl] = useState(config.webhookUrl ?? '')

  function copyUrl() {
    void navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Zapier Webhook URL copied')
  }
  const save = () =>
    update.mutate(
      { provider: 'ZAPIER', name: 'Zapier Integration', config: { webhookUrl: outboundUrl, webhookToken } },
      { onSuccess: () => toast.success('Zapier settings updated'), onError: (e) => toast.error(e) },
    )
  const ping = () =>
    test.mutate(
      { provider: 'ZAPIER', config: { webhookUrl: outboundUrl } },
      { onSuccess: (res) => (res.success ? toast.success(res.message) : toast.error(new Error(res.message))), onError: (e) => toast.error(e) },
    )

  return (
    <ConnectorCard icon={<Zap />} name="Zapier" category="Inbound Webhook" status="CONNECTED" description="Receive leads in real time from Facebook Lead Ads, Calendly, Typeform, and Google Forms.">
      <Field label="Riverly Inbound Webhook URL" hint="Accepts JSON payloads with name, email, phone, and inquiry details.">
        {(id) => (
          <div className="row gap-2">
            <Input id={id} readOnly value={webhookUrl} className="connector__mono" />
            <Button variant="ghost" onClick={copyUrl}>
              {copied ? <Check className="text--success" aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </Field>
      <div className="connector__section stack gap-3">
        <Field label="Outbound Catch Hook (optional)" hint="Riverly sends event notifications to this URL">
          {(id) => <Input id={id} value={outboundUrl} onChange={(e) => setOutboundUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/123456/abcdef/" />}
        </Field>
        <div className="action-bar">
          <Button variant="primary" loading={update.isPending} onClick={save}>
            Save Zapier settings
          </Button>
          {outboundUrl ? (
            <Button variant="ghost" loading={test.isPending} onClick={ping}>
              <Send aria-hidden /> Test webhook ping
            </Button>
          ) : null}
        </div>
      </div>
    </ConnectorCard>
  )
}

const MAIL_FACTS = [
  { label: 'Protocol', value: 'Resend API / SMTP' },
  { label: 'Domain Security', value: 'DKIM & SPF Enforced' },
]

function EmailServerCard({ integration }: { integration?: Integration }) {
  const config = (integration?.config as Config | null) ?? {}
  return (
    <ConnectorCard
      icon={<Mail />}
      name="Mail Server"
      category="Transport"
      description="Outbound transactional email delivery. Configure sender identities, templates, and view outbox logs in Email settings."
      badge={
        <>
          <Badge tone={integration?.status === 'CONNECTED' ? 'success' : 'neutral'}>{config.provider === 'RESEND' ? 'Resend' : 'SMTP Gateway'}</Badge>
          <Link to="/settings/email" className="button button--ghost button--sm">
            Email Controls <ExternalLink aria-hidden />
          </Link>
        </>
      }
    >
      <div className="grid grid--3 gap-3">
        {MAIL_FACTS.map((f) => (
          <div key={f.label} className="connector__fact">
            <span className="text text--xs text--muted">{f.label}</span>
            <span className="text text--sm text--medium text--truncate">{f.value}</span>
          </div>
        ))}
        <div className="connector__fact">
          <span className="text text--xs text--muted">Controls</span>
          <Link to="/settings/email" className="link text text--sm text--truncate">
            Settings → Email
          </Link>
        </div>
      </div>
    </ConnectorCard>
  )
}

function PlannedConnectors() {
  return (
    <Card variant="compact">
      <div className="connector__head connector__head--compact">
        <Layers size={16} className="text--muted" aria-hidden />
        <span className="text text--sm text--strong grow">Upcoming Connectors</span>
        <span className="text text--xs text--muted">Unified Adapter Pipeline</span>
      </div>
      <div className="grid grid--4 gap-3">
        {PLANNED.map((p) => (
          <div key={p.name} className="connector__fact connector__fact--row">
            <span className="connector__planned-icon">{p.icon}</span>
            <span className="stack gap-1 grow">
              <span className="text text--xs text--strong text--truncate">{p.name}</span>
              <span className="text text--xs text--muted text--truncate">{p.category}</span>
            </span>
            <Badge tone="neutral">Planned</Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}
