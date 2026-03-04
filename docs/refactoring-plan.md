# リファクタリング計画

## 概要

本プロジェクト（Resonite ユーザー検索）を **保守性・安全性・拡張性** の観点から段階的にリファクタリングする計画です。

各フェーズは独立してデプロイ可能であり、既存の 46 件のユニットテストとステージングスモークテストを常に通過した状態を維持します。

---

## 実施状況

| フェーズ | 内容                                       | 状態    | コミット  |
| -------- | ------------------------------------------ | ------- | --------- |
| Phase 0  | デッドコード削除・依存整理                 | ✅ 完了 | `d32a3d0` |
| Phase 1  | フロントエンド XSS 修正                    | ✅ 完了 | `b94825b` |
| Phase 2  | Worker の TypeScript 化・モジュール分割    | ✅ 完了 | `91d35ed` |
| Phase 3  | Hono 導入                                  | ✅ 完了 | `b363a98` |
| Phase 4  | Vite + Preact 導入（フロントエンド再構築） | ✅ 完了 | `fcd5e27` |

---

## 現状の課題（リファクタリング前の状態）

### セキュリティ

| 箇所                         | 問題                                                                | 深刻度 |
| ---------------------------- | ------------------------------------------------------------------- | ------ |
| `public/index.html` L622-668 | `innerHTML` に `user.username` 等を未エスケープで展開 → XSS         | **高** |
| `public/index.html` L786-893 | 詳細表示でも同様に `innerHTML` + テンプレートリテラル → XSS         | **高** |
| `public/index.html` L917-928 | `stripAllTags()` が正規表現ベースで不完全（ネストタグ等を突破可能） | 中     |

### 保守性

| 箇所                          | 問題                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `public/index.html` (1,106行) | HTML・CSS・JS が全て1ファイルに混在                                |
| `worker.js` (795行)           | ルーティング・キャッシュ・レートリミット・CORS・OGP が単一ファイル |
| `convertIconUrl`              | `worker.js` L170-180 と `index.html` L576-587 に同一ロジックが重複 |
| `public/js/tagImages.js`      | `window.getTagIcon` でグローバル名前空間を汚染                     |
| 型安全性                      | Worker 全体が JavaScript で型チェックなし                          |

### デッドコード

| ファイル                            | 状態                                                         |
| ----------------------------------- | ------------------------------------------------------------ |
| `server.js`                         | 旧 Express バックエンド。本番では未使用（Worker に移行済み） |
| `package.json` の `express`, `cors` | `server.js` 専用の依存。Worker では不要                      |

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

| 操作         | ファイル                                          |
| ------------ | ------------------------------------------------- |
| 削除         | `server.js`                                       |
| 移動（任意） | `getBadgeTexture.ts` → `tools/getBadgeTexture.ts` |
| 編集         | `package.json`                                    |

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

3. **詳細表示 (`displayUserDetail`) の修正**
   - 同様に全ユーザー由来データをエスケープ
   - `currentSession.name` のサニタイズを `DOMParser` ベースの `safeStripHtmlTags()` に変更

4. **`stripAllTags()` の廃止**
   - 正規表現ベースの HTML 除去は不完全なため、`DOMParser` ベースの `safeStripHtmlTags()` に置き換え

### 変更対象ファイル

| 操作 | ファイル            |
| ---- | ------------------- |
| 編集 | `public/index.html` |

### 完了条件

- XSS ペイロード（例: `<img src=x onerror=alert(1)>`）がユーザー名に含まれていても実行されない
- 既存の UI 表示が崩れない
- テスト全件パス

---

## Phase 2: Worker の TypeScript 化・モジュール分割

**目的**: 795 行の `worker.js` を責務ごとに分割し、TypeScript で型安全にする。

### 最終ディレクトリ構成（実装後）

