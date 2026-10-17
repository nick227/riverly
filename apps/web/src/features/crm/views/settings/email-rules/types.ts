export type RuleTriggerType =
  | 'lead_created'
  | 'contract_signed'
  | 'inspection_scheduled'
  | 'job_completed'
  | 'list_audience'
  | 'condition_audience'

export type RuleTimingType = 'immediately' | '1_day' | '3_days' | 'custom'

export type RecipientSelectionType =
  | 'event_customer'
  | 'contact_list'
  | 'matching_conditions'

export type RuleStatus = 'ACTIVE' | 'DRAFT' | 'PAUSED'

export type ActivationScope = 'future_only' | 'existing_and_future'

export interface EmailRule {
  id: string
  name: string
  status: RuleStatus
  triggerType: RuleTriggerType
  timing: RuleTimingType
  timingCustomDays?: number
  templateKey: string
  templateLabel: string
  recipientType: RecipientSelectionType
  scheduleFrequency?: 'monthly' | 'weekly' | 'inactive_30d'
  audienceListId?: string
  audienceCondition?: string
  scope: ActivationScope
  customSubject?: string
  customBody?: string
  createdAt: string
  updatedAt: string
}

export interface RecipientPreviewItem {
  id: string
  name: string
  email: string | null
  phone?: string
  eventSummary: string
  triggerReason: string
  isQualified: boolean
  exclusionReason?: string
  resolvedData: {
    firstName: string
    companyName: string
    senderName: string
    jobTitle: string
    propertyAddress: string
    appointmentDate?: string
    appointmentTime?: string
    estimate?: string
  }
}
