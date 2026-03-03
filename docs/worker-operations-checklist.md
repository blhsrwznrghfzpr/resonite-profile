# Worker運用チェックリスト（ステージング検証 + アラート設定）

このドキュメントは、READMEの実装計画 Step 5 / Step 6 の残作業を実行・記録するための運用チェックリストです。

## 1. ステージング検証チェックリスト（Step 5）

前提:

- `STAGING_BASE_URL` は Cloudflare Worker 公開URL（例: `https://staging.example.workers.dev`）
- 許可Originは Worker の `CORS_ALLOWED_ORIGINS` に含まれていること

### 1-0. 自動スモークチェック（ローカル実行）

事前に `npm run init:staging-smoke-env` で `.env.staging-smoke` を作成して値を埋めると実行しやすくなります。

```bash
npm run init:staging-smoke-env
npm run test:staging-smoke:env:validate

set -a; source .env.staging-smoke; set +a
npm run test:staging-smoke

# ネットワーク疎通なしで手順だけ確認する場合
npm run test:staging-smoke:dry

# ネットワーク疎通なし + ユーザー詳細必須モード
npm run test:staging-smoke:strict:dry

# envテンプレートを読み込んで実行（通常 / strict）
npm run test:staging-smoke:env
npm run test:staging-smoke:env:strict

# env読込経路のdry-run確認（通常 / strict）
npm run test:staging-smoke:env:dry
npm run test:staging-smoke:env:strict:dry

# validate + 実行を一括化（通常 / strict）
npm run test:staging-smoke:pipeline
npm run test:staging-smoke:pipeline:strict

# スモーク関連ツール自己診断（dry）
npm run test:staging-smoke:doctor

# 自己診断 + env読込dry-run（通常 / strict）を一括実行
npm run test:staging-smoke:preflight

# アラート閾値テンプレートの構造チェック
npm run test:alerts:validate

# ローカル準備の一括ゲート（format/lint/スクリプトlint/unit/preflight）
npm run test:worker:readiness
# 未完了項目/証跡が残っている場合に失敗させる strict モード
npm run test:worker:readiness:strict

# 補助スクリプトの静的チェック（bash -n + shellcheck）
npm run lint:scripts:rollout

# 実装計画コマンドの README/package/運用チェックリスト整合性を検証
npm run verify:worker-rollout:docs
npm run verify:worker-rollout:docs:json

# CI向けの一括チェック（JSON成果物は /tmp に生成し、終了時に自動削除）
npm run test:worker:readiness:ci
# 未完了項目が残ると失敗する strict CI モード
npm run test:worker:readiness:ci:strict
# strict CI で成果物も保持する場合
npm run test:worker:readiness:ci:strict:keep

# 生成レポート（docs/staging-smoke-report.* / docs/worker-rollout-docs-verify.json）はローカル確認用で .gitignore 済み

# 実装計画（Step 5/6）進捗の現在値を表示（JSON可）
npm run verify:worker-rollout:progress
npm run progress:worker-rollout
npm run progress:worker-rollout:json
npm run report:worker-rollout:open-items
npm run report:worker-rollout:open-items:json
# 未完了項目がある場合に失敗させる strict モード
npm run report:worker-rollout:open-items:strict
npm run report:worker-rollout:open-items:json:strict
# 証跡ノート（docs/worker-rollout-evidence.md）の入力状況を確認
npm run verify:worker-rollout:evidence
# 残タスク証跡が揃っていないと失敗する strict モード
npm run verify:worker-rollout:evidence:strict
# 残タスク全体（open items + evidence）を集計
npm run report:worker-rollout:status
npm run report:worker-rollout:status:json
npm run report:worker-rollout:status:md
# 進捗 + 残タスク状況のサマリ
npm run report:worker-rollout:overview
npm run report:worker-rollout:overview:json
# 証跡が揃ったら README の未完了2項目を自動で [x] へ同期（dry-run / apply）
npm run sync:worker-rollout:open-items
npm run sync:worker-rollout:open-items:apply
# 証跡未完了なら失敗させる strict モード
npm run sync:worker-rollout:open-items:strict
# 証跡完了済みを必須にして即時反映（CI向け）
npm run sync:worker-rollout:open-items:apply:strict


# 実行結果をMarkdownで保存する場合
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke:report

# 実行結果をJSONで保存する場合
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke:json
```

> `STAGING_TEST_USER_ID` は任意です。未指定時は `/api/users/{id}` の確認をスキップし、レポートには `SKIP` として記録されます。
> スクリプトは「HTTPステータスの期待値不一致」または「必須ヘッダー欠落」を失敗として非0終了します。
> 必須ヘッダーは `STAGING_REQUIRED_HEADERS`（デフォルト: `x-request-id`）で調整できます。

補足:

- 期待ステータスは `STAGING_EXPECT_HEALTH` / `STAGING_EXPECT_USERS_SEARCH` / `STAGING_EXPECT_USER_DETAIL` / `STAGING_EXPECT_SESSIONS` で上書きできます。
- `STAGING_REQUIRE_USER_DETAIL=1` を指定すると、`STAGING_TEST_USER_ID` 未設定時に失敗として扱います。

### 1-1. APIスモーク（curl）

```bash
curl -i "${STAGING_BASE_URL}/api/health"
curl -i "${STAGING_BASE_URL}/api/users?name=cloud"
curl -i "${STAGING_BASE_URL}/api/users/<user-id>"
curl -i "${STAGING_BASE_URL}/api/sessions"
```

確認観点:

- ステータスが想定通り（`200` / `4xx` / `5xx`）
- `X-Request-Id` が付与される
- `Server-Timing` / `X-Robots-Tag` / `Access-Control-Expose-Headers` が契約通り

### 1-2. ブラウザE2E（手動）

- [ ] 検索画面でユーザー名検索が成功する
- [ ] 検索結果から詳細表示へ遷移できる
- [ ] 連続検索時に表示劣化やCORSエラーが発生しない
- [ ] `/user/{id}` で OGP タグ注入済みHTMLが返る

### 1-3. 実施記録

| 日付 | 実施者 | 対象環境 | 結果 | 備考 |
| ---- | ------ | -------- | ---- | ---- |
|      |        | staging  |      |      |

## 2. アラート設定チェックリスト（Step 6）

Cloudflareダッシュボード（Workers Analytics / Logs / Alerting）で以下を設定する。

推奨しきい値の雛形は `docs/cloudflare-alert-thresholds-template.json` を参照。

### 2-1. 推奨しきい値

- `5xx ratio`: 5分窓で **2%超** が3回連続で発報
- `429 ratio`: 5分窓で **5%超** が3回連続で発報
- `upstream p95`（`Server-Timing: upstream`）: **1200ms超** が10分継続で発報

> しきい値は初期案です。運用1〜2週間の実測分布に合わせて再調整してください。

### 2-2. オンコール連携

- [ ] 通知先（Slack / PagerDuty / Email）を設定
- [ ] アラートごとの一次切り分け手順をRunbook化
- [ ] `X-Request-Id` を使ったログ追跡手順をRunbookに記載

### 2-3. 実施記録

| 日付 | 実施者 | Alert種別    | しきい値 | 通知先 | 備考 |
| ---- | ------ | ------------ | -------- | ------ | ---- |
|      |        | 5xx ratio    |          |        |      |
|      |        | 429 ratio    |          |        |      |
|      |        | upstream p95 |          |        |      |
