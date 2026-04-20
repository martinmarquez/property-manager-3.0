# Security Policy — Corredor CRM

## Overview

Corredor CRM handles sensitive financial and personal data for real estate professionals and their clients across Argentina and LATAM. Security is non-negotiable. We take all reports seriously and commit to rapid, transparent response.

---

## Responsible Disclosure Policy

### Scope

The following systems are in scope:

| Target | Scope |
|--------|-------|
| `api.corredor.ar` | **In scope** — REST/tRPC API, auth endpoints, webhooks |
| `app.corredor.ar` | **In scope** — Web application, PWA |
| `*.corredor.ar` subdomains | **In scope** — All production subdomains |
| Mobile apps (iOS/Android) | **In scope** — Capacitor-wrapped native shells |
| `admin.corredor.ar` | **In scope** — Admin panel |
| Third-party integrations | **Out of scope** — Tokko portals, Mercado Pago, AFIP |
| Physical infrastructure | **Out of scope** — Fly.io, Neon, Cloudflare infra |

### What We Want to Hear About

- Authentication/authorization bypasses
- Injection attacks (SQL, NoSQL, command, template)
- Cross-tenant data leakage (tenant isolation failures)
- Insecure direct object references (IDOR)
- Cross-site scripting (XSS) and CSRF
- Server-side request forgery (SSRF)
- Sensitive data exposure (PII, financial data, API keys)
- Business logic flaws with security impact
- Cryptographic weaknesses (weak password hashing, insecure token generation)
- Dependency vulnerabilities with proof-of-concept exploit

### Out of Scope

- Denial of service (DoS/DDoS)
- Social engineering attacks on staff
- Physical attacks
- Issues requiring unlikely user interaction
- Missing rate limiting on non-security-critical endpoints
- SSL/TLS certificate validity without exploitability
- Banner grabbing / fingerprinting without impact

---

## Reporting a Vulnerability

**Email:** security@corredor.ar  
**PGP Key:** Published at `https://corredor.ar/.well-known/security.txt`  
**Response SLA:**
- Acknowledgement: **48 hours**
- Triage and severity assessment: **5 business days**
- Patch timeline communicated: **10 business days**
- Critical vulnerabilities: **patched within 7 days**

### What to Include in Your Report

1. Vulnerability type (e.g., "SQL Injection in /api/listings")
2. Affected URL / endpoint / component
3. Step-by-step reproduction steps
4. Proof of concept (screenshots, curl commands, scripts)
5. Potential impact assessment
6. Your contact information (for coordinated disclosure)

### Our Commitments

- We will **not** take legal action against good-faith researchers
- We will **acknowledge** your contribution in our security hall of fame (with your consent)
- We will **coordinate disclosure** timing with you (standard: 90 days after patch)
- We **do not offer** a bug bounty program at this time (may change post-launch)

---

## Security Contacts

| Role | Contact |
|------|---------|
| Security Engineer | security@corredor.ar |
| CTO (escalations) | cto@corredor.ar |
| Data Protection Officer | dpo@corredor.ar |
| Emergency (critical breach) | +54 9 11 XXXX-XXXX |

---

## Data Classification

| Class | Examples | Handling |
|-------|---------|---------|
| **Critical** | Auth credentials, API keys, session tokens | Never log, encrypt at rest, rotate regularly |
| **Confidential** | Tenant financial data, PII, property valuations | Encrypted at rest + in transit, access-controlled |
| **Internal** | Analytics aggregates, system logs | Access-controlled, retained per policy |
| **Public** | Published listing data, public API responses | Standard integrity controls |

---

## Security Hall of Fame

*No reports yet. Be the first.*

---

## Legal

This policy is governed by Argentine law. Responsible disclosure in good faith, following the guidelines above, is protected conduct. We reserve the right to modify this policy at any time.

*Last updated: 2026-04-20*
