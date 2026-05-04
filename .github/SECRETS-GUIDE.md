# Production Deployment Secrets Configuration Guide

This guide explains how to obtain each required GitHub secret for the production deployment pipeline.

## Quick Setup

Run the automated configuration script:

```bash
./scripts/configure-deployment-secrets.sh
```

This script will prompt you for each secret value and add them to your GitHub repository using the `gh` CLI.

## Prerequisites

Before running the script or manually adding secrets, ensure you have:

1. **GitHub CLI installed**: https://github.com/cli/cli#installation
2. **GitHub authentication**: Run `gh auth login`
3. **Repository access**: You must be an admin or have permission to manage secrets

## Required Secrets

### 🔴 CRITICAL — Must Configure Before Deployment

#### DATABASE_URL
**Purpose**: Production PostgreSQL database connection string  
**Provider**: Neon  
**How to get it**:
1. Log in to https://console.neon.tech
2. Go to your project → Branch (main) → Connection string
3. Copy the full connection string starting with `postgresql://`
4. Format: `postgresql://user:password@host/database`

**Note**: This is the most critical secret. Without it, database migrations will fail immediately.

---

#### CI_DATABASE_URL
**Purpose**: Separate test database for CI/test runs  
**Provider**: Neon  
**How to get it**:
1. Create a separate branch in Neon for CI testing (or reuse an existing test database)
2. Log in to https://console.neon.tech
3. Copy the connection string for your CI database
4. Format: `postgresql://user:password@host/database`

**Note**: Must be different from production DATABASE_URL to avoid interfering with production data during tests.

---

### 🟠 Fly.io Secrets — Required for API & Worker Deployments

#### FLY_API_TOKEN
**Purpose**: Authentication token for Fly.io API  
**Provider**: Fly.io  
**How to get it**:
1. Go to https://web.fly.io/user/personal_access_tokens
2. Click "Create Org Token" (or "Create Personal Token")
3. Give it a descriptive name (e.g., "GitHub CI/CD")
4. Copy the generated token

**Important**: Keep this token secret. Only paste it when prompted by the script.

---

#### FLY_ORG
**Purpose**: Your Fly.io organization name  
**How to get it**:
1. Go to https://web.fly.io
2. In the top left, you'll see your organization name
3. Or check the URL: `https://web.fly.io/organizations/{ORG_NAME}`
4. Enter just the organization name (e.g., "my-org")

---

### 🟠 Cloudflare Secrets — Required for Web & Admin Deployments

#### CLOUDFLARE_API_TOKEN
**Purpose**: API token for Cloudflare Pages deployment  
**Provider**: Cloudflare  
**How to get it**:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Select "Edit Cloudflare Workers" or create a custom token with:
   - **Permissions**: 
     - `Account.Cloudflare Pages`
     - `Zone.Workers Routes`
4. Under "Account Resources", select "All accounts" or your specific account
5. Copy the token

**Alternative**: Use a read/write token scoped to your account.

---

#### CLOUDFLARE_ACCOUNT_ID
**Purpose**: Your Cloudflare account ID  
**How to get it**:
1. Go to https://dash.cloudflare.com
2. Go to your account settings
3. Look for "Account ID" (usually visible in the right sidebar)
4. Or check any domain's Overview tab - Account ID is displayed there

---

### 🟡 Sentry Secrets — Optional (Error Tracking)

If you have a Sentry project for error tracking, configure these. If not, you can skip them (the workflow will still work, but error tracking won't be set up).

#### SENTRY_AUTH_TOKEN
**Purpose**: Authentication token for Sentry  
**Provider**: Sentry  
**How to get it**:
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. Give it a descriptive name
4. Select necessary scopes (recommend: `project:read`, `project:write`, `releases:read`, `releases:write`)
5. Copy the token

---

#### SENTRY_ORG
**Purpose**: Sentry organization slug  
**How to get it**:
1. Go to https://sentry.io/organizations/
2. Click on your organization
3. The slug is in the URL: `https://sentry.io/organizations/{SLUG}/`
4. Or in Settings → General → Slug

---

#### SENTRY_PROJECT
**Purpose**: Sentry project slug  
**How to get it**:
1. In Sentry, go to your project
2. The slug is in the URL: `https://sentry.io/organizations/.../ projects/{SLUG}/`
3. Or in Project Settings → General → Project Slug

---

## Adding Secrets Manually (if script doesn't work)

If you prefer to add secrets manually through the GitHub UI:

1. Go to: `https://github.com/{owner}/{repo}/settings/secrets/actions`
2. Click "New repository secret"
3. Enter the secret name (e.g., `DATABASE_URL`)
4. Paste the secret value
5. Click "Add secret"

Repeat for each secret listed above.

---

## Verifying Secrets are Configured

After adding secrets, verify they were added correctly:

```bash
gh secret list
```

This will show all configured secrets (values are masked for security).

---

## Next Steps

Once all critical secrets are configured:

1. **Test the deployment pipeline**:
   ```bash
   git commit --allow-empty -m "trigger: test deployment pipeline"
   git push origin main
   ```

2. **Monitor the workflow**:
   ```bash
   # Watch the CI workflow
   gh run watch $(gh run list --workflow=production-deploy.yml --limit 1 --json databaseId | jq -r '.[0].databaseId')
   ```

3. **Check logs** if any step fails:
   ```bash
   # List recent runs
   gh run list --workflow=production-deploy.yml --limit 5

   # View specific run
   gh run view <run-id> --log
   ```

---

## Troubleshooting

### Secret Configuration Fails

**Error**: "Could not determine repository"
- Make sure you're running the script from the repository root directory
- Ensure `gh` CLI is authenticated: `gh auth login`

**Error**: "You don't have permission to manage secrets"
- You must be a repository admin to add secrets
- Check your GitHub permissions on the repo

### Deployment Still Fails After Secrets are Added

**Check**:
1. Are all critical secrets configured? Run `gh secret list`
2. Are the values correct? (DATABASE_URL format, FLY_ORG matches, etc.)
3. Do the Fly.io and Cloudflare projects exist?
4. Check the workflow logs: `gh run view <id> --log`

**Common issues**:
- **Database connection fails**: Verify DATABASE_URL is correct and the database is accessible
- **Fly.io deployment fails**: Check that FLY_ORG matches your organization
- **Cloudflare Pages deployment fails**: Verify projects exist (corredor-web, corredor-admin)
- **Vercel deployment fails**: VERCEL_TOKEN may need regeneration

---

## Security Best Practices

1. **Never commit secrets** to version control (they're Git-ignored)
2. **Rotate tokens periodically** (especially API tokens)
3. **Use specific scopes** for API tokens (least privilege principle)
4. **Monitor usage** of tokens for suspicious activity
5. **Delete unused tokens** to reduce attack surface

---

## Support

For more information:
- **Neon docs**: https://neon.tech/docs
- **Fly.io docs**: https://fly.io/docs
- **Cloudflare Pages docs**: https://developers.cloudflare.com/pages
- **GitHub Secrets docs**: https://docs.github.com/actions/security-guides/encrypted-secrets
- **Sentry docs**: https://docs.sentry.io
