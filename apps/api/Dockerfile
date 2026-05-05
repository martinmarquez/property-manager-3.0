# syntax=docker/dockerfile:1.7
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── deps: install all workspace dependencies ──────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ai/package.json ./packages/ai/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/telemetry/package.json ./packages/telemetry/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @corredor/api --filter @corredor/ai --filter @corredor/db --filter @corredor/core --filter @corredor/telemetry --filter @corredor/config

# ── build ──────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @corredor/db build && \
    pnpm --filter @corredor/core build && \
    pnpm --filter @corredor/telemetry build && \
    pnpm --filter @corredor/api build && \
    tar --create --file /node_modules.tar --directory /app node_modules

# ── runner ─────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

COPY --chown=hono:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=hono:nodejs apps/api/package.json ./apps/api/
COPY --chown=hono:nodejs packages/ai/package.json ./packages/ai/
COPY --chown=hono:nodejs packages/config/package.json ./packages/config/
COPY --chown=hono:nodejs packages/core/package.json ./packages/core/
COPY --chown=hono:nodejs packages/db/package.json ./packages/db/
COPY --chown=hono:nodejs packages/telemetry/package.json ./packages/telemetry/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @corredor/api --filter @corredor/ai --filter @corredor/db --filter @corredor/core --filter @corredor/telemetry --filter @corredor/config

COPY --chown=hono:nodejs --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=hono:nodejs --from=builder /app/packages/db/dist ./packages/db/dist
COPY --chown=hono:nodejs --from=builder /app/packages/core/dist ./packages/core/dist
COPY --chown=hono:nodejs --from=builder /app/packages/telemetry/dist ./packages/telemetry/dist

RUN chown -R hono:nodejs /app

USER hono
EXPOSE 3000
ENV NODE_ENV=production PORT=3000

CMD ["node", "apps/api/dist/index.js"]
