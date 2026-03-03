# Worker API 契約（v1）

Cloudflare Worker経由でフロントエンドが依存するAPI契約を明文化したドキュメントです。

## 共通仕様

- ベースURL: `/api`
- JSONレスポンス: `Content-Type: application/json; charset=utf-8`
- すべてのAPIレスポンスに `X-Request-Id` を付与
- CORS: `Access-Control-Allow-Methods: GET,HEAD,POST,OPTIONS`
- CORS: `Access-Control-Expose-Headers` で `X-Request-Id`, `X-RateLimit-*`, `X-Worker-Cache`, `Server-Timing` を参照可能
- レート制限ヘッダー: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- APIレスポンスには `X-Robots-Tag: noindex, nofollow`
- 観測用ヘッダー: `Server-Timing`（`upstream` / `edge-cache` / `kv-cache`）

## 1. ユーザー検索

### Request

- Method: `GET` / `HEAD`
- Path: `/api/users`
- Query:
  - `name` (必須): 検索文字列

### Response

- `200 OK`:
  - 配列レスポンス（Resonite `/users/?name=` の透過）
  - `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=30, stale-if-error=600`
  - フロント側の主な依存項目
    - `id`
    - `username`
    - `profile.iconUrl`
    - `tags[]`
- `400 Bad Request`: `name` がない場合
- `5xx` / `4xx`（上流API応答）: `{"error":"API returned <status>"}`
- `429 Too Many Requests`: レート制限超過

## 2. ユーザー詳細

### Request

- Method: `GET` / `HEAD`
- Path: `/api/users/{userId}`

### Response

- `200 OK`:
  - オブジェクトレスポンス（Resonite `/users/{id}` の透過）
  - `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=30, stale-if-error=600`
  - フロント側の主な依存項目
    - `id`
    - `username`
    - `registrationDate`
    - `profile.iconUrl`
    - `tags[]`
    - `migratedData.registrationDate`（存在する場合）
- `400 Bad Request`: `userId` が空
- `5xx` / `4xx`（上流API応答）: `{"error":"API returned <status>"}`
- `429 Too Many Requests`: レート制限超過

## 3. セッション一覧

### Request

- Method: `GET` / `HEAD`
- Path: `/api/sessions`

### Response

- `200 OK`:
  - 配列レスポンス（Resonite `/sessions?minActiveUsers=1&includeEmptyHeadless=false` の透過）
  - `Cache-Control: public, max-age=30, s-maxage=120, stale-while-revalidate=15, stale-if-error=300`
  - フロント側の主な依存項目
    - `name`
    - `sessionId`
    - `sessionUsers[]`
      - `userID`
      - `isPresent`
- `429 Too Many Requests`: レート制限超過
- `5xx` / `4xx`（上流API応答）: `{"error":"API returned <status>"}`

## 4. ワールド検索

### Request

- Method: `POST`
- Path: `/api/worlds`
- Body: JSON（Resonite `/records/pagedSearch` へ透過）

### Response

- `200 OK`: JSONオブジェクト（上流レスポンス透過）
- `400 Bad Request`: 不正なJSON
- `429 Too Many Requests`: レート制限超過
- `5xx` / `4xx`（上流API応答）: `{"error":"API returned <status>"}`

## 5. ヘルスチェック

### Request

- Method: `GET` / `HEAD`
- Path: `/api/health`

### Response

- `200 OK`
  - `GET` の場合: `{ "status": "ok", "service": "resonite-profile-worker", "now": "..." }`
  - `HEAD` の場合: ボディなし
- `Cache-Control: no-store`
- レート制限対象外

## 6. OGPページ

### Request

- Method: `GET`
- Path: `/user/{userId}`

### Response

- `200 OK` HTML
- `public/index.html` をベースに、可能な場合はユーザー情報を取得して OGP / Twitter メタタグを注入
- `Cache-Control: no-store`
