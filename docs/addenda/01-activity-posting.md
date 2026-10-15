# Activity — product, design and data contract

## Purpose and screen
One primary `Activity` surface, chronological newest-first, centered single river; compact filter/search toolbar; lightweight expandable post composer. Feed filters: All, Mine, Messages, Team, System; filters must not change underlying persistence. Preserve scroll position when fresh events arrive; offer a new-activity affordance. Default entries display actor, plain-language action, relevant subject, time, and source link. Dense activity should remain scannable.

## What is included
- Human: posts, job updates, comments, mentions, recognition (awards/stickers), attachments/photos.
- Business: lead created/imported, assignment, pipeline transition, phone call, inspection scheduled/completed, file uploaded, contract attached, review request.
- Communications: outbound queued/sent/failed/delivered, inbound reply **only if a reply integration exists**.
- System: batch import results, webhook failures, provider disconnects, email worker failures/retries when consequential.
- Diagnostics such as polling and heartbeats belong in engineering logs, not the business river. Retain correlation metadata to link to diagnostics.

## Presentation primitives
`ActivityRiver`, `ActivityItem`, `PostComposer`, `ActivityFilterBar`, `MediaGrid`, `ActionBar`, `CommentThread` (simple), `ReactionStrip`. Three variants: compact event, rich post/media, actionable failure/attention item. Rendering is chosen from structured event type and payload; never create a unique page for each event type. Coalesce lifecycle messages (queued/sent/delivered) into a single expandable delivery story while preserving raw events.

## Interactions
- Post a team update; optionally attach media and associate with an accessible job. `@mentions` resolve to actual member IDs; free text alone does not grant access.
- Comment, react, and give a recognition token; each has actor, timestamp and target; comments/reactions can be deferred behind a small implementation flag if necessary for V1 schedule.
- Click a subject to navigate to the originating contact/job/profile; reply to external messages only when supported by channel credentials; retry failed send only with proper permission and idempotency.
- Read/acknowledge/notification status is *per viewer*, not a global property of the event.

## Data contract (proposed, not a migration)
- `ActivityEvent`: id, organizationId, type, occurredAt, actorType, actorId?, subjectType, subjectId, contactId?, opportunityId?, payloadJson, correlationId?, originService?, visibility, createdAt. Append-only facts; corrections as new events or audited revisions.
- `Post`: id, organizationId, authorId, body, audience, opportunityId?, createdAt, updatedAt?, deletedAt?; shares river rendering but is not confused with immutable operational events.
- `Comment`: id, postId, authorId, body, createdAt; `Reaction`: id, targetType, targetId, memberId, emoji/code, createdAt; `Mention`: id, postId/commentId, mentionedMemberId.
- `NotificationDelivery/ReadState`: id, eventId, userId, deliveryChannel, deliveredAt?, seenAt?, acknowledgedAt?; do not equate event creation with a notification being sent.
- `Attachment`: reuse existing attachment ownership, link via authorized association rather than duplicating files.

## Ingestion and safety
All producers use a typed `appendActivity` interface with authenticated organization scope, actor and correlation IDs. Use outbox transaction or a durable queue where an event must track a domain mutation; retries/deduplication by producer event key. Ingestion is allowed from worker system identities but cannot impersonate a human. No client arbitrary writes of `SYSTEM` events. Permission-gate the river, referenced jobs and media; do not leak private customer/email content into public profiles. Rate-limit human posting and mention notifications, sanitize text and attachments, support soft-delete/moderation and retention decisions.

## Reporting/read models
Project the same stream for company feed, individual job history, and staff history. Aggregates and current state come from authoritative domain tables or explicitly materialized summaries, not from parsing display strings. Every workflow stage can filter its related events and include records made before/after stage advancement.
