// Email template catalog + deterministic renderer. Tokens resolve only from real
// records; a token with no value is reported as unresolved and blocks sending.

export type TemplateSeed = {
  stableKey: string
  label: string
  stageId: string | null
  subjectTemplate: string
  bodyTemplate: string
}

export const STOCK_EMAIL_TEMPLATES: TemplateSeed[] = [
  {
    stableKey: 'welcome',
    label: 'Welcome',
    stageId: 'lead',
    subjectTemplate: 'Thanks for contacting {{company.name}}',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nThanks for reaching out about {{job.title}}. I\'m {{sender.name}} and I\'ll be your point of contact. I\'ll call you shortly to learn more about the property and answer any questions.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'follow_up',
    label: 'Follow-up',
    stageId: 'called',
    subjectTemplate: 'Following up on your roofing request',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nI tried to reach you about {{job.title}} at {{job.propertyAddress}}. When is a good time to talk or schedule a free inspection?\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'inspection_complete',
    label: 'Inspection complete',
    stageId: 'inspection',
    subjectTemplate: 'Your roof inspection is complete',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nThanks for having us out to {{job.propertyAddress}}. Our inspection is complete and we\'re preparing your estimate. We\'ll follow up with the findings and next steps.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'thank_you_signing',
    label: 'Thank you for signing',
    stageId: 'contract',
    subjectTemplate: 'Thank you for choosing {{company.name}}',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nThank you for signing with us for {{job.title}}. We\'ll be in touch shortly to confirm scheduling.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'work_started',
    label: 'Work started',
    stageId: 'started',
    subjectTemplate: 'Work has started on your roof',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nOur crew has started work at {{job.propertyAddress}}. If you have any questions during the project, reply to this email or call me.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'job_completed',
    label: 'Job completed',
    stageId: 'completed',
    subjectTemplate: 'Your roofing project is complete',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nYour {{job.title}} at {{job.propertyAddress}} is complete. Thank you for trusting {{company.name}} with your home.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'inspection_confirmation',
    label: 'Inspection confirmation',
    stageId: 'inspection',
    subjectTemplate: 'Inspection confirmed for {{appointment.date}}',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nYour roof inspection at {{job.propertyAddress}} is confirmed for {{appointment.date}} at {{appointment.time}}.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'appointment_reminder',
    label: 'Appointment reminder',
    stageId: 'inspection',
    subjectTemplate: 'Reminder: appointment on {{appointment.date}}',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nA reminder that we\'ll see you at {{job.propertyAddress}} on {{appointment.date}} at {{appointment.time}}.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'estimate_ready',
    label: 'Estimate ready',
    stageId: 'contract',
    subjectTemplate: 'Your estimate is ready',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nYour estimate for {{job.title}} is ready: {{job.estimate}}. I\'m happy to walk through it with you.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'estimate_follow_up',
    label: 'Estimate follow-up',
    stageId: 'contract',
    subjectTemplate: 'Any questions about your estimate?',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nI wanted to check in on the estimate for {{job.title}}. Let me know if you have any questions.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'schedule_change',
    label: 'Schedule change',
    stageId: null,
    subjectTemplate: 'Schedule update for your project',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nWe need to update the schedule for {{job.title}}. The new appointment is {{appointment.date}} at {{appointment.time}}.\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'payment_request',
    label: 'Payment request',
    stageId: 'completed',
    subjectTemplate: 'Invoice for your project',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nYou can view and pay your invoice for {{job.title}} here:\n{{payment.url}}\n\n{{sender.name}}\n{{company.name}}',
  },
  {
    stableKey: 'review_request',
    label: 'Review request',
    stageId: 'completed',
    subjectTemplate: 'How did we do?',
    bodyTemplate:
      'Hi {{contact.firstName}},\n\nThank you for choosing {{company.name}}. If you have a moment, we\'d appreciate hearing about your experience:\n{{review.url}}\n\n{{sender.name}}\n{{company.name}}',
  },
]

export type RenderContext = Record<string, string | null | undefined>

const TOKEN = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g

export const KNOWN_TOKENS = [
  'contact.firstName',
  'contact.name',
  'company.name',
  'sender.name',
  'job.title',
  'job.propertyAddress',
  'job.estimate',
  'owner.name',
  'appointment.date',
  'appointment.time',
  'payment.url',
  'review.url',
] as const

export function templateTokens(template: string): string[] {
  return [...new Set([...template.matchAll(TOKEN)].map((m) => m[1]!))]
}

export function renderTemplate(template: string, ctx: RenderContext) {
  const unresolved = new Set<string>()
  const text = template.replace(TOKEN, (whole, key: string) => {
    const v = ctx[key]
    if (v === null || v === undefined || v === '') {
      unresolved.add(key)
      return whole
    }
    return v
  })
  return { text, unresolved: [...unresolved] }
}
