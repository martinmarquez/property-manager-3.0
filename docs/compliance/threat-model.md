# Threat Model — Corredor CRM

> **Framework:** STRIDE  
> **Version:** 1.0  
> **Date:** 2026-04-20  
> **Author:** Security Engineer  
> **Review Status:** Draft — pending CTO approval

---

## 1. System Overview

Corredor is a multi-tenant SaaS CRM for Argentine real estate professionals. The system processes:

- **PII:** Tenant/client contact data, owner information
- **Financial:** Property valuations, commission tracking, Mercado Pago payment data
- **Credentials:** User passwords (Argon2id), session tokens, API keys, TOTP secrets
- **Documents:** Signed contracts, identity documents (DNI scans), property deeds
- **AI context:** Property descriptions, client notes used for RAG queries

### Architecture Diagram (Trust Zones)

```
┌─────────────────────────────────────────────────────────────┐
│  Public Internet                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │  Browser │  │  Mobile  │  │  Portal Webhooks         │  │
│  │  (React) │  │(Capacitor│  │  (Tokko/Zonaprop/etc)    │  │
│  └────┬─────┘  └─────┬────┘  └──────────┬───────────────┘  │
└───────┼──────────────┼─────────────────┼────────────────────┘
        │              │                 │
┌───────▼──────────────▼─────────────────▼────────────────────┐
│  Cloudflare Edge (WAF + Rate Limiting + DDoS)                │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│  Fly.io (apps/api — Node 22 + Hono)                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Auth Layer (RENA-5): Argon2id, Sessions, TOTP, WebAuthn│ │
│  │  RBAC Middleware, Tenant Isolation Middleware            │  │
│  │  Security Headers Middleware                             │  │
│  │  Rate Limiting (Redis token bucket)                      │  │
│  └─────────────────────────────┬──────────────────────────┘  │
│  ┌────────────────────────────┐ │ ┌──────────────────────┐   │
│  │  apps/worker (BullMQ)      │ │ │  apps/admin          │   │
│  └────────────────────────────┘ │ └──────────────────────┘   │
└────────────────────────────────┼─────────────────────────────┘
                                 │
          ┌──────────────────────┼────────────────────────┐
          │                      │                        │
┌─────────▼──────┐  ┌────────────▼──────────┐  ┌────────▼──────┐
│  Neon (Postgres│  │  Upstash Redis         │  │  Cloudflare   │
│  16 + RLS)     │  │  (Sessions, Cache,     │  │  R2 (Files)   │
│                │  │   Rate Limits)         │  │               │
└────────────────┘  └───────────────────────┘  └───────────────┘
```

### Data Flows

| Flow | Source | Destination | Sensitivity |
|------|--------|------------|-------------|
| User login | Browser | API /auth/login | Critical |
| Session token | API | Browser cookie (HttpOnly, Secure, SameSite=Strict) | Critical |
| Listing CRUD | Browser | API → Neon | Confidential |
| Document upload | Browser | API → R2 | Confidential |
| Portal sync | External portal webhook | apps/worker | Internal |
| AI queries | Browser | API → Anthropic | Confidential |
| Payment webhook | Mercado Pago | API | Confidential |

---

## 2. Assets

| Asset | Value | Location |
|-------|-------|---------|
| User credentials (hashed) | Critical | Neon DB |
| Session tokens | Critical | Redis + Cookie |
| TOTP secrets | Critical | Neon DB (encrypted) |
| WebAuthn credentials | Critical | Neon DB |
| API keys (external) | Critical | Doppler + Neon |
| Tenant PII | Confidential | Neon DB |
| Property/financial data | Confidential | Neon DB |
| Signed documents | Confidential | Cloudflare R2 |
| AI conversation context | Confidential | Neon DB |
| Source code + secrets | Critical | GitHub (private) + Doppler |

---

## 3. STRIDE Threat Analysis