```
worker/
├── index.ts                 # エントリポイント（export default { fetch }）
├── types.ts                 # 共通型定義（Env, RuntimeConfig, RateLimitState 等）
├── constants.ts             # 定数（API URL, デフォルト値, Cache-Control 文字列）
├── middleware/
│   ├── cors.ts              # parseAllowedOrigins, isOriginAllowed, withCors, optionsResponse
│   └── rateLimit.ts         # checkRateLimit, attachRateLimitHeaders, pruneRateLimitStore
├── routes/
│   ├── health.ts            # GET /api/health
│   ├── users.ts             # GET /api/users, GET /api/users/:id
│   ├── sessions.ts          # GET /api/sessions
│   ├── worlds.ts            # POST /api/worlds
│   └── ogp.ts               # GET /user/:id（OGP HTML 生成）
├── lib/
│   ├── cache.ts             # Edge Cache + KV の読み書き
│   ├── config.ts            # getRuntimeConfig（環境変数のパースとデフォルト値）
│   ├── proxy.ts             # proxyGet, proxyWorlds, fetchWithTimeout, fetchWithRetry
│   ├── response.ts          # jsonResponse, errorResponse, asHeadResponse, withCacheHeaders,
│   │                        # withServerTiming, withRequestId, methodNotAllowed 等
│   └── url.ts               # convertIconUrl
```

> **計画との差分**: 当初 `middleware/security.ts`（withRequestId, methodNotAllowed）を分離する予定だったが、
> これらはレスポンス構築に関連するため `lib/response.ts` に統合した。
> また `lib/config.ts` は計画に含まれていなかったが、環境変数パースの責務を分離するために追加した。

### 作業内容

1. **TypeScript の設定**
   - `tsconfig.json` を追加（`target: "esnext"`, `module: "esnext"`, `lib: ["esnext"]`, `types: ["@cloudflare/workers-types"]`）
   - `lib: ["esnext"]` により DOM の `CacheStorage` 型定義との競合を回避（Workers-types が正しい型を提供）
   - `@cloudflare/workers-types`, `typescript` を devDependencies に追加
   - `wrangler.toml` の `main` を `worker/index.ts` に変更

2. **段階的な分割**（各ステップで全テストをパスさせる）

3. **テストの適応**
   - テストランナーを `tsx/esm` から `node --experimental-strip-types --experimental-default-type=module` に変更
     - Node.js 22 では `tsx/esm` の `resolveSync()` が未実装のため互換性エラーが発生
   - `tests/worker.test.mjs` の import パスを `../worker/index.ts` に変更

4. **ESLint 設定**
   - TypeScript 用の `@typescript-eslint` プラグインは未導入（TypeScript の型チェックは `npx tsc --noEmit` で代替）
   - `lint-staged` の対象を `*.{js,mjs}` のまま維持（Worker の `.ts` ファイルへの ESLint は Phase 4 で `*.{ts,tsx}` の prettier 対象追加時に拡張）

### 変更対象ファイル

| 操作 | ファイル                                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 削除 | `worker.js`                                                                                                                         |
| 新規 | `worker/index.ts`, `worker/types.ts`, `worker/constants.ts`                                                                         |
| 新規 | `worker/middleware/cors.ts`, `worker/middleware/rateLimit.ts`                                                                       |
| 新規 | `worker/routes/health.ts`, `worker/routes/users.ts`, `worker/routes/sessions.ts`, `worker/routes/worlds.ts`, `worker/routes/ogp.ts` |
| 新規 | `worker/lib/cache.ts`, `worker/lib/config.ts`, `worker/lib/proxy.ts`, `worker/lib/response.ts`, `worker/lib/url.ts`                 |
| 新規 | `tsconfig.json`                                                                                                                     |
| 編集 | `wrangler.toml` (`main` パス変更)                                                                                                   |
| 編集 | `package.json` (devDependencies: tsx, typescript, @cloudflare/workers-types 追加、test:worker スクリプト変更)                       |
| 編集 | `tests/worker.test.mjs` (import パス調整)                                                                                           |

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

