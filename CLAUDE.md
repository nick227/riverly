# Riverly — Project State

Read this first. Specs live in `docs/` (01–06) and `docs/addenda/` (01–19); later addenda win.
`docs/Frontend Architecture & Quality Standards.md` governs all UI code.

## MVP (approved 2026-10-15)

**What it does:** Roofing companies move each inquiry from lead to completed job with a manual
six-stage pipeline and one Activity history, so follow-ups are not missed.

**Roles (per company, invite-only):** Member · Manager (assign, workload, reports) · Admin
(Settings: workflow labels/options, resources, email templates/senders, team) · Owner (admin grants).
External inspectors/crews are job participants with no login.

**In V1:** tenancy + invites · schema-driven roofing workflow (stable IDs, manual transitions, logged) ·
Contacts (list/pipeline/search) + job detail (pipeline bar, StageWorkspace, ContactCard **left**, single
Activity river, Full Record) · intake (manual, CSV + dedupe review, embeddable form) · Activity river
(events + posts + reactions + recognition) · Email modal with **real sending** (Resend) + dev transport,
13 stock templates, Request review · files once, linked to job/stage · manual money references
(unverified) · Manage (workload, neglected leads, inspections, basic reports) · Settings · Profile `/u/:slug`
(internal visibility).

**Parking lot:** Partner + Platform Admin screens (schema keeps PlatformRoleGrant), WooCommerce/other
connectors, automation presets/bots, AI, scenarios/advanced reports, payment/accounting sync, inbound
replies, public profiles, contractor portal, mentions/notifications, contact lists/saved views,
workflow version migration engine, page builder.

**Assumptions:** USD; UTC storage, company timezone display; Members see all company jobs (scope check
centralised in `apps/server/src/lib/access.ts` so assigned-only can be switched on later).

## Stack & deviations from factory defaults

- pnpm monorepo: `apps/server` (Fastify 4 + fastify-openapi-glue), `apps/web` (Vite + React + TS),
  `packages/{api-spec,sdk,db,shared}`. OpenAPI → SDK pipeline as per factory.
- **Database: MySQL 8** via Prisma (`provider = "mysql"`). No PostgreSQL, no DB abstraction layer.
- **Styling: plain CSS** — tokens, BEM-style classes, `@layer reset, tokens, base, primitives, patterns,
  features, utilities`. **No Tailwind**, no CSS-in-JS. (Overrides factory Tailwind default.)
- **Migrations, not `db push`:** versioned `prisma migrate`. Bootstrap/CI use `migrate deploy`.
- `packages/shared` holds domain contracts (workflow definition zod schema + validation, roofing
  template, email catalog/renderer, permission matrix, normalization). Used by server, seed and web.
- Session auth: httpOnly `token` cookie (hash stored), active company stored on the session.
- Email: `DEV_LOG` transport (simulated provider events, clearly labelled) + `RESEND` transport with
  signed webhooks for delivery tracking. Company sender keys encrypted at rest (AES-256-GCM).
- Files: local disk + HMAC-signed URLs in dev; S3-compatible bucket (Railway bucket) when
  `STORAGE_DRIVER=s3`.
- Worker: email outbox worker runs in the API process (`WORKER_ENABLED`), can be split into its own
  Railway service with the same image.

## Local database

- Preferred: `docker compose up -d db` (MySQL 8.0 on 127.0.0.1:3407).
- Without Docker (this WSL machine): `pnpm db:local:start` runs a project-local MariaDB 10.11
  (MySQL-compatible) on 127.0.0.1:3407 with data in `.data/mysql`. CI runs real MySQL 8.
- `DATABASE_URL=mysql://riverly:riverly_dev@127.0.0.1:3407/riverly_dev`; tests use `riverly_test`.

## Controlled migration execution

- Author: `pnpm db:migrate:dev --name <change>` locally only. Commit `packages/db/prisma/migrations/`.
- Validate: CI applies all migrations to a fresh MySQL 8 (`prisma migrate deploy`) then runs tests;
  `prisma migrate diff` checks schema ↔ migrations have no drift.
