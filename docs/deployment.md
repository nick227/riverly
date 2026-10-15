# Deployment (Railway)

One Railway project, three resources:

| Resource | Purpose |
|---|---|
| **riverly** service (this repo, `Dockerfile` + `railway.json`) | API under `/api` + the built web app on the same origin |
| **MySQL** service (Railway template, persistent volume) | the database |
| **Bucket** (Railway object storage, S3-compatible) | uploaded files |

Serving the web app and API from one origin keeps the session cookie first-party
(`SameSite=Lax`, `Secure`, `HttpOnly`) — no cross-site cookies, no CORS for the app itself.

## First-time setup

1. Create a project and add a **MySQL** service (persistent volume is included).
2. Add a **Bucket** and a service from this GitHub repo. Railway picks up `railway.json`.
3. On the riverly service, set variables (reference variables keep secrets out of the repo):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` (encrypts company email API keys — back it up; losing it means re-entering keys) |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | from the bucket's credentials (Railway's `BUCKET`/`ENDPOINT`/… names are also accepted) |
| `WEB_URL` | `https://<your-domain>` |
| `API_PUBLIC_URL` | `https://<your-domain>/api` |
| `CORS_ORIGIN` | `https://<your-domain>` |
| `RESEND_WEBHOOK_SECRET` | from the Resend webhook you create below |
| `ALLOW_COMPANY_SIGNUP` | `false` unless you are onboarding companies self-serve |

`NODE_ENV=production`, `API_PREFIX=/api`, `SERVE_WEB_DIR` and `TRUST_PROXY` are set by the Dockerfile.
`PORT` is injected by Railway. Production refuses to boot without `ENCRYPTION_KEY`, a 32+ character
`SESSION_SECRET`, and `STORAGE_DRIVER=s3` (local disk would lose files on redeploy).

4. Generate a domain. Health check: `GET /api/health` (checks the database too).

## Demo data

The demo seed (`apps/server/src/seed/`) loads every role, one fully populated company and a second
company for isolation tests — see the README for logins. It runs through the real services, so it
also exercises storage (photos/PDFs go to the bucket) and the email pipeline (simulated sender only;
seeded emails never leave the system).

**Use a dedicated test/staging environment**, not the environment real customers use.

1. In Railway, create (or duplicate into) a `staging` environment with its own MySQL and bucket.
2. On the riverly service in that environment set `ALLOW_DEMO_SEED=true`.
   Without it the seed refuses to run when `NODE_ENV=production`.
3. Deploy (the pre-deploy step applies migrations), then load the data inside the running container:

```bash
railway link                                   # once: pick the project
railway ssh --environment staging --service riverly -- pnpm db:seed
```

Re-seeding from scratch wipes **every table** in that environment's database, so it needs an extra flag:

```bash
railway ssh --environment staging --service riverly -- pnpm db:seed -- --reset --confirm-wipe
```

The seed is idempotent: if the demo company already exists it does nothing.
When you are done testing, remove `ALLOW_DEMO_SEED` again.

Why `railway ssh`: the command runs inside the deployed container, so it uses the service's
internal `DATABASE_URL`, the bucket credentials and the same code version — nothing to configure
locally. (Alternative: `railway run --environment staging -- pnpm db:seed` from your machine, but
then `DATABASE_URL` must be the MySQL service's *public* URL, `${{MySQL.MYSQL_PUBLIC_URL}}`, and
uploads go to the bucket from your laptop.)

## Email (real sending + delivery tracking)

1. In the company's (or platform's) **Resend** account, add and verify the sending domain (DNS records).
2. In Riverly → Settings → Email → *Connect sender*: Resend, From name/email on that domain, and the
   API key (stored AES-256-GCM encrypted; never returned by the API). Riverly checks the domain status
   with Resend; only **verified** senders can send.
3. In Resend → Webhooks, add `https://<your-domain>/api/webhooks/email/resend` for `email.sent`,
   `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`; put its signing
   secret in `RESEND_WEBHOOK_SECRET`. Events are signature-checked, de-duplicated and never move a
   message backwards.
