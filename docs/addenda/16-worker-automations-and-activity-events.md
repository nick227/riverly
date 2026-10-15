# 16 — Scheduled jobs, bots and Activity
Status: architecture extension; do not confuse workflow activity data with technical job logs.

## Three mechanisms
1. `DomainEvent`: immutable business outcome (lead.created, opportunity.stage_changed, email.sent, inspection.scheduled, sync.completed). Contains tenant, actor (USER|SYSTEM|INTEGRATION), subject, occurredAt, correlationId, idempotencyKey, version, safe payload.
2. `WorkerRun`: operational execution details (trigger, schedule, attempts, checkpoints, errors, timing); backend-owned, not an Activity post.
3. `ActivityProjection`: read-optimized user-facing river entry linking actor/job/contact/source, kind, visibility, rendered summary, and actions. Avoid posting worker retries as multiple customer-visible successes.

## Visibility and notifications
- Default river: meaningful business events, people posts, completed sends, job media, recognition and actionable failures. Group delivery lifecycle updates and batch import runs.
- System filter: more detailed worker outcomes. Technical heartbeats, noisy polling and secrets remain in protected ops logs, not end-user feed.
- Personal notifications are per recipient, not a mutable global read flag. Only user-relevant events trigger notification; mention, assignment or failed owned send are candidates. Social reactions are allowed only where authorized.
- Every entry links to original record/job; source-level access governs visibility. No accidental cross-company disclosure through aggregate worker events.

## Automation roadmap
Presets with thresholds/schedules/recipients: unassigned leads; first-contact delay; stage inactivity; morning manager summary; completed-job review-request reminder. **Observe and suggest first**, then optionally prepare drafts. Auto-send or consequential updates require explicit admin authorization, consent/opt-out handling, audit and replay protection. AI bots are later enhancements, not an essential implementation tier.

## Execution safety
Per-organization scoping; durable outbox/queue, idempotency keys, retry with backoff, dead-letter handling, reconciliation and bounded worker concurrency. Track status `queued/running/succeeded/failed/partially_completed`, avoid implying email delivered when only queued. Use signed provider webhooks where available, secret redaction and short safe error snippets. Enforce no duplicate review requests without explicit resend action. Prevent replay storms and excessive email sends.

## Example result
A daily inactivity scan produces one grouped Activity result: checked N opportunities, identified M requiring review, offers **Review jobs**. Raw record IDs and scan evidence available on authorized detail drill-down; public river avoids exposing private lead data to unauthorised roles.
