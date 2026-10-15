# Addendum 08 — Email Is a Modal Capability, Not a Page

## Product behavior
There is **no Email top-level navigation**. Email opens as a dismissible overlay from any contact, workflow stage or Activity action. It may expand to full-screen, but closes to the same underlying page/view without losing context.

A contextual email opens already prepared: authorized sender, target contact/email, appropriate template, personalized subject and body, available job/stage facts and relevant links. Deterministic placeholders are resolved before preview. Missing required values are prominently identified and block send; no fabrication from activity history.

## Two-click send contract
1. User chooses Email or a stage-specific template action; the modal displays **From, To, Subject, exact rendered message**, and optional attachments. User may select another template, edit subject/body, or append a personal note. Changes do not alter the company's original template.
2. User reviews and presses **Send email** once; queue the immutable rendered snapshot and show queued status, not false claims of delivery. Worker updates message status and Activity. Do not add an unnecessary third confirmation.

Warn before changing templates or closing when unsaved edits exist. Show prior sends for the job and prior request state to avoid duplicate or repetitive communication. Use a stable idempotency key for dispatch requests. Resend is an explicit action, not a silent repeat.

## Stock templates (admin-editable)
Standard stage templates: Welcome / inquiry acknowledgment; Follow-up; Inspection complete; Thank you for signing; Work started; Job completed.

Specialized templates: Inspection confirmation; Appointment reminder; Estimate ready; Estimate follow-up; Schedule change; Payment request with external customer-owned invoice/checkout URL; **Review request** with approved business review destination.

Company admin controls template wording, stage association, enabled state, sender connection and review URL. Team members may personalize individual sends where authorized, without changing the shared template. The Job completed workspace prominently exposes Request review and clearly displays its last request/delivery status, without inferring the review was posted.

## Worker and records
- Tenant-scoped authorized sender accounts; provider credentials isolated from CRM record responses and affiliate/platform business modules.
- EmailTemplate with stable ID and version; EmailSend/OutboundMessage with sender, recipient, job, template reference/version, rendered immutable content, initiator, schedule/queue timestamps, message ID, provider ID, delivery state.
- Delivery attempts/provider events and failures retain correlation and deduplication IDs. Distinguish queued, provider-accepted/sent, delivered, bounced, failed. Do not treat opens as incontrovertible reading.
- Delivery is recorded in both job-filtered and company Activity projections, but not as duplicate messages.
- No campaign manager, mass-email editor, automatic stage-trigger campaigns or autonomous AI mail in V1. All listed templates are available for manual use; automation is explicitly deferred.
- Apply appropriate unsubscribe/opt-out and legal requirements by message purpose and jurisdiction; do not send to an unverified or unauthorized identity.
