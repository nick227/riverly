# Riverly — single image: Fastify API under /api + built web app on the same origin.
# Migrations are NOT run here; Railway's preDeployCommand runs `prisma migrate deploy` once per release.
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api-spec/package.json packages/api-spec/
COPY packages/db/package.json packages/db/
COPY packages/sdk/package.json packages/sdk/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @project/db exec prisma generate \
  && pnpm sdk:check \
  && pnpm --filter server typecheck \
  && VITE_API_URL=/api pnpm --filter web build

FROM base AS runtime
ENV NODE_ENV=production \
    API_PREFIX=/api \
    SERVE_WEB_DIR=/app/apps/web/dist \
    TRUST_PROXY=true
COPY --from=build /app /app
EXPOSE 3001
# PORT is injected by Railway.
CMD ["pnpm", "--filter", "server", "start"]
