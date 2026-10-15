# 03 — Engineering architecture & domain schema

## Scope and deployment
**One modular CRM API, one database, one traditional frontend, optional AI assistant in the same application.** Do not build a separate AI frontend, microservices, affiliate portal or company-wide licensing platform for V1. Keep module seams for later extraction.

```text
apps/web                  # pipeline-first CRM + optional contextual AI panel
apps/api                  # auth + REST/typed RPC controllers + validation
modules/identity          # users, org members, permissions
modules/crm              # contacts, opportunities, stage changes, assignment
modules/workflow         # versioned definitions, admin editing, renderer metadata
modules/activity         # append-only activity/events, current-fact projection
modules/media            # uploads, stage associations
modules/intake           # lead submissions, CSV, form/webhook adapters
modules/integrations     # future external billing references (no V1 provider sync)
packages/contracts       # shared Zod schemas / DTOs / enums
packages/ui              # UI primitives, stage/field renderer
```

## Data invariants
1. All CRM records carry `organizationId` (tenant), and access is checked server-side.
2. A contact may have many opportunities; a property, service, assigned salesperson, stage and lead source belong to an opportunity.
3. Every opportunity has one current stage ID and an independent lifecycle status (`OPEN`, `WON`, `LOST`, `ON_HOLD`, `CANCELED`); “won” may be derived/displayed from Contract Signed but not conflated with Job Completed.
4. Stage IDs/field IDs/option IDs are immutable; labels may change.
5. Stage navigation never updates current stage. Stage changes write an audit event, including reason for backward/lost if needed.
6. Activity records are repeatable, actor/time stamped, stage-associated, append-first; corrections should be revision events or updates with audit, never silent mutation.
7. Structured field values are typed and validated against a published workflow version; common searchable CRM fields stay native columns.
8. Evidence is stored once and referenced by opportunity/stage; delete/restore and authorization are explicit.
9. All time persisted in UTC; UI displays organization/user timezone.
10. External billing is informational/linked, not a source of implicit stage changes; merchant accounts always belong to tenant businesses.

## Canonical entities
| Entity | Key attributes / relationships |
|---|---|
| `Organization`, `User`, `Membership` | Tenant account, authentication identity, scoped roles |
| `Contact` | Name, phone/email normalized, optional primary address, org |
| `Opportunity` | Contact, assigned owner, source, inquiry, service/property, current stage, lifecycle, value |
| `LeadSubmission` | Source, external ID, raw payload, intake time, dedupe decision, resulting contact/opportunity |
| `WorkflowDefinition`, `WorkflowVersion`, `StageDefinition` | Org/template, version, stage stable keys, ordering, labels, behavior |
| `FieldDefinition`, `FieldOption`, `StageField` | ID, type, binding, option IDs, visible/editable/required (UI recommendation only unless domain validation applies), stage placement |
| `OpportunityFieldValue` | Typed extension value per opportunity and field key, workflow version |
| `ActivityEvent` | Type, subtype/outcome, actor, stage, payload, occurredAt, recordedAt, revision link |
| `Appointment` | Timing, participants/inspector, status, opportunity, optional stage |
| `Attachment`, `AttachmentLink` | Storage metadata and references to opportunity/activity/stage |
| `Resource` and `StageResource` | Tenant-owned external link/document with stage associations |
| `ExternalRecordLink` | Future read-only external invoice/payment provider references; not a payment ledger |

## Schema design: native vs extensible
**Native columns** for essential joins, filters and reports: organization, contact identity, opportunity assignment, current stage, lifecycle, createdAt, lead source ID, service, property address, estimated and contract value. **Custom fields** for business-specific variations: roof material, insurance claim type, inspection choices, labels, etc. Keep definition in versioned schema and values in typed JSON *with validated schemas*, not an unbounded unindexed EAV system.

**Events, not checkboxes:** Called + voicemail twice = two `ActivityEvent` rows (`kind=CONTACT_ATTEMPT`, `method=PHONE`, `outcome=VOICEMAIL`). Any overview “Voicemail left” chip is derived. Users can add notes and timestamps to each record. Schema-defined select options retain immutable option IDs for reporting.

