import type { EmailRule, RecipientPreviewItem, RuleTriggerType, RecipientSelectionType } from './types'

export const SAMPLE_RECIPIENTS_BY_TRIGGER: Record<RuleTriggerType, RecipientPreviewItem[]> = {
  contract_signed: [
    {
      id: 'rec_angela',
      name: 'Angela Ruiz',
      email: 'angela.ruiz@example.com',
      phone: '(208) 555-0168',
      eventSummary: 'Contract signed · 310 Willow Way',
      triggerReason: 'Contract signed for Roof replacement ($28,400)',
      isQualified: true,
      resolvedData: {
        firstName: 'Angela',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof replacement',
        propertyAddress: '310 Willow Way, Nampa, ID',
        estimate: '$28,400',
      },
    },
    {
      id: 'rec_robert',
      name: 'Robert Hale',
      email: 'rhale@example.com',
      phone: '(208) 555-0123',
      eventSummary: 'Contract signed · 7 Bluff View',
      triggerReason: 'Contract signed for Architectural shingles ($19,500)',
      isQualified: true,
      resolvedData: {
        firstName: 'Robert',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Architectural shingles replacement',
        propertyAddress: '7 Bluff View, Boise, ID',
        estimate: '$19,500',
      },
    },
    {
      id: 'rec_george',
      name: 'George Kim',
      email: 'george.kim@example.com',
      phone: '(208) 555-0171',
      eventSummary: 'Contract signed · 18 Pheasant Hill',
      triggerReason: 'Contract signed for Standing seam metal roof ($41,200)',
      isQualified: true,
      resolvedData: {
        firstName: 'George',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Metal roof installation',
        propertyAddress: '18 Pheasant Hill, Boise, ID',
        estimate: '$41,200',
      },
    },
    {
      id: 'rec_carl',
      name: 'Carl Jensen',
      email: null,
      phone: '(208) 555-0164',
      eventSummary: 'Contract signed · 2201 W Main St',
      triggerReason: 'Contract signed · No email address on file',
      isQualified: false,
      exclusionReason: 'Missing email address in CRM contact record',
      resolvedData: {
        firstName: 'Carl',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof replacement',
        propertyAddress: '2201 W Main St, Boise, ID',
      },
    },
  ],

  inspection_scheduled: [
    {
      id: 'rec_maria',
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      phone: '(208) 555-0199',
      eventSummary: 'Inspection scheduled · 42 Cedar Ln',
      triggerReason: 'Onsite inspection booked for Tomorrow at 10:00 AM',
      isQualified: true,
      resolvedData: {
        firstName: 'Maria',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof leak assessment',
        propertyAddress: '42 Cedar Ln, Meridian, ID',
        appointmentDate: 'Tomorrow, Oct 18',
        appointmentTime: '10:00 AM',
      },
    },
    {
      id: 'rec_samantha',
      name: 'Samantha Reed',
      email: 'sam.reed@example.com',
      phone: '(208) 555-0137',
      eventSummary: 'Inspection scheduled · 1550 N Linder Rd',
      triggerReason: 'Storm damage inspection booked for Oct 19 at 2:00 PM',
      isQualified: true,
      resolvedData: {
        firstName: 'Samantha',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Storm damage inspection',
        propertyAddress: '1550 N Linder Rd, Meridian, ID',
        appointmentDate: 'Oct 19',
        appointmentTime: '2:00 PM',
      },
    },
    {
      id: 'rec_dean',
      name: 'Dean Foster',
      email: 'dean.foster@example.com',
      phone: '(208) 555-0152',
      eventSummary: 'Inspection scheduled · 9 Quail Run',
      triggerReason: 'Gutter and fascia inspection booked for Oct 20 at 9:00 AM',
      isQualified: true,
      resolvedData: {
        firstName: 'Dean',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Gutter + fascia inspection',
        propertyAddress: '9 Quail Run, Star, ID',
        appointmentDate: 'Oct 20',
        appointmentTime: '9:00 AM',
      },
    },
  ],

  job_completed: [
    {
      id: 'rec_don',
      name: 'Don Lou',
      email: 'donlou@example.com',
      phone: '(555) 123-4567',
      eventSummary: 'Job completed · 123 Maple Ave',
      triggerReason: 'Roof replacement marked 100% complete by crew',
      isQualified: true,
      resolvedData: {
        firstName: 'Don',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof replacement',
        propertyAddress: '123 Maple Ave, Boise, ID',
        estimate: '$28,400',
      },
    },
    {
      id: 'rec_patricia',
      name: 'Patricia Long',
      email: 'patricia.long@example.com',
      phone: '(208) 555-0103',
      eventSummary: 'Job completed · 914 N 15th St',
      triggerReason: 'Roof replacement complete & final inspection signed',
      isQualified: true,
      resolvedData: {
        firstName: 'Patricia',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof replacement',
        propertyAddress: '914 N 15th St, Boise, ID',
        estimate: '$21,300',
      },
    },
    {
      id: 'rec_helen',
      name: 'Helen Fischer',
      email: 'helen.fischer@example.com',
      phone: '(208) 555-0193',
      eventSummary: 'Job completed · 61 Lakeview Dr',
      triggerReason: 'Roof replacement finished and warranty registered',
      isQualified: true,
      resolvedData: {
        firstName: 'Helen',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof replacement',
        propertyAddress: '61 Lakeview Dr, Eagle, ID',
        estimate: '$26,700',
      },
    },
    {
      id: 'rec_david',
      name: 'David Miller',
      email: null,
      phone: '(208) 555-0198',
      eventSummary: 'Job completed · 4410 Birch Ln',
      triggerReason: 'Job completed · Customer prefers phone only',
      isQualified: false,
      exclusionReason: 'Missing email address in CRM contact record',
      resolvedData: {
        firstName: 'David',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Gutter repair',
        propertyAddress: '4410 Birch Ln, Boise, ID',
      },
    },
  ],

  lead_created: [
    {
      id: 'rec_priya',
      name: 'Priya Shah',
      email: 'priya.shah@example.com',
      phone: '(208) 555-0133',
      eventSummary: 'New lead · Web form inquiry',
      triggerReason: 'Submitted inspection request for 19 Aspen Dr',
      isQualified: true,
      resolvedData: {
        firstName: 'Priya',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Pre-purchase roof inspection',
        propertyAddress: '19 Aspen Dr, Boise, ID',
      },
    },
    {
      id: 'rec_hector',
      name: 'Hector Alvarez',
      email: 'hector.alvarez@example.com',
      phone: '(208) 555-0161',
      eventSummary: 'New lead · Local Services Ad',
      triggerReason: 'Requested hail damage assessment for 880 W Pine Ave',
      isQualified: true,
      resolvedData: {
        firstName: 'Hector',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Hail damage assessment',
        propertyAddress: '880 W Pine Ave, Meridian, ID',
      },
    },
    {
      id: 'rec_frank',
      name: 'Frank Delgado',
      email: null,
      phone: '(208) 555-0129',
      eventSummary: 'New lead · Referral call',
      triggerReason: 'Phone call lead · No email provided',
      isQualified: false,
      exclusionReason: 'Missing email address in CRM contact record',
      resolvedData: {
        firstName: 'Frank',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Leak repair',
        propertyAddress: '4402 S Five Mile Rd, Boise, ID',
      },
    },
  ],

  list_audience: [
    {
      id: 'rec_margaret',
      name: 'Margaret Holt',
      email: 'margaret.holt@example.com',
      phone: '(208) 555-0201',
      eventSummary: 'WooCommerce synced client · 15 Cottonwood Ln',
      triggerReason: 'Member of synced WooCommerce Customers list',
      isQualified: true,
      resolvedData: {
        firstName: 'Margaret',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Prior client re-engagement',
        propertyAddress: '15 Cottonwood Ln, Boise, ID',
      },
    },
    {
      id: 'rec_daniel',
      name: 'Daniel Price',
      email: 'daniel.price@example.com',
      phone: '(208) 555-0202',
      eventSummary: 'WooCommerce synced client · 7 Ironwood Ct',
      triggerReason: 'Member of synced WooCommerce Customers list',
      isQualified: true,
      resolvedData: {
        firstName: 'Daniel',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Seasonal maintenance offer',
        propertyAddress: '7 Ironwood Ct, Meridian, ID',
      },
    },
    {
      id: 'rec_susan',
      name: 'Susan Clarke',
      email: 'susan.clarke@example.com',
      phone: '(208) 555-0203',
      eventSummary: 'WooCommerce synced client · 290 Fir St',
      triggerReason: 'Member of synced WooCommerce Customers list',
      isQualified: true,
      resolvedData: {
        firstName: 'Susan',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Annual roof tune-up',
        propertyAddress: '290 Fir St, Eagle, ID',
      },
    },
  ],

  condition_audience: [
    {
      id: 'rec_don_c',
      name: 'Don Lou',
      email: 'donlou@example.com',
      phone: '(555) 123-4567',
      eventSummary: 'Completed 45 days ago · No contact in 30 days',
      triggerReason: 'Matches filter: Completed jobs with no outreach > 30 days',
      isQualified: true,
      resolvedData: {
        firstName: 'Don',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof replacement check-in',
        propertyAddress: '123 Maple Ave, Boise, ID',
      },
    },
    {
      id: 'rec_patricia_c',
      name: 'Patricia Long',
      email: 'patricia.long@example.com',
      phone: '(208) 555-0103',
      eventSummary: 'Completed 60 days ago · No contact in 30 days',
      triggerReason: 'Matches filter: Completed jobs with no outreach > 30 days',
      isQualified: true,
      resolvedData: {
        firstName: 'Patricia',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Roof inspection review',
        propertyAddress: '914 N 15th St, Boise, ID',
      },
    },
    {
      id: 'rec_helen_c',
      name: 'Helen Fischer',
      email: 'helen.fischer@example.com',
      phone: '(208) 555-0193',
      eventSummary: 'Completed 75 days ago · No contact in 30 days',
      triggerReason: 'Matches filter: Completed jobs with no outreach > 30 days',
      isQualified: true,
      resolvedData: {
        firstName: 'Helen',
        companyName: 'NV Custom Homes',
        senderName: 'Tyler Mason',
        jobTitle: 'Post-job satisfaction survey',
        propertyAddress: '61 Lakeview Dr, Eagle, ID',
      },
    },
  ],
}

