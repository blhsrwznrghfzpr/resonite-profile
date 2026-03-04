# リファクタリング計画

## 概要

本プロジェクト（Resonite ユーザー検索）を **保守性・安全性・拡張性** の観点から段階的にリファクタリングする計画です。

各フェーズは独立してデプロイ可能であり、既存の 46 件のユニットテストとステージングスモークテストを常に通過した状態を維持します。

---

## 現状の課題

### セキュリティ

| 箇所 | 問題 | 深刻度 |
|------|------|--------|
| `public/index.html` L622-668 | `innerHTML` に `user.username` 等を未エスケープで展開 → XSS | **高** |
| `public/index.html` L786-893 | 詳細表示でも同様に `innerHTML` + テンプレートリテラル → XSS | **高** |
| `public/index.html` L917-928 | `stripAllTags()` が正規表現ベースで不完全（ネストタグ等を突破可能） | 中 |

### 保守性

| 箇所 | 問題 |
|------|------|
| `public/index.html` (1,106行) | HTML・CSS・JS が全て1ファイルに混在 |
| `worker.js` (795行) | ルーティング・キャッシュ・レートリミット・CORS・OGP が単一ファイル |
| `convertIconUrl` | `worker.js` L170-180 と `index.html` L576-587 に同一ロジックが重複 |
| `public/js/tagImages.js` | `window.getTagIcon` でグローバル名前空間を汚染 |
| 型安全性 | Worker 全体が JavaScript で型チェックなし |

### デッドコード

| ファイル | 状態 |
|----------|------|
| `server.js` | 旧 Express バックエンド。本番では未使用（Worker に移行済み） |
| `package.json` の `express`, `cors` | `server.js` 専用の依存。Worker では不要 |

> **注**: `getBadgeTexture.ts` はビルドパイプライン外ですが、デッドコードではありません。
> Resonite ゲームクライアントに ResoniteLink 経由で接続し、バッジの `StaticTexture2D` テクスチャ URL を採取する**開発者用の手動実行スクリプト**です。
> `public/js/tagImages.js` のハッシュデータはこのスクリプトで収集したものです。
> 新しいバッジが追加された際に手動で実行して `tagImages.js` を更新する用途で使い続けます。

---

## フェーズ一覧

```
Phase 0  デッドコード削除・依存整理
Phase 1  フロントエンド XSS 修正
Phase 2  Worker の TypeScript 化・モジュール分割
Phase 3  Hono 導入
Phase 4  Vite + Preact 導入（フロントエンド再構築）
```

各フェーズの完了条件:
- 既存テスト（`npm run test:worker`）が全件パス
- `npm run lint` がエラーなし
- `npm run format:check` がエラーなし
- ステージングスモークテストがパス（デプロイ後）

---

## Phase 0: デッドコード削除・依存整理

**目的**: 不要なコードと依存を除去し、リファクタリングの出発点をクリーンにする。

### 作業内容

1. **`server.js` を削除**
   - Express ベースの旧バックエンド
   - `wrangler dev` でローカル開発が可能なため不要

2. **`getBadgeTexture.ts` を移動**（任意）
   - `tools/getBadgeTexture.ts` へ移動し、開発ユーティリティであることを明示
   - ロジック自体は変更しない

3. **`package.json` の整理**
   - `dependencies` から `express`, `cors` を削除
   - `scripts.start` / `scripts.dev`（Express 用）を削除 or `wrangler dev` に置換
   - `main` フィールドを削除（Worker のエントリは `wrangler.toml` で指定済み）

### 変更対象ファイル

| 操作 | ファイル |
|------|----------|
| 削除 | `server.js` |
| 移動（任意） | `getBadgeTexture.ts` → `tools/getBadgeTexture.ts` |
| 編集 | `package.json` |

### 完了条件

- `npm run test:worker` が全件パス
- `npm run lint` / `npm run format:check` がパス
- `npm run dev:worker` でローカル起動できる

---

## Phase 1: フロントエンド XSS 修正

**目的**: `innerHTML` + テンプレートリテラルによる XSS 脆弱性を解消する。

### 作業内容

1. **テキストエスケープ関数の追加**
   ```js
   function escapeHtml(str) {
     const div = document.createElement('div');
     div.appendChild(document.createTextNode(str));
     return div.innerHTML;
   }
   ```

2. **検索結果表示 (`displaySearchResults`) の修正**
   - `innerHTML` に埋め込む前に `user.username`, `user.id` 等を `escapeHtml()` で処理
   - または DOM API（`createElement` / `textContent`）に置き換え

3. **詳細表示 (`displayUserDetail`) の修正**
   - 同様に全ユーザー由来データをエスケープ
   - `currentSession.name` のサニタイズを `stripAllTags()` → `escapeHtml()` に変更

