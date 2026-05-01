#!/usr/bin/env bash
# setup-r2-lifecycle.sh — apply lifecycle rules to corredor-documents-* buckets
#
# Rules:
#   drafts/   — expire after 90 days
#   tenants/  — no expiry (permanent)
#
# Usage:
#   CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> ./scripts/setup-r2-lifecycle.sh

set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

API_BASE="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets"
AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

# 90 days in seconds
NINETY_DAYS=$((90 * 86400))

LIFECYCLE_BODY=$(cat <<EOF
{
  "rules": [
    {
      "id": "expire-drafts-90d",
      "enabled": true,
      "conditions": {
        "prefix": "drafts/",
        "maxAge": ${NINETY_DAYS}
      }
    }
  ]
}
EOF
)

apply_lifecycle() {
  local bucket="$1"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    "${API_BASE}/${bucket}/lifecycle" \
    "${AUTH[@]}" \
    --data "${LIFECYCLE_BODY}")
  if [[ "$http_code" == "200" || "$http_code" == "204" ]]; then
    echo "  ✓ ${bucket} — drafts/ expires after 90 days (http ${http_code})"
  else
    echo "  ✗ ${bucket} — unexpected status ${http_code}" >&2
    exit 1
  fi
}

echo "Applying R2 lifecycle rules…"
apply_lifecycle "corredor-documents-prod"
apply_lifecycle "corredor-documents-staging"
echo "Done."
