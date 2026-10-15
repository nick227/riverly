# Workflow Email — overlay, templates, delivery

## Business objective
Emails support roofing jobs and customer relationships, particularly review requests—not email marketing or a separate email application. No Email item in primary navigation. Company administrators customize stock templates and sender connections under Settings. All outgoing messages and meaningful delivery outcomes appear in Activity and the associated job.

## One universal overlay
`EmailModal` launches from persistent contact Email action or a stage-specific template button. The exact same surface may open as a compact modal, large sheet or full-screen overlay, always closable back to the exact origin and preserving underlying page context.

On open, show: (1) selected template with switcher, (2) authorized From account, (3) recipient name and email, (4) resolved subject and fully rendered body, (5) relevant links/attachments, and (6) a clear final Send action. Prepopulate using contact/opportunity and stage records plus available history from up to multiple previous job emails; **never fabricate** unknown dates, promises, readings or attachments. Missing required tokens produce an explicit unresolved-field state and block send.

Optional user interactions: switch template, edit subject/body, append a personal note, preview attachments, expand full-screen. Template edits affect the current message only, not the admin template. Warn before discarding unsaved custom edits or replacing the drafted body by switching templates. Final Send is a single intentional click on an already visible message, no secondary dialog. Queue feedback says `Queued`, not `Delivered`; disable repeat-click submission with idempotency.

## Stock templates (proposed initial catalog)
Standard stage templates:
1. Welcome — New Lead.
2. Follow-up — Called.
3. Inspection complete — Inspection.
4. Thank you for signing — Contract Signed.
5. Work started — Job Started.
6. Job completed — Job Completed.

Specialized:
7. Inspection confirmation.
8. Appointment reminder.
9. Estimate ready.
10. Estimate follow-up.
11. Schedule change.
12. Payment request (external company-owned checkout/invoice URL only).
13. Review request (prominent Job Completed action and tracking).

Suggested stage defaults are not automatic sends: a salesperson initiates each message. Company admins may change titles, subject/body, variables, available stages and defaults without changing source code. Templates should be versioned so an older send remains reproducible. Transactional customer messages and review solicitation should be assessed separately for consent, content, and applicable unsubscribe rules.

## Data model additions (proposed)
- `EmailTemplate`: id, organizationId, stableKey, label, stageDefinitionId?, subjectTemplate, bodyTemplate, enabled, version, createdBy, updatedAt.
- `EmailDraft`: id, organizationId, opportunityId?, contactId?, templateId?, senderIdentityId, recipientJson, subject, body, attachmentsJson, editedBy, savedAt; optional V1 persistence if drafts are retained across closing.
- `OutboundMessage`: id, organizationId, contactId?, opportunityId?, templateId?, templateVersion?, senderIdentityId, recipientSnapshot, subjectSnapshot, bodySnapshot, providerMessageId?, idempotencyKey, status, requestedBy, queuedAt, sentAt?, deliveredAt?, failedAt?.
- `DeliveryAttempt`: id, messageId, attemptNumber, providerStatus, providerEventId?, attemptedAt, errorCode?, errorSummary?.
- `ReviewRequest`: id, organizationId, opportunityId, contactId, outboundMessageId?, destinationUrl, requestedAt?, deliveryStatus, reviewedStatus? (unknown unless corroborated), createdBy. Treat multiple sends as separate outbound records under a single request history, not overwriting the first.
- `SenderIdentity/EmailConnection`: company-owned authorized sending provider credentials, verification status, allowed From/Reply-To; secrets encrypted/server-only.

## Worker contract and reliability
Worker consumes queued messages by tenant with authorization, rate limits, suppression checks, safe retries, frozen recipients/content, and deterministic idempotency. Persist the authoritative message, then dispatch via outbox/queue. Use provider webhooks for accepted/delivered/bounced events where supported; de-duplicate provider events and handle out-of-order updates. The worker emits typed activity: email queued, sent, failed, delivered; UI groups these under one message card. Distinguish provider acceptance from mailbox delivery and both from recipient reading. No fake replies where inbound is not connected.

## Review request UX
At Job Completed, show `Request review`; after queueing, show status, destination, last request date, View message and guarded Resend. Avoid accidental repeats. A delivered review request is not evidence that a review exists. Do not selectively solicit only favorable reviews.

## Non-goals
No standalone Email page, bulk campaigns, drip sequences, no-code automation builder, auto-send on stage transitions, arbitrary SMTP impersonation, or internal payment processing.
