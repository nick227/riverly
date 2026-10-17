import { useState, useMemo } from 'react'
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Overlay } from '@/components/patterns/Overlay'
import { Notice } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { STOCK_EMAIL_TEMPLATES } from '@project/shared/email'
import type { EmailRule, RecipientPreviewItem } from './types'
import { renderPersonalizedContent, formatTimingLabel } from './mockRecipients'

interface EmailPreviewModalProps {
  rule: EmailRule
  recipients: RecipientPreviewItem[]
  onClose: () => void
  onActivateRule?: () => void
}

export function EmailPreviewModal({
  rule,
  recipients,
  onClose,
  onActivateRule,
}: EmailPreviewModalProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState(recipients[0]?.id ?? '')
  const [editedSubjects, setEditedSubjects] = useState<Record<string, string>>({})
  const [editedBodies, setEditedBodies] = useState<Record<string, string>>({})

  const activeTemplate = useMemo(() => {
    return (
      STOCK_EMAIL_TEMPLATES.find((t) => t.stableKey === rule.templateKey) ??
      STOCK_EMAIL_TEMPLATES[0]!
    )
  }, [rule.templateKey])

  const selectedRecipient = useMemo(
    () => recipients.find((r) => r.id === selectedRecipientId) || recipients[0],
    [recipients, selectedRecipientId]
  )

  const defaultSubject = useMemo(() => {
    if (!selectedRecipient) return ''
    return renderPersonalizedContent(
      rule.customSubject || activeTemplate.subjectTemplate,
      selectedRecipient.resolvedData
    )
  }, [rule.customSubject, activeTemplate.subjectTemplate, selectedRecipient])

  const defaultBody = useMemo(() => {
    if (!selectedRecipient) return ''
    return renderPersonalizedContent(
      rule.customBody || activeTemplate.bodyTemplate,
      selectedRecipient.resolvedData
    )
  }, [rule.customBody, activeTemplate.bodyTemplate, selectedRecipient])

  const currentSubject = selectedRecipient
    ? editedSubjects[selectedRecipient.id] ?? defaultSubject
    : ''
  const currentBody = selectedRecipient
    ? editedBodies[selectedRecipient.id] ?? defaultBody
    : ''

  function handleSendTest() {
    toast.success('Test email sent to your inbox (tyler@nvcustomhomes.com)')
  }

  const timingText = formatTimingLabel(rule.timing, rule.timingCustomDays)

  return (
    <Overlay
      open
      variant="wide"
      onRequestClose={onClose}
      title="Preview Email"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button id="preview-modal-close-btn" variant="ghost" onClick={onClose}>
            Back
          </Button>
          <div className="action-bar">
            <Button
              id="preview-send-test-btn"
              variant="secondary"
              onClick={handleSendTest}
              disabled={!selectedRecipient?.email}
            >
              <Send size={14} /> Send test preview
            </Button>
            {onActivateRule ? (
              <Button
                id="preview-activate-btn"
                variant="primary"
                onClick={onActivateRule}
              >
                Activate Rule
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="stack gap-4">
        {/* Recipient switcher bar */}
        <div className="stack gap-1.5">
          <label className="text text--xs text--muted">Previewing email for customer:</label>
          <div className="flex items-center gap-2 flex-wrap">
            {recipients.map((rec) => {
              const isSelected = rec.id === selectedRecipient?.id
              const hasEmail = !!rec.email
              return (
                <button
                  key={rec.id}
                  type="button"
                  className={`crm-recipient-tab ${isSelected ? 'is-active' : ''} ${!hasEmail ? 'is-missing' : ''}`}
                  onClick={() => setSelectedRecipientId(rec.id)}
                >
                  <span className="text text--xs font-medium">{rec.name}</span>
                  {hasEmail ? (
                    <span className="crm-dot-ok" />
                  ) : (
                    <span className="text text--xs text--danger">(No email)</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {selectedRecipient ? (
          <div className="crm-clean-email-preview">
            {/* Warning if no email */}
            {!selectedRecipient.email ? (
              <Notice tone="warning">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text--warning flex-none" />
                  <span>
                    <strong>Missing email:</strong> {selectedRecipient.name} has no email address. This email will be skipped until an email address is added.
                  </span>
                </div>
              </Notice>
            ) : null}

            {/* Clean Envelope Header */}
            <div className="crm-preview-envelope">
              <div className="crm-preview-envelope__row">
                <span className="crm-preview-envelope__label">From</span>
                <span className="crm-preview-envelope__val">
                  NV Custom Homes &lt;hello@nvcustomhomes.com&gt;
                </span>
              </div>
              <div className="crm-preview-envelope__row">
                <span className="crm-preview-envelope__label">To</span>
                <span className="crm-preview-envelope__val">
                  {selectedRecipient.email ? (
                    `${selectedRecipient.name} <${selectedRecipient.email}>`
                  ) : (
                    <span className="text--danger">{selectedRecipient.name} (No email on file)</span>
                  )}
                </span>
              </div>
              <div className="crm-preview-envelope__row">
                <span className="crm-preview-envelope__label">Schedule</span>
                <span className="crm-preview-envelope__val">
                  Sends {timingText.toLowerCase()} after event
                </span>
              </div>
            </div>

            {/* Subject Input */}
            <div className="stack gap-1">
              <label className="text text--xs text--muted">Subject</label>
              <Input
                value={currentSubject}
                onChange={(e) =>
                  setEditedSubjects((prev) => ({
                    ...prev,
                    [selectedRecipient.id]: e.target.value,
                  }))
                }
              />
            </div>

            {/* Message Body */}
            <div className="stack gap-1">
              <label className="text text--xs text--muted">Message</label>
              <Textarea
                rows={9}
                value={currentBody}
                onChange={(e) =>
                  setEditedBodies((prev) => ({
                    ...prev,
                    [selectedRecipient.id]: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </Overlay>
  )
}
