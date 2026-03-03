# Resonite ユーザー検索アプリ

ResoniteユーザーのプロフィールやタグなどのユーザーID・名前から検索・表示できるWebアプリケーションです。

## 機能

- **ユーザー名検索**: ユーザー名から該当するユーザー一覧を表示
- **ユーザー詳細表示**: 選択したユーザーの詳細プロフィール情報
- **タグ表示**: ユーザーが持つタグ（イベント参加履歴など）をアイコン付きで表示
- **レスポンシブデザイン**: モバイル・デスクトップ両対応

## 技術スタック

- **フロントエンド**: HTML/CSS/JavaScript（バニラJS）
- **バックエンド**: Node.js/Express
- **依存関係**: CORS対応
- **API**: Resonite公式API

## インストール・実行方法

1. 依存関係のインストール:

```bash
npm install
```

2. 開発サーバーの起動:

```bash
npm run dev
```

3. 本番環境での実行:

```bash
npm start
```

アプリは `http://localhost:3000` でアクセス可能です。

4. Cloudflare Workersのローカル実行（移行実装中）:

```bash
npm run dev:worker
```

5. ステージング向けAPIスモーク確認（残作業用）:

```bash
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke

# 手順確認のみ（疎通なし）
npm run test:staging-smoke:dry

# 手順確認（ユーザー詳細必須モード）
npm run test:staging-smoke:strict:dry

# テンプレートからローカル環境ファイルを作成
npm run init:staging-smoke-env

# 設定ファイルの妥当性チェック
npm run test:staging-smoke:env:validate

# 変数をテンプレートから読み込んで実行
set -a; source .env.staging-smoke; set +a
npm run test:staging-smoke

# envテンプレートを直接読み込んで実行（通常 / strict）
npm run test:staging-smoke:env
npm run test:staging-smoke:env:strict

# env読込経路のdry-run確認（通常 / strict）
npm run test:staging-smoke:env:dry
npm run test:staging-smoke:env:strict:dry

# validate + run を一括実行（通常 / strict）
npm run test:staging-smoke:pipeline
npm run test:staging-smoke:pipeline:strict

# スモーク関連ツールの自己診断（dry）
npm run test:staging-smoke:doctor

# 自己診断 + env読込dry-run（通常/strict）を一括実行
npm run test:staging-smoke:preflight

# アラート閾値テンプレートの構造検証
npm run test:alerts:validate

# ローカル準備の一括ゲート（format/lint/スクリプトlint/unit/preflight）
npm run test:worker:readiness
# 未完了項目/証跡が残っている場合に失敗させる strict モード
npm run test:worker:readiness:strict

# ロールアウト補助スクリプトの静的チェック（bash -n + shellcheck）
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
# 依存解決だけ個別に実行する場合
npm run deps:worker-rollout
# （`test:worker:readiness:ci` 実行時は `CI=1` 扱いで lockfile があれば `npm ci` を優先）
# CI成果物を保持して確認する場合
npm run test:worker:readiness:ci:keep

# 生成されるレポート（docs/staging-smoke-report.* / docs/worker-rollout-docs-verify.json）はローカル確認用で .gitignore 済み

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


# 結果をMarkdown出力
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke:report

# 結果をJSON出力
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke:json

# 必須ヘッダー/期待ステータスを上書き
STAGING_BASE_URL="https://<your-staging-worker>" \
STAGING_REQUIRED_HEADERS="x-request-id,server-timing" \
STAGING_EXPECT_SESSIONS=200 \
STAGING_REQUIRE_USER_DETAIL=1 \
npm run test:staging-smoke
```

## ディレクトリ構成

```
.
├── server.js          # Express サーバー
├── package.json       # パッケージ設定
├── package-lock.json  # 依存関係のロックファイル
├── worker.js          # Cloudflare Workersエントリポイント
├── wrangler.toml      # Workers設定
├── public/            # 静的ファイル
│   ├── index.html     # フロントエンドアプリ
│   └── js/
│       └── tagImages.js  # タグ画像関連処理
├── node_modules/      # npm依存関係
└── README.md          # このファイル
```

