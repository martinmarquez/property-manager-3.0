# syntax=docker/dockerfile:1.7
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── deps ───────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/ai/package.json ./packages/ai/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/telemetry/package.json ./packages/telemetry/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @corredor/worker --filter @corredor/ai --filter @corredor/db --filter @corredor/core --filter @corredor/telemetry --filter @corredor/config

# ── build ──────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
RUN pnpm --filter @corredor/db build && \
    pnpm --filter @corredor/core build && \
    pnpm --filter @corredor/telemetry build && \
    pnpm --filter @corredor/worker build && \
    tar --create --file /node_modules.tar --directory /app node_modules

# ── runner ─────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# System Chromium for Playwright PDF generation (playwright-core uses this directly)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

COPY --from=builder package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/apps/worker/ ./apps/worker/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /node_modules.tar /tmp/
RUN tar --extract --file /tmp/node_modules.tar && rm /tmp/node_modules.tar

RUN chown -R worker:nodejs /app

USER worker
ENV NODE_ENV=production

CMD ["node", "apps/worker/dist/index.js"]
