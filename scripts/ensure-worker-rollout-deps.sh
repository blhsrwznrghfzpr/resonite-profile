#!/usr/bin/env bash
set -euo pipefail

if [[ "${SKIP_DEP_INSTALL:-0}" == "1" ]]; then
  echo "[deps] SKIP_DEP_INSTALL=1; skipping dependency check"
  exit 0
fi

missing=0
for pkg in @eslint/js prettier eslint; do
  if ! node -e "require.resolve('${pkg}')" >/dev/null 2>&1; then
    echo "[deps] missing package: ${pkg}"
    missing=1
  fi
done

if [[ "$missing" -eq 0 ]]; then
  echo "[deps] required dev dependencies already available"
  exit 0
fi

if [[ -f package-lock.json && "${CI:-0}" == "1" ]]; then
  echo "[deps] CI=1 and lockfile found; running deterministic install (npm ci)"
  HUSKY=0 npm ci
else
  echo "[deps] running npm install"
  HUSKY=0 npm install
fi