## API エンドポイント

- `GET /api/users?name={名前}` (`HEAD`対応) - ユーザー名でユーザー検索
- `GET /api/users/{ユーザーID}` (`HEAD`対応) - 特定ユーザーの詳細情報取得
- `GET /api/sessions` (`HEAD`対応) - セッション一覧取得
- `GET /api/health` (`HEAD`対応、HEADはボディなし) - Workerのヘルスチェック（`no-store`、レート制限対象外）
- `GET /user/{ユーザーID}` - OGP付きHTMLを返却（`no-store`）
- レスポンスに `X-Request-Id` を付与（障害調査・トレース用途）
- 未対応メソッドには `405 Method Not Allowed` と `Allow` ヘッダーを返却
- APIレスポンスには `X-Robots-Tag: noindex, nofollow` を付与
- CORS時に `Access-Control-Expose-Headers` で `X-Request-Id` / `X-RateLimit-*` / `X-Worker-Cache` / `Server-Timing` を参照可能
- CORS応答は `Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers` を付与

### API契約（棚卸し結果）

フロントエンドが依存するWorker APIの入出力契約は `docs/worker-api-contract.md` に整理しています。

## 利用しているAPI

このアプリは以下のResonite公式APIを使用しています:

- `https://api.resonite.com/users/?name={名前}`
- `https://api.resonite.com/users/{ユーザーID}`

## バックエンド不要で静的デプロイするための選択肢

フロント単体で公開したい場合は、次のような構成が現実的です。

1. **Edge Function / Serverless Functionを「最小BFF」として使う（推奨）**
   - Vercel Functions / Netlify Functions / Cloudflare Workers などに、既存のwrapper API相当を移植します。
   - ブラウザからは同一オリジン (`/api/...`) にアクセスするため、CORSの問題を回避できます。
   - 実質的に「サーバー管理不要」かつ、秘匿したいヘッダーやレート制御も実装しやすいです。

2. **ビルド時に事前取得して静的JSON化（更新頻度が低い場合）**
   - CI（GitHub Actions等）で定期的に外部APIを叩き、`public/data/*.json` を生成して配信します。
   - 実行時のCORSは完全に不要になります。
   - ただしユーザー検索のような動的クエリには向かず、人気ユーザー一覧など限定用途向けです。

3. **公開CORSプロキシの利用（非推奨）**
   - `cors.isomorphic-git.org` などの公開プロキシを経由する方法です。
   - 可用性・性能・セキュリティ面のリスクが高く、プロダクション用途にはおすすめしません。

### 推奨アーキテクチャ

- フロントはそのまま静的ホスティング（Vercel/Netlify/Cloudflare Pages）
- API呼び出しだけを同サービスのFunctionで中継
- Function側でキャッシュ（`Cache-Control`, KV, CDNキャッシュ）を有効化

この構成なら、運用コストを増やさずにCORS回避とパフォーマンス改善を両立できます。

### Cloudflare Workersの料金について

- **無料枠あり**: 小〜中規模の個人開発・検証用途なら、無料枠内で運用できることが多いです。
- **従量課金あり**: リクエスト数や実行時間が増えると有料プランの対象になります。
- **実運用の目安**: 「検索が多い時間帯だけキャッシュを効かせる」構成にすると、コストを抑えやすくなります。

> 料金体系は変更される可能性があるため、導入前にCloudflare公式のPricingページで最新情報を確認してください。

### Cloudflare Workers化した場合のローカル検証

はい、**ローカルで検証できます**。一般的には `wrangler` のローカル開発サーバーを使います。

- `wrangler dev` でWorkerをローカル起動し、`http://127.0.0.1:8787` などでAPIを確認
- フロント側のAPIベースURLをローカルWorkerに向ける（例: `/api` を `http://127.0.0.1:8787/api` に切替）
- 本番同様に同一オリジンに寄せたい場合は、フロントをローカル静的サーバーで立ててリバースプロキシ設定を使う

