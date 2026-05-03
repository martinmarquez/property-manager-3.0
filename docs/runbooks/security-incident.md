# Security Incident Runbook

Covers: detection, containment, eradication, recovery, and post-mortem for security incidents.

**Regulatory context:** Corredor processes personal data of Argentine residents. Breaches must be reported to the **AAIP** (Agencia de Acceso a la Información Pública) under **Ley 25.326** (Protección de Datos Personales) within **72 hours** of discovery. See Section 7 for notification requirements.

---

## Severity Classification

| Level | Description | Examples | Response SLA |
|-------|-------------|---------|-------------|
| **P1 Critical** | Active breach, data exfiltration confirmed or suspected | Unauthorized DB access, leaked API keys in use, account takeover at scale | Immediate — 24/7 |
| **P2 High** | Vulnerability confirmed, no evidence of exploitation | Secret committed to git, SSRF discovered, auth bypass found | < 4 hours |
| **P3 Medium** | Potential vulnerability, requires investigation | Suspicious traffic pattern, unusual API usage, failed brute-force | < 24 hours |
| **P4 Low** | Informational / hardening | Dependency CVE (non-exploitable), misconfiguration with no exposure | Next sprint |

---

## Phase 1 — Detection

### Automated signals

| Signal | Source | Action |
|--------|--------|--------|
| `gitleaks` detected secret | GitHub Actions → `security.yml` | P2 immediately — rotate secret |
| Snyk / CodeQL critical CVE | GitHub Security tab | Triage exploitability → P2–P4 |
| Sentry: auth error spike | Sentry → corredor-api | Check for credential stuffing |
| Unusual `pnpm audit` output | CI run | Review advisory |
| Fly anomaly (new region, VPN exit) | Fly.io dashboard | Check for unauthorized machine |
| Unexpected DB query pattern | Neon query monitor | Check for SQL injection |

### Manual detection checklist

```bash
# 1. Check for secrets in git history
git log --all --oneline | head -20
# Run gitleaks locally:
gitleaks detect --source . --verbose

# 2. Check for unauthorized Fly apps or machines
flyctl apps list
flyctl machines list --app corredor-api-prod

# 3. Audit recent Fly deployments
flyctl releases --app corredor-api-prod | head -20

# 4. Check for unusual DB sessions
psql $DIRECT_DATABASE_URL -c "
  SELECT pid, usename, application_name, client_addr, state, query
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY query_start DESC;
"

# 5. Check Cloudflare R2 access logs for unauthorized reads
# → Cloudflare dashboard → R2 → corredor-documents-prod → Object logs
```

---

## Phase 2 — Containment

Act fast. Containment before eradication. Document every action with timestamp.

### 2a. Rotate compromised credentials immediately

```bash
# Rotate GitHub secrets (update in GitHub → Settings → Secrets)
# Then update in Fly.io:
flyctl secrets set MY_SECRET=new_value --app corredor-api-prod
flyctl secrets set MY_SECRET=new_value --app corredor-worker-prod

# Update in Doppler (source of truth):
doppler secrets set MY_SECRET=new_value --project corredor --config production

# Redeploy to pick up rotated secrets:
flyctl deploy --config infra/fly/api.fly.toml --remote-only
flyctl deploy --config infra/fly/worker.fly.toml --remote-only
```

### 2b. Revoke compromised tokens / sessions

```bash
# Invalidate all active sessions (forces all users to re-login)
psql $DIRECT_DATABASE_URL -c "
  UPDATE \"session\" SET \"expiresAt\" = NOW() WHERE \"expiresAt\" > NOW();
"

# Or delete all sessions entirely:
psql $DIRECT_DATABASE_URL -c "DELETE FROM \"session\";"

# Flush Redis session cache:
redis-cli -u $REDIS_URL FLUSHDB  # WARNING: flushes all queues too — use only in extremis
# Prefer targeted key deletion:
redis-cli -u $REDIS_URL --scan --pattern "sess:*" | xargs redis-cli -u $REDIS_URL DEL
```

