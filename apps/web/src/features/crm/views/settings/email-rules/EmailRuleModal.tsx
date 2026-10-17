import { useState, useMemo } from 'react'
import {
  FileCheck,
  Calendar,
  CheckCircle2,
  UserPlus,
  FileText,
  Star,
  Zap,
  Clock,
  UserCheck,
  Users,
  ArrowRight,
  ArrowLeft,
  Copy,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { Button, Input, Textarea } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Overlay } from '@/components/patterns/Overlay'
import { toast } from '@/components/patterns/Toast'
import { STOCK_EMAIL_TEMPLATES, KNOWN_TOKENS } from '@project/shared/email'
import type {
  EmailRule,
  RuleTriggerType,
  RuleTimingType,
} from './types'
import {
  getRecipientsForTrigger,
  generatePlainEnglishSentence,
  renderPersonalizedContent,
  formatTimingLabel,
} from './mockRecipients'

interface EmailRuleModalProps {
  initialRule?: EmailRule | null
  onClose: () => void
  onSaveRule: (rule: EmailRule) => void
}

export function EmailRuleModal({
  initialRule,
  onClose,
  onSaveRule,
}: EmailRuleModalProps) {
  // 4-Step Wizard
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Template
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(
    initialRule?.templateKey ?? 'thank_you_signing'
  )
  const [customSubject, setCustomSubject] = useState(initialRule?.customSubject ?? '')
  const [customBody, setCustomBody] = useState(initialRule?.customBody ?? '')

  // Step 2: Trigger & Timing (Two lists of chips)
  const [triggerKind, setTriggerKind] = useState<'event' | 'schedule'>(
    initialRule?.triggerType === 'condition_audience' || initialRule?.triggerType === 'list_audience'
      ? 'schedule'
      : 'event'
  )
  const [triggerType, setTriggerType] = useState<RuleTriggerType>(
    initialRule?.triggerType ?? 'contract_signed'
  )
  const [scheduleFrequency, setScheduleFrequency] = useState<'monthly' | 'weekly' | 'inactive_30d'>('monthly')
  const [timing, setTiming] = useState<RuleTimingType>(initialRule?.timing ?? 'immediately')
  const [timingCustomDays, setTimingCustomDays] = useState<number>(
    initialRule?.timingCustomDays ?? 7
  )

  // Step 3: Recipients (One line or group chips)
  const [selectedAudienceGroup, setSelectedAudienceGroup] = useState(
    initialRule?.audienceListId ?? 'woocommerce'
  )

  // Active template lookup
  const activeTemplate = useMemo(() => {
    return (
      STOCK_EMAIL_TEMPLATES.find((t) => t.stableKey === selectedTemplateKey) ??
      STOCK_EMAIL_TEMPLATES[0]!
    )
  }, [selectedTemplateKey])

  function handleSelectTemplate(key: string) {
    setSelectedTemplateKey(key)
    const t = STOCK_EMAIL_TEMPLATES.find((item) => item.stableKey === key)
    if (t) {
      setCustomSubject(t.subjectTemplate)
      setCustomBody(t.bodyTemplate)
    }
  }

  // Auto-derived rule name (no input required from user)
  const autoRuleName = useMemo(() => {
    if (triggerKind === 'event') {
      if (triggerType === 'contract_signed') return 'Contract thank-you'
      if (triggerType === 'inspection_scheduled') return 'Inspection reminder'
      if (triggerType === 'job_completed') return 'Job completed notice'
      if (triggerType === 'lead_created') return 'Welcome new lead'
    } else {
      if (scheduleFrequency === 'monthly') return 'Monthly client check-in'
      if (scheduleFrequency === 'weekly') return 'Weekly project digest'
      if (scheduleFrequency === 'inactive_30d') return 'Re-engage inactive clients'
    }
    return `${activeTemplate.label} rule`
  }, [triggerKind, triggerType, scheduleFrequency, activeTemplate.label])

  // Current rule draft
  const currentRuleDraft: EmailRule = useMemo(() => {
    return {
      id: initialRule?.id || `rule_${Date.now()}`,
      name: autoRuleName,
      status: initialRule?.status || 'DRAFT',
      triggerType,
      timing,
      timingCustomDays: timing === 'custom' ? timingCustomDays : undefined,
      templateKey: selectedTemplateKey,
      templateLabel: activeTemplate.label,
      recipientType: triggerKind === 'event' ? 'event_customer' : 'contact_list',
      scheduleFrequency: triggerKind === 'schedule' ? scheduleFrequency : undefined,
      audienceListId: triggerKind === 'schedule' ? selectedAudienceGroup : undefined,
      scope: initialRule?.scope ?? 'future_only',
      customSubject: customSubject.trim() || undefined,
      customBody: customBody.trim() || undefined,
      createdAt: initialRule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }, [
    initialRule,
    autoRuleName,
    triggerType,
    timing,
    timingCustomDays,
    selectedTemplateKey,
    activeTemplate.label,
    triggerKind,
    scheduleFrequency,
    selectedAudienceGroup,
    customSubject,
    customBody,
  ])

  // Plain English sentence
  const plainEnglish = useMemo(
    () => generatePlainEnglishSentence(currentRuleDraft),
    [currentRuleDraft]
  )

  // Recipients for preview
  const previewRecipients = useMemo(() => {
    if (triggerKind === 'schedule') {
      return getRecipientsForTrigger(
        scheduleFrequency === 'inactive_30d' ? 'condition_audience' : 'list_audience'
      )
    }
    return getRecipientsForTrigger(triggerType)
  }, [triggerKind, scheduleFrequency, triggerType])

  const sampleRecipient = previewRecipients[0]

  const renderedSubject = useMemo(() => {
    if (!sampleRecipient) return customSubject || activeTemplate.subjectTemplate
    return renderPersonalizedContent(
      customSubject || activeTemplate.subjectTemplate,
      sampleRecipient.resolvedData
    )
  }, [sampleRecipient, customSubject, activeTemplate.subjectTemplate])

  const renderedBody = useMemo(() => {
    if (!sampleRecipient) return customBody || activeTemplate.bodyTemplate
    return renderPersonalizedContent(
      customBody || activeTemplate.bodyTemplate,
      sampleRecipient.resolvedData
    )
  }, [sampleRecipient, customBody, activeTemplate.bodyTemplate])

  // Summary of When and Who for Step 4 Confirmation
  const whenSummary = useMemo(() => {
    if (triggerKind === 'event') {
      if (triggerType === 'contract_signed') return 'A contract is signed'
      if (triggerType === 'lead_created') return 'A new lead is created'
      if (triggerType === 'inspection_scheduled') return 'An inspection is scheduled'
      if (triggerType === 'job_completed') return 'A job is completed'
    } else {
      if (scheduleFrequency === 'monthly') return 'Monthly on the 1st'
      if (scheduleFrequency === 'weekly') return 'Weekly on Mondays'
      if (scheduleFrequency === 'inactive_30d') return 'Customer inactive for 30 days'
    }
    return 'Milestone event occurs'
  }, [triggerKind, triggerType, scheduleFrequency])

  const whoSummary = useMemo(() => {
    if (triggerKind === 'event') {
      return {
        title: 'Associated customer',
        detail: `The specific customer linked to the event (${sampleRecipient?.name || 'e.g. Angela Ruiz'})`,
      }
    }
    if (selectedAudienceGroup === 'woocommerce') {
      return {
        title: 'WooCommerce Customers',
        detail: '42 synced contacts',
      }
    }
    if (selectedAudienceGroup === 'no_contact_30d') {
      return {
        title: 'Inactive Customers (> 30 Days)',
        detail: '14 qualifying contacts',
      }
    }
    if (selectedAudienceGroup === 'website_leads') {
      return {
        title: 'Inbound Leads',
        detail: '18 recent website leads',
      }
    }
    return {
      title: 'All Active Clients',
      detail: '38 clients with active projects',
    }
  }, [triggerKind, selectedAudienceGroup, sampleRecipient?.name])

  function handleActivate() {
    const finalRule: EmailRule = {
      ...currentRuleDraft,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    }
    onSaveRule(finalRule)
    toast.success(`Rule "${finalRule.name}" activated!`)
    onClose()
  }

  function handleSaveDraft() {
    const finalRule: EmailRule = {
      ...currentRuleDraft,
      status: 'DRAFT',
      updatedAt: new Date().toISOString(),
    }
    onSaveRule(finalRule)
    toast.success(`Rule "${finalRule.name}" saved as Draft`)
    onClose()
  }

  return (
    <Overlay
      open
      variant="full"
      className="crm-wizard-overlay"
      onRequestClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{initialRule ? 'Edit Email Rule' : 'New Email Rule'}</span>
          <Badge tone="warning">Draft</Badge>
        </div>
      }
    >
      <div className="crm-wizard-full">
        {/* ── 4-STEP PROGRESS STEPPER ── */}
        <div className="crm-wizard-stepper">
          <div className={`crm-wizard-step-node ${step === 1 ? 'is-active' : step > 1 ? 'is-done' : ''}`}>
            <span className="crm-wizard-step-badge">{step > 1 ? '✓' : '1'}</span>
            <span>1. Template</span>
          </div>
          <div className={`crm-wizard-step-divider ${step > 1 ? 'is-done' : ''}`} />

          <div className={`crm-wizard-step-node ${step === 2 ? 'is-active' : step > 2 ? 'is-done' : ''}`}>
            <span className="crm-wizard-step-badge">{step > 2 ? '✓' : '2'}</span>
            <span>2. Trigger & Timing</span>
          </div>
          <div className={`crm-wizard-step-divider ${step > 2 ? 'is-done' : ''}`} />

          <div className={`crm-wizard-step-node ${step === 3 ? 'is-active' : step > 3 ? 'is-done' : ''}`}>
            <span className="crm-wizard-step-badge">{step > 3 ? '✓' : '3'}</span>
            <span>3. Recipients</span>
          </div>
          <div className={`crm-wizard-step-divider ${step > 3 ? 'is-done' : ''}`} />

          <div className={`crm-wizard-step-node ${step === 4 ? 'is-active' : ''}`}>
            <span className="crm-wizard-step-badge">4</span>
            <span>4. Confirmation</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            STEP 1: SIMPLE LIST OF TEMPLATES + CUSTOMIZE COPY
            ══════════════════════════════════════════════════════════════ */}
        {step === 1 ? (
          <div className="stack gap-5">
            <div className="crm-wizard-header">
              <h2 className="crm-wizard-title">Choose an email template</h2>
            </div>

            <div className="grid grid--2 gap-6 items-start">
              {/* Left Column: Simple Vertical List of Templates */}
              <div className="stack gap-2">
                <span className="text text--xs text--strong uppercase text--muted">
                  Email Templates
                </span>

                <div className="crm-template-simple-list">
                  <div
                    className={`crm-template-simple-item ${selectedTemplateKey === 'thank_you_signing' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectTemplate('thank_you_signing')}
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck size={18} className="text--accent flex-none" />
                      <div className="stack gap-0.5">
                        <span className="text text--sm text--strong">Thank you for signing</span>
                        <span className="text text--xs text--muted">Contract agreement confirmation</span>
                      </div>
                    </div>
                    <Badge tone="accent">Contract</Badge>
                  </div>

                  <div
                    className={`crm-template-simple-item ${selectedTemplateKey === 'inspection_confirmation' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectTemplate('inspection_confirmation')}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text--accent flex-none" />
                      <div className="stack gap-0.5">
                        <span className="text text--sm text--strong">Inspection reminder</span>
                        <span className="text text--xs text--muted">Confirmed assessment date & time</span>
                      </div>
                    </div>
                    <Badge tone="accent">Inspection</Badge>
                  </div>

                  <div
                    className={`crm-template-simple-item ${selectedTemplateKey === 'job_completed' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectTemplate('job_completed')}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text--accent flex-none" />
                      <div className="stack gap-0.5">
                        <span className="text text--sm text--strong">Job completed</span>
                        <span className="text text--xs text--muted">Roof project finished notification</span>
                      </div>
                    </div>
                    <Badge tone="accent">Completion</Badge>
                  </div>

                  <div
                    className={`crm-template-simple-item ${selectedTemplateKey === 'welcome' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectTemplate('welcome')}
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus size={18} className="text--accent flex-none" />
                      <div className="stack gap-0.5">
                        <span className="text text--sm text--strong">Welcome new lead</span>
                        <span className="text text--xs text--muted">Initial outreach after inquiry</span>
                      </div>
                    </div>
                    <Badge tone="accent">Lead</Badge>
                  </div>

                  <div
                    className={`crm-template-simple-item ${selectedTemplateKey === 'review_request' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectTemplate('review_request')}
                  >
                    <div className="flex items-center gap-3">
                      <Star size={18} className="text--accent flex-none" />
                      <div className="stack gap-0.5">
                        <span className="text text--sm text--strong">Review request</span>
                        <span className="text text--xs text--muted">Customer satisfaction & Google review link</span>
                      </div>
                    </div>
                    <Badge tone="accent">Review</Badge>
                  </div>

                  <div
                    className={`crm-template-simple-item ${selectedTemplateKey === 'estimate_ready' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectTemplate('estimate_ready')}
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text--accent flex-none" />
                      <div className="stack gap-0.5">
                        <span className="text text--sm text--strong">Estimate ready</span>
                        <span className="text text--xs text--muted">Proposal estimate and quote link</span>
                      </div>
                    </div>
                    <Badge tone="accent">Proposal</Badge>
                  </div>
                </div>
              </div>

              {/* Right Column: Template Copy Customization */}
              <div className="stack gap-3">
                <span className="text text--xs text--strong uppercase text--muted">
                  Message Copy Preview
                </span>

                <div className="p-4 bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] stack gap-3">
                  <div className="stack gap-1">
                    <label className="text text--xs text--strong">Subject line</label>
                    <Input
                      value={customSubject || activeTemplate.subjectTemplate}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder={activeTemplate.subjectTemplate}
                    />
                  </div>

                  <div className="stack gap-1">
                    <label className="text text--xs text--strong">Message body</label>
                    <Textarea
                      rows={8}
                      value={customBody || activeTemplate.bodyTemplate}
                      onChange={(e) => setCustomBody(e.target.value)}
                      placeholder={activeTemplate.bodyTemplate}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text text--xs text--muted mr-1">Insert token:</span>
                    {KNOWN_TOKENS.slice(0, 5).map((tok) => (
                      <button
                        key={tok}
                        type="button"
                        className="crm-token-chip"
                        onClick={() => setCustomBody((prev) => `${prev} {{${tok}}}`)}
                      >
                        +{tok}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ══════════════════════════════════════════════════════════════
            STEP 2: TRIGGER & TIMING (TWO LISTS OF STANDARD CHIPS)
            ══════════════════════════════════════════════════════════════ */}
        {step === 2 ? (
          <div className="stack gap-6">
            <div className="crm-wizard-header">
              <h2 className="crm-wizard-title">When should Riverly send this email?</h2>
            </div>

            {/* List 1: Trigger Event or Schedule Chips */}
            <div className="stack gap-3 p-5 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border)]">
              <div className="stack gap-1">
                <div className="crm-chips-list mt-1">
                  <button
                    type="button"
                    className={`crm-standard-chip ${triggerKind === 'event' && triggerType === 'contract_signed' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTriggerKind('event')
                      setTriggerType('contract_signed')
                    }}
                  >
                    ✍️ A contract is signed
                  </button>

                  <button
                    type="button"
                    className={`crm-standard-chip ${triggerKind === 'event' && triggerType === 'lead_created' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTriggerKind('event')
                      setTriggerType('lead_created')
                    }}
                  >
                    👤 A new lead is created
                  </button>

                  <button
                    type="button"
                    className={`crm-standard-chip ${triggerKind === 'event' && triggerType === 'inspection_scheduled' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTriggerKind('event')
                      setTriggerType('inspection_scheduled')
                    }}
                  >
                    📋 An inspection is scheduled
                  </button>

                  <button
                    type="button"
                    className={`crm-standard-chip ${triggerKind === 'event' && triggerType === 'job_completed' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTriggerKind('event')
                      setTriggerType('job_completed')
                    }}
                  >
                    🔨 A job is completed
                  </button>
                </div>
              </div>

              <div className="stack gap-1 mt-3 pt-3 border-t border-[var(--color-border)]">
                <div className="crm-chips-list mt-1">
                  <button
                    type="button"
                    className={`crm-standard-chip ${triggerKind === 'schedule' && scheduleFrequency === 'monthly' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTriggerKind('schedule')
                      setScheduleFrequency('monthly')
                      setTriggerType('list_audience')
                    }}
                  >
                    🗓️ Monthly on the 1st
                  </button>

                  <button
                    type="button"
                    className={`crm-standard-chip ${triggerKind === 'schedule' && scheduleFrequency === 'weekly' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTriggerKind('schedule')
                      setScheduleFrequency('weekly')
                      setTriggerType('list_audience')
                    }}
                  >
                    📅 Weekly on Mondays
                  </button>

                  <button
                    type="button"
                    className={`crm-standard-chip ${triggerKind === 'schedule' && scheduleFrequency === 'inactive_30d' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setTriggerKind('schedule')
                      setScheduleFrequency('inactive_30d')
                      setTriggerType('condition_audience')
                    }}
                  >
                    ⏳ Inactive for 30 days
                  </button>
                </div>
              </div>
            </div>

          </div>
        ) : null}

        {/* ══════════════════════════════════════════════════════════════
            STEP 3: RECIPIENTS (ONE LINE OR GROUP CHIPS) + LIVE PREVIEW
            ══════════════════════════════════════════════════════════════ */}
        {step === 3 ? (
          <div className="stack gap-5">
            <div className="crm-wizard-header">
              <h2 className="crm-wizard-title">Who receives this email?</h2>
            </div>

            <div className="gap-6 items-start">
              {/* Simplified Recipients */}
              <div className="stack gap-3">

                {triggerKind === 'event' ? (
                  /* Condition Event: Simple One Line! */
                  <div className="crm-recipient-oneline">
                    <UserCheck size={20} className="text--success flex-none" />
                    <div className="stack gap-0.5">
                      <span className="text text--sm text--strong">
                        The customer associated with the event
                      </span>
                      <span className="text text--xs text--muted">
                        Automatically sends to whichever customer triggers this event. 1 customer per event.
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Scheduled / Time-Based: Standard Group Chips! */
                  <div className="stack gap-2">
                    <span className="text text--xs text--muted">Select recipient group:</span>
                    <div className="crm-chips-list">
                      <button
                        type="button"
                        className={`crm-standard-chip ${selectedAudienceGroup === 'woocommerce' ? 'is-selected' : ''}`}
                        onClick={() => setSelectedAudienceGroup('woocommerce')}
                      >
                        🛒 WooCommerce Customers (42)
                      </button>

                      <button
                        type="button"
                        className={`crm-standard-chip ${selectedAudienceGroup === 'no_contact_30d' ? 'is-selected' : ''}`}
                        onClick={() => setSelectedAudienceGroup('no_contact_30d')}
                      >
                        📋 Inactive &gt; 30 Days (14)
                      </button>

                      <button
                        type="button"
                        className={`crm-standard-chip ${selectedAudienceGroup === 'website_leads' ? 'is-selected' : ''}`}
                        onClick={() => setSelectedAudienceGroup('website_leads')}
                      >
                        🌐 Inbound Leads (18)
                      </button>

                      <button
                        type="button"
                        className={`crm-standard-chip ${selectedAudienceGroup === 'active_clients' ? 'is-selected' : ''}`}
                        onClick={() => setSelectedAudienceGroup('active_clients')}
                      >
                        👥 All Active Clients (38)
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[var(--color-surface-subtle)] rounded border border-[var(--color-border)] text text--xs text--muted">
                  {triggerKind === 'event'
                    ? `Example: When ${sampleRecipient?.name || 'Maria Santos'}’s ${triggerType === 'contract_signed' ? 'contract' : 'job'} triggers this rule, ${sampleRecipient?.name || 'Maria'} receives the message.`
                    : `Will send on schedule to all qualifying contacts in the chosen segment.`}
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* ══════════════════════════════════════════════════════════════
            STEP 4: MINIMAL CONFIRMATION & ACTIVATION
            ══════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════
            STEP 4: CONFIRMATION
            ══════════════════════════════════════════════════════════════ */}
        {step === 4 ? (
          <div className="stack gap-5" style={{ margin: '0 auto', width: '100%' }}>
            <div className="crm-wizard-header text-center">
              <h2 className="crm-wizard-title">Review</h2>
            </div>

            {/* Summarize When and Who */}
            <div className="grid grid--2 gap-3">
              {/* When Box */}
              <div className="p-4 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border)] stack gap-1">
                <div className="flex items-center gap-2 text text--xs font-semibold uppercase tracking-wider text--muted">
                  <Clock size={14} className="text--accent" />
                  <span>When</span>
                </div>
                <div className="text text--sm font-semibold text--text mt-0.5">
                  {whenSummary}
                </div>
                <div className="text text--xs text--muted">
                  Timing: <span className="font-medium text--text">{formatTimingLabel(timing, timingCustomDays)}</span>
                </div>
              </div>

              {/* Who Box */}
              <div className="p-4 bg-[var(--color-surface-subtle)] rounded-lg border border-[var(--color-border)] stack gap-1">
                <div className="flex items-center gap-2 text text--xs font-semibold uppercase tracking-wider text--muted">
                  <UserCheck size={14} className="text--success" />
                  <span>Who</span>
                </div>
                <div className="text text--sm font-semibold text--text mt-0.5">
                  {whoSummary.title}
                </div>
                <div className="text text--xs text--muted">
                  {whoSummary.detail}
                </div>
              </div>
            </div>

            {/* Email Preview */}
            <div className="stack gap-2">
              <div className="flex items-center justify-between">
                <span className="text text--xs text--strong uppercase tracking-wider text--muted">
                  Email Preview
                </span>
                <span className="text text--xs text--muted">
                  Template: <strong className="text--text">{activeTemplate.label}</strong>
                </span>
              </div>

              <div className="p-4 bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] stack gap-3">
                <div className="crm-preview-envelope">
                  <div className="crm-preview-envelope__row">
                    <span className="crm-preview-envelope__label">From</span>
                    <span className="crm-preview-envelope__val font-medium">
                      NV Custom Homes &lt;hello@nvcustomhomes.com&gt;
                    </span>
                  </div>
                  <div className="crm-preview-envelope__row">
                    <span className="crm-preview-envelope__label">To</span>
                    <span className="crm-preview-envelope__val">
                      {sampleRecipient?.name || 'Customer'} &lt;{sampleRecipient?.email || 'customer@example.com'}&gt;
                    </span>
                  </div>
                  <div className="crm-preview-envelope__row">
                    <span className="crm-preview-envelope__label">Subject</span>
                    <span className="crm-preview-envelope__val font-semibold">
                      {renderedSubject}
                    </span>
                  </div>
                </div>

                <div className="stack gap-1">
                  <span className="text text--xs text--muted">Message body</span>
                  <div
                    className="p-3 bg-[var(--color-surface-subtle)] rounded border border-[var(--color-border)] text text--xs whitespace-pre-wrap leading-relaxed"
                    style={{ maxHeight: 220, overflowY: 'auto' }}
                  >
                    {renderedBody}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text text--xs text--muted pt-1">
              <span>Verified sender: NV Custom Homes &lt;hello@nvcustomhomes.com&gt;</span>
              <span>Sends automatically once activated</span>
            </div>
          </div>
        ) : null}

        {/* ── FOOTER ACTIONS ── */}
        <div className="crm-wizard-footer-bar">
          <div>
            {step > 1 ? (
              <Button
                id="wizard-back-btn"
                variant="ghost"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              >
                <ArrowLeft size={14} /> Back
              </Button>
            ) : (
              <Button id="wizard-cancel-btn" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>

          <div className="text text--xs text--muted">
            Step {step} of 4
          </div>

          <div className="action-bar">
            {step < 4 ? (
              <Button
                id="wizard-continue-btn"
                variant="primary"
                onClick={() => setStep((s) => (s + 1) as 2 | 3 | 4)}
              >
                Continue <ArrowRight size={14} />
              </Button>
            ) : (
              <>
                <Button id="wizard-save-draft-btn" variant="ghost" onClick={handleSaveDraft}>
                  Save as Draft
                </Button>
                <Button id="wizard-activate-btn" variant="primary" onClick={handleActivate}>
                  <ShieldCheck size={14} /> Activate Rule
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  )
}
