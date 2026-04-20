# Corredor CRM — QA Strategy

> Version: 1.0 | Phase: A | Owner: QA Specialist

## 1. Testing Pyramid

```
          ┌──────────────────────┐
          │   AI Eval (golden    │
          │   set assertions)    │
          ├──────────────────────┤
          │   Load / Perf (k6)   │
          ├──────────────────────┤
          │   E2E (Playwright)   │
          ├──────────────────────┤
          │  Integration (Vitest │
          │  + Testcontainers /  │
          │  Neon branch)        │
          ├──────────────────────┤
          │   Unit (Vitest)      │
          └──────────────────────┘
```

### Layer definitions

| Layer | Tooling | Scope | Speed |
|-------|---------|-------|-------|
| **Unit** | Vitest | Pure functions, domain logic, validators | < 1 s total |
| **Integration** | Vitest + Neon branch or Testcontainers | tRPC routers, DB queries, service calls | < 2 min |
| **E2E** | Playwright | Full user flows in browser vs. preview env | < 5 min smoke, < 15 min full |
| **Load** | k6 | API endpoints under traffic, latency/error SLAs | On-demand before phase exit |
| **AI Eval** | tools/eval-runner | LLM-assisted features; correctness on golden set | On PR touching AI code |

---

## 2. Coverage Targets

### Unit + Integration (Vitest)

| Metric | Threshold |
|--------|-----------|
| Lines | 80 % |
| Functions | 80 % |
| Branches | 70 % |
| Statements | 80 % |

**Scope**: applies to `packages/*` and `apps/api/src`.

**Exceptions** (excluded from coverage):
- `src/index.ts` entry points (wiring only)
- Generated migration files
- `*.d.ts` type-only files

### tRPC Procedures

Every router must have at least:
- One **happy-path** integration test (valid inputs → expected response).
- One **unhappy-path** integration test (invalid/unauthorized input → expected error shape).

### E2E (Playwright)

- One smoke test per module per PR (register, login, dashboard for Phase A).
- Full regression on the `main` branch nightly against production.

---

## 3. Regression Rules

1. **No merge without green CI.**  The `ci.yml` workflow must pass: typecheck + lint + unit tests + integration tests + build.
2. **Coverage gates enforced in CI.**  If coverage drops below threshold, the `test:unit` step fails and the PR is blocked.
3. **E2E smoke on every PR.**  The `preview-deploy.yml` workflow deploys a Fly.io preview + Neon branch; the `e2e-smoke.yml` workflow runs Playwright against that preview URL.
4. **Nightly full regression.**  A scheduled workflow (`nightly-regression.yml`) runs the full Playwright suite against production.

---

## 4. AI Eval Gate

- Applies to any PR that touches files under `packages/ai/**`.
- Must run `tools/eval-runner` against the golden set stored in `packages/ai/eval/golden/`.
- The PR is blocked if any golden assertion regresses (accuracy metric must be ≥ main branch).
- New features may add new golden entries; they may not weaken existing ones.

---

## 5. Phase A Acceptance Criteria

These criteria are validated manually + via Playwright against the preview environment after RENA-5 (Auth) and RENA-6 (Web App) are complete:

| # | Criterion | Test file |
|---|-----------|-----------|
| 1 | Sign up as new agency owner | `register.spec.ts` |
| 2 | Create tenant with org details | `register.spec.ts` |
| 3 | Invite a second user by email | `register.spec.ts` |
| 4 | Second user accepts invite and signs in | `login.spec.ts` |
| 5 | Both users land on empty `/dashboard` | `dashboard.spec.ts` |
| 6 | Working telemetry (Sentry + OTel events visible) | Manual check |
| 7 | Validated in preview env (not just local) | CI E2E step |

---

## 6. Test File Conventions

### Unit / Integration (Vitest)
```
packages/<package>/src/<module>/__tests__/<module>.test.ts
apps/api/src/<router>/__tests__/<router>.test.ts
```

### E2E (Playwright)
```
apps/web/src/e2e/
├── fixtures/
│   ├── auth.ts          # createTenant(), loginAs(role)
│   └── index.ts
├── pages/
│   ├── RegisterPage.ts  # Page Object Model
│   ├── LoginPage.ts
│   └── DashboardPage.ts
└── tests/
    ├── register.spec.ts
    ├── login.spec.ts
    └── dashboard.spec.ts
```

### Load (k6)
```
tools/loadtest/
├── phase-a-baseline.js  # 50 VU, 5-min ramp, GET /health
└── ...                  # per-phase scripts
```

---

## 7. Environment Strategy

| Environment | Database | Used for |
|-------------|----------|----------|
| Local dev | Docker Postgres or Neon dev branch | Unit + integration |
| PR preview | Neon branch `pr-<N>` + Fly.io preview | E2E smoke |
| Staging / main | Neon main branch + Fly.io staging | Nightly full regression |
| Production | Neon production + Fly.io production | Load tests pre-phase-exit |

---

## 8. Sign-off Process

Before each phase exit, QA must:
1. Run the full Playwright suite against the preview env → all pass.
2. Run the k6 baseline against the API preview → p95 latency < 500 ms, error rate < 1 %.
3. Write a **test report comment** on the relevant QA issue with pass/fail per criterion.
4. QA Specialist marks the issue `done`.  No merge to main without this sign-off.
