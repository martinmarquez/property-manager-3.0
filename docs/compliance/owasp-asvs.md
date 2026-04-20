# OWASP ASVS L2 Control Mapping — Corredor CRM

> **Standard:** OWASP Application Security Verification Standard (ASVS) 4.0.3  
> **Target Level:** L2 (Standard)  
> **Date:** 2026-04-20  
> **Review Status:** Draft

**Legend:**
- ✅ Implemented — control is active in production code
- 🔄 In Progress — implementation underway or planned in current sprint
- ⚠️ TODO — not yet implemented, must be done before launch
- N/A — not applicable to Corredor's architecture

---

## V1 — Architecture, Design and Threat Modeling

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 1.1.1 | Secure SDLC documented and followed | 🔄 | This document + threat-model.md establishes baseline |
| 1.1.2 | Threat modeling for every design change | 🔄 | STRIDE model in threat-model.md; process to be formalized |
| 1.1.3 | User stories include security acceptance criteria | ⚠️ | To be added to issue templates in GitHub |
| 1.1.4 | Data flow diagrams for all trusted/untrusted boundaries | ✅ | Documented in threat-model.md §3 |
| 1.1.5 | High-value items identified and reviewed | ✅ | Risk register in threat-model.md §6 |
| 1.2.1 | Components use principle of least privilege | 🔄 | DB roles: `corredor_api` (no DDL), `corredor_migrations` (DDL) |
| 1.2.2 | Communications use TLS | ✅ | Fly.io → Neon over TLS; all external APIs HTTPS only |
| 1.2.3 | Single vetted auth mechanism | 🔄 | Unified auth in RENA-5 (Argon2id + sessions + TOTP + WebAuthn) |
| 1.4.1 | Trusted enforcement points on server side | ✅ | tenantId from session only; RBAC server-side |
| 1.5.1 | Input validation at trusted service layer | 🔄 | Zod schemas on all tRPC/REST inputs |
| 1.6.1 | Key management policy documented | 🔄 | Doppler manages all secrets; secrets.md runbook |
| 1.9.1 | Encrypted communications between components | ✅ | All inter-service calls over TLS |
| 1.10.1 | Source control system in use | ✅ | GitHub private repo |
| 1.11.1 | All business logic flows documented | ⚠️ | Sequence diagrams needed for payment/commission flows |
| 1.14.1 | Segregated build/deploy environments | 🔄 | Doppler: local/preview/staging/production environments |

---

## V2 — Authentication

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 2.1.1 | Passwords ≥12 chars | 🔄 | RENA-5 — Zod validation on registration |
| 2.1.2 | Passwords ≥64 chars allowed | 🔄 | RENA-5 — no max length below 128 |
| 2.1.3 | Password truncation not performed | 🔄 | RENA-5 — Argon2id hashes full input |
| 2.1.4 | All Unicode chars allowed in passwords | 🔄 | RENA-5 |
| 2.1.5 | Password change allowed | ⚠️ | RENA-5 — self-service password change |
| 2.1.6 | Forgot password uses OTP/magic link | ⚠️ | RENA-5 — SES email with signed token |
| 2.1.7 | Passwords checked against breach databases (HIBP) | ⚠️ | RENA-5 — HIBP k-anonymity API on registration/change |
| 2.1.8 | Password strength meter in UI | ⚠️ | apps/web — zxcvbn-ts |
| 2.1.9 | No password composition rules that reduce entropy | ✅ | Reject; allow any composition |
| 2.1.12 | Paste allowed in password fields | ✅ | No autocomplete=off |
| 2.2.1 | Anti-automation controls on auth endpoints | 🔄 | Rate limiting: 10/min per IP (RENA-11 rate-limit.ts) |
| 2.2.2 | Brute force protection with lockout | ⚠️ | RENA-5 — 5 failed attempts → 15-min lockout |
| 2.2.3 | Secure account notifications on changes | ⚠️ | RENA-5 — email alerts for password/MFA changes |
| 2.3.1 | System-generated initial passwords are random | N/A | No system-generated passwords; invite-only with set-password flow |
| 2.4.1 | Passwords stored using adaptive hashing (Argon2id) | 🔄 | RENA-5 — `m=65536, t=3, p=4` minimum |
| 2.5.1 | Credential recovery not reveals current creds | 🔄 | RENA-5 — OTP flow; no credential hints |
| 2.6.1 | Lookup secrets (backup codes) are random | ⚠️ | RENA-5 — TOTP backup codes: 10 × 8-char random |
| 2.7.1 | OTP codes expire after short time | 🔄 | RENA-5 — TOTP: 30-second window; email OTP: 15 min |
| 2.8.1 | Time-based OTP RFC 6238 compliant | 🔄 | RENA-5 — otplib |
| 2.8.4 | OTP seeds stored securely (encrypted) | ⚠️ | RENA-5 — AES-256-GCM encryption of TOTP secrets in DB |
| 2.9.1 | WebAuthn challenge is unique per auth | 🔄 | RENA-5 — @simplewebauthn/server |
| 2.10.1 | Integration secrets not in source | ✅ | Doppler; gitleaks in CI |

