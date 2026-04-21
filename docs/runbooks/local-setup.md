# Local Setup Runbook

This walkthrough gets Corredor running locally from a clean machine. Target time: under 30 minutes.

---

## Prerequisites

Install these tools before starting.

### macOS

```bash
# Node.js 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
nvm use 22

# pnpm 9+
npm install -g pnpm@latest

# Docker Desktop
# Download from https://www.docker.com/products/docker-desktop/

# Doppler CLI (secrets)
brew install dopplerhq/cli/doppler

# Fly CLI (optional for local dev, required for deploys)
brew install flyctl
```

### Windows

```powershell
# Node.js 22 via nvm-windows
# Download nvm-windows installer from https://github.com/coreybutler/nvm-windows/releases
nvm install 22
nvm use 22

# pnpm
npm install -g pnpm@latest

# Docker Desktop for Windows
# Download from https://www.docker.com/products/docker-desktop/

# Doppler CLI
# Download from https://docs.doppler.com/docs/install-cli
```

### Linux (Ubuntu/Debian)

```bash
# Node.js 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# pnpm
npm install -g pnpm@latest

# Docker Engine + Docker Compose
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

# Doppler CLI
(curl -Ls --tlsv1.2 --proto "=https" 'https://cli.doppler.com/install.sh' || wget -t 3 -qO- 'https://cli.doppler.com/install.sh') | sudo sh
```

---

## Step 1 — Clone the Repository

```bash
git clone git@github.com:corredor-ar/corredor.git
cd corredor
```

If you don't have SSH access yet, ask the engineering team for repository access.

---

## Step 2 — Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies across all apps and packages in one command.

---

## Step 3 — Set Up Secrets (Doppler)

Corredor uses Doppler for secrets. There are no `.env` files to copy.

```bash
# Authenticate with Doppler (first time only)
doppler login

# Link the repo to the Corredor project
doppler setup
# Select: project = corredor, config = dev
```

If you don't have Doppler access, ask the engineering team to invite your account to the `corredor` project. While you wait, see [Step 3 (Manual)](#step-3-manual--secrets-without-doppler) below.

---

## Step 3 (Manual) — Secrets Without Doppler

If Doppler access is pending, create a `.env.local` at the repo root:

```bash
cp .env.example .env.local
```

Fill in the required values. At minimum for local dev:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/corredor
DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/corredor
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-dev-secret-at-least-32-bytes-long
SESSION_SECRET=local-dev-session-secret-32-bytes
```

Optional (AI, email, portals) can be left blank — those features will fail gracefully in local dev.

**Never commit `.env.local`.**

---

## Step 4 — Start Local Services

Docker Compose starts Postgres 16, Redis, MinIO (local R2), and Mailhog (local email).

```bash
docker compose up -d
```

Verify services are up:

```bash
docker compose ps
```

Expected output: all services show `Up`.

| Service | Port | Purpose |
|---------|------|---------|
| Postgres 16 | 5432 | Primary database |
| Redis | 6379 | Job queue + rate limiting |
| MinIO | 9000 (API), 9001 (UI) | Local object storage (R2 substitute) |
| Mailhog | 1025 (SMTP), 8025 (UI) | Local email capture |

---

## Step 5 — Apply Database Migrations

```bash
pnpm --filter @corredor/db migrate
```

This runs all pending Drizzle migrations against your local Postgres.

For a fresh database with seed data:

```bash
pnpm --filter @corredor/db migrate
pnpm --filter @corredor/db seed
```

---

## Step 6 — Start the Apps

```bash
doppler run -- pnpm dev
```

Without Doppler (using `.env.local`):

```bash
pnpm dev
```

After startup:

| App | URL | Notes |
|-----|-----|-------|
| Web (CRM) | http://localhost:5173 | Main agent-facing app |
| API | http://localhost:8080 | Hono + tRPC server |
| Admin | http://localhost:5174 | Internal ops |
| Site | http://localhost:3000 | Tenant websites (Next.js) |
| Mailhog | http://localhost:8025 | Local email viewer |
| MinIO | http://localhost:9001 | Local storage UI (user: minioadmin / minioadmin) |

---

## Common Issues

### "Cannot connect to Docker daemon"

Docker Desktop is not running. Start it from Applications (macOS) or the system tray (Windows).

### "Port 5432 already in use"

A local Postgres installation is running on the default port.

```bash
# Stop local Postgres (macOS with Homebrew)
brew services stop postgresql@16

# Or change the Docker Compose port
# In docker-compose.yml, change "5432:5432" to "5433:5432"
# Then update DATABASE_URL port to 5433
```

### "pnpm install fails on node-gyp / native modules"

You're missing build tools.

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install -y build-essential python3
```

### "MODULE_NOT_FOUND: Cannot find module '@corredor/...'"

The monorepo workspace links are stale. Run:

```bash
pnpm install --force
```

### "Error: connect ECONNREFUSED 127.0.0.1:5432"

Postgres is not running. Start it:

```bash
docker compose up -d postgres
```

### "relation 'tenants' does not exist"

Migrations have not been applied. Run:

```bash
pnpm --filter @corredor/db migrate
```

### Doppler "project not configured"

```bash
doppler setup
```

Select `corredor` as the project and `dev` as the config.

---

## Running a Single App

To run only one app in dev mode:

```bash
# API only
doppler run -- pnpm --filter @corredor/api dev

# Web only
doppler run -- pnpm --filter @corredor/web dev

# Worker only
doppler run -- pnpm --filter @corredor/worker dev
```

Note: `apps/web` requires `apps/api` to be running for tRPC calls to work.

---

## Resetting the Database

### Full reset (drop + remigrate + reseed)

```bash
# Stop apps first
# Ctrl+C to stop pnpm dev

# Drop and recreate
docker compose down -v      # removes Docker volumes (deletes all data)
docker compose up -d postgres

# Wait ~5 seconds for Postgres to be ready, then:
pnpm --filter @corredor/db migrate
pnpm --filter @corredor/db seed
```

### Migration rollback only

Drizzle does not support automatic rollbacks. To undo a migration:

1. Identify the migration file in `packages/db/migrations/`.
2. Write a reverse migration manually as a new migration file.
3. Run `pnpm --filter @corredor/db migrate` to apply.

### Create a fresh dev Neon branch (instead of Docker)

If you prefer to use Neon in local dev instead of Docker Postgres:

```bash
# Install Neon CLI
npm install -g neonctl

# Create a personal dev branch
neonctl branches create --name dev-yourname --project-id $NEON_PROJECT_ID

# Get the connection string
neonctl connection-string --branch dev-yourname --project-id $NEON_PROJECT_ID

# Update your local DATABASE_URL to the Neon connection string
```

---

## Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @corredor/core test
pnpm --filter @corredor/db test

# Watch mode
pnpm --filter @corredor/core test -- --watch

# Coverage
pnpm --filter @corredor/web test -- --coverage
```

Tests in `packages/db` run against a real Postgres instance (local Docker). Ensure `docker compose up -d postgres` is running before running DB tests.

---

## TypeScript & Lint

```bash
# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Type check one package
pnpm --filter @corredor/api typecheck
```