### 作業内容

1. **Hono のインストール**

   ```bash
   npm install hono
   ```

2. **エントリポイントの書き換え** (`worker/index.ts`)

   `HonoEnv` 型で `Bindings`（環境変数）と `Variables`（リクエストスコープ変数）を定義し、
   ミドルウェアを `app.use()` / `app.all()` / `app.options()` で登録する構成に移行。

   ```ts
   type HonoEnv = {
     Bindings: Env;
     Variables: {
       requestId: string;
       rateState: RateLimitState;
       rateLimitConfig: RateLimitConfig;
       runtimeConfig: RuntimeConfig;
     };
   };

   const app = new Hono<HonoEnv>();

   // ミドルウェア登録順（Hono の first-match セマンティクスを活用）
   app.use('*' /* requestId 付与 */);
   app.options('/api/*' /* CORS preflight */);
   app.use('/api/*' /* CORS origin チェック */);
   app.all('/api/health' /* ヘルスチェック：レートリミット前に終端 */);
   app.use('/api/*' /* レートリミット */);
   app.all('/api/users', handler);
   app.all('/api/users/*', handler); // :id は空文字も含むため /* で受けて手動抽出
   // ...
   app.all('*' /* ASSETS fallthrough */);

   export default app;
   ```

   > **実装上の注意**: `/api/users/:id` に対して Hono の `:id` パラメータパターンを使うと
   > `/api/users/`（空 ID）が 404 になるため、`/api/users/*` で受けて
   > `c.req.path.slice('/api/users/'.length)` で userId を抽出する。

3. **各ルートハンドラは `worker/routes/` のまま維持**
   - `handleUsers()`, `handleUserDetail()` 等は Hono の `Context` ではなく `Request` + `Env` を受け取る形のまま
   - `worker/index.ts` の Hono ハンドラ内で呼び出す

4. **テストは既存のまま**
   - Hono の `export default app` は `app.fetch(req, env)` を持つため、
     テストが呼ぶ `worker.fetch(request, env)` がそのまま動作する

### 変更対象ファイル

| 操作 | ファイル                                      |
| ---- | --------------------------------------------- |
| 編集 | `worker/index.ts`（全面書き換え）             |
| 編集 | `package.json`（hono を dependencies に追加） |

### 完了条件

- テスト全件パス（テスト数は同等以上）
- 全 API エンドポイントの振る舞いが Phase 2 完了時と同一
- レスポンスヘッダー（CORS, Rate Limit, Cache-Control, Server-Timing, X-Request-Id）が既存と完全一致

---

## Phase 4: Vite + Preact 導入（フロントエンド再構築）

**目的**: 1,106 行のモノリシック `index.html` を Preact コンポーネントに分解し、XSS を構造的に排除する。

### 技術選定の理由

| 項目         | 選定         | 理由                                           |
| ------------ | ------------ | ---------------------------------------------- |
| UIライブラリ | Preact       | バンドルサイズ ~3KB、JSX による自動エスケープ  |
| ビルドツール | Vite         | Wrangler v4 が内蔵 Vite をサポート、HMR が高速 |
| ルーティング | preact-iso   | 2画面（検索/詳細）に十分な軽量ルーター         |
| 状態管理     | preact/hooks | `useState`/`useEffect` で十分な複雑度          |

### 最終ディレクトリ構成（実装後）