4. **`stripAllTags()` の廃止**
   - 正規表現ベースの HTML 除去は不完全なため、DOMParser か `escapeHtml()` に置き換え

### 変更対象ファイル

| 操作 | ファイル |
|------|----------|
| 編集 | `public/index.html` |

### 完了条件

- XSS ペイロード（例: `<img src=x onerror=alert(1)>`）がユーザー名に含まれていても実行されない
- 既存の UI 表示が崩れない
- テスト全件パス

---

## Phase 2: Worker の TypeScript 化・モジュール分割

**目的**: 795 行の `worker.js` を責務ごとに分割し、TypeScript で型安全にする。

### 最終ディレクトリ構成

```
worker/
├── index.ts                 # エントリポイント（export default { fetch }）
├── types.ts                 # 共通型定義（Env, RuntimeConfig, RateLimitState 等）
├── constants.ts             # 定数（API URL, デフォルト値, Cache-Control 文字列）
├── middleware/
│   ├── cors.ts              # parseAllowedOrigins, isOriginAllowed, withCors, optionsResponse
│   ├── rateLimit.ts         # checkRateLimit, attachRateLimitHeaders, pruneRateLimitStore
│   └── security.ts          # withRequestId, methodNotAllowed
├── routes/
│   ├── health.ts            # GET /api/health
│   ├── users.ts             # GET /api/users, GET /api/users/:id
│   ├── sessions.ts          # GET /api/sessions
│   ├── worlds.ts            # POST /api/worlds
│   └── ogp.ts               # GET /user/:id（OGP HTML 生成）
├── lib/
│   ├── cache.ts             # Edge Cache + KV の読み書き
│   ├── proxy.ts             # proxyGet, proxyWorlds, fetchWithTimeout, fetchWithRetry
│   ├── response.ts          # jsonResponse, errorResponse, asHeadResponse, withCacheHeaders, withServerTiming
│   └── url.ts               # convertIconUrl（フロントエンドとの共有候補）
```

### 作業内容

1. **TypeScript の設定**
   - `tsconfig.json` を追加（`target: "esnext"`, `module: "esnext"`, `types: ["@cloudflare/workers-types"]`）
   - `@cloudflare/workers-types` を devDependencies に追加
   - `wrangler.toml` の `main` を `worker/index.ts` に変更（Wrangler が自動的に TypeScript をビルド）

2. **段階的な分割**（各ステップで全テストをパスさせる）
   - Step 1: `worker.js` → `worker/index.ts` にリネーム・移動（内容そのまま + 型アノテーション追加）
   - Step 2: `constants.ts`, `types.ts` を抽出
   - Step 3: `lib/response.ts`, `lib/url.ts` を抽出
   - Step 4: `lib/cache.ts`, `lib/proxy.ts` を抽出
   - Step 5: `middleware/cors.ts`, `middleware/rateLimit.ts`, `middleware/security.ts` を抽出
   - Step 6: `routes/` を抽出

3. **テストの適応**
   - テストは Worker の `fetch` ハンドラの export を直接呼び出しているため、エントリポイントの export 形式を維持すれば既存テストはそのまま動作する
   - Wrangler がビルドした `worker.js` 出力をテストが import できるように `wrangler.toml` または test script を調整
   - あるいは: テストファイルも `.mts` にしてTypeScriptのソースを直接import

4. **ESLint 設定の更新**
   - TypeScript ファイルのリント対応（`@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`）
   - `lint-staged` に `*.ts` を追加

### 変更対象ファイル

| 操作 | ファイル |
|------|----------|
| 削除 | `worker.js` |
| 新規 | `worker/index.ts`, `worker/types.ts`, `worker/constants.ts` |
| 新規 | `worker/middleware/cors.ts`, `worker/middleware/rateLimit.ts`, `worker/middleware/security.ts` |
| 新規 | `worker/routes/health.ts`, `worker/routes/users.ts`, `worker/routes/sessions.ts`, `worker/routes/worlds.ts`, `worker/routes/ogp.ts` |
| 新規 | `worker/lib/cache.ts`, `worker/lib/proxy.ts`, `worker/lib/response.ts`, `worker/lib/url.ts` |
| 新規 | `tsconfig.json` |
| 編集 | `wrangler.toml` (`main` パス変更) |
| 編集 | `package.json` (devDependencies, scripts, lint-staged) |
| 編集 | `eslint.config.mjs` (TypeScript 対応) |
| 編集 | `tests/worker.test.mjs` (import パス調整) |

### 完了条件

- `npx tsc --noEmit` が型エラーなし
- `npm run test:worker` が全件パス
- `npm run lint` / `npm run format:check` がパス
- `npm run dev:worker` でローカル起動し、全エンドポイントが動作

---

## Phase 3: Hono 導入

**目的**: 手動ルーティング・ミドルウェアチェーンを Hono フレームワークに置き換え、可読性とテスト容易性を向上させる。

