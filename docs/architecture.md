# Architecture

```
apps/web        Vite + React. Feature views compose primitives/patterns; data only via @project/sdk.
apps/server     Fastify 4. fastify-openapi-glue routes every operationId to a handler → service.
packages/api-spec  openapi.yaml — the API contract (82 operations). Edit first.
packages/sdk    Generated types + typed openapi-fetch client + React Query hooks.
packages/db     Prisma schema (MySQL 8) + versioned migrations.
packages/shared Domain contracts shared by server/web/seed: workflow definition schema + validation,
                roofing template, email catalog + renderer, permission matrix, normalization.
```

## Request path

`browser → (cookie) → onRequest: bearerAuth (session → user → active company membership → role)
→ body validation (spec) → handler → service (requireOrg / requirePermission, org-scoped queries)
→ transaction(domain write + appendActivity) → response (serialized by the spec's schema)`.

- **Tenancy:** the company comes from the session's active membership, never from the client.
  Every query filters by `organizationId`; child rows of Contact/Opportunity use compound
  `(id, organizationId)` foreign keys so the database rejects cross-tenant links too.
- **Roles:** `packages/shared/src/permissions.ts` (Member < Manager < Admin < Owner). The web app uses
  the same matrix only to hide controls.
- **Record scope:** members see all company jobs (pilot decision). Centralized in
  `apps/server/src/lib/access.ts` to allow assigned-only later.

## Data model essentials

- `Contact` (person) has many independent `Opportunity` rows (jobs). Job facts live on the job.
- `WorkflowVersion.definition` is the company's configuration (stages, fields, options, vocabulary),
  validated by zod. Publishing creates a new immutable version; IDs never change or get reused;
  removing means *retire*; retiring an occupied stage requires an explicit, logged mapping.
- `StageTransition` — every manual move (forward, backward, status, admin mapping), idempotent per key.
- `ActivityEvent` — the single append-only river. Job history, stage history, company Activity and
  profile highlights are filters over it. Corrections are new events (`revisionOfId`).
  `verification` distinguishes SELF_REPORTED (people), SYSTEM_RECORDED (Riverly) and PROVIDER_VERIFIED.
- `SourceRecord` keeps every raw form submission / CSV row unmodified; `ContactSourceLink` records
  provenance. Ambiguous matches wait in review; nothing merges automatically.
- `OutboundMessage` is both the authoritative email record and the outbox queue.
- `ExternalRecordLink` — invoice/payment URLs with manually entered status, always "manual · unverified".

## Email pipeline

`renderEmail` resolves a template from real records (unknown values are reported, never invented) →
user reviews/edits in the overlay → `sendEmail` freezes the content with an idempotency key (one
message per click session) + one `email.message` river item → worker claims, sends via the company
sender (Resend, or the dev transport), records `DeliveryAttempt`s with retry/backoff → Resend
webhooks (svix-signed, de-duplicated, monotonic status) update the same message. The river shows one
item whose status updates; review requests stay "not confirmed" regardless of delivery.

## Files

Stored once (`Attachment`), referenced many times (`AttachmentLink` → job/stage/field/activity).
Downloads are short-lived signed URLs: HMAC-signed `/files/{id}` locally, presigned S3 GET in prod.
Upload type allow-list + magic-byte check + 25 MB limit.

## Frontend

CSS lives in `apps/web/src/styles` with `@layer reset, tokens, base, primitives, patterns, features,
utilities`. Components consume semantic tokens only; dark theme is a token override. Primitives
(`components/primitives`) have no CRM knowledge; patterns (`components/patterns`) are domain-agnostic;
`features/crm` holds the CRM compositions: `PipelineBar`, `StageWorkspace` (used for every stage and
Full Record), `FieldControl` (renders any configured field), `ContactCard`, `ActivityRiver`,
`EmailModal`. A new stage or field is configuration — no code change.
