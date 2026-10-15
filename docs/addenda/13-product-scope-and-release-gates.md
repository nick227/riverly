# 13 — Final product scope and release gates
Status: planning baseline, 2026-10-15. Additive to addenda 06–12. This is a forward-looking release boundary, not permission to overwrite existing requirements.

## Positioning and initial buyer
Riverly's prototype serves roofing companies. Core promise: preserve lead-to-job context and reduce missed follow-ups. A configurable engine is implementation architecture, **not** primary sales positioning. First evaluate one real pilot company, its existing stack and lead volume before claiming ROI or product-market fit. We do not assume existing field-service or accounting systems can be replaced.

## Confirmed core UX
- Primary daily navigation: **Contacts · Activity · Profile**. Manage and Settings are permission-gated; Partner and Platform Admin are separate authorized views. **Email is a closable modal workspace**, never required as top-level navigation.
- One contact may have multiple independent jobs; each job has a current stage, and every stage is viewable and editable regardless of progress. Six default roofing stages: New Lead, Called (label can be changed to Contacted), Inspection, Contract Signed, Job Started, Job Completed. Stage changes manual, with no mandatory checklist gates.
- Job detail: persistent segmented bar; stage-specific fields, instructions and resources; persistent contact card; **one combined job Activity river** containing notes, mail, files and workflow history rather than duplicate stage-level logs. Stage context still associated to each event. Full-width, light, black/white/neutral styling, strong alignment, no needless copy, no extraneous job/task panels.
- Unified Activity supports human posts, comments/reactions, mentions, worker outcomes and meaningful business events; diagnostics are filterable, not flooding the default river. Profile supports custom URL, curated work history and recognition.
- Company workflows and terminology driven by config; accepted types and field options admin-managed. IDs remain stable; stages can be renamed, reordered, added and retired without erasing history. Platform template + company override.

## POC essential: must be demonstrable end to end
1. Company membership and invite-based staff onboarding, roles and isolated tenancy.
2. Contacts/jobs with stage navigation, owner assignment, basic notes, attachments, activity history.
3. Manual/CSV/embed-form lead intake, attribution and duplicate-review workflow.
4. Small manager view of assignments and stalled records, and company workflow settings.
5. Job-stage email modal with preview/optional edit/explicit Send; tenant-authorized sender; queued/sent/delivered/failed status and Request Review action at Job Completed.
6. Activity river including business events, durable worker outcomes and manual posts.
7. Basic pipeline/activity reports, with drill-down into source records.

## Staged, NOT a POC release promise
- WooCommerce as **first external connector candidate**: design source architecture now; validate access and implement pilot adapter after core workflow unless a pilot makes it essential.
- Revenue and conversion scenarios: useful exploration in manager Reports, but only when reliable data exists. Manual baseline/test data allowed for prototype with explicit labels.
- Deterministic automation presets (uncontacted lead, inactivity, assignment, summaries, review reminder): implement after event quality and permission controls stabilize. Do not ship a generic automation builder.
- Other connectors (QuickBooks, Stripe, Jobber, Shopify, Housecall Pro), automated cross-system financial sync, broad AI agents, affiliate payout automation, complex reporting, campaign marketing: deferred.
- Affiliate/platform POC may use basic real license records and manual earnings/payout accounting; avoid building a complex billing service before validation. Do not label sample dollars as actual earnings.

## Release acceptance
A salesperson can process a new inquiry and trace it to completed job; a manager can find neglected leads; an admin can safely change vocabulary/options; worker and email changes appear once in Activity; an affiliate cannot see tenant CRM data. All workflows must function without AI, deep accounting integration, or a second CRM frontend.