4. Remove the development sender in production; the dev transport is disabled there unless
   `EMAIL_DEV_TRANSPORT=true`.

The outbox worker runs inside the API process (`WORKER_ENABLED`, default on). To scale it
separately, set `WORKER_ENABLED=false` on the API and add a second service from the same repo with
start command `pnpm --filter server worker`. Claiming is a conditional update, so several workers are
safe, and Resend's `Idempotency-Key` (the message id) prevents double sends after a crash.

## Controlled migration execution

| Step | Where | Command |
|---|---|---|
| Author | developer machine only | `pnpm db:migrate:dev --name <change>` → commit `packages/db/prisma/migrations/<timestamp>_<change>/` |
| Validate | CI on every PR | applies all migrations to a **fresh MySQL 8** (`prisma migrate deploy`), fails if `schema.prisma` and migrations drift (`prisma migrate diff --exit-code`), then runs the full test suite against it |
| Apply | Railway **pre-deploy** (`railway.json` → `preDeployCommand`) | `pnpm --filter @project/db db:migrate:deploy` runs once per release, before new containers receive traffic; if it fails the release is not deployed and the old version keeps serving |
| Never | — | the app does not migrate on boot; `migrate dev`, `migrate reset` and `db push` are never run against production |

Writing migrations safely (expand → contract):

1. **Expand** (release N): add new tables/columns as nullable or with defaults; code writes both
   old and new shapes where needed.
2. **Backfill** in a script or a follow-up migration.
3. **Contract** (release N+1 or later): drop/rename old columns only after no running code reads them.

Check before a release: `pnpm db:migrate:status` against the target (`railway run pnpm db:migrate:status`).

## Backups

- Turn on Railway's scheduled **volume backups** for the MySQL service (daily, keep ≥ 7) — Railway
  volume backups are point-in-time snapshots of the database volume.
- Additionally take a **logical dump before every release that contains a migration**:

```bash
railway run --service MySQL -- sh -c \
  'mysqldump --single-transaction --routines --triggers -h $MYSQLHOST -P $MYSQLPORT -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE' \
  | gzip > riverly-$(date +%F-%H%M).sql.gz
```

Store dumps outside Railway (encrypted). The bucket holds files only; enable its versioning/lifecycle
if your plan provides it. Also back up `ENCRYPTION_KEY` and `SESSION_SECRET` in a password manager.

## Restore

1. Put the app in maintenance (scale the riverly service to 0 or remove its domain).
2. Either restore a volume backup from the MySQL service's *Backups* tab, or load a dump into a
   fresh database:
   ```bash
   gunzip -c riverly-YYYY-MM-DD-HHMM.sql.gz | railway run --service MySQL -- sh -c \
     'mysql -h $MYSQLHOST -P $MYSQLPORT -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE'
   ```
3. `railway run pnpm db:migrate:status` — the `_prisma_migrations` table travels with the data, so
   the status shows exactly which migrations the restored data has.
4. Deploy the application version that matches that migration state, then bring traffic back.
5. Rehearse this on a staging environment at least once before the pilot goes live.

## Rollback

Prisma has no automatic down-migrations, so rollback is planned, not improvised:

- **Code-only release:** redeploy the previous successful deployment in Railway. Safe at any time.
- **Release with an additive (expand) migration:** roll the code back; the extra nullable
  columns/tables are ignored by the old code. Leave the migration in place.
- **Release with a destructive (contract) migration:** only ship these after the data is no
  longer needed. If it must be undone, restore the pre-release dump (above), then redeploy the
  previous version.
- If a migration fails half-way in pre-deploy: the release does not go live. Inspect with
  `prisma migrate status`, fix forward with a new migration, or mark it resolved with
  `prisma migrate resolve --rolled-back <name>` after restoring the pre-release dump.

## Operational checks

- `GET /api/health` → `{status:"ok", database:"ok"}`
- Settings → Diagnostics → worker runs (per company, no customer data)
- Railway logs: JSON (pino) with `authorization`/`cookie` headers redacted
