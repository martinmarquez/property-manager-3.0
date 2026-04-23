#!/usr/bin/env bash
# Sets up a personal Neon dev branch for a single developer.
#
# Usage: ./infra/neon/dev-branch.sh <your-username>
# Env:   NEON_API_KEY, NEON_PROJECT_ID
#
# Outputs the exact lines to paste into packages/db/.env.
#
# Prerequisites:
#   export NEON_API_KEY=<your-neon-api-key>         # from https://console.neon.tech/app/settings/api-keys
#   export NEON_PROJECT_ID=<corredor-project-id>    # ask team lead or see secrets.md
set -euo pipefail

USERNAME="${1:?Usage: $0 <your-username>  (e.g. $0 mmarquez)}"
BRANCH_NAME="dev-${USERNAME}"
BASE_URL="https://console.neon.tech/api/v2"

: "${NEON_API_KEY:?NEON_API_KEY must be set — get yours at https://console.neon.tech/app/settings/api-keys}"
: "${NEON_PROJECT_ID:?NEON_PROJECT_ID must be set — ask your team lead or see docs/runbooks/secrets.md}"

echo "Setting up personal Neon dev branch: ${BRANCH_NAME}" >&2

# ── 1. Check if branch already exists ───────────────────────────────────────
EXISTING=$(curl -sf \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  "${BASE_URL}/projects/${NEON_PROJECT_ID}/branches" \
  | jq -r ".branches[] | select(.name == \"${BRANCH_NAME}\") | .id" || true)

if [ -n "$EXISTING" ]; then
  echo "Branch '${BRANCH_NAME}' already exists (${EXISTING}), reusing." >&2
  BRANCH_ID="$EXISTING"
else
  echo "Creating branch '${BRANCH_NAME}' from main..." >&2
  RESPONSE=$(curl -sf -X POST \
    -H "Authorization: Bearer ${NEON_API_KEY}" \
    -H "Content-Type: application/json" \
    "${BASE_URL}/projects/${NEON_PROJECT_ID}/branches" \
    -d "{\"branch\": {\"name\": \"${BRANCH_NAME}\"}}")

  BRANCH_ID=$(echo "$RESPONSE" | jq -r '.branch.id')
  echo "Created branch '${BRANCH_NAME}' (${BRANCH_ID})" >&2
fi

# ── 2. Get connection endpoints ──────────────────────────────────────────────
# Wait briefly for compute to provision on a brand-new branch
sleep 3

ENDPOINTS=$(curl -sf \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  "${BASE_URL}/projects/${NEON_PROJECT_ID}/branches/${BRANCH_ID}/endpoints")

ENDPOINT_ID=$(echo "$ENDPOINTS" | jq -r '.endpoints[0].id')
HOST=$(echo "$ENDPOINTS" | jq -r '.endpoints[0].host')

# Pooler host: Neon returns it directly or it can be derived
POOLER_HOST=$(echo "$ENDPOINTS" | jq -r '.endpoints[0].pooler_host // empty')
if [ -z "$POOLER_HOST" ]; then
  POOLER_HOST="${ENDPOINT_ID}-pooler.${HOST#*.}"
fi

DB_USER="${NEON_DB_USER:-neondb_owner}"
DB_NAME="${NEON_DB_NAME:-neondb}"

# ── 3. Fetch the branch password ─────────────────────────────────────────────
# Neon returns passwords only via the connection-string endpoint
CONN_RESPONSE=$(curl -sf \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  "${BASE_URL}/projects/${NEON_PROJECT_ID}/connection_uri?branch_id=${BRANCH_ID}&role_name=${DB_USER}&database_name=${DB_NAME}&pooled=false")

RAW_URI=$(echo "$CONN_RESPONSE" | jq -r '.uri')
# Extract password from URI: postgresql://user:PASSWORD@host/db
PASSWORD=$(echo "$RAW_URI" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')

POOLED_URL="postgresql://${DB_USER}:${PASSWORD}@${POOLER_HOST}/${DB_NAME}?channel_binding=require&sslmode=require"
DIRECT_URL="postgresql://${DB_USER}:${PASSWORD}@${HOST}/${DB_NAME}?channel_binding=require&sslmode=require"

# ── 4. Print .env lines ──────────────────────────────────────────────────────
echo "" >&2
echo "Done. Paste these lines into packages/db/.env:" >&2
echo "────────────────────────────────────────────────────────" >&2

cat <<ENV
# Neon Postgres — corredor-crm project
# Branch: ${BRANCH_NAME} (${BRANCH_ID})
# Personal dev branch — NOT the main/production branch.
# Created by: ./infra/neon/dev-branch.sh ${USERNAME}
DATABASE_URL=${POOLED_URL}

# Unpooled endpoint for migrations/seed
DATABASE_URL_UNPOOLED=${DIRECT_URL}

# Test database — use the same dev branch (unpooled so session vars survive)
TEST_DATABASE_URL=${DIRECT_URL}
ENV

echo "────────────────────────────────────────────────────────" >&2
echo "" >&2
echo "IMPORTANT: Keep your branch credentials private." >&2
echo "Never share packages/db/.env or commit it to git." >&2
