#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.staging-smoke}"
MODE="${2:-normal}"

if [[ "$MODE" != "normal" && "$MODE" != "strict" ]]; then
  echo "Error: mode must be 'normal' or 'strict'" >&2
  exit 1
fi

bash scripts/validate-staging-smoke-env.sh "$ENV_FILE"
bash scripts/run-staging-smoke-from-env.sh "$ENV_FILE" "$MODE"
