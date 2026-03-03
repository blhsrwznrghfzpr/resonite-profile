#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="${ROLLOUT_CI_TMP_DIR:-/tmp/resonite-profile-rollout}"
DOCS_VERIFY_JSON_PATH="${DOCS_VERIFY_JSON_PATH:-${TMP_DIR}/worker-rollout-docs-verify.json}"
PROGRESS_JSON_PATH="${PROGRESS_JSON_PATH:-${TMP_DIR}/worker-rollout-progress.json}"
KEEP_ARTIFACTS="${KEEP_ARTIFACTS:-0}"

cleanup() {
  if [[ "$KEEP_ARTIFACTS" == "1" ]]; then
    echo "[ci-check] KEEP_ARTIFACTS=1; keeping artifacts in ${TMP_DIR}"
    return
  fi
  rm -f "$DOCS_VERIFY_JSON_PATH" "$PROGRESS_JSON_PATH"
}
trap cleanup EXIT

mkdir -p "$TMP_DIR"

echo "[ci-check] ensuring required dependencies"
CI="${CI:-1}" npm run deps:worker-rollout

echo "[ci-check] docs verification (with JSON artifact)"
DOCS_VERIFY_JSON="$DOCS_VERIFY_JSON_PATH" npm run verify:worker-rollout:docs

echo "[ci-check] readiness gate"
npm run test:worker:readiness

echo "[ci-check] progress snapshot (json artifact)"
PROGRESS_JSON=1 bash scripts/show-worker-rollout-progress.sh README.md >"$PROGRESS_JSON_PATH"

if [[ ! -s "$DOCS_VERIFY_JSON_PATH" || ! -s "$PROGRESS_JSON_PATH" ]]; then
  echo "[ci-check] expected artifacts are missing or empty" >&2
  exit 1
fi

echo "[ci-check] docs verify json: $DOCS_VERIFY_JSON_PATH"
echo "[ci-check] progress json: $PROGRESS_JSON_PATH"
echo "[ci-check] passed"
