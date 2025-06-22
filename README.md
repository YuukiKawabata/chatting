# Intimate Chat Application

リアルタイムチャット機能を持つ親密なコミュニケーションアプリケーション

## プロジェクト構成

### フロントエンド
- **React Native アプリ** (`intimate-chat/`)
  - Expo を使用したクロスプラットフォーム対応
  - リアルタイムメッセージング
  - テーマ切り替え機能
  - タッチインジケーター機能

### バックエンド
- **Node.js サーバー** (`intimate-chat-backend.js`)
  - Socket.IO を使用したリアルタイム通信
  - Express.js ベースのREST API
  - ユーザー認証機能

### その他のファイル
- `intimate-chat-frontend-realtime.tsx` - フロントエンドコンポーネント
- `intimate-chat-technical-specs.md` - 技術仕様書
- `CLAUDE.md` - AI アシスタント用指示書

## 技術スタック

### フロントエンド
- React Native
- Expo
- TypeScript
- Socket.IO Client

### バックエンド
- Node.js
- Express.js
- Socket.IO
- CORS対応

## セットアップ

### バックエンド
```bash
node intimate-chat-backend.js
```

### フロントエンド（React Native）
```bash
cd intimate-chat
npm install
npx expo start
```

## 機能

- ✅ リアルタイムメッセージング
- ✅ ユーザー認証
- ✅ テーマ切り替え
- ✅ タッチインジケーター
- ✅ 接続状態表示
- ✅ レスポンシブデザイン

## ライセンス

MIT License
