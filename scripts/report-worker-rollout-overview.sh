#!/usr/bin/env bash
set -euo pipefail

README_PATH="${1:-README.md}"
EVIDENCE_PATH="${2:-docs/worker-rollout-evidence.md}"
JSON_OUT="${ROLLOUT_OVERVIEW_JSON:-}"

if [[ ! -f "$README_PATH" ]]; then
  echo "[rollout-overview] README not found: $README_PATH" >&2
  exit 1
fi
if [[ ! -f "$EVIDENCE_PATH" ]]; then
  echo "[rollout-overview] evidence file not found: $EVIDENCE_PATH" >&2
  exit 1
fi

progress_line="$(bash scripts/show-worker-rollout-progress.sh "$README_PATH" | tail -n 1)"
status_line="$(bash scripts/report-worker-rollout-status.sh "$README_PATH" "$EVIDENCE_PATH" | tail -n 1)"
open_items_count="$(printf '%s' "$status_line" | sed -n 's/.*open_items=\([0-9][0-9]*\).*/\1/p')"
status_value="$(printf '%s' "$status_line" | sed -n 's/.*status=\([^ ]*\).*/\1/p')"

if [[ -z "$open_items_count" || -z "$status_value" ]]; then
  echo "[rollout-overview] failed to parse rollout status" >&2
  exit 1
fi

next_action="manual_tasks_remaining"
if [[ "$open_items_count" == "0" && "$status_value" == "ready_to_close" ]]; then
  next_action="close_remaining_checklist_items"
fi

echo "[rollout-overview] ${progress_line}"
echo "[rollout-overview] ${status_line}"
echo "[rollout-overview] next_action=${next_action}"

if [[ -n "$JSON_OUT" ]]; then
  mkdir -p "$(dirname "$JSON_OUT")"
  {
    echo '{'
    echo "  \"readme\": \"${README_PATH}\"," 
    echo "  \"evidence\": \"${EVIDENCE_PATH}\"," 
    echo "  \"progressLine\": \"$(printf '%s' "$progress_line" | sed 's/\\/\\\\/g; s/"/\\"/g')\"," 
    echo "  \"statusLine\": \"$(printf '%s' "$status_line" | sed 's/\\/\\\\/g; s/"/\\"/g')\"," 
    echo "  \"openItems\": ${open_items_count},"
    echo "  \"status\": \"${status_value}\"," 
    echo "  \"nextAction\": \"${next_action}\""
    echo '}'
  } >"$JSON_OUT"
  echo "[rollout-overview] wrote json: $JSON_OUT"
fi
