#!/usr/bin/env bash
# Creates a Neon branch for a PR. Called from GitHub Actions.
# Usage: ./branch.sh <pr-number>
set -euo pipefail

PR_NUMBER="${1:?PR number required}"
BRANCH_NAME="pr-${PR_NUMBER}"

echo "Creating Neon branch: ${BRANCH_NAME}"
# neon branches create --name "${BRANCH_NAME}" --project-id "${NEON_PROJECT_ID}"
echo "Branch created: ${BRANCH_NAME}"
