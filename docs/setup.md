# Local setup

## Prerequisites

- Node 20+, pnpm 10 (`corepack enable`)
- A MySQL-compatible database (pick one below)

## 1. Database

Riverly targets **MySQL 8** (Railway's MySQL service). Locally you can use either:

**A. Docker (preferred — same engine as production)**

```bash
docker compose up -d db          # MySQL 8.0 on 127.0.0.1:3407, user riverly / riverly_dev
```

**B. No Docker — project-local server**

```bash
pnpm db:local:start              # uses the machine's mysqld/mariadbd; data in .data/mysql
pnpm db:local:status
pnpm db:local:stop
```

This starts a private instance on `127.0.0.1:3407` (it never touches a system MySQL), creates
`riverly_dev` and `riverly_test`, and a dev-only `riverly` user. On machines that only have MariaDB
this is MariaDB 10.11 — MySQL-compatible for everything Riverly uses. One known cosmetic difference:
`prisma migrate diff` reports JSON columns as changed on MariaDB (it stores JSON as LONGTEXT). CI runs
the real drift check against MySQL 8.

Either way:

```
DATABASE_URL="mysql://riverly:riverly_dev@127.0.0.1:3407/riverly_dev"
```

## 2. Environment

```bash
cp .env.example .env             # defaults work for local development
```

`.env.test` (committed) points tests at `riverly_test`.

## 3. Install, migrate, seed

```bash
pnpm install
pnpm db:migrate:deploy           # apply committed migrations
pnpm db:seed                     # demo company (add `-- --reset` to start over)
```

Or all at once: `pnpm bootstrap`.

## 4. Run

```bash
pnpm dev
```

| | URL |
|---|---|
| Web app | http://localhost:5180 |
| API | http://localhost:3001 |
| API docs (Swagger UI, dev only) | http://localhost:3001/docs |
| Dev email outbox | `.data/outbox/*.txt` |

Demo logins (password `riverly-demo-2026`):

| Email | Role |
|---|---|
| chris@nvcustomhomes.test | Owner |
| dana@nvcustomhomes.test | Admin |
| marcus@nvcustomhomes.test | Manager |
| nina@nvcustomhomes.test, jake@nvcustomhomes.test | Members |
| sara@summitroofing.test | Owner of a second company (isolation check) |

## Tests

```bash
pnpm --filter server test        # 198 API integration tests (real DB, real auth)
pnpm --filter @project/shared test
pnpm --filter web test:e2e       # Playwright; reseeds the demo data first
```

## Changing the database schema

```bash
# 1. edit packages/db/prisma/schema.prisma
pnpm db:migrate:dev --name describe_the_change     # creates + applies a migration locally
# 2. commit the new folder under packages/db/prisma/migrations/
```

Never use `prisma db push` — every change ships as a reviewed, versioned migration. See
[deployment.md](deployment.md#controlled-migration-execution).

## Changing the API

1. Edit `packages/api-spec/openapi.yaml` (the contract) and `pnpm spec:lint`.
2. `pnpm sdk:generate` → regenerated types for server and web.
3. Add the handler export (`apps/server/src/handlers/`) and service logic.
4. `pnpm test:generate` appends test stubs for new operations.