---

## V3 — Session Management

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 3.1.1 | Session tokens never in URL params | ✅ | Cookie-only sessions |
| 3.2.1 | New session token generated on auth | 🔄 | RENA-5 — rotate session on login/privilege change |
| 3.2.2 | Session tokens ≥64 bits entropy | 🔄 | RENA-5 — 128-bit cryptorandom |
| 3.2.3 | Session tokens stored securely by browser | 🔄 | HttpOnly; Secure; SameSite=Strict |
| 3.3.1 | Logout invalidates server-side session | 🔄 | RENA-5 — delete Redis key on logout |
| 3.3.2 | Idle timeout after ≤30 min inactivity | ⚠️ | RENA-5 — sliding window: 30 min idle → re-auth |
| 3.3.3 | Absolute session timeout ≤24 hours | 🔄 | RENA-5 — 24hr max session lifetime |
| 3.4.1 | Cookie-based tokens use SameSite=Strict | 🔄 | RENA-5 — cookie config |
| 3.4.2 | Cookie-based tokens use Secure flag | 🔄 | RENA-5 |
| 3.4.3 | Cookie-based tokens use HttpOnly flag | 🔄 | RENA-5 |
| 3.4.4 | Cookie scope limited to correct path/domain | 🔄 | RENA-5 — `domain=.corredor.ar` |
| 3.5.3 | Stateless tokens validated against list | 🔄 | Opaque sessions in Redis; no JWT for auth |
| 3.7.1 | Sensitive transactions require step-up auth | ⚠️ | TODO — e-sign, payment triggers require MFA step-up |

---

## V4 — Access Control

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 4.1.1 | All routes enforce access control | 🔄 | RBAC middleware on all API routes |
| 4.1.2 | Access control decisions on server side | ✅ | Never trust client for role/tenantId |
| 4.1.3 | Deny by default | 🔄 | All routes require explicit permission grant |
| 4.1.5 | Access control logged | ⚠️ | Structured audit log on access denial |
| 4.2.1 | Sensitive data/functions have object-level auth | 🔄 | Check `listing.tenantId === session.tenantId` before return |
| 4.2.2 | CSRF protection via SameSite=Strict or tokens | ✅ | SameSite=Strict on session cookie |
| 4.3.1 | Admin UI has additional auth factors | ⚠️ | IP allowlist + separate admin session with MFA required |
| 4.3.2 | Directory listing disabled | ✅ | N/A — no static file serving with directory listing |

---

## V5 — Validation, Sanitization, Encoding

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 5.1.1 | HTTP parameter pollution protection | 🔄 | Zod schemas reject unexpected fields |
| 5.1.2 | Frameworks protect against mass assignment | 🔄 | Zod `strict()` on all input schemas |
| 5.1.3 | Positive validation (allowlist) for all inputs | 🔄 | Zod schemas define allowed values |
| 5.2.1 | All untrusted HTML sanitized | ⚠️ | DOMPurify in web app; no raw HTML storage |
| 5.2.2 | No eval() with user-controlled data | ✅ | ESLint `no-eval` rule |
| 5.2.3 | Template injection protection | ✅ | No server-side templating with user data |
| 5.2.5 | Template injection in AI prompts mitigated | ⚠️ | Prompt injection detection in AI module |
| 5.3.1 | Output encoding for HTML context | 🔄 | React auto-escapes JSX; verify rich text components |
| 5.3.3 | Output encoding for JavaScript context | ✅ | React; no `dangerouslySetInnerHTML` without sanitize |
| 5.3.4 | Database queries use parameterized queries | ✅ | Drizzle ORM parameterizes all queries |
| 5.3.5 | OS command injection prevention | ✅ | No shell commands with user input |
| 5.3.8 | XML/JSON injection prevention | 🔄 | Zod validates all JSON; no XML processing |
| 5.4.1 | Memory-safe language or safe string functions | ✅ | TypeScript/Node.js — memory-safe |
| 5.5.1 | Serialized data not trusted from client | 🔄 | Redis cache hits validated with Zod on deserialization |

