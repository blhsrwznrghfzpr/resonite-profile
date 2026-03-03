#!/usr/bin/env bash
set -euo pipefail

echo "[readiness] formatting"
npm run format:check

echo "[readiness] lint"
npm run lint

echo "[readiness] rollout scripts lint"
npm run lint:scripts:rollout

echo "[readiness] worker tests"
npm run test:worker

echo "[readiness] alert template validation"
npm run test:alerts:validate

echo "[readiness] smoke preflight"
npm run test:staging-smoke:preflight

echo "[readiness] rollout docs consistency"
npm run verify:worker-rollout:docs

echo "[readiness] rollout progress validation"
npm run verify:worker-rollout:progress

echo "[readiness] rollout progress snapshot"
npm run progress:worker-rollout

echo "[readiness] rollout evidence status"
REQUIRE_EVIDENCE_COMPLETE="${REQUIRE_EVIDENCE_COMPLETE:-0}" npm run verify:worker-rollout:evidence

echo "[readiness] rollout overview"
npm run report:worker-rollout:overview

echo "[readiness] rollout open items"
REQUIRE_NO_OPEN_ITEMS="${REQUIRE_NO_OPEN_ITEMS:-0}" npm run report:worker-rollout:open-items

echo "[readiness] passed"
