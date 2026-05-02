#!/usr/bin/env bash
# test-phase-e-acceptance.sh — RENA-60 Phase E acceptance checks
#
# Runs 4 checks. Each exits non-zero on failure. Pass --skip-X flags to skip
# checks that require external credentials not yet available.
#
# Usage (all checks):
#   SIGNATURIT_API_KEY=<key> \
#   CLOUDFLARE_ACCOUNT_ID=<id> R2_ACCESS_KEY_ID=<key> R2_SECRET_ACCESS_KEY=<secret> \
#   ./scripts/test-phase-e-acceptance.sh
#
# Usage (only local checks — no external creds needed):
#   ./scripts/test-phase-e-acceptance.sh --skip-signaturit --skip-docusign --local-r2
#
# Flags:
#   --skip-signaturit   Skip Signaturit API health check
#   --skip-docusign     Skip DocuSign sandbox check
#   --local-r2          Use MinIO (localhost:9000) instead of Cloudflare R2
#   --skip-r2           Skip the R2 bucket upload/download test entirely

set -euo pipefail

SKIP_SIGNATURIT=false
SKIP_DOCUSIGN=false
LOCAL_R2=false
SKIP_R2=false

for arg in "$@"; do
  case "$arg" in
    --skip-signaturit) SKIP_SIGNATURIT=true ;;
    --skip-docusign)   SKIP_DOCUSIGN=true ;;
    --local-r2)        LOCAL_R2=true ;;
    --skip-r2)         SKIP_R2=true ;;
    *) echo "Unknown flag: $arg" >&2; exit 1 ;;
  esac
done

PASS=0
FAIL=0
SKIP=0

ok()   { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }
skip() { echo "  ⏭  $1 (skipped)"; SKIP=$((SKIP + 1)); }

echo ""
echo "════════════════════════════════════════"
echo " RENA-60 — Phase E Acceptance Checks"
echo "════════════════════════════════════════"

# ---------------------------------------------------------------------------
# 1. Signaturit API health check
# ---------------------------------------------------------------------------
echo ""
echo "1. Signaturit API health check"
if $SKIP_SIGNATURIT; then
  skip "SIGNATURIT_API_KEY not provided — run with real key to verify"
elif [[ -z "${SIGNATURIT_API_KEY:-}" ]]; then
  skip "SIGNATURIT_API_KEY not set"
else
  BASE_URL="${SIGNATURIT_API_BASE_URL:-https://api.sandbox.signaturit.com}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${SIGNATURIT_API_KEY}" \
    "${BASE_URL}/v1/account.json")
  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "Signaturit sandbox API reachable (HTTP 200)"
  else
    fail "Signaturit sandbox returned HTTP ${HTTP_CODE} — check API key and base URL"
  fi
fi

# ---------------------------------------------------------------------------
# 2. R2 upload + download
# ---------------------------------------------------------------------------
echo ""
echo "2. R2 bucket upload + download"
if $SKIP_R2; then
  skip "R2 test skipped"
elif $LOCAL_R2; then
  S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
  S3_KEY="${S3_ACCESS_KEY_ID:-minioadmin}"
  S3_SECRET="${S3_SECRET_ACCESS_KEY:-minioadmin}"
  BUCKET="${S3_BUCKET_DOCUMENTS:-documents}"

  # Check MinIO is reachable
  if ! curl -s -o /dev/null -f "${S3_ENDPOINT}/minio/health/live" 2>/dev/null; then
    fail "MinIO not reachable at ${S3_ENDPOINT} — run: docker compose up -d minio"
  else
    TEST_KEY="rena60-acceptance-$(date +%s).txt"
    TEST_BODY="RENA-60 acceptance test $(date -u)"

    # Upload
    aws --endpoint-url "${S3_ENDPOINT}" s3 cp \
      - "s3://${BUCKET}/${TEST_KEY}" \
      --no-sign-request 2>/dev/null <<< "${TEST_BODY}" || \
    AWS_ACCESS_KEY_ID="${S3_KEY}" AWS_SECRET_ACCESS_KEY="${S3_SECRET}" \
    aws --endpoint-url "${S3_ENDPOINT}" s3 cp \
      - "s3://${BUCKET}/${TEST_KEY}" 2>/dev/null <<< "${TEST_BODY}"

    # Download and verify
    DOWNLOADED=$(AWS_ACCESS_KEY_ID="${S3_KEY}" AWS_SECRET_ACCESS_KEY="${S3_SECRET}" \
      aws --endpoint-url "${S3_ENDPOINT}" s3 cp \
      "s3://${BUCKET}/${TEST_KEY}" - 2>/dev/null)

    if [[ "$DOWNLOADED" == "$TEST_BODY" ]]; then
      ok "MinIO upload + download roundtrip OK (bucket: ${BUCKET})"
      # Cleanup
      AWS_ACCESS_KEY_ID="${S3_KEY}" AWS_SECRET_ACCESS_KEY="${S3_SECRET}" \
        aws --endpoint-url "${S3_ENDPOINT}" s3 rm "s3://${BUCKET}/${TEST_KEY}" 2>/dev/null || true
    else
      fail "MinIO download content mismatch"
    fi
  fi