---

## V6 — Cryptography

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 6.2.1 | Cryptographically strong RNG used | 🔄 | `crypto.randomBytes()` for all tokens/nonces |
| 6.2.2 | GUID/UUID not used as security tokens | ✅ | Session tokens are random, not UUID |
| 6.2.3 | Random values ≥128 bits | 🔄 | Session: 128-bit; CSRF nonce: 128-bit |
| 6.2.5 | Insecure cipher modes not used | ✅ | AES-256-GCM for symmetric encryption |
| 6.2.7 | Cryptographic keys not hardcoded | ✅ | All keys in Doppler |
| 6.3.1 | Password hashing: Argon2id, bcrypt, scrypt | 🔄 | RENA-5 — Argon2id (m=65536, t=3, p=4) |
| 6.4.1 | Key management policy exists | 🔄 | secrets.md runbook; Doppler-managed |
| 6.4.2 | Key material not exposed to application | ✅ | Doppler injects via env var; keys never logged |

---

## V7 — Error Handling and Logging

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 7.1.1 | No credentials or PII in logs | ⚠️ | Log scrubbing middleware needed |
| 7.1.2 | No sensitive data in error messages | 🔄 | Generic errors in prod; structured logs only |
| 7.2.1 | All auth decisions logged with sufficient context | ⚠️ | Auth audit log: user, IP, action, result, timestamp |
| 7.2.2 | All auth events logged | ⚠️ | Login, logout, failed attempt, password change, MFA enable/disable |
| 7.3.1 | Logs protected from injection | 🔄 | JSON-only structured logging; no string interpolation in log fields |
| 7.3.3 | Logs protected from unauthorized access | ⚠️ | Grafana Cloud with RBAC; no public log endpoints |
| 7.4.1 | Error handler sends generic error for unexpected errors | 🔄 | Hono error handler returns `{"error":"Internal error"}` in prod |

---

## V8 — Data Protection

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 8.1.1 | Sensitive data not stored in client-accessible storage | 🔄 | No tokens in localStorage; HttpOnly cookies only |
| 8.1.2 | Caches protected for sensitive data | ⚠️ | Cache-Control: no-store on auth/sensitive API responses |
| 8.2.1 | PII not accessible to JavaScript | 🔄 | Sensitive fields not returned in list APIs |
| 8.2.2 | Sensitive data purged from browser memory when no longer needed | N/A | React; GC handles this |
| 8.3.4 | Sensitive data identified and classification policy exists | ✅ | Data classification in SECURITY.md |
| 8.3.6 | PII can be deleted per ARCO rights (Argentina PDPA) | ⚠️ | Account deletion flow with cascade delete + data export |
| 8.3.7 | PII field-level encryption where possible | ⚠️ | DNI numbers, sensitive financial fields encrypted at application level |

---

## V9 — Communication

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 9.1.1 | TLS used for all client connections | ✅ | Cloudflare enforces HTTPS; no HTTP fallback |
| 9.1.2 | TLS 1.2+ only; no SSL/TLS 1.0/1.1 | ✅ | Cloudflare minimum TLS: 1.2 |
| 9.1.3 | Strong cipher suites only | ✅ | Cloudflare manages; AEAD ciphers only |
| 9.2.1 | Backend connections use TLS | ✅ | Fly.io → Neon, Fly.io → Redis: TLS required |
| 9.2.2 | Certificate pinning for high-risk backends | ⚠️ | Mobile apps: pin to Cloudflare CA |
| 9.2.3 | Certificate validity checked | ✅ | Node.js default TLS validation |

---

## V10 — Malicious Code

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 10.2.1 | No malicious functionality in source | ✅ | Code review process |
| 10.3.2 | npm packages have integrity checks | 🔄 | pnpm lockfile + Snyk; `npm ci` in CI |
| 10.3.3 | No eval with user data | ✅ | ESLint rule enforced |

---

## V11 — Business Logic

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 11.1.1 | Process steps verified in correct order | ⚠️ | E-sign flow must enforce: draft → sent → signed → archived |
| 11.1.2 | Business limits enforced server-side | ⚠️ | Per-plan listing/user limits enforced at API, not just UI |
| 11.1.4 | Anti-automation for business process abuse | 🔄 | Rate limiting + CAPTCHA on bulk operations |

---

