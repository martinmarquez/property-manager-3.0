#!/usr/bin/env bash
# fly-set-esign-secrets.sh — push e-sign secrets to Fly.io apps
#
# Usage:
#   ENV=staging \
#   SIGNATURIT_API_KEY=<key> \
#   CLOUDFLARE_ACCOUNT_ID=<id> \
#   R2_ACCESS_KEY_ID=<key> \
#   R2_SECRET_ACCESS_KEY=<secret> \
#   [DOCUSIGN_INTEGRATION_KEY=<key>] \
#   [DOCUSIGN_CLIENT_SECRET=<secret>] \
#   [DOCUSIGN_ACCOUNT_ID=<id>] \
#   ./scripts/fly-set-esign-secrets.sh
#
# ENV must be "staging" or "production". Two apps are updated per run:
#   corredor-api-{ENV}     — needs Signaturit + DocuSign for webhook callbacks
#   corredor-worker-{ENV}  — needs all of the above + R2 creds for PDF upload

set -euo pipefail

ENV="${ENV:-staging}"
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "ENV must be 'staging' or 'production'" >&2
  exit 1
fi

: "${SIGNATURIT_API_KEY:?SIGNATURIT_API_KEY is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"

SIGNATURIT_BASE_URL="${SIGNATURIT_API_BASE_URL:-https://api.sandbox.signaturit.com}"
DOCUSIGN_BASE_URL="${DOCUSIGN_BASE_URL:-https://demo.docusign.net}"

API_APP="corredor-api-${ENV}"
WORKER_APP="corredor-worker-${ENV}"

echo "Setting e-sign secrets on ${API_APP} and ${WORKER_APP}…"

# Secrets shared by API + worker
SHARED_SECRETS=(
  "SIGNATURIT_API_KEY=${SIGNATURIT_API_KEY}"
  "SIGNATURIT_API_BASE_URL=${SIGNATURIT_BASE_URL}"
)

if [[ -n "${DOCUSIGN_INTEGRATION_KEY:-}" ]]; then
  SHARED_SECRETS+=(
    "DOCUSIGN_INTEGRATION_KEY=${DOCUSIGN_INTEGRATION_KEY}"
    "DOCUSIGN_CLIENT_SECRET=${DOCUSIGN_CLIENT_SECRET:?DOCUSIGN_CLIENT_SECRET required when DOCUSIGN_INTEGRATION_KEY is set}"
    "DOCUSIGN_ACCOUNT_ID=${DOCUSIGN_ACCOUNT_ID:?DOCUSIGN_ACCOUNT_ID required when DOCUSIGN_INTEGRATION_KEY is set}"
    "DOCUSIGN_BASE_URL=${DOCUSIGN_BASE_URL}"
  )
fi

fly secrets set --app "${API_APP}" "${SHARED_SECRETS[@]}"
echo "  ✓ ${API_APP}"

# Worker also needs R2 creds
fly secrets set --app "${WORKER_APP}" "${SHARED_SECRETS[@]}" \
  "CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID}" \
  "R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}" \
  "R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}"
echo "  ✓ ${WORKER_APP}"

echo "Done. Verify with: fly secrets list --app ${WORKER_APP}"
