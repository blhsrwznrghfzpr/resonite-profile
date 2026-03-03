#!/usr/bin/env bash
set -euo pipefail

README_PATH="${1:-README.md}"
EVIDENCE_PATH="${2:-docs/worker-rollout-evidence.md}"
APPLY_CHANGES="${APPLY_CHANGES:-0}"

if [[ ! -f "$README_PATH" ]]; then
  echo "[sync-open-items] README not found: $README_PATH" >&2
  exit 1
fi

# 証跡が揃っていない場合は同期しない
REQUIRE_SYNC_READY="${REQUIRE_SYNC_READY:-0}"
if ! REQUIRE_EVIDENCE_COMPLETE=1 bash scripts/validate-worker-rollout-evidence.sh "$EVIDENCE_PATH" >/dev/null 2>&1; then
  echo "[sync-open-items] evidence is not complete yet; skip sync"
  if [[ "$REQUIRE_SYNC_READY" == "1" ]]; then
    echo "[sync-open-items] REQUIRE_SYNC_READY=1 and evidence is incomplete" >&2
    exit 1
  fi
  exit 0
fi

before_1='- [ ] ステージング環境で「検索 → 詳細表示」のE2E確認を実施し、結果を `docs/worker-rollout-evidence.md`（またはREADME）へ記録する。'
before_2='- [ ] Cloudflare側で `429` / `5xx` / `upstream` 遅延のアラート閾値を実設定し、オンコール手順に紐付け、`docs/worker-rollout-evidence.md` に記録する。'
after_1='- [x] ステージング環境で「検索 → 詳細表示」のE2E確認を実施し、結果を `docs/worker-rollout-evidence.md`（またはREADME）へ記録する。'
after_2='- [x] Cloudflare側で `429` / `5xx` / `upstream` 遅延のアラート閾値を実設定し、オンコール手順に紐付け、`docs/worker-rollout-evidence.md` に記録する。'

if ! grep -Fq -- "$before_1" "$README_PATH" && ! grep -Fq -- "$after_1" "$README_PATH"; then
  echo "[sync-open-items] target item not found (E2E): $README_PATH" >&2
  exit 1
fi
if ! grep -Fq -- "$before_2" "$README_PATH" && ! grep -Fq -- "$after_2" "$README_PATH"; then
  echo "[sync-open-items] target item not found (alert): $README_PATH" >&2
  exit 1
fi

if [[ "$APPLY_CHANGES" != "1" ]]; then
  echo "[sync-open-items] evidence is complete"
  echo "[sync-open-items] dry-run: set README open-items to checked by running:"
  echo "[sync-open-items] APPLY_CHANGES=1 bash scripts/sync-worker-rollout-open-items.sh $README_PATH $EVIDENCE_PATH"
  exit 0
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

sed -e "s|${before_1}|${after_1}|" -e "s|${before_2}|${after_2}|" "$README_PATH" >"$tmp"
mv "$tmp" "$README_PATH"

echo "[sync-open-items] updated: $README_PATH"
