# 01 — Product & PM specification

## Product definition
A configurable CRM that helps a roofing company capture inquiries, assign salespeople, document contact efforts, coordinate inspections, win contracts, track job execution and retain a complete job record. The **persistent six-segment visual pipeline** is the organizing structure, not a gated task wizard. Each view represents a *record of activity* from that phase.

## Users and permissions
- **Salesperson:** works assigned leads; logs interactions; uploads evidence; updates authorized opportunity fields.
- **Manager:** manages pipeline, ownership, follow-ups and summaries across the business.
- **Business admin:** configures the organization's field labels, select options, stages, resources, and presentation variants; manages members.
- **Field worker/inspector:** may be assigned to inspection or job; no CRM access unless explicitly invited/authorized.
- **Platform operator:** supports licensing and commercial platform; no default access to tenant customer records.

## Core mental model
- **Contact:** stable person or business identity, possibly associated with several opportunities.
- **Opportunity (job):** an individual roofing request with a property/service, owner, stage, evidence and history.
- **Stage view:** configured projection of stage-specific data and events for the *same opportunity*.
- **Activity:** append-only record of a meaningful interaction/event, timestamped and attributed.
- **Field value:** current structured fact; changes generate an audit/change event. Repeatable outcomes (calls, voicemails) are activities, not booleans overwritten on the contact.
- **Stage change:** explicit status update independent of optional field/checklist completion.

## Six-stage roofing default
| Stage | User objective | Up to four main inputs/controls | Typical activity events |
|---|---|---|---|
| New Lead | Understand and route inquiry | Lead source, Inquiry, Salesperson, Urgency | Lead received, assigned, qualified |
| Called | Record contact and follow-up | Contact method, Outcome, Follow-up date, Customer interest | Called, voicemail, spoke, emailed, texted |
| Inspection | Arrange and document assessment | Appointment, Inspector, Inspection report, Photos | Scheduled, visited, findings filed |
| Contract Signed | Establish agreement | Estimate, Contract, Signature status, Deposit reference | Quote shared, contract signed, deposit requested |
| Job Started | Document delivery progress | Start date, Crew, Progress, Change orders | Work started, update logged, change approved |
| Job Completed | Preserve closeout | Completion report, Final photos, Payment status, Review request | Job completed, warranty filed, review requested |

> Stage titles are configurable display labels. The template uses these six by default. A stage may be opened or edited before it becomes current; advance/revert events remain traceable.

## User journeys
### First lead
1. Lead is created manually, from CSV, or a simple website form; system captures raw source and arrival time.
2. Existing contacts are matched by normalized phone/email with human review for ambiguous matches; source submission remains distinct.
3. Opportunity is created in New Lead; salesperson is assigned or shown as Unassigned.
4. User sees persistent pipeline, stage view, contact bio, communication controls and Activity.
5. User logs outcomes without losing earlier attempts; explicitly marks next stage when appropriate.

### Contacting a customer
1. Click Call/Text/Email in persistent contact bio (links launch appropriate app/provider, no fabricated send confirmation).
2. Log contact activity with method + outcome + optional note and follow-up date.
3. Repeat as many times as needed. Each event has actor/time/stage; the latest outcome may be projected as a summary.
4. Advance pipeline explicitly; notes and records stay available.

### Inspection and job
1. Assigned salesperson schedules/assigns inspector; inspector may be a named third party without system membership.
2. Photo/report artifacts are linked to opportunity and stage, accessible from Full Record.
3. Contract and job stages remain visible even if not current; resources link to company-maintained documents/tools.
4. Closeout retains files and external payment references; does not require integrated accounting.

## V1 commitments
**P0 — Must ship:** contact CRUD/search, opportunity CRUD, tenant membership and assignment, six configurable stage IDs/labels, active vs selected stage, explicit transitions and history, stage-specific inputs, repeatable Activity logger, file uploads and stage attachment association, right-hand editable contact bio, Focus view, backend authorization, admin-managed vocabulary/options/visibility (simple settings or seed-driven admin), basic form lead intake and CSV import with duplicate review.

