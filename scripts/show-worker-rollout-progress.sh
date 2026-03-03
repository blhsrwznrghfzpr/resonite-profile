#!/usr/bin/env bash
set -euo pipefail

README_PATH="${1:-README.md}"

if [[ ! -f "$README_PATH" ]]; then
  echo "[progress] file not found: $README_PATH" >&2
  exit 1
fi

step5_line="$(grep -F '| 5. ローカル・ステージング検証 |' "$README_PATH" || true)"
step6_line="$(grep -F '| 6. デプロイと運用設定         |' "$README_PATH" || true)"
overall_line="$(grep -F '**全体進捗:' "$README_PATH" || true)"

if [[ -z "$step5_line" || -z "$step6_line" || -z "$overall_line" ]]; then
  echo "[progress] required progress lines were not found in $README_PATH" >&2
  exit 1
fi

extract_percent() {
  local line="$1"
  echo "$line" | sed -E 's/.*\|[[:space:]]*([0-9]+)%[[:space:]]*\|.*/\1/'
}

extract_state() {
  local line="$1"
  echo "$line" | sed -E 's/.*\|[[:space:]]*[0-9]+%[[:space:]]*\|[[:space:]]*([^| ]+).*/\1/'
}

STEP5_PERCENT="$(extract_percent "$step5_line")"
STEP5_STATE="$(extract_state "$step5_line")"
STEP6_PERCENT="$(extract_percent "$step6_line")"
STEP6_STATE="$(extract_state "$step6_line")"

if ! [[ "$STEP5_PERCENT" =~ ^[0-9]+$ && "$STEP6_PERCENT" =~ ^[0-9]+$ ]]; then
  echo "[progress] failed to parse progress percentage" >&2
  exit 1
fi

if [[ "${PROGRESS_JSON:-0}" == "1" ]]; then
  cat <<JSON
{
  "step5": {"percent": ${STEP5_PERCENT}, "state": "${STEP5_STATE}"},
  "step6": {"percent": ${STEP6_PERCENT}, "state": "${STEP6_STATE}"},
  "overall": "$(echo "$overall_line" | sed 's/\*//g')"
}
JSON
else
  echo "[progress] Step 5: ${STEP5_PERCENT}% (${STEP5_STATE})"
  echo "[progress] Step 6: ${STEP6_PERCENT}% (${STEP6_STATE})"
  echo "[progress] ${overall_line//\*/}"
fi