### Hono を選ぶ理由

- Cloudflare Workers ネイティブ対応（バンドルサイズ ~14KB）
- ミドルウェアパターンが宣言的
- TypeScript ファーストで型推論が強力
- `app.fire()` でユニットテストが書きやすい

### 作業内容

1. **Hono のインストール**
   ```bash
   npm install hono
   ```

2. **エントリポイントの書き換え** (`worker/index.ts`)
   ```ts
   import { Hono } from 'hono';
   import { cors } from './middleware/cors';
   import { rateLimit } from './middleware/rateLimit';
   import { usersRoutes } from './routes/users';
   // ...

   const app = new Hono<{ Bindings: Env }>();

   app.use('/api/*', cors());
   app.use('/api/*', rateLimit());
   app.route('/api', usersRoutes);
   // ...

   export default app;
   ```

3. **各ルートを Hono のルートハンドラに変換**
   - `handleApi` 内の `if (pathname === ...)` チェーン → `app.get('/api/users', handler)` 等に分解
   - レスポンスヘルパー（`withCors`, `attachRateLimitHeaders` 等）→ Hono ミドルウェアに変換

4. **テストの書き換え**
   - Hono の `app.request()` メソッドでテスト可能
   - テストが `export default { fetch }` を直接呼び出している箇所を `app.request()` に移行

### 変更対象ファイル

| 操作 | ファイル |
|------|----------|
| 編集 | `worker/index.ts` (全面書き換え) |
| 編集 | `worker/middleware/*.ts` (Hono ミドルウェア形式に) |
| 編集 | `worker/routes/*.ts` (Hono ルートハンドラ形式に) |
| 編集 | `tests/worker.test.mjs` (テスト呼び出し方法の変更) |
| 編集 | `package.json` (hono 追加) |

### 完了条件

- テスト全件パス（テスト数は同等以上）
- 全 API エンドポイントの振る舞いが Phase 2 完了時と同一
- レスポンスヘッダー（CORS, Rate Limit, Cache-Control, Server-Timing, X-Request-Id）が既存と完全一致

---

## Phase 4: Vite + Preact 導入（フロントエンド再構築）

**目的**: 1,106 行のモノリシック `index.html` を Preact コンポーネントに分解し、XSS を構造的に排除する。

### 技術選定の理由

| 項目 | 選定 | 理由 |
|------|------|------|
| UIライブラリ | Preact | バンドルサイズ ~3KB、JSX による自動エスケープ |
| ビルドツール | Vite | Wrangler v4 が内蔵 Vite をサポート、HMR が高速 |
| ルーティング | preact-iso または手動 | 2画面（検索/詳細）だけなので軽量で十分 |
| 状態管理 | Preact Signals | 軽量で Preact との相性が良い |

### 最終ディレクトリ構成

```
src/
├── index.html               # Vite エントリ HTML（最小限のシェル）
├── main.tsx                  # アプリ初期化・ルーティング
├── style.css                 # グローバルスタイル（現 index.html の <style> を抽出）
├── components/
│   ├── App.tsx               # ルートコンポーネント
│   ├── Header.tsx            # ヘッダー（タイトル + GitHub リンク）
│   ├── SearchBar.tsx         # 検索フォーム
│   ├── UserCard.tsx          # 検索結果カード（一覧用）
│   ├── UserDetail.tsx        # ユーザー詳細ページ
│   ├── WorldGrid.tsx         # ワールドカード一覧
│   ├── WorldCard.tsx         # 個別ワールドカード
│   ├── TagBadge.tsx          # タグバッジ表示
│   └── CopyableText.tsx     # コピー機能付きテキスト
├── hooks/
│   ├── useUser.ts            # ユーザー検索・詳細取得
│   ├── useWorlds.ts          # ワールド一覧取得
│   └── useSessions.ts       # セッション取得
├── lib/
│   ├── api.ts                # fetch ラッパー（apiUrl 生成）
│   └── url.ts                # convertIconUrl（worker/lib/url.ts と共有）
└── data/
    └── tagImages.ts          # タグ画像マッピング（ES Module 化、型付き）
```

### 作業内容

1. **Vite + Preact のセットアップ**
   - `npm install preact` / `npm install -D @preact/preset-vite`
   - `vite.config.ts` を作成
   - `wrangler.toml` の `[assets] directory` を `"./dist"` に変更

2. **CSS の抽出**
   - `index.html` 内の `<style>` → `src/style.css` へ移動
   - レスポンシブメディアクエリも含めてそのまま移行

