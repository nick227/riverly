import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Eye, Mail, ArrowRight } from 'lucide-react'
import { Button, IconButton } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { toast } from '@/components/patterns/Toast'
import { STOCK_EMAIL_TEMPLATES } from '@project/shared/email'
import type { EmailRule } from './types'
import {
  INITIAL_RULES,
  formatTimingLabel,
  formatTriggerLabel,
  getRecipientsForTrigger,
} from './mockRecipients'
import { EmailRuleModal } from './EmailRuleModal'
import { EmailPreviewModal } from './EmailPreviewModal'

const STORAGE_KEY = 'riverly:email-rules:v1'

export function EmailRulesSection() {
  const [rules, setRules] = useState<EmailRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return INITIAL_RULES
  })

  const [editingRule, setEditingRule] = useState<EmailRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [previewingRule, setPreviewingRule] = useState<EmailRule | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
    } catch {
      // fallback
    }
  }, [rules])

  function handleSaveRule(savedRule: EmailRule) {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === savedRule.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = savedRule
        return next
      }
      return [savedRule, ...prev]
    })
    setIsCreating(false)
    setEditingRule(null)
  }

  function handleToggleStatus(ruleId: string) {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r
        const newStatus = r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        toast.success(`Rule "${r.name}" is now ${newStatus.toLowerCase()}`)
        return {
          ...r,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }

  function handleDeleteRule(ruleId: string, ruleName: string) {
    if (window.confirm(`Delete rule "${ruleName}"?`)) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      toast.success(`Rule "${ruleName}" deleted`)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Email Rules"
        actions={
          <Button
            id="create-email-agent-btn"
            size="sm"
            variant="primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} aria-hidden /> Create Email Agent
          </Button>
        }
      />

      <div className="list">
        {rules.map((rule) => {
          const triggerLabel = formatTriggerLabel(rule.triggerType, rule.scheduleFrequency)
          const timingLabel = formatTimingLabel(rule.timing, rule.timingCustomDays)
          const template =
            STOCK_EMAIL_TEMPLATES.find((t) => t.stableKey === rule.templateKey)?.label ||
            rule.templateLabel ||
            'Template'

          const scopeText =
            rule.scope === 'future_only'
              ? 'Future events only · Sent from NV Custom Homes'
              : 'Existing & future contacts · Sent from NV Custom Homes'

          const statusTone =
            rule.status === 'ACTIVE'
              ? 'success'
              : rule.status === 'DRAFT'
                ? 'warning'
                : 'outline'

          return (
            <div key={rule.id} className="list__row crm-email-rule-row">
              <div className="stack gap-1 grow" style={{ minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="text text--sm text--strong">{rule.name}</span>
                  <Badge tone={statusTone}>{rule.status.toLowerCase()}</Badge>
                </div>

                {/* Readable plain sentence */}
                <div className="crm-rule-flow-line">
                  <span>{triggerLabel}</span>
                  <span className="text--muted">→</span>
                  <span>{timingLabel}</span>
                  <span className="text--muted">→</span>
                  <span className="text--strong">{template}</span>
                </div>

                <span className="text text--xs text--muted">
                  {scopeText}
                </span>
              </div>

              <div className="action-bar flex-none">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewingRule(rule)}
                >
                  <Eye size={13} /> Preview
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingRule(rule)}
                >
                  <Edit2 size={13} /> Edit
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleStatus(rule.id)}
                >
                  {rule.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                </Button>

                <IconButton
                  size="sm"
                  label="Delete rule"
                  icon={<Trash2 size={13} />}
                  onClick={() => handleDeleteRule(rule.id, rule.name)}
                />
              </div>
            </div>
          )
        })}

        {rules.length === 0 ? (
          <div className="empty">
            <Mail size={32} />
            <span>No automatic email rules configured yet</span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={14} /> Create Email Agent
            </Button>
          </div>
        ) : null}
      </div>

      {/* Create / Edit Rule Question Process Modal */}
      {isCreating || editingRule ? (
        <EmailRuleModal
          initialRule={editingRule}
          onClose={() => {
            setIsCreating(false)
            setEditingRule(null)
          }}
          onSaveRule={handleSaveRule}
        />
      ) : null}

      {/* Clean Email Preview Modal */}
      {previewingRule ? (
        <EmailPreviewModal
          rule={previewingRule}
          recipients={getRecipientsForTrigger(previewingRule.triggerType)}
          onClose={() => setPreviewingRule(null)}
          onActivateRule={() => {
            handleToggleStatus(previewingRule.id)
            setPreviewingRule(null)
          }}
        />
      ) : null}
    </Card>
  )
}
