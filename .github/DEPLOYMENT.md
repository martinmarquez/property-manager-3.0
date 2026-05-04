# Production Deployment Guide

## Overview

The production deployment pipeline uses GitHub Actions with a two-stage workflow:

1. **production-deploy.yml** - CI Gate
   - Runs on push to main branch
   - Executes: typecheck, lint, test, build
   - Uploads source maps to Sentry
   - Triggers: production-deploy-follow-up.yml on success

2. **production-deploy-follow-up.yml** - Deployment Stage
   - Triggered by workflow_run event when CI completes
   - Only runs if CI is successful
   - Executes database migrations
   - Deploys to all platforms

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ production-deploy.yml (CI Gate)                             │
│ • Typecheck, Lint, Test, Build                             │
│ • Upload Sentry source maps                                │
│ Runs on: push to main                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─ Success ─┐
                   │           │
                   │      (Triggers)
                   │           │
                   ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│ production-deploy-follow-up.yml (Deployment)                │
│ • Run database migrations                                   │
│ • Deploy API to Fly.io (Docker)                            │
│ • Deploy Worker to Fly.io (Docker)                         │
│ • Deploy Web to Cloudflare Pages                           │
│ • Deploy Admin to Cloudflare Pages                         │
│ • Deploy Site to Vercel                                    │
└─────────────────────────────────────────────────────────────┘
```

## Required Secrets

Configure these secrets in GitHub repository settings:

### Database
- `DATABASE_URL` - Production PostgreSQL connection string (Neon)

### Fly.io (API & Worker)
- `FLY_API_TOKEN` - Fly.io API authentication token
- `FLY_ORG` - Fly.io organization name

### Cloudflare Pages (Web & Admin)
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token (with Pages permission)
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

### Vercel (Site)
- `VERCEL_TOKEN` - Vercel personal access token

### Sentry (Error Tracking)
- `SENTRY_AUTH_TOKEN` - Sentry authentication token
- `SENTRY_ORG` - Sentry organization slug
- `SENTRY_PROJECT` - Sentry project slug

### CI/Testing
- `CI_DATABASE_URL` - Separate database for CI test runs

## Configuring Secrets

```bash
# List all configured secrets
gh secret list

# Add a secret
gh secret set <SECRET_NAME> --body "<secret_value>"

# Delete a secret
gh secret delete <SECRET_NAME>
```

## Deployment Steps

### 1. Database Migrations
```bash
pnpm --filter @corredor/db migrate
```

### 2. API & Worker (Fly.io)
Uses Docker images built from apps/api and apps/worker Dockerfiles.
Deployed via `flyctl deploy --remote-only`.

### 3. Web & Admin (Cloudflare Pages)
- Builds Vite apps: `pnpm --filter @corredor/web build`
- Deploys dist folder: `wrangler pages deploy apps/web/dist`

### 4. Site (Vercel)
- Builds Vite app: `pnpm --filter @corredor/site build`
- Deploys via: `vercel deploy --prod`

## Monitoring Deployments

View workflow runs:
```bash
# List all production-deploy runs
gh run list --workflow=production-deploy.yml

# View latest run details
gh run view <run-id>

# View latest deployment run
gh run list --workflow=production-deploy-follow-up.yml
```

View logs:
```bash
# Show workflow run logs
gh run view <run-id> --log

# Stream logs as they happen
gh run watch <run-id>
```

## Troubleshooting

### Workflow doesn't trigger
- Check that changes are pushed to `main` branch
- Verify workflow file YAML syntax: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/production-deploy.yml'))"`

### CI fails
- Check test output: `gh run view <run-id> --log`
- Common issues:
  - Linting errors: run `pnpm lint` locally
  - Type errors: run `pnpm typecheck` locally
  - Test failures: run `pnpm test` locally

### Deployment fails
- Check if CI completed successfully
- Verify all required secrets are configured: `gh secret list`
- Check deployment logs: `gh run view <deployment-run-id> --log`

### Specific deployment failures
- **Fly.io**: Check `flyctl logs` for the app
- **Cloudflare Pages**: Check Pages dashboard for deployment logs
- **Vercel**: Check Vercel dashboard for build and deployment logs
- **Database migrations**: Check logs for SQL errors

## Rollback Procedure

If a deployment causes issues:

### Revert commit
```bash
git revert <commit-sha>
git push origin main
```

### Rollback to previous version on each platform
- **Fly.io**: `flyctl releases --app <app-name>` then rollback
- **Cloudflare Pages**: Select previous deployment in Pages dashboard
- **Vercel**: Select previous deployment in Vercel dashboard

## Manual Deployment (if needed)

### Deploy locally (not recommended for production)
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login

# Deploy API
cd apps/api
flyctl deploy

# Deploy Worker
cd ../worker
flyctl deploy
```

## CI/CD Status Checks

These checks must pass before deployment is allowed:
- Typecheck (TypeScript compilation)
- Lint (ESLint)
- Test (Vitest)
- Build (Turbo build)
