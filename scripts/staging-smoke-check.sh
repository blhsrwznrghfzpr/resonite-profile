#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  cat <<'USAGE'
Usage:
  STAGING_BASE_URL="https://<worker-url>" [STAGING_ORIGIN="https://<origin>"] [STAGING_TEST_NAME="cloud"] [STAGING_TEST_USER_ID="<id>"] [STAGING_SMOKE_REPORT="docs/staging-smoke-report.md"] [STAGING_SMOKE_JSON="docs/staging-smoke-report.json"] [STAGING_REQUIRED_HEADERS="x-request-id"] [DRY_RUN=1] bash scripts/staging-smoke-check.sh

Environment variables:
  STAGING_BASE_URL        required unless DRY_RUN=1
  STAGING_ORIGIN          optional Origin header value (default: https://example.com)
  STAGING_TEST_NAME       optional search name for /api/users (default: cloud)
  STAGING_TEST_USER_ID    optional user id for /api/users/{id}
  STAGING_SMOKE_REPORT    optional markdown report output path
  STAGING_SMOKE_JSON      optional JSON report output path
  STAGING_REQUIRED_HEADERS comma-separated required response headers (default: x-request-id)
  STAGING_EXPECT_*        optional expected status override per endpoint:
                          STAGING_EXPECT_HEALTH (default: 200)
                          STAGING_EXPECT_USERS_SEARCH (default: 200)
                          STAGING_EXPECT_USER_DETAIL (default: 200)
                          STAGING_EXPECT_SESSIONS (default: 200)
  STAGING_REQUIRE_USER_DETAIL if set to 1, fail when STAGING_TEST_USER_ID is missing
  DRY_RUN                 if set to 1, print planned checks without calling network
USAGE
  exit 0
fi

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[dry-run] staging smoke checks would run with:"
  echo "  STAGING_BASE_URL=${STAGING_BASE_URL:-<required>}"
  echo "  STAGING_ORIGIN=${STAGING_ORIGIN:-https://example.com}"
  echo "  STAGING_TEST_NAME=${STAGING_TEST_NAME:-cloud}"
  echo "  STAGING_TEST_USER_ID=${STAGING_TEST_USER_ID:-<not-set>}"
  echo "  STAGING_SMOKE_REPORT=${STAGING_SMOKE_REPORT:-<not-set>}"
  echo "  STAGING_SMOKE_JSON=${STAGING_SMOKE_JSON:-<not-set>}"
  echo "  STAGING_REQUIRED_HEADERS=${STAGING_REQUIRED_HEADERS:-x-request-id}"
  echo "  STAGING_REQUIRE_USER_DETAIL=${STAGING_REQUIRE_USER_DETAIL:-0}"
  echo "[dry-run] endpoints: /api/health, /api/users?name=..., /api/users/{id}(optional), /api/sessions"
  exit 0
fi

if [[ -z "${STAGING_BASE_URL:-}" ]]; then
  echo "Error: STAGING_BASE_URL is required (e.g. https://staging.example.workers.dev)" >&2
  exit 1
fi

BASE="${STAGING_BASE_URL%/}"
ORIGIN_VALUE="${STAGING_ORIGIN:-https://example.com}"
NAME_QUERY="${STAGING_TEST_NAME:-cloud}"
USER_ID="${STAGING_TEST_USER_ID:-}"
REPORT_PATH="${STAGING_SMOKE_REPORT:-}"
JSON_REPORT_PATH="${STAGING_SMOKE_JSON:-}"
REQUIRED_HEADERS_CSV="${STAGING_REQUIRED_HEADERS:-x-request-id}"
EXPECT_HEALTH="${STAGING_EXPECT_HEALTH:-200}"
EXPECT_USERS_SEARCH="${STAGING_EXPECT_USERS_SEARCH:-200}"
EXPECT_USER_DETAIL="${STAGING_EXPECT_USER_DETAIL:-200}"
EXPECT_SESSIONS="${STAGING_EXPECT_SESSIONS:-200}"
REQUIRE_USER_DETAIL="${STAGING_REQUIRE_USER_DETAIL:-0}"
GENERATED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

RESULTS=()
FAILURES=0

required_headers_display() {
  echo "${REQUIRED_HEADERS_CSV}" | sed 's/,/, /g'
}

json_escape() {
  local value="$1"
  value=${value//\\/\\\\}
  value=${value//"/\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

headers_check() {
  local header_file="$1"
  local missing=""
  IFS=',' read -r -a headers <<<"${REQUIRED_HEADERS_CSV}"
  for h in "${headers[@]}"; do
    local key
    key="$(echo "$h" | xargs | tr '[:upper:]' '[:lower:]')"
    [[ -z "$key" ]] && continue
    if ! grep -iq "^${key}:" "$header_file"; then
      [[ -n "$missing" ]] && missing+=";"
      missing+="$key"
    fi
  done
  echo "$missing"
}

record_result() {
  local path="$1"
  local status="$2"
  local expected_status="$3"
  local missing_headers="$4"
  local note="$5"
  local verdict="PASS"

  if [[ "$status" != "$expected_status" || -n "$missing_headers" ]]; then
    verdict="FAIL"
    FAILURES=$((FAILURES + 1))
  fi

  RESULTS+=("${path}|${status}|${expected_status}|${missing_headers:-none}|${verdict}|${note}")
}

record_skip() {
  local path="$1"
  local expected_status="$2"
  local note="$3"
  RESULTS+=("${path}|-|-|none|SKIP|${note};expected=${expected_status}")
}


request() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local url="${BASE}${path}"
  local tmp_body tmp_headers
  tmp_body="$(mktemp)"
  tmp_headers="$(mktemp)"

  echo ""
  echo "==> ${method} ${url}"

  local http_code
  http_code=$(curl -sS -X "$method" "$url" \
    -H "Origin: ${ORIGIN_VALUE}" \
    -D "$tmp_headers" \
    -o "$tmp_body" \
    -w "%{http_code}")

  cat "$tmp_headers"
  echo "HTTP_STATUS:${http_code} (expected:${expected_status})"

  if [[ "$method" != "HEAD" ]]; then
    echo "-- body (first 400 chars) --"
    head -c 400 "$tmp_body" || true
    echo ""
  fi

  local missing_headers
  missing_headers="$(headers_check "$tmp_headers")"
  record_result "$path" "$http_code" "$expected_status" "$missing_headers" "origin=${ORIGIN_VALUE}"

  rm -f "$tmp_body" "$tmp_headers"
}

request GET "/api/health" "$EXPECT_HEALTH"
request GET "/api/users?name=${NAME_QUERY}" "$EXPECT_USERS_SEARCH"

if [[ -n "$USER_ID" ]]; then
  request GET "/api/users/${USER_ID}" "$EXPECT_USER_DETAIL"
else
  echo ""
  echo "[skip] STAGING_TEST_USER_ID is not set; skipping /api/users/{id} check"
  record_skip "/api/users/{id}" "$EXPECT_USER_DETAIL" "missing STAGING_TEST_USER_ID"
  if [[ "$REQUIRE_USER_DETAIL" == "1" ]]; then
    echo "[error] STAGING_REQUIRE_USER_DETAIL=1 but STAGING_TEST_USER_ID is missing" >&2
    FAILURES=$((FAILURES + 1))
  fi
fi

request GET "/api/sessions" "$EXPECT_SESSIONS"

echo ""
echo "Smoke check summary"
echo "path | status | expected | missing-headers | verdict | note"
for row in "${RESULTS[@]}"; do
  echo "$row"
done

if [[ -n "$REPORT_PATH" ]]; then
  mkdir -p "$(dirname "$REPORT_PATH")"
  {
    echo "# Staging smoke report"
    echo ""
    echo "- base: \`${BASE}\`"
    echo "- origin: \`${ORIGIN_VALUE}\`"
    echo "- required_headers: \`$(required_headers_display)\`"
    echo "- require_user_detail: \`${REQUIRE_USER_DETAIL}\`"
    echo "- generated_at_utc: \`${GENERATED_AT_UTC}\`"
    echo ""
    echo "| path | status | expected | missing-headers | verdict | note |"
    echo "| ---- | ------ | -------- | --------------- | ------- | ---- |"
    for row in "${RESULTS[@]}"; do
      IFS='|' read -r p s e mh v n <<<"$row"
      echo "| \`${p}\` | ${s} | ${e} | ${mh} | ${v} | ${n} |"
    done
  } > "$REPORT_PATH"
  echo ""
  echo "Saved markdown report to: $REPORT_PATH"
fi

if [[ -n "$JSON_REPORT_PATH" ]]; then
  mkdir -p "$(dirname "$JSON_REPORT_PATH")"
  {
    echo "{"
    echo "  \"base\": \"$(json_escape "$BASE")\","
    echo "  \"origin\": \"$(json_escape "$ORIGIN_VALUE")\","
    echo "  \"requiredHeaders\": \"$(json_escape "$(required_headers_display)")\","
    echo "  \"generatedAtUtc\": \"${GENERATED_AT_UTC}\"," 
    echo "  \"failures\": ${FAILURES},"
    echo "  \"results\": ["
    for i in "${!RESULTS[@]}"; do
      IFS='|' read -r p s e mh v n <<<"${RESULTS[$i]}"
      comma=","
      if [[ "$i" -eq $((${#RESULTS[@]} - 1)) ]]; then
        comma=""
      fi
      echo "    {\"path\":\"$(json_escape "$p")\",\"status\":\"$(json_escape "$s")\",\"expected\":\"$(json_escape "$e")\",\"missingHeaders\":\"$(json_escape "$mh")\",\"verdict\":\"$(json_escape "$v")\",\"note\":\"$(json_escape "$n")\"}${comma}"
    done
    echo "  ]"
    echo "}"
  } > "$JSON_REPORT_PATH"
  echo "Saved JSON report to: $JSON_REPORT_PATH"
fi

if [[ "$FAILURES" -gt 0 ]]; then
  echo ""
  echo "Smoke check failed (${FAILURES} issue(s)): status mismatch or missing required headers detected." >&2
  exit 1
fi

echo ""
echo "Smoke check completed successfully."