### 2c. Block suspicious IP / isolate tenant

```bash
# Block IP via Cloudflare WAF (if behind Cloudflare):
# → Cloudflare dashboard → Security → WAF → Custom Rules → Block IP

# Suspend a compromised tenant account:
psql $DIRECT_DATABASE_URL -c "
  UPDATE \"tenant\"
  SET status = 'suspended', \"suspendedAt\" = NOW(), \"suspendedReason\" = 'security_incident'
  WHERE id = '<tenant-id>';
"
```

### 2d. Take app offline (P1 only — last resort)

```bash
# Scale to 0 machines (takes API offline immediately)
flyctl scale count 0 --app corredor-api-prod

# Restore when safe:
flyctl scale count 2 --app corredor-api-prod
```

---

## Phase 3 — Eradication

After containment, remove the root cause.

```
[ ] Identify the attack vector (git history, logs, Sentry traces)
[ ] Remove malicious code if any was injected
[ ] Rotate ALL secrets that were potentially exposed (not just confirmed ones)
[ ] Patch the vulnerability (deploy hotfix PR to main)
[ ] Verify patch is live: curl https://api.corredor.ar/health
[ ] Run security scan on the fixed codebase:
    - pnpm audit --audit-level=high
    - gitleaks detect --source . --verbose
[ ] Check for persistence mechanisms (unauthorized apps, DB users, API keys)
[ ] Revoke any OAuth tokens or third-party integrations that may have been used
```

---

## Phase 4 — Recovery

```
[ ] Restore services in order: DB → API → Worker → Frontends
[ ] Verify health at each step:
      curl https://api.corredor.ar/health
      flyctl status --app corredor-api-prod
[ ] Re-enable suspended tenants after confirming safety
[ ] Verify no data was altered: row counts, audit log review
[ ] Restore from Neon PITR if data was modified maliciously:
      → Neon dashboard → corredor-crm → Branches → main → Restore
[ ] Confirm email/SMS delivery is working (notifications to affected users)
[ ] Lift IP blocks once threat is neutralized
[ ] Run E2E smoke tests:
      pnpm --filter @corredor/e2e test:smoke
```

---

## Phase 5 — Post-Mortem

Required for all P1 and P2 incidents. Optional for P3.

Post-mortem document must include:

```markdown
## Security Incident Post-Mortem — [Date] [Short Description]

**Severity:** P[1-4]
**Duration:** [start] → [end] UTC
**Affected systems:** [list]
**Data affected:** [categories of personal data, tenant count]
**Root cause:** [technical explanation]

### Timeline (all times UTC)
- HH:MM — [event]
- HH:MM — [action taken]

### Impact
- Users affected: [N tenants / N users]
- Data exposed: [yes/no — describe categories if yes]
- Downtime: [duration]

### Root cause analysis
[5-whys or fishbone analysis]

### Remediation
- [Action taken during incident]
- [Follow-up: ticket reference]

### Prevention
- [System change or process change to prevent recurrence]
```

Post-mortem must be reviewed by CTO and Engineering Lead within 5 business days of incident closure.

---

## Phase 6 — Internal Communication

### Slack #incidents (during incident)

```
🔴 INCIDENTE DE SEGURIDAD — P[1-4]
Inicio: HH:MM UTC
Descripción: [breve]
Sistemas afectados: [lista]
Datos personales involucrados: SÍ / NO / EN INVESTIGACIÓN
Responsable: @nombre
Próxima actualización: HH:MM UTC
```

### Slack #incidents (resolution)

```
✅ INCIDENTE RESUELTO — P[1-4]
Duración: [tiempo total]
Causa raíz: [breve]
Datos afectados: SÍ / NO
Acción de notificación regulatoria: [requiere / no requiere / en evaluación]
Post-mortem: [link al documento]
```

---

## Phase 7 — Regulatory Notification (Ley 25.326)

### Obligation threshold

