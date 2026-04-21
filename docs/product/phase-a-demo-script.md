# Phase A Exit Demo Script

**Purpose:** Step-by-step walkthrough the QA team uses to validate all Phase A acceptance criteria before advancing to Phase B.  
**Audience:** QA engineer, product manager (observing), CEO (final sign-off)  
**Estimated time:** 45–60 minutes  
**Environment:** Preview (per-PR) or Staging  
**Prerequisites:** Fresh tenant (no seed data), blank DB except for plan definitions

---

## Pre-Demo Checklist

Before starting the demo session, verify:

- [ ] Preview environment URL is up and responding (< 200ms on `GET /api/health`)
- [ ] Sentry project is configured and receiving events from this env
- [ ] PostHog is capturing events (check PostHog dashboard for env events)
- [ ] OpenTelemetry traces are flowing to Grafana Cloud
- [ ] GitHub Actions CI passed on the branch being demoed (green checkmark)
- [ ] Playwright smoke tests passed on this environment
- [ ] No critical Sentry errors from the last 24h in this env

---

## Step 1: Landing & Sign-Up (5 min)

### 1.1 — Navigate to the app
1. Open the preview URL in an incognito browser window.
2. **Expected:** Landing / login page loads in < 2s. No JS console errors. Correct Spanish UI. Corredor logo and branding visible.

### 1.2 — Sign up (new tenant)
1. Click "Crear cuenta" (or equivalent CTA).
2. Fill in:
   - Agency name: "Inmobiliaria Demo QA"
   - Email: `qa-demo@corredor.test`
   - Password: a strong password (note it for later)
3. Click "Crear cuenta".
4. **Expected:**
   - Tenant is created.
   - User is created with role `owner`.
   - You are redirected to `/dashboard` (empty state).
   - No server errors in logs.
   - `audit_log` has `action=create, entity_type=tenant` and `action=create, entity_type=user` rows.
   - PostHog records `tenant_created` and `user_signed_up` events.

### 1.3 — Email verification (if applicable)
1. Check Mailhog (local) or SES sandbox for the verification email.
2. Click the verification link.
3. **Expected:** Email marked verified in DB; user remains logged in.

---

## Step 2: Tenant Creation & User Invite (10 min)

### 2.1 — Navigate to Settings
1. Go to `/settings/organization`.
2. **Expected:** Org settings page shows tenant name "Inmobiliaria Demo QA", country AR, timezone America/Argentina/Buenos_Aires, locale es-AR.

### 2.2 — Create a branch
1. Go to `/settings/branches`.
2. Click "+ Nueva sucursal".
3. Fill: Name = "Zona Norte", city = "Pilar".
4. Save.
5. **Expected:** Branch appears in the list. `branch.created` event in audit_log.

### 2.3 — Invite a second user
1. Go to `/settings/users`.
2. Click "+ Invitar usuario".
3. Fill: Email = `agent@corredor.test`, Role = `agent`, Branch = "Zona Norte".
4. Click "Enviar invitación".
5. **Expected:** Invitation email appears in Mailhog. User is in `status=invited` in the user list.

### 2.4 — Accept invitation in a second incognito window
1. Open Mailhog, copy the invite link.
2. Open a new incognito window, navigate to the invite link.
3. Set password for the agent user.
4. **Expected:** Agent lands on `/dashboard` as agent role, cannot access `/settings/organization` (permission blocked — redirect or 403 page).

---

## Step 3: Authentication — All Auth Methods (10 min)

### 3.1 — Password login
1. Log out from the owner user.
2. Log in with email + password.
3. **Expected:** Login in < 1s. Session cookie is HttpOnly (verify in DevTools: `document.cookie` returns empty). No JWT in URL.

### 3.2 — Wrong password lockout
1. Log out.
2. Enter correct email, wrong password 5 times.
3. **Expected:** After 5 attempts, account is temporarily locked. Error message: "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos."

### 3.3 — Password reset
1. Click "Olvidé mi contraseña".
2. Enter owner email.
3. **Expected:** Reset email in Mailhog. Click link → set new password → can log in with new password. Old password no longer works.

