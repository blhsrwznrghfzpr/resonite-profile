#!/usr/bin/env bash
set -euo pipefail

README_PATH="${1:-README.md}"

if [[ ! -f "$README_PATH" ]]; then
  echo "[progress-validate] file not found: $README_PATH" >&2
  exit 1
fi

extract_line() {
  local pattern="$1"
  grep -F "$pattern" "$README_PATH" || true
}

step5_line="$(extract_line '| 5. ローカル・ステージング検証 |')"
step6_line="$(extract_line '| 6. デプロイと運用設定         |')"
overall_line="$(extract_line '**全体進捗:')"

if [[ -z "$step5_line" || -z "$step6_line" || -z "$overall_line" ]]; then
  echo "[progress-validate] missing required progress lines in README" >&2
  exit 1
fi

extract_pct() {
  local line="$1"
  echo "$line" | sed -E 's/.*\|[[:space:]]*([0-9]+)%[[:space:]]*\|.*/\1/'
}

step5_pct="$(extract_pct "$step5_line")"
step6_pct="$(extract_pct "$step6_line")"

if ! [[ "$step5_pct" =~ ^[0-9]+$ && "$step6_pct" =~ ^[0-9]+$ ]]; then
  echo "[progress-validate] failed to parse percentage values" >&2
  exit 1
fi

for v in "$step5_pct" "$step6_pct"; do
  if (( v < 0 || v > 100 )); then
    echo "[progress-validate] percentage out of range: $v" >&2
    exit 1
  fi
done

echo "[progress-validate] Step5=${step5_pct}% Step6=${step6_pct}%"
echo "[progress-validate] ${overall_line//\*/}"
