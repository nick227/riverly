import type { Role, OpportunityStatus } from '@project/sdk'
import type { BadgeTone } from '@/components/patterns/Badge'

export const roleLabel = (r: Role) => ({ OWNER: 'Owner', ADMIN: 'Admin', MANAGER: 'Manager', MEMBER: 'Member' })[r]

export const statusLabel = (s: OpportunityStatus) => ({ OPEN: 'Open', WON: 'Won', LOST: 'Lost', ON_HOLD: 'On hold', CANCELED: 'Canceled' })[s]

export const statusTone = (s: OpportunityStatus): BadgeTone => ({ OPEN: 'neutral', WON: 'success', LOST: 'danger', ON_HOLD: 'warning', CANCELED: 'outline' })[s] as BadgeTone

/** Delivery language never claims more than the provider confirmed. */
export const messageStatusLabel = (s: string) =>
  ({ QUEUED: 'Queued', SENDING: 'Sending', SENT: 'Accepted by provider', DELIVERED: 'Delivered', BOUNCED: 'Bounced', FAILED: 'Failed' })[s] ?? s

export const messageStatusTone = (s: string): BadgeTone =>
  (({ QUEUED: 'outline', SENDING: 'outline', SENT: 'neutral', DELIVERED: 'success', BOUNCED: 'danger', FAILED: 'danger' }) as Record<string, BadgeTone>)[s] ?? 'neutral'

export const verificationLabel = (v: string) =>
  ({ SELF_REPORTED: 'Logged by team', PROVIDER_VERIFIED: 'Provider confirmed', SYSTEM_RECORDED: 'Recorded by Riverly' })[v] ?? v
