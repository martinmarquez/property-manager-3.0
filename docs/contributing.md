# Contributing Guide

---

## Branch Naming

All branches must follow this pattern:

```
<type>/RENA-<number>-<short-description>
```

| Type | Use for |
|------|---------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Tooling, config, dependency updates |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `refactor/` | Refactoring without behavior change |

**Examples:**
```
feature/RENA-42-portal-sync-zonprop
fix/RENA-101-kanban-drag-state-reset
docs/RENA-16-architecture-overview
chore/RENA-88-upgrade-drizzle-0-38
```

Rules:
- Use the ticket identifier that this branch implements.
- Use kebab-case for the description.
- Keep the description under ~40 characters.
- Never push directly to `main`. All changes go through pull requests.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, config, build |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `refactor` | Code restructuring, no behavior change |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Scope (optional but recommended)

Use the package or app name: `api`, `web`, `worker`, `db`, `core`, `ui`, `portals`, `ai`.

### Examples

```
feat(core): add lead score recalculation on stage change

fix(api): correct RLS tenant context in batch mutation endpoint

chore(db): upgrade drizzle-orm to 0.38.2

docs: add architecture overview and ADR-002

test(core): add integration tests for portal sync retry logic

refactor(web): extract kanban card to isolated component
```

### Rules

- Subject line: present tense, no period, ≤ 72 characters.
- Body: explain *why*, not *what*. The diff shows what; the commit explains the reasoning.
- Breaking changes: add `BREAKING CHANGE:` in the footer with a description.
- Reference the Paperclip ticket in the footer when applicable: `Refs: RENA-42`.

---

## Pull Request Checklist

Before requesting review, verify every item below. CI will block merges if checks fail — this checklist is for your confidence before opening the PR.

### Required

- [ ] **Tests pass** — `pnpm test` exits 0 across all affected packages
- [ ] **Typecheck clean** — `pnpm typecheck` exits 0 with no errors
- [ ] **Lint clean** — `pnpm lint` exits 0
- [ ] **No hardcoded strings** — user-visible strings belong in i18n message keys; no raw Spanish/English text in TSX
- [ ] **No `.env` files committed** — check `git status` for `.env*` files; if present, remove and add to `.gitignore`
- [ ] **Audit log for mutations** — every `packages/core` mutation procedure has an audit log entry via the `auditLog` tRPC middleware
- [ ] **RLS not bypassed** — no direct `db.select()` or `db.insert()` in `apps/api` handlers; all DB access goes through `packages/core`
- [ ] **Migration included** — if the PR changes Drizzle schema in `packages/db/src`, a generated migration file in `packages/db/migrations/` is committed
- [ ] **PR Neon branch tested** — CI creates a `pr-{n}` Neon branch; verify migrations applied cleanly in the CI run

### Conditional

- [ ] **Portal adapter changes tested against sandbox** — if touching `packages/portals`, test the adapter against the portal's sandbox/staging environment and document the result in the PR
- [ ] **AI prompt changes include eval** — if modifying prompts in `packages/ai`, include before/after output samples in the PR description
- [ ] **Secrets updated in Doppler** — if the PR requires a new environment variable, add it to Doppler and document it in `docs/runbooks/secrets.md`

---

## Code Review Expectations

### For authors

- Keep PRs focused on one issue. Multiple independent changes belong in separate PRs.
- Write a clear PR description: **what** changed, **why**, and how to test it.
- Self-review the diff before requesting review — catch typos, debug logs, commented-out code.
- Respond to review comments within one business day.
- Do not merge without at least one approving review.

### For reviewers

- Review within one business day of request.
- Approve only when you are genuinely satisfied. "LGTM but haven't looked closely" is not a review.
- Ask for changes with specific, actionable feedback. Vague requests waste time.
- Distinguish between blocking issues (must fix) and suggestions (optional). Use GitHub's suggestion feature for small fixes so the author can apply them with one click.
- Focus on correctness, security (especially RLS, input validation, CSRF), and maintainability — not style. The linter handles style.

### What we look for

- **Correctness under RLS:** Does every new query respect tenant isolation? Is `tenant_id` always in the WHERE clause or covered by RLS policy?
- **Input validation:** Are all user inputs validated with Zod at the tRPC procedure boundary?
- **Idempotency:** Are mutations in `packages/core` idempotent? (Required for safe BullMQ retry.)
- **Error handling:** Are errors propagated as typed tRPC errors, not raw `Error` throws that leak stack traces to clients?
- **Test coverage:** Does new business logic in `packages/core` have unit + integration tests?

---

## Development Workflow

1. Pull latest `main`: `git pull origin main`
2. Create a branch: `git checkout -b feature/RENA-XX-your-description`
3. Make changes, run tests locally: `pnpm test && pnpm typecheck`
4. Commit with Conventional Commits format
5. Push and open a PR against `main`
6. CI runs: typecheck, lint, tests, build, Neon branch migration
7. Request review once CI is green
8. Address review feedback
9. Merge after approval + green CI

---

## Questions?

Ask in the engineering Slack channel or open a discussion in the relevant Paperclip task.
