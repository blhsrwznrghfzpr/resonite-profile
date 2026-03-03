#!/usr/bin/env bash
set -euo pipefail

TARGETS=(
  scripts/staging-smoke-check.sh
  scripts/run-staging-smoke-from-env.sh
  scripts/init-staging-smoke-env.sh
  scripts/validate-staging-smoke-env.sh
  scripts/run-staging-smoke-pipeline.sh
  scripts/doctor-staging-smoke.sh
  scripts/preflight-staging-smoke.sh
  scripts/validate-cloudflare-alert-thresholds.sh
  scripts/check-worker-rollout-readiness.sh
  scripts/show-worker-rollout-progress.sh
  scripts/verify-worker-rollout-docs.sh
  scripts/run-worker-rollout-ci-check.sh
  scripts/ensure-worker-rollout-deps.sh
  scripts/validate-worker-rollout-progress.sh
  scripts/report-worker-rollout-open-items.sh
)

for file in "${TARGETS[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "[scripts-lint] missing file: $file" >&2
    exit 1
  fi
  bash -n "$file"
  echo "[scripts-lint] bash -n OK: $file"
done

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck "${TARGETS[@]}"
  echo "[scripts-lint] shellcheck OK"
else
  echo "[scripts-lint] shellcheck not installed; skipped"
fi