簡易的には「Workerのみを単体検証」→「フロント接続検証」の2段階で進めると安全です。

#### 例: 最小コマンド

```bash
npm install -D wrangler
npx wrangler dev
```

#### Workerの自動チェック

```bash
npm run test:worker
```

上記テストでは、CORSプリフライト制御（許可/拒否の両ケース）、`GET/HEAD /api/users` の契約（`name`欠落時の`400`を含む）、`GET/HEAD /api/users/{id}` の契約（空ID時の`400`を含む）と `GET/HEAD /api/sessions` のプロキシ応答、`/api/worlds` の入力バリデーション/メソッド制約（HEAD時の`405`ボディレス含む）、許可外Originの`403`（`/api/users` と `/api/health`、HEADボディレス含む）、`/api/health` の`GET/HEAD/405`挙動、`/api/health` のレート制限除外、`/api/users` の`429`発生条件（HEADボディレス含む）、未知の `/api/*` の`404`（HEADボディレス含む）とレートヘッダー、APIレスポンスの `X-Robots-Tag`、`/user/{id}` のOGP注入とフォールバック挙動、非API静的レスポンス（200/404）の `X-Request-Id` 付与、未対応メソッド時の `405 + Allow` を検証します。

CORSの許可オリジンを固定したい場合は、Worker環境変数 `CORS_ALLOW_ORIGIN` を設定してください（未設定時は `*`）。複数オリジンを許可したい場合はカンマ区切りで指定できます。許可されないOriginからのリクエストは `403` を返します。
レート制限は `RATE_LIMIT_MAX_REQUESTS`（デフォルト: 120）と `RATE_LIMIT_WINDOW_MS`（デフォルト: 60000）で調整できます。必要に応じて `RATE_LIMIT_MAX_TRACKED_IPS`（デフォルト: 5000）でメモリ使用量上限も調整可能です。
上流APIのタイムアウト・GETリトライ回数は `API_TIMEOUT_MS`（デフォルト: 10000）と `GET_RETRY_COUNT`（デフォルト: 1）で調整できます。
`/api/users` 検索については、KVバインディング `SEARCH_CACHE` を設定すると短期キャッシュを利用できます（TTLは `SEARCH_CACHE_TTL_SECONDS`、デフォルト: 60秒）。KV読込/書込に失敗した場合もリクエストは継続し、上流取得結果を優先して返します。なお `HEAD` リクエストではキャッシュを新規投入しません。

> KV / D1 / R2 などを使う場合も `wrangler` でローカル相当の検証が可能ですが、一部挙動は本番と完全一致しないことがあるため、最終的にはステージング環境での確認を推奨します。

### Cloudflare Workers前提の実装計画

1. **現行API呼び出しの棚卸し（0.5日）**
   - `GET /api/users?name=...` と `GET /api/users/{id}` の入出力形式を固定
   - 既存フロントが依存しているレスポンス項目を明文化

2. **Worker APIの土台作成（1日）**
   - `wrangler` でWorkerプロジェクトを作成
   - ルーティングを `/api/users` と `/api/users/:id` に統一
   - 外部APIへの `fetch` とエラーハンドリング（タイムアウト・5xx）を実装

3. **キャッシュとレート保護（1日）**
   - レスポンスに `Cache-Control` を設定
   - 必要に応じてKVを利用し、検索結果の短期キャッシュを追加
   - アクセス集中時のフェイルセーフ（stale利用・簡易リトライ）を定義

4. **フロント側の接続切替（0.5日）**
   - APIベースURLを環境変数化（local/staging/prod）
   - 既存の `/api/...` 呼び出しをWorker経由前提で統一

5. **ローカル・ステージング検証（1日）**
   - `wrangler dev` で単体確認
   - フロントと結合して検索→詳細表示のE2E確認
   - 本番同等設定のステージング環境で最終確認

6. **デプロイと運用設定（0.5日）**
   - Cloudflare Pages + Workersのルート設定
   - ログ監視、エラートラッキング、利用量モニタリングを有効化
   - 無料枠超過を想定したアラート閾値を設定

