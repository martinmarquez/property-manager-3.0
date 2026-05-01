#!/usr/bin/env bash
# setup-r2-buckets.sh — create corredor-documents-{prod,staging} R2 buckets
#
# Usage:
#   CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> ./scripts/setup-r2-buckets.sh
#
# The script is idempotent: a 409 (bucket already exists) is treated as success.

set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

API="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets"
AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

create_bucket() {
  local name="$1"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}" \
    "${AUTH[@]}" \
    --data "{\"name\": \"${name}\", \"location_hint\": \"LATAM\"}")
  if [[ "$http_code" == "200" || "$http_code" == "201" || "$http_code" == "409" ]]; then
    echo "  ✓ ${name} (http ${http_code})"
  else
    echo "  ✗ ${name} — unexpected status ${http_code}" >&2
    exit 1
  fi
}

echo "Creating R2 document buckets…"
create_bucket "corredor-documents-prod"
create_bucket "corredor-documents-staging"
echo "Done."
