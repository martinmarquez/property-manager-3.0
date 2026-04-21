#!/usr/bin/env bash
# Creates a Neon branch for a PR and outputs connection strings to GITHUB_OUTPUT.
# Usage: ./infra/neon/branch.sh <pr-number>
# Env: NEON_API_KEY, NEON_PROJECT_ID
set -euo pipefail

PR_NUMBER="${1:?PR number required}"
BRANCH_NAME="pr-${PR_NUMBER}"
BASE_URL="https://console.neon.tech/api/v2"

echo "Creating Neon branch: ${BRANCH_NAME}" >&2

# Check if branch already exists
EXISTING=$(curl -sf \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  "${BASE_URL}/projects/${NEON_PROJECT_ID}/branches" \
  | jq -r ".branches[] | select(.name == \"${BRANCH_NAME}\") | .id" || true)

if [ -n "$EXISTING" ]; then
  echo "Branch ${BRANCH_NAME} already exists (${EXISTING}), reusing." >&2
  BRANCH_ID="$EXISTING"
else
  RESPONSE=$(curl -sf -X POST \
    -H "Authorization: Bearer ${NEON_API_KEY}" \
    -H "Content-Type: application/json" \
    "${BASE_URL}/projects/${NEON_PROJECT_ID}/branches" \
    -d "{\"branch\": {\"name\": \"${BRANCH_NAME}\", \"parent_id\": null}}")

  BRANCH_ID=$(echo "$RESPONSE" | jq -r '.branch.id')
  echo "Created branch ${BRANCH_NAME} (${BRANCH_ID})" >&2
fi

# Get connection URIs (pooled + direct)
ENDPOINTS=$(curl -sf \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  "${BASE_URL}/projects/${NEON_PROJECT_ID}/branches/${BRANCH_ID}/endpoints")

ENDPOINT_ID=$(echo "$ENDPOINTS" | jq -r '.endpoints[0].id')
HOST=$(echo "$ENDPOINTS" | jq -r '.endpoints[0].host')
POOLER_HOST=$(echo "$ENDPOINTS" | jq -r '.endpoints[0].pooler_host // empty')

# Fall back to deriving pooler host if not explicitly returned
if [ -z "$POOLER_HOST" ]; then
  POOLER_HOST="${ENDPOINT_ID}-pooler.${HOST#*.}"
fi

DB_USER="${NEON_DB_USER:-neondb_owner}"
DB_NAME="${NEON_DB_NAME:-neondb}"

DB_URL="postgresql://${DB_USER}@${HOST}/${DB_NAME}?sslmode=require"
DB_URL_POOLED="postgresql://${DB_USER}@${POOLER_HOST}/${DB_NAME}?sslmode=require&pgbouncer=true"

# Write to GITHUB_OUTPUT when running in Actions
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "branch_id=${BRANCH_ID}" >> "$GITHUB_OUTPUT"
  echo "branch_name=${BRANCH_NAME}" >> "$GITHUB_OUTPUT"
  echo "db_url=${DB_URL}" >> "$GITHUB_OUTPUT"
  echo "db_url_pooled=${DB_URL_POOLED}" >> "$GITHUB_OUTPUT"
else
  echo "branch_id=${BRANCH_ID}"
  echo "branch_name=${BRANCH_NAME}"
  echo "db_url=${DB_URL}"
  echo "db_url_pooled=${DB_URL_POOLED}"
fi

echo "Neon branch ready: ${BRANCH_NAME}" >&2