## Configuration contract
Workflow template contains:
- `stages[]`: `id`, `key`, `label`, `order`, `fieldIds[]`, `activityTypeIds[]`, `actionIds[]`, `resourceIds[]`.
- `fieldDefinitions[]`: stable `id`, type (text/date/select/multiSelect/person/file/link/number/currency), label, options (stable IDs), source binding, validation and widget.
- `activityDefinitions[]`: stable type/outcomes/methods with labels.
- `terminology{}`: controlled strings for contact, job/opportunity, salesperson and stage-specific copy.
- `page`: bounded layout/theme/field ordering; separate presentation data from domain policy.

**Resolution:** platform defaults → industry template → organization overrides; publish creates immutable workflow version. New records use latest version. Existing records retain version association; migration/label changes are explicit. Minimum V1 UI: rename/reorder labels and options; show/hide fields; assign resources. Avoid arbitrary admin-authored code.

## APIs/commands (representative)
```text
GET    /orgs/:orgId/opportunities/:id     # opportunity + contact + effective workflow
PATCH  /orgs/:orgId/opportunities/:id     # permitted native fields
POST   /orgs/:orgId/opportunities/:id/transition {stageId, reason?, idempotencyKey}
POST   /orgs/:orgId/opportunities/:id/activities {typeId, optionIds?, note?, occurredAt?}
GET    /orgs/:orgId/opportunities/:id/activities?stageId=&typeId=
PATCH  /orgs/:orgId/opportunities/:id/fields {fieldId, value, schemaVersion}
POST   /orgs/:orgId/opportunities/:id/attachments
POST   /orgs/:orgId/leads/intake            # authenticated/instrumented connector endpoint
GET    /orgs/:orgId/workflows/effective
POST   /orgs/:orgId/workflows/publish       # admin only, validate + version
```
API checks `orgId` against signed-in membership and scopes every lookup. Use request idempotency for retries; transactionally update opportunity status/owner/fields and append corresponding event. Normalize and validate intake payloads, limit public form abuse, and protect against duplicate event delivery.

## Reporting projections
Queries project from `Opportunity` plus `ActivityEvent`, `StageTransition`, appointments and value fields. Examples: open leads per salesperson, outreach attempts per lead, response time, stage aging, inspection conversion, signed contracts. Define canonical event kinds and stable IDs (avoid grouping by display vocabulary). Aggregate reporting can be computed initially; add materialized summaries if needed.

## Financial integration boundary
V1 permits **external provider URL/reference** and manually sourced status/value fields with clear provenance (`MANUAL`, `STRIPE`, `QUICKBOOKS`, etc.) and lastSyncAt when sync exists. Do not model customer invoices as platform charges, do not hold or route tenant funds. Future Stripe hosted checkout or accounting integrations should sync via isolated adapters and webhooks using provider IDs/idempotency; never silently advance the job. Customer's own payment provider continues if CRM closes.

## AI compatibility
AI assistant is a caller of the same authenticated domain commands and read APIs, not an alternate datastore. It receives selected contact/opportunity/stage context and permission-scoped tools. Read-only first; confirm consequential writes. Audit tool-produced changes as actor/channel. Keep prompts and presentation separate from domain rules.

## Recommended build increments
1. Establish tenant membership, Contact, Opportunity, stage IDs, transitions, basic ActivityEvent and tests.
2. Implement stage config resolver/renderer with roofing seed; ContactCard, PipelineBar, StageWorkspace and ActivityFeed.
3. Add typed stage inputs, logging quick outcomes, inspector/appointment and media associations.
4. Add simple admin editing of vocabulary/options/resources with published version snapshots; intake form/CSV + dedupe.
5. Add management projections, follow-up improvements, Full Record view and optional AI read-only assistant.

## Test matrix
- Cross-tenant direct object requests rejected (including files and resources).
- Multiple repeated contact attempts retained; unique event IDs; concurrent writes safe.
- Changing display text doesn't alter history/report aggregates.
- Stage selected vs current independent; transitioning creates one event after retries.
- Version change and removal/retirement of options preserve old values.
- New lead matching links submission to existing contact without destroying source record.
- Import/webhook replay idempotent.
- Signed media URLs expire; content size/type controlled.
- Same component displays valid old/new workflow configs without rendering unsafe HTML.


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
