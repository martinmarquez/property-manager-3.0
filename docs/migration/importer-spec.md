# Tokko Importer — CLI Tool Specification

**Status:** Draft v1 — 2026-04-20
**Audience:** Back-End Developer (Phase H)
**Implements:** `tools/tokko-importer`
**Depends on:** `docs/migration/tokko-data-map.md` for all field mappings

---

## Overview

`tokko-importer` is a CLI tool that reads data from a Tokko Broker agency account (via their REST API or a local export), transforms it to match the Corredor schema, and posts it to the Corredor import API. It must be:

- **Safe to re-run** (idempotent — duplicate runs do not create duplicate records)
- **Resumable** (can restart from where it left off after failure)
- **Transparent** (progress bar + structured error report)
- **Non-destructive** (never deletes or overwrites data in Corredor without explicit flag)

---

## Commands

```bash
# Import all entity types in order
tokko-import --all --tokko-api-key <key> --corredor-api-key <key> --agency-id <id>

# Import by entity type
tokko-import properties
tokko-import contacts
tokko-import leads
tokko-import users
tokko-import agency-config

# Dry-run (validate + report; no writes to Corredor)
tokko-import --all --dry-run

# Resume a failed run
tokko-import --all --resume --run-id <run-id>

# Show errors from a previous run
tokko-import report --run-id <run-id>
```

### Global flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--tokko-api-key` | Yes | `$TOKKO_API_KEY` | Tokko REST API key for source agency |
| `--tokko-agency-id` | Yes | `$TOKKO_AGENCY_ID` | Tokko numeric agency ID |
| `--corredor-api-key` | Yes | `$CORREDOR_API_KEY` | Corredor API key (scoped to target agency) |
| `--corredor-url` | No | `https://api.corredor.ar` | Override for staging/local |
| `--dry-run` | No | false | Validate + report; no writes |
| `--resume` | No | false | Resume from last checkpoint |
| `--run-id` | No | auto-generated UUID | Label for this run (used in resume + report) |
| `--concurrency` | No | 4 | Parallel API call concurrency |
| `--log-level` | No | info | debug / info / warn / error |
| `--output` | No | terminal | terminal / json / csv — format for final report |

---

## Input

### Via Tokko REST API (primary)

Tokko API base: `https://www.tokkobroker.com/api/v1/`

Required endpoints (all require `key` query param):

```
GET /api/v1/property/search?key=<key>&limit=100&offset=<n>&format=json&data={"filters":{"operations":["1","2","3"],"current_localization_id":"","current_localization_type":"","price_from":"","price_to":"","currency":"","prop_type":"","deleted":true}}&order_by=id&order_type=ASC
GET /api/v1/contact/?key=<key>&limit=100&offset=<n>
GET /api/v1/lead/?key=<key>&limit=100&offset=<n>
GET /api/v1/user/?key=<key>&limit=100
GET /api/v1/branch/?key=<key>
```

### Via local export ZIP (fallback)

If Tokko API is unavailable or rate-limited, accept a ZIP file containing:
- `properties.csv` — flat property export from Tokko admin
- `contacts.csv` — flat contact export

```bash
tokko-import --all --from-zip ./tokko-export-2026-04-20.zip
```

CSV column mapping is in `src/adapters/csv-adapter.ts`.

---

## Processing Pipeline

For each entity type, the pipeline is:

```
Fetch (Tokko API / ZIP) → Validate → Transform → Dedup-check → Write (Corredor API)
```

### Fetch

- Paginate Tokko API (`limit=100`, `offset` increments) until empty page
- Cache raw responses to `.tokko-import/cache/<run-id>/<entity>/<page>.json`
- Cache is reused on `--resume` to avoid re-fetching

### Validate

- JSON Schema validation on Tokko response
- Log `WARN` for unexpected fields (do not fail)
- Log `ERROR` and skip record for missing required fields (id, type)

### Transform

Transform follows `docs/migration/tokko-data-map.md` exactly.

Key transformations:
- Phone normalization to E.164 (`libphonenumber-js`)
- HTML stripping on `description` (`sanitize-html`, allow nothing)
- Photo URL head-check (async, with 5s timeout; skip 404/timeout)
- Geocoding for properties missing lat/lng (Google Maps Geocoding API or Nominatim fallback)
- Fuzzy dedup detection for contacts (see below)

### Dedup detection

Before writing, check if a record already exists in Corredor by `external_id` (Tokko ID stored at import time). If found and unchanged, skip. If found and changed, update (unless `--no-update` flag set).

For contacts with no prior Corredor match, run fuzzy dedup:
1. Normalize phone numbers
2. Query Corredor for contacts with matching email OR matching normalized phone
3. If match found: attach a `suspected_duplicate` warning to both records in the error report; do not auto-merge

### Write

Post to Corredor Import API (see §6). On HTTP 4xx for a single record: log error, mark record failed, continue. On HTTP 5xx or network error: retry with exponential backoff (3 retries, 2s base delay), then mark failed.

---

## Progress Display

Terminal output uses a multi-line progress display:

```
Tokko → Corredor import  [run: abc-123]

  ✓ agency-config      done (1/1)
  ✓ users              done (12/12)
  ● properties         ████████████░░░░░░░  63% (189/300)  ~2m left
  ○ contacts           waiting
  ○ leads              waiting

  Errors so far: 3
  Press Ctrl+C to pause (run can be resumed with --resume --run-id abc-123)
```

