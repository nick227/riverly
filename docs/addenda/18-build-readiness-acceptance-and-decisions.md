# 18 — Pre-development implementation checklist and unresolved decisions
Status: final planning handoff; do not convert suggestions into unreviewed POC commitments.

## Recommended technical order
0. Freeze naming: user/person, company/organization, contact, job/opportunity, source/list/view, stage/event/worker run; assert one glossary for API/UI/docs.
1. Migration-safe relational core: company membership, contact, opportunity, workflow definitions/versions, stage transition history, activity, attachment, source record, source links, lists, import run. Every table has organization ownership where applicable.
2. Typed workflow configuration + renderer; one roofing seed; manual stage change with optional recorded evidence; preserve old stage labels via historical snapshots or version IDs.
3. Contact/job views, lead intake and source review; attach workers and Activity projections.
4. Email modal, reviewed send, worker queue/status, and review request; real authorized sender required for live dispatch.
5. Manager reports and minimal settings/team/PARTNER/platform demo; avoid implementing speculative features before a first live pilot.
6. WooCommerce connector and insights/simulations as separately gated phase after source model is tested with CSV and forms.

## Critical end-to-end tests
- Same person in multiple lists/sources; provenance shows all entries and correct job-origin source, no unapproved merge.
- Contact with two concurrent independent jobs, each with stage/owner/activity history; switching doesn't leak stage details.
- Rename/reorder/retire stages after jobs exist: no orphan history, migration/reassignment deliberate and audited.
- New web lead + CSV duplicate + assignment; history shows true source and timestamps.
- Contractor assignment cannot expose other records; managers cannot edit schema; affiliate cannot read any tenant record; platform admin support escalation audited.
- Review email: preloaded, rendered, editable, explicit Send; duplicate prevention, retries, failed and delivered states, source of truth in outbound record; stage does not auto-advance.
- System import/worker event appears once as grouped Activity item; operational diagnostics protected; human posts and comments honor visibility.
- Reports after configuration edits use stable keys and accurate denominators; missing historical source data marked partial rather than silently imputed.
- WooCommerce idempotent historical + incremental sync, multi-store overlap, disconnect preserving canonical records; no external order auto-creates job.
- UI screenshots at desktop/mobile validate minimal white layout, stage container, clean avatar alignment, interaction affordances, single activity river and no duplicated info.

## Decisions to verify with pilot/customer, not block schema draft
- Staff member's default contact scope: all company records vs assigned-only; permissions must support both without leaking data.
- Whether the commercial system bills by company, seat, or other plan; platform/affiliate commission formula and settlement treatment (especially profit vs revenue share) remain configurable legal/commercial agreements, not invented constants.
- WooCommerce credential flow and historical access in actual target hosting/provider environment; confirm customer-provided credentials and WordPress plugin restrictions.
- Contact-source precedence policy and privacy/retention rules, especially for exports, imported marketing lists and personally identifiable details.
- Appointment time zones, reminder opt-ins and notification routing; account-level email sending identities and legal eligibility for customer messages.
- Availability of external payment statuses: in POC external URLs and manual indications only; no implied verified payments.
- Whether team recognition/social posting are pilot-critical or can be staged after operational adoption.

## Definition of ready
Implementation starts when owner acknowledges staged scope, schema reviewed for tenant-safe references/foreign keys/indexes, naming consistent, permission matrix approved, prototype screen acceptance understood, and at least one real company data workflow chosen for validation. Any new feature proposal must identify customer benefit, smallest execution slice, proof metric, and whether it displaces committed POC work.
