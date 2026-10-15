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

Sign in with any [demo account](#demo-accounts). Full details: [docs/setup.md](docs/setup.md).

## Demo accounts

Mock credentials created by the demo seed — **for local and test environments only**. Every account
uses the password **`riverly-demo-2026`**.

**NV Custom Homes** — the fully loaded company (30 jobs across every stage, call/email history,
inspections with photos and reports, contracts, invoices, team posts and recognition):

| Email | Role | What to test |
|---|---|---|
| `chris@nvcustomhomes.test` | Owner | Everything, incl. granting Admin and the pending invitation |
| `dana@nvcustomhomes.test` | Admin | Settings: workflow labels/stages, templates, senders, forms, team |
| `marcus@nvcustomhomes.test` | Manager | Manage: unassigned/neglected leads, workload, reports, CSV import |
| `ava@nvcustomhomes.test` | Manager | Production side: crews, progress updates, final photos |
| `nina@nvcustomhomes.test` | Member | Senior salesperson with a full book (Don Lou, Robert Hale…) |
| `jake@nvcustomhomes.test` | Member | Salesperson with overdue follow-ups (Maria Santos, Angela Ruiz…) |
| `sofia@nvcustomhomes.test` | Member | Salesperson; owns a repeat customer with two jobs |
| `tyler@nvcustomhomes.test` | Member | New salesperson, light pipeline |
| `owen@nvcustomhomes.test` | Member | Project coordinator (team posts, recognition) |
| `alex@riverly-demo.test` | Member here, **Manager at Summit** | Company switcher (account menu) |
| `ryan@nvcustomhomes.test` | Member — **deactivated** | Signs in but has no company access |

**Summit Roofing** — a second, separate company used to prove isolation:

| Email | Role |
|---|---|
| `sara@summitroofing.test` | Owner |
| `ben@summitroofing.test` | Member |

Also seeded: a pending invitation for `new.hire@nvcustomhomes.test`, two leads waiting in
*Review matches*, a CSV import of past clients, and an embeddable website form (`/f/<token>`, printed
by the seed). Seeded email uses a simulated sender, so nothing is ever delivered to the example addresses.

### Loading demo data

| Where | Command |
|---|---|
| Local (first time / no-op if present) | `pnpm db:seed` |
| Local (wipe and reload) | `pnpm db:seed:reset` |
| Railway test/staging environment | set `ALLOW_DEMO_SEED=true`, then `railway ssh --environment staging --service riverly -- pnpm db:seed` |
| Railway wipe and reload | `railway ssh --environment staging --service riverly -- pnpm db:seed -- --reset --confirm-wipe` |

Never seed the environment real customers use — see [docs/deployment.md](docs/deployment.md#demo-data).

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | API + web in watch mode |
| `pnpm bootstrap` | install, migrate, generate SDK, seed |
| `pnpm db:local:start` / `stop` / `status` | project-local MySQL-compatible server (no Docker) |
| `pnpm db:migrate:dev --name x` | create a new migration (local only) |
| `pnpm db:migrate:deploy` / `db:migrate:status` | apply / inspect migrations |
| `pnpm db:seed` · `pnpm db:seed:reset` | load demo data · wipe and reload |
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