### 3.1 Spoofing

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|-----------|
| **S1** — Credential theft via phishing | Auth layer | High | TOTP/WebAuthn MFA; phishing-resistant for admins |
| **S2** — Session hijacking via XSS | Browser | High | HttpOnly cookies; strict CSP; `SameSite=Strict` |
| **S3** — Forged webhook from portals | apps/worker webhook handler | Medium | HMAC signature verification on all inbound webhooks |
| **S4** — API key brute-force | API key auth | High | Key prefix + secret split; rate limiting; key rotation alerts |
| **S5** — JWT algorithm confusion | If JWTs used | High | Use opaque session tokens in Redis; avoid JWT for auth sessions |
| **S6** — Cross-tenant spoofing | RLS policies | Critical | Postgres RLS on every tenant-scoped table; server-side tenantId injection |

### 3.2 Tampering

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|-----------|
| **T1** — SQL injection | Neon DB via API | Critical | Drizzle ORM with parameterized queries; WAF; no raw string interpolation |
| **T2** — Mass assignment on listing update | API PATCH routes | High | Zod schema validation on all inputs; allowlist update fields |
| **T3** — Document tampering pre-sign | R2 signed documents | High | Immutable R2 paths after signing; audit log on document state transitions |
| **T4** — Commission data manipulation | Financial module | High | Append-only audit log; server-side calculation; client sends intent only |
| **T5** — BGP/DNS hijacking | DNS resolution | Medium | DNSSEC; cert pinning in mobile apps; HSTS preload |
| **T6** — Supply chain compromise | npm dependencies | High | Snyk CI; Dependabot; lockfile integrity; npm provenance |

### 3.3 Repudiation

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|-----------|
| **R1** — Denied commission agreement | CRM deals module | High | Immutable audit trail with timestamps + user IDs in Postgres |
| **R2** — Disputed document signatures | e-Sign module | High | DocuSign/Autofirma with legally-valid audit packet |
| **R3** — Portal sync disputed | Portal sync | Medium | Idempotent webhook log with portal payload hash stored |
| **R4** — Payment dispute | Mercado Pago | Medium | Webhook payload stored verbatim; Stripe/MP dashboard as source of truth |

### 3.4 Information Disclosure

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|-----------|
| **I1** — Cross-tenant data leak via API | API + Neon RLS | Critical | Postgres RLS on all tenant tables; tenantId extracted server-side from session |
| **I2** — PII in logs | API logging | High | Log scrubbing middleware (strip email, DNI, phone from logs) |
| **I3** — Secrets in git | All repos | Critical | gitleaks pre-commit hook + CI check; Doppler for all secrets |
| **I4** — Verbose error messages in prod | API error handlers | Medium | Generic error responses in prod; detailed errors in structured logs only |
| **I5** — AI prompt injection exposes tenant data | AI/RAG module | High | Prompt injection detection; namespace RAG context per tenant; output filtering |
| **I6** — R2 pre-signed URL sharing | Cloudflare R2 | Medium | Short TTL on pre-signed URLs (15 min); access log on document fetch |
| **I7** — Stack traces in HTTP responses | API | Medium | `NODE_ENV=production` disables Express/Hono error stacks |
| **I8** — Insecure direct object reference | Listing/document APIs | High | Authorization check before every fetch; UUIDs not sequential IDs |

### 3.5 Denial of Service

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|-----------|
| **D1** — API endpoint flooding | Public API | High | Cloudflare WAF + rate limiting; Redis token bucket per endpoint class |
| **D2** — AI endpoint cost DoS | AI module | High | Per-tenant monthly AI token budget enforced before Anthropic call |
| **D3** — Large file upload DoS | Document upload | Medium | File size limits (50 MB); Cloudflare Upload limit; MIME type allowlist |
| **D4** — Webhook replay flood | apps/worker | Medium | Idempotency key per webhook; dedup in Redis |
| **D5** — Slow-loris against API | Fly.io HTTP server | Low | Fly.io load balancer handles; `requestTimeout` config on Hono |
| **D6** — Bulk query via portal sync | Portal sync | Medium | Per-portal rate limits; background worker queue with backpressure |

