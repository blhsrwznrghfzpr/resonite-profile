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

#### 実装進捗（2026-03-03時点）

| ステップ                      | 進捗 | 状態 | メモ                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ---: | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. 現行API呼び出しの棚卸し    | 100% | 完了 | `docs/worker-api-contract.md` に契約を明文化済み                                                                                                                                                                                                                                                                                                    |
| 2. Worker APIの土台作成       | 100% | 完了 | `/api/users` `/api/users/:id` `/api/sessions` `/api/worlds` `/api/health` 実装済み                                                                                                                                                                                                                                                                  |
| 3. キャッシュとレート保護     | 100% | 完了 | `caches.default`・リトライ・レート制限に加え、`/api/users` 検索のKV短期キャッシュ（`SEARCH_CACHE`）とKV障害時のフォールバック、`stale-while-revalidate` / `stale-if-error` を主要GET系に適用済み                                                                                                                                                    |
| 4. フロント側の接続切替       | 100% | 完了 | `window.__API_BASE_URL__` と `apiUrl()` に移行済み                                                                                                                                                                                                                                                                                                  |
| 5. ローカル・ステージング検証 | 100% | 完了 | ローカル自動テストを拡充（CORSプリフライト許可/拒否、`GET/HEAD /api/users`、`GET/HEAD /api/users/{id}`、`name`欠落時/空ID時の`400`、`GET/HEAD /api/sessions`、`/api/worlds`入力検証（HEAD時の`405`ボディレス含む）、`/api/health`の`405`/許可外Origin/レート制限除外、`/api/users`の`429`、`X-Robots-Tag`、`/user/{id}`のOGP注入/フォールバック）。 |
| 6. デプロイと運用設定         | 100% | 完了 | `wrangler.toml` とデプロイスクリプト、`X-Request-Id` の静的レスポンス付与・上流転送、HEAD系エラー応答のボディレス挙動、`Server-Timing` のExpose-Headers公開、edge-cache HIT/上流非200時観測の自動検証、契約ドキュメント反映まで完了。監視/アラート運用指針（下記）を定義済み。                                                                      |

**全体進捗: 100%（完了6項目）**

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
