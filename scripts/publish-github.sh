#!/usr/bin/env bash
set -euo pipefail

REPO="JaxenRoden27/threshold-manor"
BRANCH="main"
PAGES_URL="https://jaxenroden27.github.io/threshold-manor/"

if ! command -v gh >/dev/null; then
  echo "gh CLI is required"
  exit 1
fi

if [ -z "${GH_TOKEN:-}" ] && ! gh auth status >/dev/null 2>&1; then
  echo "Set GH_TOKEN or run: gh auth login"
  exit 1
fi

if [ -n "${GH_TOKEN:-}" ]; then
  echo "$GH_TOKEN" | gh auth login --with-token
fi

USER=$(gh api user --jq .login)
echo "Authenticated as: $USER"

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public --description "Cooperative tile-based survival puzzle game"
fi

git remote remove github 2>/dev/null || true
git remote add github "https://github.com/${REPO}.git"
git push github HEAD:"$BRANCH" --force

gh api "repos/${REPO}/pages" -X POST -f build_type=workflow 2>/dev/null || \
  gh api "repos/${REPO}/pages" -X PUT -f build_type=workflow 2>/dev/null || true

echo "Repo: https://github.com/${REPO}"
echo "Pages URL (after workflow): ${PAGES_URL}"
gh run list --repo "$REPO" --workflow deploy-pages.yml --limit 1