### 3.6 Elevation of Privilege

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|-----------|
| **E1** — RBAC bypass via tenant switching | API middleware | Critical | tenantId from session only, never from request body/header |
| **E2** — Admin panel accessible to regular users | apps/admin | High | Separate auth domain; IP allowlist for admin subdomain |
| **E3** — Worker job injection | BullMQ | High | Job type allowlist; no arbitrary code execution from job data |
| **E4** — Path traversal in file APIs | R2 integration | High | Sanitize file paths; use UUID-based R2 keys, never user input |
| **E5** — Insecure deserialization | Redis cache | Medium | JSON-only serialization; schema validation on cache hit |
| **E6** — Mass assignment privilege escalation | User update API | High | Role field never accepted from client; server-side RBAC enforcement |

---

## 4. Tenant Isolation Deep Dive

Tenant isolation is the most critical security property in a multi-tenant SaaS.

### Isolation Layers

1. **Application Layer:** `tenantId` extracted from session JWT/cookie — never from request parameters.
2. **Database Layer:** Postgres Row Level Security (RLS) on every tenant-scoped table:
   ```sql
   CREATE POLICY tenant_isolation ON listings
     USING (tenant_id = current_setting('app.tenant_id')::uuid);
   ```
3. **Redis Layer:** All keys namespaced with `tenant:{tenantId}:*`
4. **Storage Layer:** R2 paths: `tenants/{tenantId}/documents/{uuid}`
5. **AI Layer:** RAG vector namespaced per tenant in pgvector

### Isolation Test Cases (Required in CI)

- [ ] User from Tenant A cannot read Tenant B listings via direct ID
- [ ] User from Tenant A cannot modify Tenant B contacts
- [ ] Session switching between tenants requires fresh auth
- [ ] Admin impersonation audit trail is enforced
- [ ] RLS cannot be bypassed by setting `app.tenant_id` via API parameter

---

## 5. Auth System Threats (RENA-5 Dependency)

The auth system (RENA-5) is a separate implementation. Security review of RENA-5 will be performed under RENA-11 task #6 once RENA-5 is in_review. Key controls to verify:

- Argon2id params: `m=65536, t=3, p=4` (minimum; prefer m=131072 for production)
- Session token entropy: ≥128 bits cryptographically random
- TOTP: RFC 6238 compliant, 30-second window, max ±1 step tolerance
- WebAuthn: FIDO2 compliant, user verification required for high-privilege actions
- Password reset tokens: single-use, 15-minute TTL, invalidated on use

---

## 6. Risk Register

| ID | Threat | Likelihood | Impact | Risk Score | Owner | Status |
|----|--------|-----------|--------|-----------|-------|--------|
| S6 | Cross-tenant spoofing | Low (RLS) | Critical | **High** | Security Eng | Mitigated via RLS |
| T1 | SQL injection | Low (ORM) | Critical | **High** | Security Eng | Mitigated via Drizzle |
| I1 | Cross-tenant data leak | Low (RLS) | Critical | **High** | Security Eng | Mitigated via RLS |
| E1 | RBAC bypass | Low | Critical | **High** | Security Eng | In design |
| I5 | AI prompt injection | Medium | High | **High** | Security Eng | TODO — AI module |
| T6 | Supply chain attack | Medium | High | **High** | Security Eng | Snyk + Dependabot |
| D2 | AI cost DoS | Medium | High | **High** | Security Eng | Budget enforcement |
| S1 | Credential theft | Low (MFA) | High | **Medium** | Security Eng | MFA required |
| I3 | Secrets in git | Low (gitleaks) | Critical | **Medium** | Security Eng | gitleaks in CI |

---

## 7. Security Assumptions

1. Fly.io and Neon are trusted infrastructure providers with their own security controls.
2. Cloudflare WAF is the first line of defense against volumetric attacks.
3. Doppler is trusted for secrets management; compromise of Doppler = full breach.
4. The Anthropic API is a trusted external service; responses must still be sanitized.
5. Developers follow the secrets runbook (`docs/runbooks/secrets.md`).

---

## 8. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Security Engineer | (auto) | 2026-04-20 | Draft |
| CTO | — | — | Pending review |

*This document must be reviewed and approved by the CTO before Phase A exit.*

*Last updated: 2026-04-20*
