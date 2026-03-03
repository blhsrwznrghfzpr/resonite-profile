#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.staging-smoke}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

fail() {
  echo "[env-invalid] $1" >&2
  exit 1
}

[[ -n "${STAGING_BASE_URL:-}" ]] || fail "STAGING_BASE_URL is required"
[[ "${STAGING_BASE_URL}" =~ ^https?:// ]] || fail "STAGING_BASE_URL must start with http:// or https://"

if [[ -n "${STAGING_ORIGIN:-}" && ! "${STAGING_ORIGIN}" =~ ^https?:// ]]; then
  fail "STAGING_ORIGIN must start with http:// or https:// when provided"
fi

for code in STAGING_EXPECT_HEALTH STAGING_EXPECT_USERS_SEARCH STAGING_EXPECT_USER_DETAIL STAGING_EXPECT_SESSIONS; do
  val="${!code:-}"
  [[ -n "$val" ]] || continue
  [[ "$val" =~ ^[0-9]{3}$ ]] || fail "$code must be a 3-digit HTTP status code"
done

if [[ -n "${STAGING_REQUIRE_USER_DETAIL:-}" && ! "${STAGING_REQUIRE_USER_DETAIL}" =~ ^[01]$ ]]; then
  fail "STAGING_REQUIRE_USER_DETAIL must be 0 or 1"
fi

echo "[env-valid] $ENV_FILE"