- Deploy: Railway **pre-deploy command** `pnpm --filter @project/db db:migrate:deploy` runs once per
  release before new containers take traffic. The app never migrates on boot; `migrate dev`/`db push`
  are never run against production.
- Rollback: Prisma has no down migrations. Migrations are written expand → contract (additive first,
  destructive changes in a later release). Roll back app code freely; roll back data by restoring
  a backup taken before the release (see docs/deployment.md).

- Server is ESM (`"type": "module"`, fastify-openapi-glue v4 uses `serviceHandlers`). `buildApp()` in
  `apps/server/src/app.ts` is shared by the server and tests. An `onRoute` hook moves glue's security
  preHandler to `onRequest` so auth runs before body validation (anonymous callers get 401, never 400).
- Tests use the real security handler with real session tokens (not the template's fake handler), against
  `riverly_test` reset with `prisma migrate reset` once per run (globalSetup) and truncated per file.
- Seed lives in `apps/server/src/seed/` (`data.ts` people + scenarios, `story.ts` walks each job through
  the real services under a seeded clock, `media.ts` generates photos/PDFs). `pnpm db:seed` (no-op if
  present), `pnpm db:seed:reset` (wipe + reload). Production needs `ALLOW_DEMO_SEED=true`; a production
  reset also needs `--confirm-wipe`. Railway: `railway ssh --environment staging --service riverly --
  pnpm db:seed`. Demo password: `riverly-demo-2026`. Playwright relies on Maria Santos/Angela Ruiz/
  Robert Hale (Jake/Nina) and Walter Grey (Summit) — keep them.

- **Single origin in production:** API under `API_PREFIX=/api`, Fastify serves `apps/web/dist`
  (`SERVE_WEB_DIR`). Dev: web http://localhost:5180 (strictPort; 5173 is used by another local
  project), API http://localhost:3001 at root.
- `pnpm pages:generate` intentionally NOT used: per-endpoint CRUD stubs contradict the Frontend
  Standards. UI = `apps/web/src/features/crm/{components,views}` composed from
  `components/{primitives,patterns}`; plain CSS in `src/styles` (layers + tokens, dark = token override).
- System font stack (no Google Fonts — external font requests stalled and the spec allows system-ui).
- E2E (`pnpm --filter web test:e2e`) reseeds the demo data in globalSetup (`E2E_SKIP_SEED=1` to skip).

## Phase Completed

Phase 6 — Documentation. All phases 1–6 built; awaiting developer browser verification.

Verified: 198 server tests, 8 shared tests, 8 Playwright e2e (desktop + mobile), typecheck clean,
OpenAPI lint clean, SDK no drift, migrations apply cleanly, production single-origin mode smoke-tested
locally.

Not verified here (no Docker / no credentials on this machine): `docker build`, Railway deploy, live
Resend sending + webhooks (code path covered by tests with signed fixtures), S3 bucket driver,
MySQL 8 itself (local is MariaDB 10.11; CI runs MySQL 8). `npx fallow` not run.

## Open decisions (from the specs — do not silently decide)

Assigned-only job visibility; public profile URLs; email provider beyond Resend + inbound replies;
attachment antivirus/retention; consent/unsubscribe policy per message type; notification channels;
pilot lead channel and success metric (addendum 19).

## Last Session Summary

Built the full MVP bottom-up: MySQL schema + migration → OpenAPI (82 ops) → SDK → Fastify services
(tenancy, workflow versions, intake/dedupe, Activity river, email outbox + Resend + webhooks, files,
reports) → React app (Contacts, Job detail with Focus/Full Record, Activity, Profile, Manage, Settings,
Import/Review, public form, invite/signup) → Docker/Railway config, CI, docs. Next: deploy to Railway
(docs/deployment.md), connect a real Resend sender, pilot validation per addendum 19.