### 3.4 — 2FA setup (TOTP)
1. Log in as owner.
2. Go to `/settings/organization` → Security → Enable 2FA.
3. Scan QR with an authenticator app (Google Authenticator / Aegis).
4. Enter the 6-digit code to confirm.
5. **Expected:** 2FA enabled. On next login, after password, a TOTP prompt appears. Entering correct code → logged in. Entering wrong code → error.

### 3.5 — Passkeys (WebAuthn)
1. In browser that supports WebAuthn (Chrome/Safari/Firefox with TouchID or security key).
2. Go to Security → Add passkey.
3. Register a passkey.
4. Log out.
5. Click "Iniciar sesión con passkey".
6. **Expected:** Authenticator prompt appears; successful authentication lands on dashboard.

*Note: WebAuthn requires HTTPS. Ensure the preview env uses HTTPS (Fly.io provides it). Skip passkey test if only HTTP is available for this preview.*

---

## Step 4: Empty App Shell (5 min)

### 4.1 — Dashboard empty state
1. Navigate to `/dashboard` as owner.
2. **Expected:** Empty state illustration with "Bienvenido a Corredor. Empieza importando tus propiedades o invitando tu equipo." (or similar). No broken components, no 500 errors.

### 4.2 — Navigation
1. Click each top-level nav item: Propiedades, Contactos, Oportunidades, Consultas, Calendario, Configuración.
2. **Expected:** Each route renders without error. URL changes correctly. No blank screens.

### 4.3 — Mobile responsiveness
1. Open DevTools → toggle device emulation (iPhone 12 or Galaxy S21).
2. Navigate through the main routes.
3. **Expected:** Navigation collapses to hamburger menu. Content reflows without horizontal scroll. Touch targets ≥ 44×44px.

### 4.4 — PWA installability
1. In Chrome, open the preview URL.
2. Look for the install prompt in the address bar (or check DevTools → Application → Manifest).
3. **Expected:** Web app manifest is valid (name, icons, start_url, display=standalone). Service worker registered. Lighthouse PWA score ≥ 80.

---

## Step 5: i18n & Locale (5 min)

### 5.1 — Spanish labels
1. Inspect any page. Verify all visible UI text is in Spanish (ES-AR).
2. **Expected:** No English strings visible in production UI (exception: technical field names in Settings if acceptable per spec).

### 5.2 — Date/number formats
1. If the app shows any date or number (e.g. in user profile or placeholder), verify:
   - Dates: DD/MM/YYYY format (es-AR standard)
   - Currency: If ARS, format as `$ 1.234.567,89`; if USD, `USD 1,234.56`.

### 5.3 — i18n completeness
1. Check DevTools console for any `[intl] Missing message:` warnings.
2. **Expected:** Zero missing message warnings in the ES-AR locale.

---

## Step 6: Observability Validation (5 min)

### 6.1 — Sentry
1. Trigger a known test error (e.g., navigate to `/properties/nonexistent-id`).
2. **Expected:** The error page renders gracefully (no blank screen). Within 30s, a Sentry event appears in the Sentry dashboard with: environment=preview, user context (tenant_id, user_id), stack trace.

### 6.2 — OpenTelemetry traces
1. Perform a login (Step 3.1).
2. Navigate to Grafana Cloud → Tempo.
3. Search for traces in the last 5 minutes with service=`api`.
4. **Expected:** Login traces visible with spans for: auth middleware, DB query (argon2 verify), session creation. p95 < 200ms.

### 6.3 — PostHog product analytics
1. Log into PostHog for the preview env.
2. Look for events from the last hour.
3. **Expected:** Events visible: `page_viewed`, `user_signed_up`, `tenant_created`, `user_logged_in`. Each event has `tenant_id`, `user_id`, `$session_id`.

### 6.4 — Structured logs
1. Open the Fly.io log stream (or equivalent for the preview env).
2. **Expected:** Logs are JSON-formatted. Each line has: `timestamp`, `level`, `message`, `tenantId`, `userId`, `requestId`, `traceId`. No plain-text log lines.

---

## Step 7: Security Spot Check (5 min)

### 7.1 — No JWT in URL
1. Log in and inspect the browser URL bar and history.
2. Inspect all network requests in DevTools Network tab.
3. **Expected:** Zero occurrences of JWT tokens in any URL. Auth is session-cookie-based only.