**P1 — Strong follow-up:** Full Record scrolling view using identical stage components; team management filters and summaries; reliable follow-up reminders; more intake channels and webhook adapters; external financial status references and manual amount capture; deeper field-worker coordination.

**Later:** third-party two-way finance sync, custom Stripe checkout, subscriptions/collections, affiliates, complex automation, autonomous AI workflows, visual page designer, multi-product company platform.

## Product principles
- Optimize for repeated everyday use, especially lead handling and contact history.
- The pipeline shows *official state*; stage navigation shows *selected workspace*; activity history shows *what happened*.
- No required checklists or forced advancement; keep suggested steps optional and low-noise.
- No redundant contact details in stage panels; bio is persistent.
- Company resources are lightweight stage-aware links, not another workflow.
- Flexible terminology and options should not require code edits.
- Avoid silent state mutations when syncing/integrating; show provenance.

## Success measures
- Median time from lead received to first recorded outreach.
- Portion of open opportunities with a salesperson and next follow-up.
- Logged contact attempts per opportunity, inspection booking and completion rates.
- Conversion from lead to contract signed, plus stage aging.
- Frequency of record/activity use and successful data capture without support.
- **Measurement caution:** distinguish logged activity from actual phone/email send unless provider confirms it.

## Acceptance criteria / test scenarios
1. New lead from form preserves source, raw submission and lead timestamp; can link to existing contact without merging opportunities.
2. Salesperson logs 3 calls, 2 voicemails and 1 conversation: all six events remain visible and reportable.
3. Admin renames “Called” to “Contacted,” and re-labels an option without rewriting historical event IDs.
4. User browses Inspection while opportunity is New Lead; stage remains unchanged.
5. User assigns/reassigns salesperson; current owner and historical assignment event both survive.
6. Stage goes forward, backward, or is marked lost/paused with explicit logged reason where needed.
7. Attachment added to Inspection appears in Inspection and Full Record; does not duplicate the file.
8. Salesperson cannot access a different organization's opportunity by manipulating IDs.
9. Photo/upload and activity writes remain possible without any external billing integration.
10. Canceling CRM access never cancels a customer's independently owned external payment subscriptions.


## V1 decisions ratified — 15 October 2026

The following requirements supersede earlier proposals where they differ:

1. A **Contact** is persistent; it can own **multiple independent Opportunities/jobs**, each with its own stage, assignment, activity and attachments.
2. A company admin can **rename, reorder, add or retire stages** within its own workflow; an industry/platform template supplies initial defaults. Removing a used stage means retiring/mapping it, not deleting its historical identity.
3. Company admins can define **fields, input types, and option lists** from an approved registry. IDs stay stable across relabeling.
4. Every stage exposes both **repeatable immutable activity history** and a **current summary** derived from or updated alongside those events. Summaries are not a substitute for history.
5. Stage transitions are **manual**, can move forward/back, and have **no required checklists or field-completion gates**; transitions are logged.
6. **Template → company override** controls vocabulary, stage configuration and supported presentation settings. Platform defines safe capabilities, company chooses labels/options.
7. Opportunities support internal staff **and external contractors/inspectors**; external parties are recorded as participants and do not receive application access by default.
8. V1 lead intake: **manual entry, CSV import, embeddable web forms**. API ingestion for form infrastructure is internal; general public integrations are deferred.
9. V1 finance: **values, payment status supplied manually, and external invoice/payment URLs**. No provider sync, in-app charging, or bookkeeping.
10. V1 reporting: **basic pipeline and activity reports** only. AI assistant and advanced analytics are deferred.

The initial roofing labels remain New Lead, Called, Inspection, Contract Signed, Job Started, Job Completed. They are seeded defaults, not hardcoded enum values.