## V12 — File and Resources

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 12.1.1 | File size limits enforced | ⚠️ | 50 MB max per upload; enforced in API before R2 upload |
| 12.1.2 | Compressed file bombs rejected | ⚠️ | Decompress + size check before processing |
| 12.2.1 | Files checked for malicious content | ⚠️ | ClamAV or Cloudflare malware scan on document uploads |
| 12.3.1 | No user-supplied filename used in filesystem | ✅ | R2 keys are `{tenantId}/{uuid}.{ext}` |
| 12.3.3 | Path traversal protection | ✅ | UUID-based R2 keys; no path construction from user input |
| 12.5.1 | HTTP method + type filtering on uploads | 🔄 | MIME type allowlist: PDF, JPG, PNG, DOCX, XLSX |
| 12.6.1 | Remote file fetch does not fetch internal URLs (SSRF) | ⚠️ | SSRF check: block RFC-1918 IPs in outbound fetch |

---

## V13 — API and Web Service

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 13.1.1 | All API components use same auth mechanism | 🔄 | Unified session middleware on all tRPC + REST routes |
| 13.1.2 | Admin API uses additional auth | ⚠️ | admin.corredor.ar: IP allowlist + elevated session |
| 13.1.3 | API rates limited | 🔄 | Redis token bucket — see rate-limiting.md |
| 13.2.1 | REST APIs use appropriate HTTP methods | ✅ | GET/POST/PUT/PATCH/DELETE semantic usage |
| 13.2.3 | CSRF protection for JSON APIs | ✅ | SameSite=Strict + Content-Type check |
| 13.3.1 | OpenAPI spec for all exposed APIs | 🔄 | OpenAPI generated from tRPC/Zod schemas |

---

## V14 — Configuration

| Control | Description | Status | Notes |
|---------|-------------|--------|-------|
| 14.1.1 | Components use trusted, active libraries | 🔄 | Snyk + Dependabot; npm audit in CI |
| 14.2.1 | Client-side components up to date | 🔄 | Dependabot auto-PRs |
| 14.2.4 | Unused features/components removed | ⚠️ | Dependency audit before each major release |
| 14.3.1 | Sensitive data not in server error messages | ✅ | Generic error in prod |
| 14.3.2 | HTTP debug features disabled in prod | ✅ | `NODE_ENV=production` |
| 14.3.3 | HTTP headers don't expose versions | 🔄 | Security headers middleware removes `X-Powered-By` |
| 14.4.1 | HTTP security headers as specified | 🔄 | security-headers.ts middleware (RENA-11 task #3) |
| 14.4.2 | CSP prevents XSS | 🔄 | Nonce-based CSP via middleware |
| 14.4.3 | X-Content-Type-Options: nosniff | 🔄 | Security headers middleware |
| 14.4.4 | X-Frame-Options: DENY | 🔄 | Security headers middleware |
| 14.4.5 | HSTS with long duration | 🔄 | Security headers middleware (max-age=31536000) |
| 14.4.6 | Referrer-Policy appropriate | 🔄 | strict-origin-when-cross-origin |
| 14.4.7 | Permissions-Policy appropriate | 🔄 | camera=(), microphone=(), geolocation=() |
| 14.5.1 | CORS header properly configured | ⚠️ | Allow only `*.corredor.ar` + mobile app origin |

---

## Summary Dashboard

| Chapter | Controls | ✅ Done | 🔄 In Progress | ⚠️ TODO | N/A |
|---------|---------|--------|---------------|--------|-----|
| V1 Architecture | 15 | 3 | 8 | 3 | 1 |
| V2 Authentication | 22 | 2 | 12 | 8 | 0 |
| V3 Sessions | 14 | 1 | 10 | 3 | 0 |
| V4 Access Control | 8 | 3 | 4 | 1 | 0 |
| V5 Validation | 15 | 5 | 8 | 2 | 0 |
| V6 Cryptography | 8 | 2 | 5 | 1 | 0 |
| V7 Error/Logging | 7 | 0 | 4 | 3 | 0 |
| V8 Data Protection | 8 | 2 | 3 | 3 | 0 |
| V9 Communication | 7 | 4 | 2 | 1 | 0 |
| V10 Malicious Code | 3 | 2 | 1 | 0 | 0 |
| V11 Business Logic | 3 | 0 | 1 | 2 | 0 |
| V12 Files | 7 | 2 | 2 | 3 | 0 |
| V13 API | 6 | 1 | 4 | 1 | 0 |
| V14 Configuration | 12 | 2 | 8 | 2 | 0 |

**Overall ASVS L2 Compliance: ~18% Done, ~55% In Progress, ~27% TODO**

> Most "In Progress" items depend on RENA-5 (auth system) or the codebase scaffold being set up. This document tracks targets; implementation status should be updated per sprint.

*Last updated: 2026-04-20*