export function getRecipientsForTrigger(trigger: RuleTriggerType): RecipientPreviewItem[] {
  return SAMPLE_RECIPIENTS_BY_TRIGGER[trigger] ?? SAMPLE_RECIPIENTS_BY_TRIGGER.contract_signed
}

export function formatTimingLabel(timing: EmailRule['timing'], customDays?: number): string {
  switch (timing) {
    case 'immediately':
      return 'Immediately'
    case '1_day':
      return '1 day later'
    case '3_days':
      return '3 days later'
    case 'custom':
      return `${customDays ?? 7} days later`
    default:
      return 'Immediately'
  }
}

export function formatTriggerLabel(
  trigger: RuleTriggerType,
  scheduleFrequency?: 'monthly' | 'weekly' | 'inactive_30d'
): string {
  if (scheduleFrequency === 'monthly') return 'Monthly on the 1st'
  if (scheduleFrequency === 'weekly') return 'Weekly on Mondays'
  if (scheduleFrequency === 'inactive_30d') return 'Inactive for 30 days'
  switch (trigger) {
    case 'lead_created':
      return 'A new lead is created'
    case 'contract_signed':
      return 'A contract is signed'
    case 'inspection_scheduled':
      return 'An inspection is scheduled'
    case 'job_completed':
      return 'A job is completed'
    case 'list_audience':
      return 'Contacts from a saved list'
    case 'condition_audience':
      return 'Contacts matching conditions'
  }
}

