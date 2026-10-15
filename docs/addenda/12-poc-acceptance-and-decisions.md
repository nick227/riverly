# Addendum 12 — POC Acceptance, Priorities and Open Decisions

## Confirmed direction after previous ZIP
1. Employee top-level surfaces: Contacts / Activity / Profile (plus permissioned management routes).
2. Pipeline stays six user-configurable roofing stages, not seven; stage-specific workspaces still present above a persistent, unified Activity river.
3. Contact identity/details and compact email history remain visible; avoid duplicate job/stage fields.
4. Stage-level instructions and resources remain admin-managed and optional; no mandatory checklist gates.
5. Activity includes direct social posting, comments, reactions, media, mentions, recognition, communication and relevant backend worker events.
6. Email is a universally closable modal overlay, fully preloaded and editable with a final explicit send. Admins configure all 13 stock templates.
7. Company membership uses invitation-based staff onboarding, Manager vs Company Admin separation, separately privileged Affiliate and Platform Admin.
8. POC management surfaces: Manage, Settings, Partner, Platform Admin; platform operations remain light relative to core CRM.

## POC checks
- Contact with two jobs preserves independent six-stage state and history while sharing bio.
- Stage may be browsed, edited and linked to resources without advancing; advance only manually.
- A job page displays the correct stage-specific controls/instructions plus Activity filtered to that job, including image/file and email entries.
- Company Activity shows employee posts alongside business events; worker-generated events use system actor and are tenant-scoped.
- From Job Completed, review-request action opens prefilled email modal; recipient, sender and exact rendered content are visible before final Send; after queueing, Activity displays correct status and duplicates are prevented.
- Recent Emails uses the same outbound message records as Activity, no second data model.
- Manager can assign work but cannot change UI vocabulary; Company Admin can change labels/options without breaking stored events; Member cannot access settings.
- Affiliate sees attributed license revenue/earnings but zero private tenant CRM information. Platform Admin cannot automatically open private company records.
- User profile slug routes correctly and scoped recognition/history never reveal unauthorized work.
- Responsive layout and component changes propagate through shared primitives and token styles.

## Explicit unresolved matters (don't invent rules)
- Whether every team member can read every company job or access is assigned/team-only.
- Company owner/admin invitation limits, licensing/trial/purchase flow, and seat-based pricing.
- Public or authenticated visibility of profile URLs; cross-company profile privacy.
- Exact review destination setup and whether review completion can ever be verified.
- Which email provider and inbound reply integrations are supported first; retention and opt-out requirements by message category.
- Whether affiliate compensation is gross-revenue commission or contract-defined profit sharing; eligible receipts, refunds, reserve/delay and payout policy.
- Scope of external inspector login vs invitation-less participant assignment.
- When to auto-notify users vs merely log system events; delivery channels and per-user controls.

## Implementation priority
1. CRM and schema-driven workflow correctness; 2. unified Activity/event model and job projection; 3. modal email worker integration with review request; 4. identity/roles + Settings/Manage; 5. minimal Profile/recognition; 6. Partner/Platform Admin POC. Do not trade contact/pipeline functionality for elaborate commercial infrastructure.
