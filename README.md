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

## ディレクトリ構成

```
.
├── server.js          # Express サーバー
├── package.json       # パッケージ設定
├── package-lock.json  # 依存関係のロックファイル
├── public/            # 静的ファイル
│   ├── index.html     # フロントエンドアプリ
│   └── js/
│       └── tagImages.js  # タグ画像関連処理
├── node_modules/      # npm依存関係
└── README.md          # このファイル
```

## API エンドポイント

- `GET /api/users?name={名前}` - ユーザー名でユーザー検索
- `GET /api/users/{ユーザーID}` - 特定ユーザーの詳細情報取得

## 利用しているAPI

このアプリは以下のResonite公式APIを使用しています:
- `https://api.resonite.com/users/?name={名前}`
- `https://api.resonite.com/users/{ユーザーID}`

## 開発環境

- Node.js 14.x以上
- npm 6.x以上

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。