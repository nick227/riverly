# Delivery checklist and acceptance scenarios

## Scope implementation sequence
1. Event contract + organization-scoped posting source and job/company river projections.
2. Activity screen + compact/rich/actionable renderers + worker event ingestion and grouping.
3. Admin email template and verified sender setup, reusable EmailModal, queue/delivery/history and Review request.
4. User profiles with editable presentation, custom slugs, authorized activity highlights and basic recognition.
5. Optional deeper features (comments, stickers, mention notifications, all thirteen email templates) behind explicit release criteria, without rewriting the primary views.

## Acceptance tests
- Same job appears under its contact, correctly in pipeline, with its stage history; changing labels doesn't destroy reporting.
- Two calls and one email in Called produce three distinct structured records, not three checkboxes replacing each other.
- An uploaded inspection report appears in stage and filtered Activity without duplicating the binary.
- A worker email failure is shown on company Activity, job activity and linked outbound message; diagnostics remain available only in admin logs.
- Review request opens populated modal showing name/address, from, resolved template, and destination; no send before explicit final click; safe repeated clicks produce one queued request.
- After send, queue status and provider outcome are distinct; review status remains unknown until independently confirmed.
- Switching templates with unsaved edits gives a discard warning; closing returns to prior job stage.
- Employees with and without access to a job see only authorized details in feed, mentions and profile history.
- Custom profile URL resolves predictably and remains isolated from internal records; role-based audience verified.
- Tenant A cannot read Tenant B contacts, posts, templates, messages, workers or recognition.
- Compact mobile rendering and keyboard navigation are verified for composer, pipeline, profile and modal.

## Potential tensions to settle
- Activity is intended to be exhaustive of business-meaningful events, but noisy low-level job-poll events remain diagnostics; this is deliberate.
- Emails remain deliberate sends even if actions are prominent at six stages; later automation is not silently included.
- Templates for all six stages plus seven specialized cases are approved as a **catalog direction**, but rollout prioritization and the exact V1 mandatory subset are not yet confirmed.
- Recognition and social affordances create moderation and access needs; do not treat broad public profile visibility as an agreed requirement.
- Persistent contact info belongs in ContactCard; opportunity-specific fields belong to job data even if displayed beside contact fields. Resolve duplicate presentation in layouts, not by duplicating data.
