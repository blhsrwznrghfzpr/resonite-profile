#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-docs/staging-smoke.env.example}"
MODE="${2:-normal}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ "$MODE" == "strict" ]]; then
  export STAGING_REQUIRE_USER_DETAIL=1
fi

bash scripts/staging-smoke-check.sh
