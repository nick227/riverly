# Addendum 07 — Unified Activity River and Posting

## Product contract
**Activity** is a company-wide chronological river of meaningful work and social updates. The same records are projected within a job and, selectively, on a user's profile. Store widely; render understandably; notify sparingly.

Capture: lead intake/import and assignments; stage changes; calls and notes; outbound email queue/send/delivery/failure and inbound replies if supported; inspection and field activity; attachments and final photos; review requests; external financial reference updates; team posts, @mentions, awards and stickers; business-relevant backend worker and integration outcomes.

## V1 page
- One river screen: compact composer above chronological events, with All / Mine / Messages / Team / System filters and search.
- Three event presentation variants: compact (routine), rich (media and significant milestones), actionable (failures, unassigned work, reminders).
- Feed supports links to contact, job, person, document, email, or system operation.
- Direct posts: text, optional media/file attachments, optional job association, colleague mentions. Comments and simple reactions; awards/stickers from the same social model.
- Replies to inbound customer messages only where a real inbound connection/channel exists. Internal comments are explicitly distinct from customer replies.
- Post and job permissions always enforce organization membership and record scope, on both queries and mutations.

## Persistence and noise policy
- ActivityEvent: immutable meaningful fact with organizationId, actor (user/system/integration), verb/type, subject/ref, occurredAt, optional contactId/opportunityId/stageId, correlationId, structured payload, schema version.
- SocialPost and Comment persist authored content with author, timestamps, company and optional job association. Link to event records for unified display; don't force mutable posts into immutable audit-only payloads.
- OutboundMessage, document, appointment, stage-state and other operational entities remain authoritative; Activity is an event projection and navigation surface.
- Group message lifecycle (queued -> sent -> delivered/failed) in one display item while preserving underlying transitions.
- Worker retries, webhook de-duplication, heartbeat and poll diagnostics belong to operations logs; only business-relevant outcomes appear in normal Activity (diagnostic details admin-accessible).
- Individual notifications are recipient-scoped attention states derived from relevant events, not a redundant public event copy.
- Don't insert new events at the top while the reader is scrolled down; show an unobtrusive new-events indicator.

## Minimal interactions
Post, comment, react, mention, recognize, filter, search, open related record, acknowledge personal notifications; permissioned recovery actions for actionable events. A worker event must be credited to a system/integration actor, not a fake employee.
