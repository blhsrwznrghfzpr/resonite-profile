#!/usr/bin/env bash
set -euo pipefail

README_PATH="${1:-README.md}"
EVIDENCE_PATH="${2:-docs/worker-rollout-evidence.md}"
MARKDOWN_OUT="${ROLLOUT_STATUS_MARKDOWN:-}"
JSON_OUT="${ROLLOUT_STATUS_JSON:-}"

if [[ ! -f "$README_PATH" ]]; then
  echo "[rollout-status] README not found: $README_PATH" >&2
  exit 1
fi
if [[ ! -f "$EVIDENCE_PATH" ]]; then
  echo "[rollout-status] evidence file not found: $EVIDENCE_PATH" >&2
  exit 1
fi

open_items=0
while IFS= read -r line; do
  if [[ "$line" == "#### 作業漏れチェック"* ]]; then
    in=1
    continue
  fi
  if [[ "${in:-0}" -eq 1 && "$line" == "#### "* ]]; then
    break
  fi
  if [[ "${in:-0}" -eq 1 && "$line" == "- [ ] "* ]]; then
    open_items=$((open_items + 1))
  fi
done <"$README_PATH"

e1_done=0
e2_done=0
if awk '/## 1\)/, /## 2\)/ {print}' "$EVIDENCE_PATH" | grep -Fq -- '- [x] 実施済み'; then
  e1_done=1
fi
if awk '/## 2\)/, /## 3\)/ {print}' "$EVIDENCE_PATH" | grep -Fq -- '- [x] 実施済み'; then
  e2_done=1
fi

evidence_complete=0
if [[ "$e1_done" -eq 1 && "$e2_done" -eq 1 ]]; then
  evidence_complete=1
fi

status="in_progress"
if [[ "$open_items" -eq 0 && "$evidence_complete" -eq 1 ]]; then
  status="ready_to_close"
fi

echo "[rollout-status] open_items=${open_items} evidence_section1_done=${e1_done} evidence_section2_done=${e2_done} status=${status}"

if [[ -n "$MARKDOWN_OUT" ]]; then
  mkdir -p "$(dirname "$MARKDOWN_OUT")"
  {
    echo "# Worker Rollout Status Snapshot"
    echo
    echo "- Open README items: **${open_items}**"
    echo "- Evidence section 1 done: **${e1_done}**"
    echo "- Evidence section 2 done: **${e2_done}**"
    echo "- Status: **${status}**"
  } >"$MARKDOWN_OUT"
  echo "[rollout-status] wrote markdown: $MARKDOWN_OUT"
fi

if [[ -n "$JSON_OUT" ]]; then
  mkdir -p "$(dirname "$JSON_OUT")"
  {
    echo '{'
    echo "  \"readme\": \"${README_PATH}\"," 
    echo "  \"evidence\": \"${EVIDENCE_PATH}\"," 
    echo "  \"openItems\": ${open_items},"
    echo "  \"evidenceSection1Done\": $([[ "$e1_done" -eq 1 ]] && echo true || echo false),"
    echo "  \"evidenceSection2Done\": $([[ "$e2_done" -eq 1 ]] && echo true || echo false),"
    echo "  \"status\": \"${status}\""
    echo '}'
  } >"$JSON_OUT"
  echo "[rollout-status] wrote json: $JSON_OUT"
fi