Notification to the **AAIP** is required when a breach involves personal data of Argentine residents **and** there is a real risk of harm to data subjects (identity theft, financial loss, discrimination, reputational damage, etc.).

**72-hour clock starts from the moment the breach is discovered** (or when it reasonably could have been discovered).

### AAIP Notification

**Contact:** Agencia de Acceso a la Información Pública
**Notification portal:** `https://www.argentina.gob.ar/aaip/datospersonales`
**Emergency line:** `0800-999-2247`

Required information:

```
- Nombre del responsable del tratamiento: Corredor (razón social completa)
- CUIT: [AFIP_CUIT]
- Descripción de la brecha: qué ocurrió, cómo, cuándo
- Categorías de datos involucrados: nombre, email, CUIT, datos de propiedad, etc.
- Número aproximado de titulares afectados
- Consecuencias probables de la brecha
- Medidas adoptadas para mitigar los efectos
- Punto de contacto: [DPO o responsable legal] — email y teléfono
```

### Notification template (AAIP)

```
Asunto: Notificación de Incidente de Seguridad — [Empresa] — [Fecha]

A la Agencia de Acceso a la Información Pública (AAIP):

En cumplimiento del artículo 9 de la Ley 25.326 y sus disposiciones
reglamentarias, notificamos la siguiente violación de datos personales:

1. DATOS DEL RESPONSABLE
   Nombre: Corredor CRM S.R.L. (o razón social)
   CUIT: [AFIP_CUIT]
   Domicilio: [domicilio legal]
   Contacto: [nombre, email, teléfono]

2. DESCRIPCIÓN DEL INCIDENTE
   Fecha y hora de detección: [DD/MM/YYYY HH:MM UTC-3]
   Naturaleza del incidente: [acceso no autorizado / pérdida de datos / etc.]
   
3. DATOS PERSONALES AFECTADOS
   Categorías: [nombre, email, CUIT, datos de inmuebles, etc.]
   Número estimado de titulares: [N]
   Países de residencia: Argentina

4. CONSECUENCIAS PROBABLES
   [Describe el riesgo para los titulares]

5. MEDIDAS ADOPTADAS
   Contención: [descripción]
   Eradicación: [descripción]
   Notificación a titulares: [sí/no/pendiente]

6. MEDIDAS PREVENTIVAS
   [Cambios implementados para evitar recurrencia]

Quedamos a disposición para cualquier información adicional.

[Nombre y firma del responsable legal]
[Fecha]
```

### Notification to affected users

Required if breach poses a high risk to individuals' rights and freedoms:

```
Subject: Aviso importante sobre la seguridad de su cuenta — Corredor

Estimado/a [Nombre]:

Le informamos que recientemente detectamos un incidente de seguridad
que pudo haber afectado su información personal almacenada en Corredor.

¿Qué ocurrió?
[Descripción clara y en lenguaje accesible]

¿Qué información pudo haberse visto afectada?
[Lista de categorías de datos]

¿Qué hicimos?
- [Medida 1]
- [Medida 2]

¿Qué puede hacer usted?
- Cambie su contraseña de inmediato: [link]
- Active la verificación en dos pasos si aún no lo hizo
- Esté atento/a a comunicaciones sospechosas

Si tiene preguntas, puede contactarnos en: privacidad@corredor.ar

Lamentamos sinceramente este inconveniente.

[Nombre del responsable legal]
Corredor CRM
```

---

## Emergency Contacts

| Role | Contact | When to call |
|------|---------|-------------|
| Engineering Lead | `<engineering-lead@corredor.ar>` | Any P1–P2 |
| CTO | `<cto@corredor.ar>` | P1 always; P2 if data breach |
| Legal counsel | `<legal@corredor.ar>` | Data breach confirmed |
| AAIP emergency | `0800-999-2247` | Within 72h of breach discovery |
| Fly.io security | `security@fly.io` | Infrastructure compromise |
| Neon security | `security@neon.tech` | Database compromise |
| Stripe security | Stripe dashboard → Support | Payment data exposure |