```
src/
├── index.html               # Vite エントリ HTML（<title> を OGP 注入のために保持）
├── main.tsx                  # アプリ初期化（Preact の render）
├── style.css                 # グローバルスタイル（旧 index.html の <style> を抽出）
├── types.ts                  # 共通型定義（User, Session, World インターフェース）
├── components/
│   ├── App.tsx               # LocationProvider + Router
│   ├── Header.tsx            # ヘッダー（タイトル + GitHub リンク）
│   ├── SearchPage.tsx        # 検索フォーム + 検索結果一覧
│   ├── UserDetailPage.tsx    # ユーザー詳細ページ（セッション・ワールド含む）
│   ├── WorldGrid.tsx         # ワールドカード一覧
│   ├── TagBadge.tsx          # タグバッジ表示
│   └── CopyableText.tsx      # コピー機能付きテキスト
├── lib/
│   ├── api.ts                # fetch ラッパー（searchUsers, fetchUser, fetchSessions, fetchUserWorlds）
│   └── url.ts                # convertIconUrl, DEFAULT_AVATAR_URL
└── data/
    └── tagImages.ts          # タグ画像マッピング（ES Module 化、型付き）
```

> **計画との差分**:
>
> - `hooks/` ディレクトリ（useUser, useWorlds, useSessions）は作成せず、データ取得ロジックはコンポーネント内の `useEffect` にインラインで実装した（2画面のみで分離メリットが薄いため）
> - `SearchBar`, `UserCard`, `WorldCard` は独立コンポーネントにせず、それぞれ `SearchPage`, `WorldGrid` にインラインで実装した
> - `shared/url.ts` による Worker との `convertIconUrl` 共有は実施しなかった。`tsconfig.json`（Worker 用、`lib: ["esnext"]`）と `tsconfig.app.json`（フロントエンド用、`lib: ["dom", ...]`）が分離されており、ビルド環境の前提が異なるため、`src/lib/url.ts` と `worker/lib/url.ts` をそれぞれ独立して保持する

### 作業内容

1. **Vite + Preact のセットアップ**
   - `npm install preact preact-iso` / `npm install -D @preact/preset-vite vite`
   - `vite.config.ts` を作成（`root: 'src'`, `outDir: '../dist'`, `/api` → `localhost:8787` のプロキシ設定）
   - `tsconfig.app.json` を新規作成（`lib: ["esnext", "dom", "dom.iterable"]`, `jsx: "react-jsx"`, `jsxImportSource: "preact"`）
   - `wrangler.toml` の `[assets] directory` を `"./dist"` に変更

2. **CSS の抽出**
   - `index.html` 内の `<style>` → `src/style.css` へ移動

3. **コンポーネントへの分割**
   - `displaySearchResults()` → `SearchPage` コンポーネント内にインライン化
   - `displayUserDetail()` → `UserDetailPage` コンポーネント
   - `displayUserWorlds()` → `WorldGrid` コンポーネント
   - `copyToClipboard()` → `CopyableText` コンポーネント（`useState` でフィードバック管理）
   - `handlePageLoad()` / `popstate` → `preact-iso` の `LocationProvider` + `Router` に置き換え

4. **tagImages の ES Module 化**
   - `public/js/tagImages.js` → `src/data/tagImages.ts`
   - `window.getTagIcon` グローバル → named export `getTagIcon()` に変更
   - 新バッジを追加する際のワークフロー: `tools/getBadgeTexture.ts` を実行 → 出力された URL を `src/data/tagImages.ts` に追記

5. **OGP との整合性**
   - Worker の `buildUserPage()` は `dist/index.html` を読み取って OGP タグを注入
   - `src/index.html` に `<title>Resonite ユーザー検索</title>` を記述することで、Vite ビルド後の `dist/index.html` にも同文字列が保持され、既存の置換ロジックがそのまま動作する

### 変更対象ファイル

| 操作 | ファイル                                                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 削除 | `public/index.html`                                                                                                                                        |
| 削除 | `public/js/tagImages.js`                                                                                                                                   |
| 新規 | `src/` 以下すべて                                                                                                                                          |
| 新規 | `vite.config.ts`                                                                                                                                           |
| 新規 | `tsconfig.app.json`（フロントエンド用 TypeScript 設定）                                                                                                    |
| 編集 | `wrangler.toml`（`[assets] directory` → `"./dist"`）                                                                                                       |
| 編集 | `package.json`（preact, preact-iso, vite, @preact/preset-vite 追加、`build: "vite build"`、`dev:frontend: "vite"` 追加、lint-staged に `*.{ts,tsx}` 追加） |

