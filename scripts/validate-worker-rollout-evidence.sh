#!/usr/bin/env bash
set -euo pipefail

EVIDENCE_PATH="${1:-docs/worker-rollout-evidence.md}"
REQUIRE_EVIDENCE_COMPLETE="${REQUIRE_EVIDENCE_COMPLETE:-0}"

if [[ ! -f "$EVIDENCE_PATH" ]]; then
  echo "[evidence-validate] file not found: $EVIDENCE_PATH" >&2
  exit 1
fi

section1_done=0
section2_done=0
missing=()

if awk '/## 1\)/, /## 2\)/ {print}' "$EVIDENCE_PATH" | grep -Fq -- '- [x] 実施済み'; then
  section1_done=1
fi
if awk '/## 2\)/, /## 3\)/ {print}' "$EVIDENCE_PATH" | grep -Fq -- '- [x] 実施済み'; then
  section2_done=1
fi

check_field() {
  local label="$1"
  local pattern
  pattern="^- ${label}:\\s*[^[:space:]].*"
  if ! grep -Eq "$pattern" "$EVIDENCE_PATH"; then
    missing+=("${label}")
  fi
}

check_field '実施日時'
check_field '実施者'
check_field '対象環境（`STAGING_BASE_URL`）'
check_field '結果サマリ'
check_field '対象環境（staging/prod）'
check_field '設定した閾値（429 / 5xx / upstream 遅延）'
check_field 'オンコール手順リンク'

echo "[evidence-validate] section1_done=${section1_done} section2_done=${section2_done}"
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "[evidence-validate] missing non-empty fields: ${missing[*]}"
else
  echo "[evidence-validate] required fields are filled"
fi

if [[ "$REQUIRE_EVIDENCE_COMPLETE" == "1" ]]; then
  if [[ "$section1_done" -ne 1 || "$section2_done" -ne 1 || ${#missing[@]} -gt 0 ]]; then
    echo "[evidence-validate] REQUIRE_EVIDENCE_COMPLETE=1 and evidence is incomplete" >&2
    exit 1
  fi
fi
