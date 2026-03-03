# Worker Rollout Evidence Log

最終更新: 2026-03-03

このノートは README の「作業漏れチェック」に残っている運用タスクの実行証跡を残すための記録用ファイルです。

## 1) ステージング E2E（検索 → 詳細表示）

- [ ] 実施済み
- 実施日時:
- 実施者:
- 対象環境（`STAGING_BASE_URL`）:
- 実行コマンド:

```bash
STAGING_BASE_URL="https://<your-staging-worker>" \
STAGING_TEST_USER_ID="<user-id>" \
STAGING_REQUIRE_USER_DETAIL=1 \
npm run test:staging-smoke
```

- 結果サマリ:
- レポート保存先（任意）:

## 2) Cloudflare アラート閾値の本設定 + オンコール紐付け

- [ ] 実施済み
- 実施日時:
- 実施者:
- 対象環境（staging/prod）:
- 使用テンプレート:
  - `docs/cloudflare-alert-thresholds-template.json`
- 設定した閾値（429 / 5xx / upstream 遅延）:
- オンコール手順リンク:
- 補足:

## 3) 完了確認

- [ ] README の作業漏れチェック 2 項目を `[x]` へ更新
- [ ] 必要に応じて `docs/worker-operations-checklist.md` の記録欄へ追記
