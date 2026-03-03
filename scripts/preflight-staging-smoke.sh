#!/usr/bin/env bash
set -euo pipefail

echo "[preflight] doctor"
npm run test:staging-smoke:doctor

echo "[preflight] env dry (normal)"
npm run test:staging-smoke:env:dry

echo "[preflight] env dry (strict)"
npm run test:staging-smoke:env:strict:dry

echo "[preflight] completed"