3. **コンポーネントへの分割**
   - `displaySearchResults()` → `<UserCard>` コンポーネント
   - `displayUserDetail()` → `<UserDetail>` コンポーネント
   - `displayUserWorlds()` → `<WorldGrid>` + `<WorldCard>`
   - `copyToClipboard()` → `<CopyableText>` コンポーネント（`useRef` でフィードバック管理）
   - `handlePageLoad()` / `popstate` → `preact-iso` または `useEffect` + `history.pushState`

4. **tagImages の ES Module 化**
   - `public/js/tagImages.js` → `src/data/tagImages.ts`
   - `window.getTagIcon` グローバル → named export `getTagIcon()` に変更
   - データのマッピング自体はそのまま移行（`getBadgeTexture.ts` で採取した値なので手を加えない）
   - タグ名のリテラル型を追加
   - 新バッジを追加する際のワークフロー: `tools/getBadgeTexture.ts` を実行 → 出力された URL を `src/data/tagImages.ts` に追記

5. **`convertIconUrl` の共有**
   - `src/lib/url.ts` と `worker/lib/url.ts` を同一ソースにする
   - 方法: シンボリックリンク、npm workspace、またはビルド時コピー
   - 最もシンプルな方法: `shared/url.ts` を作成し、双方から import

6. **OGP との整合性**
   - Worker の `buildUserPage()` は `dist/index.html` を読み取って OGP タグを注入
   - Vite ビルド後の `dist/index.html` に `<title>Resonite ユーザー検索</title>` が含まれていれば既存の置換ロジックがそのまま動作

### 変更対象ファイル

| 操作 | ファイル |
|------|----------|
| 削除 | `public/index.html` |
| 削除 | `public/js/tagImages.js` |
| 新規 | `src/` 以下すべて |
| 新規 | `vite.config.ts` |
| 新規 | `shared/url.ts`（共有ユーティリティ） |
| 編集 | `wrangler.toml` (`[assets] directory` → `"./dist"`) |
| 編集 | `worker/lib/url.ts` (`shared/url.ts` を re-export) |
| 編集 | `worker/routes/ogp.ts` (ビルド済み HTML のパスが変わる場合) |
| 編集 | `package.json` (preact, vite, @preact/preset-vite 追加、build script 追加) |
| 編集 | `tsconfig.json` (JSX 設定追加) |

### 完了条件

- `npm run build` で `dist/` にフロントエンドがビルドされる
- `npm run dev:worker` でローカルの HMR 開発ができる
- 全画面（検索一覧、ユーザー詳細、ワールド表示）が既存と同等に動作
- `/user/:id` の OGP タグが正しく生成される
- XSS ペイロードが構造的に実行不可能（JSX の自動エスケープ）
- Lighthouse パフォーマンススコアが劣化しない

---

## 実施しないこと

以下は検討した上で、現時点では **スコープ外** とします。

| 項目 | 理由 |
|------|------|
| Durable Objects によるグローバルレートリミット | コストに見合わない。per-isolate で十分 |
| Cloudflare Pages への移行 | Workers + Assets で静的配信は既に CDN エッジ。移行メリットが薄い |
| React / Vue / Svelte | Preact の ~3KB で十分。フレームワークの重さが不要 |
| GraphQL 化 | API エンドポイントが 5 つのみ。REST で十分 |
| モノレポ化（Turborepo 等） | Worker + フロントエンドの 2 パッケージ程度では過剰 |
| E2E テスト（Playwright 等）の導入 | 有用だが本リファクタリングのスコープ外。別途検討 |

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Phase 2 でテストが import パス変更により壊れる | テスト不能期間が発生 | Wrangler ビルド出力を `dist/worker.js` に固定し、テストはそれを import。段階的に移行 |
| Phase 3 の Hono 導入でレスポンスヘッダーが微妙に変わる | ステージングスモークテストが失敗 | Hono 導入前後でレスポンスヘッダーの diff を取り、完全一致を確認 |
| Phase 4 の Preact 導入でバンドルサイズが増加 | 初回ロード性能が劣化 | Vite のバンドル分析（`rollup-plugin-visualizer`）で監視。目標: gzip 後 30KB 以下 |
| OGP 生成の `<title>` 置換が Vite ビルド後の HTML で動かない | SNS シェア時にメタ情報が欠落 | Vite ビルド後の HTML に `<title>Resonite ユーザー検索</title>` が含まれることをテストで保証 |

---

## 参考: 現在のファイルサイズ

| ファイル | 行数 | リファクタ後 |
|----------|------|-------------|
| `worker.js` | 795 | → `worker/` 以下に 12 ファイルへ分割 |
| `public/index.html` | 1,106 | → `src/` 以下に ~15 ファイルへ分割 |
| `public/js/tagImages.js` | 234 | → `src/data/tagImages.ts` に移動 |
| `server.js` | 181 | → 削除 |
| `getBadgeTexture.ts` | - | → 削除 |
| `tests/worker.test.mjs` | 1,424 | → import パス調整 + Hono 対応 |
