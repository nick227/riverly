# 06 — Schema and UI contracts (V1)

## Persistence authority

- `Contact`: tenant-owned person identity. Contacts have many `Opportunity` records, not a mutable stage.
- `Opportunity`: tenant-owned job with stable `workflowVersionId`, `stageId`, status and assigned salesperson.
- `ActivityEvent`: repeatable append-only evidence. Fields include stage/version IDs, type/method/outcome IDs, payload, actor, occurredAt and recordedAt. Corrections reference previous event.
- `OpportunityFieldValue`: editable current facts for configured non-native fields; validate by field ID, type and definition version.
- `StageSummary`: optional denormalized, rebuildable projection of activity and current facts. Never infer a phone call happened from a checked box alone.
- `StageTransition`: explicit audited stage changes, including retrograde moves and administrative stage mappings.
- `LeadSubmission`: preserves raw form/import payload, source, import identity and dedupe decision.
- `ExternalPerson` / `OpportunityParticipant`: third-party involvement without automatic authentication or access.
- `ExternalRecordLink`: external invoice/payment URL and manually entered status, prominently marked as unverified unless future provider integration confirms it.

## Config ownership and publication

`PlatformTemplate` (seeded) → `OrganizationWorkflowDraft` (company override) → immutable `WorkflowVersion` (published, referenced by jobs). Company admins change stage labels/order/availability, fields, input options, resources and safe component variants. Backend validates allowed types/actions; old versions remain readable. Configuration IDs are not display vocabulary.

Changing workflow stages on existing jobs requires explicit mapping or pinning; do not silently remap. Stages cannot be deleted from historical event definitions. Configuration migration preview reports the count of affected jobs.

## Field registry (bounded)

Allowed types: `text`, `textarea`, `date`, `datetime`, `select`, `multi_select`, `boolean`, `money`, `member`, `external_person`, `attachment`, `url`. Special domain controls (appointment, gallery, communication log) refer to native records rather than generic JSON blobs.

Each field definition: `{id, label, type, scope, binding?, options?, editable, visible, order}`. `scope` distinguishes `contact`, `opportunity`, `activity`, `appointment`, `external_reference`. Option entries `{id,label,retired?}` use immutable IDs; options with historical activity must be retained for interpretation. Do not use label text as a reporting identifier.

## Management query examples

- Current opportunity count by stage, using actual published workflow version and stable stage IDs.
- New leads by source, deduplication decision and owner.
- Number of calls, voicemail outcomes and completed inspections over a date range from `ActivityEvent`, not from current checkboxes.
- Last activity and days in stage per opportunity.
- Unknown/unverified financial statuses displayed separately from provider-confirmed future states.

## API surface (initial)

`GET/POST /contacts`; `GET/POST /opportunities`; `PATCH /contacts/:id`; `PATCH /opportunities/:id`; `POST /opportunities/:id/activities`; `POST /opportunities/:id/transitions`; `GET /opportunities/:id/stage-summary`; `GET/POST /lead-imports`; `POST /public/forms/:token/submissions`; `GET /organization/workflow`; `POST /organization/workflow/draft`; `POST /organization/workflow/publish`.

All private endpoints scope organization from authenticated membership, never from trusted client parameter alone. Public form intake has abuse/rate limits and scoped validation. All mutating calls validate field/action IDs server-side and return structured errors. Version publish is atomic.

## UX contract

Persistent six-segment bar (variable stage count in future), stage workspace + Activity left, Contact Bio right. Avatar small and aligned with person identity. White, black and gray, sans-serif, no gradients or redundant fields. Bio owns Call/Text/Email/Schedule controls and editable contact identity. Stage owns up to four emphasized stage controls and any expandable context. Activity composer supports structured event entries, notes and history. Focus / Full Record are views of the same records; selected stage is independent from current stage.

## Schema draft caveat

The accompanying Prisma file is a **review draft**. Before migrations, finalize nullable relations, tenant-scoped foreign keys/uniqueness, enum/version policy, DB provider and migration behavior; run Prisma validation and integration tests. `WorkflowVersion` should ultimately model platform-owned templates separately from company-published versions if schema ownership requires it. Manual status values are not audited accounting entries.
