# Riverly — Roofing CRM

Lead to completed job without the gaps: a manual six-stage pipeline, one Activity history per job,
real customer email with delivery tracking, and company-configurable vocabulary — all on MySQL 8
and deployable to Railway.

## Quick start

```bash
pnpm install
pnpm db:local:start          # or: docker compose up -d db
cp .env.example .env
pnpm db:migrate:deploy && pnpm db:seed
pnpm dev                     # web http://localhost:5180 · API http://localhost:3001
```

Sign in as `nina@nvcustomhomes.test` / `riverly-demo-2026`. Full details: [docs/setup.md](docs/setup.md).

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | API + web in watch mode |
| `pnpm bootstrap` | install, migrate, generate SDK, seed |
| `pnpm db:local:start` / `stop` / `status` | project-local MySQL-compatible server (no Docker) |
| `pnpm db:migrate:dev --name x` | create a new migration (local only) |
| `pnpm db:migrate:deploy` / `db:migrate:status` | apply / inspect migrations |
| `pnpm db:seed` (`-- --reset`) | demo data |
| `pnpm spec:lint` · `pnpm sdk:generate` · `pnpm sdk:check` | API contract pipeline |
| `pnpm typecheck` · `pnpm test` · `pnpm --filter web test:e2e` | quality gates |
| `pnpm docs:generate` | regenerate API/env/database reference docs |

## Documentation

- [Setup](docs/setup.md) · [Deployment, migrations, backups, rollback](docs/deployment.md)
- [Architecture](docs/architecture.md) · [SDK](docs/sdk.md) · [Admin guide](docs/admin.md)
- Generated: [API reference](docs/api-reference.md) · [Database](docs/database.md) · [Environment](docs/env-vars.md)

## Product specification

The V1 specification this build implements (later addenda win):

- `docs/01-product-pm.md` — product scope, journeys, acceptance
- `docs/02-design.md` — page, stage views, components
- `docs/03-engineering.md` — architecture and domain separation
- `docs/04-decisions-open-questions.md` — decision log
- `docs/05-v1-acceptance-and-conflicts.md` — ratified decisions and test cases
- `docs/06-schema-contract.md` — data, configuration, API and UI contract
- `docs/addenda/` — 19 addenda (navigation, Activity, email, profiles, roles, pilot restraint, …)
- `docs/Frontend Architecture & Quality Standards.md` — frontend rules
- `schema/` — original review drafts (superseded by `packages/db/prisma/schema.prisma` and
  `packages/shared/src/roofingTemplate.ts`)