export function formatRecipientPlainLabel(
  recipientType: RecipientSelectionType,
  audienceListId?: string
): string {
  if (recipientType === 'contact_list' || recipientType === 'matching_conditions') {
    if (audienceListId === 'woocommerce') return 'contacts in WooCommerce Customers'
    if (audienceListId === 'no_contact_30d') return 'contacts inactive for 30+ days'
    if (audienceListId === 'website_leads') return 'inbound leads'
    if (audienceListId === 'active_clients') return 'all active clients'
    return 'contacts in the selected list'
  }
  return 'the associated customer'
}

export function generatePlainEnglishSentence(rule: Partial<EmailRule>): string {
  let triggerText = 'When a contract is signed'
  if (rule.scheduleFrequency === 'monthly') {
    triggerText = 'Every month on the 1st'
  } else if (rule.scheduleFrequency === 'weekly') {
    triggerText = 'Every week on Mondays'
  } else if (rule.scheduleFrequency === 'inactive_30d') {
    triggerText = 'When a customer has been inactive for 30 days'
  } else if (rule.triggerType === 'lead_created') {
    triggerText = 'When a new lead is created'
  } else if (rule.triggerType === 'inspection_scheduled') {
    triggerText = 'When an inspection is scheduled'
  } else if (rule.triggerType === 'job_completed') {
    triggerText = 'When a job is completed'
  } else if (rule.triggerType === 'list_audience') {
    triggerText = 'On recurring schedule'
  }

  const timingText =
    rule.timing === 'immediately'
      ? 'immediately'
      : rule.timing === '1_day'
        ? '1 day later'
        : rule.timing === '3_days'
          ? '3 days later'
          : `${rule.timingCustomDays ?? 7} days later`

  const templateLabel = rule.templateLabel || 'Thank you for signing'
  const recipientTarget = formatRecipientPlainLabel(
    rule.recipientType || 'event_customer',
    rule.audienceListId
  )

  if (rule.scheduleFrequency === 'monthly' || rule.scheduleFrequency === 'weekly') {
    if (rule.timing === 'immediately') {
      return `${triggerText}, send the "${templateLabel}" email to ${recipientTarget}.`
    }
    return `${triggerText}, send the "${templateLabel}" email ${timingText} to ${recipientTarget}.`
  }

  return `${triggerText}, send the "${templateLabel}" email ${timingText} to ${recipientTarget}.`
}