elif [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" || -z "${R2_ACCESS_KEY_ID:-}" ]]; then
  skip "R2 creds not set — run with CLOUDFLARE_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY"
else
  BUCKET="corredor-documents-staging"
  ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
  TEST_KEY="tenants/test/documents/rena60-acceptance-$(date +%s).txt"
  TEST_BODY="RENA-60 acceptance test $(date -u)"

  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws --endpoint-url "${ENDPOINT}" s3 cp - "s3://${BUCKET}/${TEST_KEY}" <<< "${TEST_BODY}" 2>&1

  DOWNLOADED=$(AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws --endpoint-url "${ENDPOINT}" s3 cp "s3://${BUCKET}/${TEST_KEY}" - 2>/dev/null)

  if [[ "$DOWNLOADED" == "$TEST_BODY" ]]; then
    ok "R2 upload + download roundtrip OK (bucket: ${BUCKET})"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws --endpoint-url "${ENDPOINT}" s3 rm "s3://${BUCKET}/${TEST_KEY}" 2>/dev/null || true
  else
    fail "R2 download content mismatch"
  fi
fi

# ---------------------------------------------------------------------------
# 3. PDF generation from HTML
# ---------------------------------------------------------------------------
echo ""
echo "3. PDF render from HTML via Playwright"

# Try to find a usable Chromium/Chrome executable
CHROME_EXEC=""
for candidate in \
  "${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-}" \
  "/usr/bin/chromium" \
  "/usr/bin/chromium-browser" \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    CHROME_EXEC="$candidate"
    break
  fi
done

if [[ -z "$CHROME_EXEC" ]]; then
  skip "No Chromium/Chrome found — PDF test skipped (will run in Docker with system Chromium)"
else
  PDF_OUT=$(mktemp /tmp/rena60-test-XXXXXX.pdf)
  node --input-type=module <<JSEOF 2>&1
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '${CHROME_EXEC}',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
const html = \`<!DOCTYPE html><html><body>
  <h1>Corredor — Contrato de Locación</h1>
  <p>Tenant: test-tenant | Doc: rena60-acceptance</p>
  <p>Generated: \${new Date().toISOString()}</p>
</body></html>\`;
await page.setContent(html, { waitUntil: 'domcontentloaded' });
const pdf = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
import { writeFileSync } from 'fs';
writeFileSync('${PDF_OUT}', pdf);
console.log(pdf.length);
JSEOF
  PDF_SIZE=$(cat "${PDF_OUT}" | wc -c | tr -d ' ')
  if [[ "$PDF_SIZE" -gt 1000 ]]; then
    ok "PDF rendered successfully (${PDF_SIZE} bytes) → ${PDF_OUT}"
  else
    fail "PDF render produced suspiciously small file (${PDF_SIZE} bytes)"
  fi
fi

# ---------------------------------------------------------------------------
# 4. DocuSign sandbox reachable
# ---------------------------------------------------------------------------
echo ""
echo "4. DocuSign sandbox credentials"
if $SKIP_DOCUSIGN; then
  skip "DocuSign check skipped"
elif [[ -z "${DOCUSIGN_INTEGRATION_KEY:-}" ]]; then
  skip "DOCUSIGN_INTEGRATION_KEY not set"
else
  BASE="${DOCUSIGN_BASE_URL:-https://demo.docusign.net}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/restapi/")
  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "302" ]]; then
    ok "DocuSign demo endpoint reachable (HTTP ${HTTP_CODE})"
  else
    fail "DocuSign demo endpoint returned HTTP ${HTTP_CODE}"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "════════════════════════════════════════"
echo " Results: ${PASS} passed · ${FAIL} failed · ${SKIP} skipped"
echo "════════════════════════════════════════"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
