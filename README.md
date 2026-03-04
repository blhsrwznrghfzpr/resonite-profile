# Resonite ユーザー検索アプリ

ResoniteユーザーのプロフィールやタグなどのユーザーID・名前から検索・表示できるWebアプリケーションです。

## 機能

- **ユーザー名検索**: ユーザー名から該当するユーザー一覧を表示
- **ユーザー詳細表示**: 選択したユーザーの詳細プロフィール情報
- **タグ表示**: ユーザーが持つタグ（イベント参加履歴など）をアイコン付きで表示
- **レスポンシブデザイン**: モバイル・デスクトップ両対応

## 技術スタック

- **フロントエンド**: Preact + Vite + TypeScript
- **バックエンド**: Cloudflare Workers（Hono フレームワーク）
- **API**: Resonite公式API

## インストール・実行方法

1. 依存関係のインストール:

```bash
npm install
```

2. ローカル開発（フルスタック）:

```bash
# ターミナル1: Worker（APIサーバー）
npm run dev:worker

# ターミナル2: フロントエンド（HMR付き）
npm run dev:frontend
```

フロントエンドは `http://localhost:5173` で起動し、`/api` リクエストは `localhost:8787`（Worker）にプロキシされます。

3. フロントエンドビルド:

```bash
npm run build
```

4. 本番デプロイ:

```bash
npm run deploy:worker
```

`wrangler.toml` の `SEARCH_CACHE` KV namespace ID を実際の値に置き換えてからデプロイしてください。
KV namespace の作成は `wrangler kv namespace create SEARCH_CACHE` で行えます。

## ステージング検証

デプロイ後のWorkerをスモークテストで確認できます:

```bash
# 基本的なスモーク確認
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke

# 実行前に手順確認のみ（疎通なし）
npm run test:staging-smoke:dry

# 環境変数ファイルの初期作成
npm run init:staging-smoke-env

# 環境変数ファイルを使って実行
npm run test:staging-smoke:pipeline

# 結果をMarkdown/JSONで出力
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke:report
STAGING_BASE_URL="https://<your-staging-worker>" npm run test:staging-smoke:json
```

`STAGING_TEST_USER_ID` にユーザーIDを指定すると `/api/users/{id}` も確認できます。

## ディレクトリ構成

```
.
├── package.json
├── wrangler.toml          # Workers設定
├── vite.config.ts         # Viteビルド設定
├── tsconfig.json          # TypeScript設定（Worker用）
├── tsconfig.app.json      # TypeScript設定（フロントエンド用）
├── worker/                # Cloudflare Worker（Hono + TypeScript）
│   ├── index.ts           # エントリポイント
│   ├── types.ts           # 共通型定義
│   ├── constants.ts       # 定数
│   ├── middleware/
│   │   ├── cors.ts        # CORS処理
│   │   └── rateLimit.ts   # レートリミット
│   ├── routes/
│   │   ├── health.ts      # GET /api/health
│   │   ├── users.ts       # GET /api/users, GET /api/users/:id
│   │   ├── sessions.ts    # GET /api/sessions
│   │   ├── worlds.ts      # POST /api/worlds
│   │   └── ogp.ts         # GET /user/:id（OGP HTML）
│   └── lib/
│       ├── cache.ts       # Edge Cache + KV 操作
│       ├── config.ts      # 環境変数パース
│       ├── proxy.ts       # 上流APIへのプロキシ
│       ├── response.ts    # レスポンス構築ユーティリティ
│       └── url.ts         # convertIconUrl
├── src/                   # フロントエンド（Preact + Vite）
│   ├── index.html         # Viteエントリ HTML
│   ├── main.tsx           # アプリ初期化
│   ├── style.css          # グローバルスタイル
│   ├── types.ts           # 共通型定義
│   ├── components/
│   │   ├── App.tsx        # ルーター
│   │   ├── Header.tsx     # ヘッダー
│   │   ├── SearchPage.tsx # 検索一覧画面
│   │   ├── UserDetailPage.tsx # ユーザー詳細画面
│   │   ├── WorldGrid.tsx  # ワールドカード一覧
│   │   ├── TagBadge.tsx   # タグバッジ
│   │   └── CopyableText.tsx   # コピー機能付きテキスト
│   ├── lib/
│   │   ├── api.ts         # fetch ラッパー
│   │   └── url.ts         # convertIconUrl
│   └── data/
│       └── tagImages.ts   # タグ画像マッピング
├── tools/
│   └── getBadgeTexture.ts # バッジテクスチャURL採取ツール（手動実行用）
├── scripts/               # 運用スクリプト
│   ├── staging-smoke-check.sh
│   ├── validate-cloudflare-alert-thresholds.sh
│   └── ...
├── docs/
│   ├── worker-api-contract.md
│   ├── cloudflare-alert-thresholds-template.json
│   └── staging-smoke.env.example
└── README.md              # このファイル
```

## API エンドポイント

- `GET /api/users?name={名前}` (`HEAD`対応) - ユーザー名でユーザー検索
- `GET /api/users/{ユーザーID}` (`HEAD`対応) - 特定ユーザーの詳細情報取得
- `GET /api/sessions` (`HEAD`対応) - セッション一覧取得
- `POST /api/worlds` - ワールド検索（Resonite `/records/pagedSearch` への透過）
- `GET /api/health` (`HEAD`対応) - ヘルスチェック（`no-store`、レート制限対象外）
- `GET /user/{ユーザーID}` - OGP付きHTMLを返却（`no-store`）

詳細な入出力仕様は `docs/worker-api-contract.md` を参照してください。

## 環境変数（Worker）

| 変数名                       | デフォルト | 説明                                          |
| ---------------------------- | ---------- | --------------------------------------------- |
| `CORS_ALLOW_ORIGIN`          | `*`        | 許可するOrigin（カンマ区切りで複数指定可）    |
| `RATE_LIMIT_MAX_REQUESTS`    | `120`      | レートリミット上限（リクエスト数/ウィンドウ） |
| `RATE_LIMIT_WINDOW_MS`       | `60000`    | レートリミットウィンドウ（ms）                |
| `RATE_LIMIT_MAX_TRACKED_IPS` | `5000`     | 追跡IPの上限数                                |
| `API_TIMEOUT_MS`             | `10000`    | 上流APIタイムアウト（ms）                     |
| `GET_RETRY_COUNT`            | `1`        | GETリトライ回数                               |
| `SEARCH_CACHE_TTL_SECONDS`   | `60`       | KVキャッシュTTL（秒）                         |

> **注意**: レートリミットはWorker isolate単位のインメモリ管理です。複数isolateにまたがるグローバルな制限は行いません。厳密なグローバルレートリミットが必要な場合はDurable Objectsを使用してください。

## Workerのユニットテスト

```bash
npm run test:worker
```

46テストケースで以下を検証しています: CORSプリフライト・オリジン制限・レートリミット・KV/Edgeキャッシュ・全エンドポイントの正常/異常系・HEADメソッド対応・OGP注入。

## 利用しているAPI

このアプリは以下のResonite公式APIを使用しています:

- `https://api.resonite.com/users/?name={名前}`
- `https://api.resonite.com/users/{ユーザーID}`
- `https://api.resonite.com/sessions`
- `https://api.resonite.com/records/pagedSearch`

## 開発環境

- Node.js 22.6以上（`--experimental-strip-types` が必要）
- npm 10.x以上

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