export function renderPersonalizedContent(
  template: string,
  data: RecipientPreviewItem['resolvedData'],
): string {
  return template
    .replace(/\{\{\s*contact\.firstName\s*\}\}/g, data.firstName)
    .replace(/\{\{\s*contact\.name\s*\}\}/g, data.firstName)
    .replace(/\{\{\s*company\.name\s*\}\}/g, data.companyName)
    .replace(/\{\{\s*sender\.name\s*\}\}/g, data.senderName)
    .replace(/\{\{\s*job\.title\s*\}\}/g, data.jobTitle)
    .replace(/\{\{\s*job\.propertyAddress\s*\}\}/g, data.propertyAddress)
    .replace(/\{\{\s*appointment\.date\s*\}\}/g, data.appointmentDate || 'Tomorrow')
    .replace(/\{\{\s*appointment\.time\s*\}\}/g, data.appointmentTime || '10:00 AM')
    .replace(/\{\{\s*job\.estimate\s*\}\}/g, data.estimate || '$19,500')
    .replace(/\{\{\s*review\.url\s*\}\}/g, 'https://riverly.app/r/review-nvcustomhomes')
    .replace(/\{\{\s*payment\.url\s*\}\}/g, 'https://riverly.app/pay/inv-8821')
}

export const INITIAL_RULES: EmailRule[] = [
  {
    id: 'rule_contract_thankyou',
    name: 'Contract thank-you',
    status: 'ACTIVE',
    triggerType: 'contract_signed',
    timing: 'immediately',
    templateKey: 'thank_you_signing',
    templateLabel: 'Thank you for signing',
    recipientType: 'event_customer',
    scope: 'future_only',
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'rule_inspection_reminder',
    name: 'Inspection reminder',
    status: 'ACTIVE',
    triggerType: 'inspection_scheduled',
    timing: '1_day',
    templateKey: 'inspection_confirmation',
    templateLabel: 'Inspection confirmation',
    recipientType: 'event_customer',
    scope: 'future_only',
    createdAt: '2026-10-12T14:30:00Z',
    updatedAt: '2026-10-12T14:30:00Z',
  },
  {
    id: 'rule_review_completed',
    name: 'Review request on completion',
    status: 'DRAFT',
    triggerType: 'job_completed',
    timing: '3_days',
    templateKey: 'review_request',
    templateLabel: 'Review request',
    recipientType: 'event_customer',
    scope: 'future_only',
    createdAt: '2026-10-15T09:15:00Z',
    updatedAt: '2026-10-15T09:15:00Z',
  },
]