### 7.2 — HttpOnly session cookie
1. In DevTools Console, type `document.cookie`.
2. **Expected:** The session cookie does NOT appear (HttpOnly flag prevents JS access). The console returns an empty string or only non-auth cookies.

### 7.3 — RLS tenant isolation
1. In a DB console (or via admin panel), verify:
   ```sql
   -- Connect as the API DB role (not superuser)
   -- Expect: error or empty result without setting app.tenant_id
   SELECT * FROM "user" LIMIT 1;
   ```
2. **Expected:** Query returns error (RLS blocks without `app.tenant_id` set) or returns zero rows.

### 7.4 — No eval() in JS bundles
1. In DevTools → Sources, search for `eval(` in the bundle files.
2. **Expected:** Zero occurrences of `eval(` in application code (build minification may produce `eval` in some cases — check that it's from a third-party dependency, not application code).

### 7.5 — Password hashing
1. In a DB console, inspect the `user` table's `password_hash` column for the created user.
2. **Expected:** Hash starts with `$argon2id$` (Argon2id format). The raw password is not stored anywhere.

---

## Step 8: CI/CD & Developer Experience (5 min)

### 8.1 — Preview env per PR
1. Open a recent PR on GitHub.
2. **Expected:** PR has a comment or check from the deploy action with a preview URL. The URL is unique per PR.

### 8.2 — Neon DB branching
1. Verify that the preview env connects to a Neon branch (not main/production DB).
2. **Expected:** Environment variable `DATABASE_URL` in the preview env's Fly config points to a `neon.tech` branch, not the main database.

### 8.3 — Dev setup time (for reference, not blocking)
1. On a clean machine, run `pnpm install && pnpm dev`.
2. **Expected:** App starts in < 60s. No manual configuration steps beyond copying `.env.example`.

---

## Pass / Fail Criteria

**Phase A passes if ALL of the following are true:**

| # | Criterion | Result |
|---|---|---|
| A1 | Sign up creates tenant + owner user in < 3s | ✅/❌ |
| A2 | User invite flow works end-to-end | ✅/❌ |
| A3 | Password login works; session cookie is HttpOnly | ✅/❌ |
| A4 | TOTP 2FA enabled and enforced on next login | ✅/❌ |
| A5 | Password reset flow works | ✅/❌ |
| A6 | WebAuthn passkey registration + login works (on HTTPS env) | ✅/❌ |
| A7 | All top-level routes render without errors | ✅/❌ |
| A8 | Mobile responsive (no horizontal scroll at 390px width) | ✅/❌ |
| A9 | PWA installable (valid manifest + service worker) | ✅/❌ |
| A10 | All UI text is in Spanish (ES-AR); zero missing i18n messages | ✅/❌ |
| A11 | Sentry captures test error with correct context | ✅/❌ |
| A12 | OTel traces visible in Grafana Cloud | ✅/❌ |
| A13 | PostHog captures key events with tenant/user context | ✅/❌ |
| A14 | Logs are structured JSON with required fields | ✅/❌ |
| A15 | No JWT in URLs anywhere | ✅/❌ |
| A16 | HttpOnly session cookie (not accessible via `document.cookie`) | ✅/❌ |
| A17 | RLS blocks cross-tenant queries | ✅/❌ |
| A18 | Password is Argon2id-hashed in DB | ✅/❌ |
| A19 | `audit_log` has entries for tenant create + user create | ✅/❌ |
| A20 | RBAC enforced: agent cannot access owner-only settings | ✅/❌ |

**Blocking failures:** Any ❌ in security items A15–A19 is an automatic Phase A failure requiring a fix + re-demo.  
**Non-blocking items:** A6 (passkeys) is best-effort if HTTPS is unavailable in the preview env — document as known limitation for Phase A, must pass in Staging.

---

## Notes Section

QA engineer fills during demo:

| Item | Observations |
|---|---|
| Environment URL | |
| Build / commit SHA | |
| Tester name | |
| Demo date | |
| Blocking issues found | |
| Non-blocking issues found | |
| Phase A decision (Pass / Conditional Pass / Fail) | |
| Sign-off (PM) | |
| Sign-off (CEO) | |

---

*End of Phase A exit demo script.*
