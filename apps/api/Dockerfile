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
COPY packages/documents/package.json ./packages/documents/
COPY packages/portals/package.json ./packages/portals/
COPY packages/telemetry/package.json ./packages/telemetry/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @corredor/api --filter @corredor/ai --filter @corredor/db --filter @corredor/core --filter @corredor/telemetry --filter @corredor/config --filter @corredor/documents --filter @corredor/portals

# ── build ──────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @corredor/db build && \
    pnpm --filter @corredor/core build && \
    pnpm --filter @corredor/telemetry build && \
    pnpm --filter @corredor/ai build && \
    pnpm --filter @corredor/portals build && \
    pnpm --filter @corredor/documents build && \
    pnpm --filter @corredor/api build

# ── runner ─────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy workspace config and package.json files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ai/package.json ./packages/ai/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/documents/package.json ./packages/documents/
COPY packages/portals/package.json ./packages/portals/
COPY packages/telemetry/package.json ./packages/telemetry/

# Copy compiled packages with dist directories from builder
COPY --from=builder --chown=root:root /app/packages ./packages

# Copy compiled API code from builder
COPY --from=builder --chown=root:root /app/apps/api/dist ./apps/api/dist

# Fresh install with proper symlink resolution for this container context
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono && \
    chown -R hono:nodejs /app

USER hono
EXPOSE 3000
ENV NODE_ENV=production PORT=3000

CMD ["node", "apps/api/dist/index.js"]