### 完了条件

- `npm run build` で `dist/` にフロントエンドがビルドされる
- `npm run dev:frontend` + `npm run dev:worker` でローカルの HMR 開発ができる
- 全画面（検索一覧、ユーザー詳細、ワールド表示）が既存と同等に動作
- `/user/:id` の OGP タグが正しく生成される
- XSS ペイロードが構造的に実行不可能（JSX の自動エスケープ）

---

## 実施しないこと

以下は検討した上で、現時点では **スコープ外** とします。

| 項目                                           | 理由                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Durable Objects によるグローバルレートリミット | コストに見合わない。per-isolate で十分                                                   |
| Cloudflare Pages への移行                      | Workers + Assets で静的配信は既に CDN エッジ。移行メリットが薄い                         |
| React / Vue / Svelte                           | Preact の ~3KB で十分。フレームワークの重さが不要                                        |
| GraphQL 化                                     | API エンドポイントが 5 つのみ。REST で十分                                               |
| モノレポ化（Turborepo 等）                     | Worker + フロントエンドの 2 パッケージ程度では過剰                                       |
| E2E テスト（Playwright 等）の導入              | 有用だが本リファクタリングのスコープ外。別途検討                                         |
| `convertIconUrl` の Worker / src 間共有        | tsconfig（workers-types vs DOM lib）が分離されており、単純な共有が困難。独立コピーで維持 |
| ESLint の TypeScript 対応                      | `@typescript-eslint` プラグイン未導入。型チェックは `npx tsc --noEmit` で代替            |

---

## リスクと対策

| リスク                                                      | 影響                             | 対策                                                                                                            |
| ----------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Phase 2 でテストが import パス変更により壊れる              | テスト不能期間が発生             | `node --experimental-strip-types` で TypeScript ソースを直接 import。tsx/esm は Node.js 22 と非互換のため不採用 |
| Phase 3 の Hono 導入でレスポンスヘッダーが微妙に変わる      | ステージングスモークテストが失敗 | Hono 導入前後でレスポンスヘッダーの diff を取り、完全一致を確認                                                 |
| Phase 4 の Preact 導入でバンドルサイズが増加                | 初回ロード性能が劣化             | Vite ビルド結果: JS 38.7KB (gzip: 15.3KB)、CSS 5.9KB (gzip: 1.8KB)                                              |
| OGP 生成の `<title>` 置換が Vite ビルド後の HTML で動かない | SNS シェア時にメタ情報が欠落     | `src/index.html` に文字列を保持し、Vite が変更しないことを確認済み                                              |

---

## 参考: ファイル変遷

| ファイル（リファクタリング前） | 行数  | リファクタリング後                                                |
| ------------------------------ | ----- | ----------------------------------------------------------------- |
| `worker.js`                    | 795   | 削除 → `worker/` 以下 11 ファイルに分割（合計約 900 行）          |
| `public/index.html`            | 1,106 | 削除 → `src/` 以下 15 ファイルに分割（合計約 800 行 + style.css） |
| `public/js/tagImages.js`       | 234   | 削除 → `src/data/tagImages.ts` に移動（名前付きエクスポート化）   |
| `server.js`                    | 181   | 削除                                                              |
| `getBadgeTexture.ts`           | -     | `tools/getBadgeTexture.ts` へ移動（削除しない）                   |
| `tests/worker.test.mjs`        | 1,424 | import パス調整のみ（テストロジック変更なし、46件全件パス維持）   |
| -                              | -     | 新規: `tsconfig.json`（Worker 用）                                |
| -                              | -     | 新規: `tsconfig.app.json`（フロントエンド用）                     |
| -                              | -     | 新規: `vite.config.ts`                                            |
