#!/usr/bin/env bash
# Corredor CRM — local dev stack bootstrap
# Usage: ./scripts/dev-up.sh [--no-seed] [--observability]
#
# 1. Starts Docker Compose services (+ optional observability profile)
# 2. Waits for Postgres to be healthy
# 3. Runs database migrations (drizzle-kit migrate)
# 4. Runs database seeds (optional, skipped with --no-seed)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
RUN_SEED=true
COMPOSE_PROFILES=""

for arg in "$@"; do
  case "$arg" in
    --no-seed) RUN_SEED=false ;;
    --observability) COMPOSE_PROFILES="--profile observability" ;;
  esac
done

# ---------------------------------------------------------------------------
# Load local env vars (required for drizzle-kit)
# ---------------------------------------------------------------------------
if [[ -f ".env.local" ]]; then
  echo "Loading .env.local..."
  set -o allexport
  # shellcheck disable=SC1091
  source .env.local
  set +o allexport
elif [[ -f ".env" ]]; then
  echo "Loading .env..."
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
else
  echo "Warning: no .env.local or .env found. Copy .env.example to .env.local first."
  echo "  cp .env.example .env.local"
fi

# ---------------------------------------------------------------------------
# Start services
# ---------------------------------------------------------------------------
echo ""
echo "Starting Docker Compose services..."
# shellcheck disable=SC2086
docker compose $COMPOSE_PROFILES up -d --remove-orphans

# ---------------------------------------------------------------------------
# Wait for Postgres to be ready
# ---------------------------------------------------------------------------
echo ""
echo "Waiting for Postgres to be healthy..."
until docker compose exec -T postgres pg_isready -U corredor -d corredor -q 2>/dev/null; do
  printf "."
  sleep 1
done
echo " ready."

# ---------------------------------------------------------------------------
# Run migrations
# ---------------------------------------------------------------------------
echo ""
echo "Running database migrations..."
pnpm --filter @corredor/db migrate

# ---------------------------------------------------------------------------
# Run seeds (optional)
# ---------------------------------------------------------------------------
if [[ "$RUN_SEED" == "true" ]]; then
  echo ""
  echo "Running database seeds..."
  # Seeds are implemented in Phase A task 2; this is a no-op placeholder.
  if pnpm --filter @corredor/db run seed --if-present 2>/dev/null; then
    echo "Seeds complete."
  else
    echo "No seed script found — skipping."
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "Dev stack is up:"
echo "  Postgres:  postgresql://corredor:corredor@localhost:5432/corredor"
echo "  Redis:     redis://localhost:6379"
echo "  MinIO API: http://localhost:9000  (minioadmin / minioadmin)"
echo "  MinIO UI:  http://localhost:9001"
echo "  Mailhog:   http://localhost:8025"
if [[ "$COMPOSE_PROFILES" == *"observability"* ]]; then
  echo "  Jaeger:    http://localhost:16686"
fi
echo ""
echo "Start the app:"
echo "  pnpm dev"
echo ""
