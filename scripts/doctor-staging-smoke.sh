#!/usr/bin/env bash
set -euo pipefail

echo "[doctor] validating example env"
bash scripts/validate-staging-smoke-env.sh docs/staging-smoke.env.example

echo "[doctor] running dry-run (normal)"
DRY_RUN=1 bash scripts/staging-smoke-check.sh

echo "[doctor] running dry-run (strict)"
STAGING_REQUIRE_USER_DETAIL=1 DRY_RUN=1 bash scripts/staging-smoke-check.sh

echo "[doctor] smoke tooling preflight passed"
