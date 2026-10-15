# V1 Additive Update — safe merge instructions

Date: 2026-10-15. Source: post-revision product decisions. This package includes the **original nine files byte-for-byte unchanged** and adds four addenda. Do not treat it as an instruction to overwrite a working implementation or silently change existing migrations.

## Apply safely
1. Commit or back up your current docs and source code.
2. Copy **only** `docs/addenda/` from this archive into your repository. Do not copy the other files over local edits; they are supplied only as original context.
3. Review the `Decision delta` below and update original specifications through a reviewed PR. Where the addenda supersede older scope, mark the old passage superseded instead of deleting history.
4. Do **not** automatically replace `schema/domain.prisma` or `schema/roofing-workflow.json`; use the proposed entities and contracts in the addenda to make deliberate migrations and configuration changes.
5. Run schema validation, migrations against a disposable DB, API/worker tests, tenant access checks, and UI regression tests before deployment.

## Decision delta (later decisions supersede earlier proposals)
- Primary navigation: **Contacts, Activity, Profile** (Profile may be reached from the avatar and member links; exact prominence TBD). **No Email top-level page.** Settings/admin are separate.
- Contacts combines company pipeline, lead intake, contact directory and job detail. A person may have several independent jobs.
- Activity is a company-wide chronological river for human posts, workflow events, messages, recognition and business-relevant system/worker events. Stage/job and profile histories are projections of the same underlying data.
- Posting is supported in Activity; mentions, media, comments, reactions and recognition are intended capabilities, with phased rollout allowed.
- Profiles: distinctive social-inspired identity, custom URL slug, avatar, work highlights/history, awards and stickers. Public sharing is **not** assumed; organization visibility and authorization must be defined.
- Email: reusable **modal/sheet/full-screen closable overlay**, never a standalone page. Preloaded, contextual templates; recipient/from/subject/body shown before a final Send click; optional editing/personal note; company admins manage source templates.
- Standard templates: Welcome, Follow-up, Inspection complete, Thank you for signing, Work started, Job completed. Specialized: Inspection confirmation, Appointment reminder, Estimate ready, Estimate follow-up, Schedule change, Payment request, Review request.
- Review request is a prominent Job Completed action; request and delivery status appear as CRM activity. Do not infer a review was submitted from an email send.
- For now, sending is **user-initiated**, not automatic on stage transitions; all stage changes stay manual and without required checklist gates.
- Frontend: white canvas, black/gray neutrals, sans typography, bar-only pipeline segments, generous spacing, generic primitives and token-based CSS. Stage-specific controls are configuration-driven; semantic CSS only at true feature boundaries.

## Package contents
- `01-activity-posting.md`
- `02-profiles-recognition.md`
- `03-email-modal-and-worker.md`
- `04-frontend-and-integration.md`

## Open questions / do not silently decide
Email provider and inbound reply support; review provider/link verification; profile visibility and slug namespace; worker isolation/deployment; admin template locking; exact notification delivery channel; moderation/retention; allowed file types/limits; external email consent/unsubscribe policy; breadth of V1 posting interactions versus staged rollout.
