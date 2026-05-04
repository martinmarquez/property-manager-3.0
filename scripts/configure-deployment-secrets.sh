#!/bin/bash

# Configure GitHub repository secrets for production deployment pipeline
# This script helps you add all required secrets in one go

set -e

echo "=========================================="
echo "Production Deployment Secrets Configuration"
echo "=========================================="
echo ""
echo "This script will help you configure GitHub repository secrets."
echo "You'll need to have the gh CLI installed and be authenticated."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: gh CLI is not installed"
    echo "Install it from: https://github.com/cli/cli#installation"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

echo "Checking repository..."
REPO=$(gh repo view --json nameWithOwner -q 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo "❌ Error: Could not determine repository. Make sure you're in the repo directory."
    exit 1
fi

echo "✓ Repository: $REPO"
echo ""

# Function to add a secret
add_secret() {
    local name=$1
    local description=$2
    local prompt=$3

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$description"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if secret already exists
    if gh secret list | grep -q "^$name"; then
        echo "⚠️  Secret '$name' already exists."
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "⏭️  Skipping $name"
            echo ""
            return
        fi
    fi

    read -p "$prompt: " -r value
    echo ""

    if [ -z "$value" ]; then
        echo "❌ Error: Value cannot be empty"
        echo ""
        return 1
    fi

    # Add the secret
    gh secret set "$name" --body "$value" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Secret '$name' configured successfully"
    else
        echo "❌ Error: Failed to configure secret '$name'"
        return 1
    fi
    echo ""
}

# Critical secrets section
echo "=========================================="
echo "CRITICAL SECRETS (blocks all deployments)"
echo "=========================================="
echo ""

add_secret \
    "DATABASE_URL" \
    "Production PostgreSQL Database URL (from Neon)" \
    "Enter your production database URL (postgresql://user:pass@host/db)" || true

add_secret \
    "CI_DATABASE_URL" \
    "CI/Test Database URL (separate from production)" \
    "Enter your test database URL for CI (postgresql://user:pass@host/db)" || true

echo ""
echo "=========================================="
echo "FLY.IO SECRETS (API & Worker deployments)"
echo "=========================================="
echo ""

add_secret \
    "FLY_API_TOKEN" \
    "Fly.io API Token" \
    "Enter your Fly.io API token (get from https://web.fly.io/user/personal_access_tokens)" || true

add_secret \
    "FLY_ORG" \
    "Fly.io Organization Name" \
    "Enter your Fly.io organization name" || true

echo ""
echo "=========================================="
echo "CLOUDFLARE SECRETS (Web & Admin deployments)"
echo "=========================================="
echo ""

add_secret \
    "CLOUDFLARE_API_TOKEN" \
    "Cloudflare API Token" \
    "Enter your Cloudflare API token with Pages permission" || true

add_secret \
    "CLOUDFLARE_ACCOUNT_ID" \
    "Cloudflare Account ID" \
    "Enter your Cloudflare account ID" || true

echo ""
echo "=========================================="
echo "SENTRY SECRETS (Error tracking - optional)"
echo "=========================================="
echo ""

add_secret \
    "SENTRY_AUTH_TOKEN" \
    "Sentry Authentication Token" \
    "Enter your Sentry auth token (leave empty to skip)" || true

add_secret \
    "SENTRY_ORG" \
    "Sentry Organization Slug" \
    "Enter your Sentry organization slug (leave empty to skip)" || true

add_secret \
    "SENTRY_PROJECT" \
    "Sentry Project Slug" \
    "Enter your Sentry project slug (leave empty to skip)" || true

echo ""
echo "=========================================="
echo "Configuration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify secrets were added: gh secret list"
echo "2. Push a test commit to main to trigger the CI/deployment pipeline"
echo "3. Monitor the workflow: gh run list --workflow=production-deploy.yml"
echo "4. View logs: gh run watch <run-id>"
echo ""