#### 実装進捗（2026-03-03時点・残作業着手後）

| ステップ                      | 進捗 | 状態   | メモ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---: | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. 現行API呼び出しの棚卸し    | 100% | 完了   | `docs/worker-api-contract.md` に契約を明文化済み。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2. Worker APIの土台作成       | 100% | 完了   | `/api/users` `/api/users/:id` `/api/sessions` `/api/worlds` `/api/health` を実装済み。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3. キャッシュとレート保護     | 100% | 完了   | `caches.default`・リトライ・レート制限・`SEARCH_CACHE` を実装し、主要GET系に `stale-while-revalidate` / `stale-if-error` を適用済み。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4. フロント側の接続切替       | 100% | 完了   | `window.__API_BASE_URL__` と `apiUrl()` に移行済み。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 5. ローカル・ステージング検証 |  99% | 進行中 | ローカル自動テストは完了（46ケース）。さらに `npm run test:staging-smoke`（`scripts/staging-smoke-check.sh`）と `npm run test:staging-smoke:dry` / `npm run test:staging-smoke:report` / `npm run test:staging-smoke:json` でステージングAPI確認フローを自動実行・事前点検・記録出力（Markdown/JSON）に加えて、必須ヘッダー/期待ステータスを検証できるようにした。`STAGING_TEST_USER_ID` 未指定時は `/api/users/{id}` を `SKIP` としてレポートに残し、`STAGING_REQUIRE_USER_DETAIL=1` で未指定を失敗扱いにできる。さらに `docs/staging-smoke.env.example` で実行時の環境変数をテンプレート化し、`scripts/run-staging-smoke-from-env.sh` でテンプレート読込実行を自動化し、`scripts/init-staging-smoke-env.sh` でローカルenvの初期作成も自動化し、`scripts/validate-staging-smoke-env.sh` で事前バリデーション可能にし、`scripts/run-staging-smoke-pipeline.sh` で validate + 実行の一括フローを追加し、`scripts/doctor-staging-smoke.sh` でドライラン一括自己診断も追加。さらに `test:staging-smoke:env:dry` 系で env読込経路の事前確認を可能にし、`scripts/preflight-staging-smoke.sh`（`npm run test:staging-smoke:preflight`）で自己診断 + env経路dry-run（通常/strict）の実行前チェックを一括化し、`scripts/check-worker-rollout-readiness.sh`（`npm run test:worker:readiness`）で format/lint/unit/preflight をローカル準備ゲートとして一括実行できるようにし、`scripts/lint-rollout-scripts.sh`（`npm run lint:scripts:rollout`）で補助スクリプトの bash -n/shellcheck を定期確認できるようにした。ステージング最終確認の実施記録のみ未完了。 |
| 6. デプロイと運用設定         |  90% | 進行中 | `wrangler.toml`・デプロイスクリプト・観測用ヘッダーは実装済み。アラート閾値の推奨値と記録テンプレートに加え、設定雛形 `docs/cloudflare-alert-thresholds-template.json` と構造チェック `npm run test:alerts:validate` を追加済み。本番環境への実設定のみ未実施。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**全体進捗: 99%（完了4項目 / 進行中2項目、Step 5/6 の運用準備を継続更新）**

#### 作業漏れチェック（今回の再点検で確認した未完了項目）