Use `ora` or `cli-progress` for the spinner/bar; do not use raw `console.log` in the hot path.

---

## Error Report

After each run, write `.tokko-import/reports/<run-id>.json`:

```json
{
  "run_id": "abc-123",
  "started_at": "2026-04-20T10:00:00Z",
  "completed_at": "2026-04-20T10:08:43Z",
  "status": "completed_with_errors",
  "summary": {
    "properties": { "total": 300, "imported": 297, "skipped": 0, "failed": 3 },
    "contacts":   { "total": 512, "imported": 505, "skipped": 4, "failed": 3 },
    "leads":      { "total": 1200, "imported": 1198, "skipped": 0, "failed": 2 }
  },
  "warnings": [
    {
      "entity": "property",
      "external_id": "12345",
      "type": "placeholder_owner",
      "message": "Owner contact is a Tokko placeholder (\"Propietario de 123-...\"). Assign a real owner in Corredor."
    }
  ],
  "errors": [
    {
      "entity": "contact",
      "external_id": "67890",
      "type": "write_failed",
      "http_status": 422,
      "corredor_error": "email already taken by another contact"
    }
  ]
}
```

Print a human-readable summary to terminal at the end:

```
Import complete.

  Properties:  297 imported, 0 skipped, 3 failed
  Contacts:    505 imported, 4 skipped, 3 failed  (4 suspected duplicates)
  Leads:       1198 imported, 0 skipped, 2 failed

  ⚠  12 warnings  (see report: .tokko-import/reports/abc-123.json)
  ✗   8 errors     (see report above)

  Run "tokko-import report --run-id abc-123" for details.
```

---

## Idempotency

Every entity written to Corredor includes:

```json
{
  "external_source": "tokko",
  "external_id": "12345"
}
```

The Corredor import API uses `(external_source, external_id)` as the idempotency key. Re-running the importer updates existing records (unless `--no-update`). It does not create duplicates.

---

## Corredor Import API

The Back-End team must implement these endpoints before the importer can write data:

### `POST /api/v1/import/properties` (bulk)

```json
{
  "agency_id": "uuid",
  "records": [
    {
      "external_source": "tokko",
      "external_id": "12345",
      "property_type": "apartment",
      "status": "available",
      "location": { "address": "...", "zona": "...", "lat": -34.6, "lng": -58.4 },
      "operations": [
        { "type": "venta", "price": { "amount": 150000, "currency": "USD" }, "show_price": true }
      ],
      "surface_total": 65.0,
      "surface_covered": 55.0,
      "rooms": 3,
      "bedrooms": 2,
      "bathrooms": 1,
      "description": "...",
      "photos": [{ "url": "...", "order": 0 }],
      "legacy_reference": "P-0001",
      "created_at": "2023-01-15T10:00:00Z",
      "updated_at": "2025-11-01T08:30:00Z",
      "producer_external_id": "tokko:user:99",
      "branch_external_id": "tokko:branch:1"
    }
  ]
}
```

Response: `{ "imported": 98, "updated": 2, "errors": [...] }`

### `POST /api/v1/import/contacts` (bulk)

### `POST /api/v1/import/leads` (bulk)

### `POST /api/v1/import/users` (bulk)

All bulk endpoints accept up to 100 records per request. The importer batches automatically.

---

## File Structure

```
tools/tokko-importer/
  src/
    cli.ts               # Entry point; parses flags; orchestrates pipeline
    pipeline/
      fetch.ts           # Tokko API pagination + CSV adapter
      validate.ts        # JSON Schema validation
      transform.ts       # Field mapping (from tokko-data-map.md)
      dedup.ts           # Fuzzy dedup logic (contacts)
      write.ts           # Corredor API batched writes
    adapters/
      tokko-api.ts       # Tokko REST API client
      csv-adapter.ts     # CSV fallback adapter
      corredor-api.ts    # Corredor import API client
    progress.ts          # Terminal progress bar
    report.ts            # Error report writer
    checkpoint.ts        # Run state persistence (for --resume)
    utils/
      phone.ts           # E.164 normalization
      html.ts            # HTML stripping
      geocode.ts         # Geocoding fallback
  tests/
    transform.test.ts    # Unit tests for field mapping
    dedup.test.ts
    e2e/
      dry-run.test.ts    # E2E dry-run against fixture data
  fixtures/
    sample-properties.json
    sample-contacts.json
  package.json
  tsconfig.json
  README.md
```

---

## Dependencies

```json
{
  "dependencies": {
    "libphonenumber-js": "*",
    "sanitize-html": "*",
    "cli-progress": "*",
    "ora": "*",
    "zod": "*",
    "axios": "*",
    "p-limit": "*",
    "fast-csv": "*"
  },
  "devDependencies": {
    "vitest": "*",
    "typescript": "*"
  }
}
```

---

## Phase H Handoff Checklist

Before Back-End Developer begins:

- [x] `docs/migration/tokko-data-map.md` complete (field maps, data loss risks, messy data patterns)
- [x] This spec complete
- [ ] Corredor import API endpoints designed and in API spec
- [ ] Tokko API key provisioned for test agency (ask CEO)
- [ ] Staging Corredor instance available for dry-run testing
- [ ] CLI scaffolded in `tools/tokko-importer/` (Back-End can scaffold)

---

*Owner:* Customer Success (strategy/spec) → Back-End Developer (implementation, Phase H)
