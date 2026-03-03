#!/usr/bin/env bash
set -euo pipefail

README_PATH="${1:-README.md}"
JSON_OUT_PATH="${OPEN_ITEMS_JSON:-}"
REQUIRE_NO_OPEN_ITEMS="${REQUIRE_NO_OPEN_ITEMS:-0}"

if [[ ! -f "$README_PATH" ]]; then
  echo "[open-items] file not found: $README_PATH" >&2
  exit 1
fi

items=()
in_section=0
while IFS= read -r line; do
  if [[ "$line" == "#### 作業漏れチェック"* ]]; then
    in_section=1
    continue
  fi
  if [[ "$in_section" -eq 1 && "$line" == "#### "* ]]; then
    break
  fi
  if [[ "$in_section" -eq 1 && "$line" == "- [ ] "* ]]; then
    item="${line#- [ ] }"
    items+=("$item")
    echo "[open-items] $item"
  fi
done <"$README_PATH"

if [[ ${#items[@]} -eq 0 ]]; then
  echo "[open-items] no unchecked rollout items found"
fi

if [[ "$REQUIRE_NO_OPEN_ITEMS" == "1" && ${#items[@]} -gt 0 ]]; then
  echo "[open-items] REQUIRE_NO_OPEN_ITEMS=1 and unchecked items remain" >&2
  # JSON出力が指定されている場合は後段で出力するため継続
  status=1
else
  status=0
fi

if [[ -n "$JSON_OUT_PATH" ]]; then
  mkdir -p "$(dirname "$JSON_OUT_PATH")"
  {
    echo "{"
    echo "  \"readme\": \"$README_PATH\"," 
    echo "  \"count\": ${#items[@]},"
    echo "  \"items\": ["
    for i in "${!items[@]}"; do
      comma=","; [[ "$i" -eq $((${#items[@]} - 1)) ]] && comma=""
      esc=$(printf '%s' "${items[$i]}" | sed 's/\\/\\\\/g; s/"/\\"/g')
      echo "    \"${esc}\"${comma}"
    done
    echo "  ]"
    echo "}"
  } >"$JSON_OUT_PATH"
  echo "[open-items] wrote JSON report: $JSON_OUT_PATH"
fi

exit "$status"