- [x] 残作業を実行しやすくするため、ステージング検証とアラート設定の手順/記録テンプレートを `docs/worker-operations-checklist.md` に整備。
- [x] アラート閾値の雛形 `docs/cloudflare-alert-thresholds-template.json` を追加。
- [x] アラート閾値テンプレートの構造チェック `npm run test:alerts:validate` を追加。
- [x] ローカル準備ゲート `npm run test:worker:readiness`（format/lint/スクリプトlint/unit/preflight 一括実行）を追加。
- [x] 残タスク未完了時に失敗する `npm run test:worker:readiness:strict` を追加。
- [x] 補助スクリプト静的チェック `npm run lint:scripts:rollout`（bash -n + shellcheck）を追加。
- [x] 実装計画の進捗表示コマンド `npm run progress:worker-rollout`（`...:json` 含む）を追加。
- [x] 実装計画コマンドのREADME/package整合性チェック `npm run verify:worker-rollout:docs`（README/package/運用チェックリストの三点整合性）と JSON 出力 `npm run verify:worker-rollout:docs:json` を追加。
- [x] 残タスク証跡の入力状況を確認する `npm run verify:worker-rollout:evidence`（strict: `...:strict`）を追加。
- [x] 残タスク全体状況（open items + evidence）を確認する `npm run report:worker-rollout:status`（JSON/Markdown出力含む）を追加。
- [x] 全体進捗と残タスク状況を一括表示する `npm run report:worker-rollout:overview`（JSON出力含む）を追加。
- [x] 証跡完了後に README の未完了2項目を同期更新する `npm run sync:worker-rollout:open-items`（apply/strict/apply:strict 版含む）を追加。
- [x] レポート出力ファイル（`docs/staging-smoke-report.*` / `docs/worker-rollout-docs-verify.json`）を `.gitignore` に追加。
- [x] ステージングスモーク用の環境変数テンプレート `docs/staging-smoke.env.example` を追加。
- [x] テンプレートからローカル実行用envを作る `npm run init:staging-smoke-env` を追加。
- [x] envファイル妥当性チェック `npm run test:staging-smoke:env:validate` を追加。
- [x] ステージング確認の定型スモークを `npm run test:staging-smoke` として追加。
- [x] 定型スモークのDRY_RUN（疎通なし確認）を `npm run test:staging-smoke:dry` として追加。
- [x] ユーザー詳細必須モードのDRY_RUNを `npm run test:staging-smoke:strict:dry` として追加。
- [x] envテンプレート読込付き実行コマンド `npm run test:staging-smoke:env` / `:env:strict` を追加。
- [x] env読込経路のDRY_RUN検証 `npm run test:staging-smoke:env:dry` / `:env:strict:dry` を追加。
- [x] validate + 実行を一括化する `npm run test:staging-smoke:pipeline` / `:pipeline:strict` を追加。
- [x] スモーク関連ツール自己診断 `npm run test:staging-smoke:doctor` を追加。
- [x] 自己診断 + env読込dry-run（通常/strict）を一括実行する `npm run test:staging-smoke:preflight` を追加。
- [x] 定型スモーク結果のMarkdown保存を `npm run test:staging-smoke:report` として追加。
- [x] 定型スモーク結果のJSON保存を `npm run test:staging-smoke:json` として追加。
- [ ] ステージング環境で「検索 → 詳細表示」のE2E確認を実施し、結果を `docs/worker-rollout-evidence.md`（またはREADME）へ記録する。
- [ ] Cloudflare側で `429` / `5xx` / `upstream` 遅延のアラート閾値を実設定し、オンコール手順に紐付け、`docs/worker-rollout-evidence.md` に記録する。

詳細手順は `docs/worker-operations-checklist.md` を参照してください。
実行証跡は `docs/worker-rollout-evidence.md` に記録してください。

#### 運用監視・アラート方針（Step 6）

- `X-Request-Id` をキーに、Workerログと上流API調査ログを相関できる運用フローを採用する。
- `Server-Timing`（`upstream` / `edge-cache` / `kv-cache`）の分布を定点観測し、`upstream` の遅延悪化を早期検知する。
- エラー率監視は `429`（レート制限）と `5xx`（上流/内部）を分離してしきい値管理する。
- アラート一次判定は「`upstream` 遅延上昇」→「`5xx` 上昇」→「`429` 上昇」の順で実施し、切り分け時間を短縮する。

#### 完了条件（Definition of Done）

- 既存の主要機能（ユーザー検索・詳細表示）がWorker経由で動作する
- CORSエラーが発生しない
- 主要APIでキャッシュが有効化され、連続アクセス時の応答が改善している
- ローカル / ステージング / 本番の3環境で同一のAPI契約を満たす

## 開発環境

- Node.js 14.x以上
- npm 6.x以上

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
