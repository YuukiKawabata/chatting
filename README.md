# 親密チャットアプリケーション

React Native + Supabaseによるリアルタイム親密チャットアプリ

## 🎯 概要

親密なパートナー間での特別なコミュニケーションを可能にするモバイルチャットアプリケーションです。

### ✨ 主要機能

- 💬 **リアルタイムメッセージング** - Supabase Realtime
- 🔐 **セキュアな認証** - Supabase Auth
- 😍 **リアクション機能** - ❤️ 😊 ⚡ ☕ ⭐
- ⌨️ **タイピング表示** - リアルタイムプレビュー
- 🎨 **テーマシステム** - 4つのテーマ (cute, cool, minimal, warm)
- 👆 **タッチ位置共有** - 親密な体験
- 🟢 **プレゼンス機能** - オンライン/オフライン状態
- 📁 **ファイル共有** - 画像・ファイルアップロード

## 🏗️ 技術スタック

### フロントエンド
- **React Native** - クロスプラットフォーム開発
- **Expo SDK 53+** - 開発・ビルド・デプロイ統合
- **TypeScript** - 型安全性
- **Redux Toolkit** - 状態管理
- **React Navigation** - ナビゲーション
- **MMKV** - 高速ローカルストレージ

### バックエンド
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - リレーショナルデータベース
- **Row Level Security** - データベースレベルセキュリティ
- **Realtime** - WebSocketリアルタイム通信
- **Storage** - ファイルストレージ

## 🚀 クイックスタート

### 1. 環境準備

```bash
# Node.js 18+ 確認
node --version

# Expo CLI インストール
npm install -g @expo/cli

# プロジェクトクローン
git clone <repository-url>
cd chatting/intimate-chat

# 依存関係インストール
npm install
```

### 2. Supabase セットアップ

1. [Supabase](https://supabase.com) でプロジェクト作成
2. SQL Editor で `supabase/config.sql` を実行
3. デモデータ用に `supabase/seed.sql` を実行
4. API keys を取得

### 3. 環境変数設定

```bash
# .env ファイル作成
cp .env.example .env

# 以下を設定
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. アプリ起動

```bash
# 開発サーバー起動
npx expo start

# iOS シミュレータ
npx expo start --ios

# Android エミュレータ
npx expo start --android
```

## 📂 プロジェクト構造

```
chatting/
├── intimate-chat/           # React Native アプリ
│   ├── src/
│   │   ├── components/      # 再利用可能コンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── screens/        # 画面コンポーネント
│   │   ├── services/       # API・外部サービス
│   │   ├── store/          # Redux状態管理
│   │   ├── styles/         # スタイル・テーマ
│   │   ├── types/          # TypeScript型定義
│   │   ├── utils/          # ユーティリティ
│   │   └── lib/            # ライブラリ設定
│   ├── .env.example        # 環境変数例
│   ├── eas.json           # EAS設定
│   └── package.json       # 依存関係
├── supabase/              # データベース設定
│   ├── config.sql         # テーブル定義
│   ├── seed.sql          # 初期データ
│   └── functions/        # Edge Functions
├── docs/                 # ドキュメント
└── archive/             # 古いファイル
```

## 🛠️ 開発

### 型チェック
```bash
npm run type-check
```

### リント
```bash
npm run lint
```

### テスト
```bash
npm test
```

### ビルド（EAS）
```bash
# Android
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile production
```

## 📚 ドキュメント

- [API仕様](docs/api.md)
- [データベース設計](docs/database.md)
- [デプロイメント手順](docs/deployment.md)
- [詳細設計](CLAUDE.md)

## 🔒 セキュリティ

- JWT認証（Supabase Auth）
- Row Level Security（データベースレベル）
- HTTPS/WSS強制通信
- 入力検証・サニタイゼーション

## 📱 対応プラットフォーム

- iOS 12.0+
- Android API Level 21+
- Web（PWA対応）

## 🤝 貢献

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 ライセンス

このプロジェクトは MIT License の下で公開されています。

## 🔒 セキュリティ

### **重要**: 機密情報の取り扱い
- **絶対にコミットしない**: API キー、トークン、パスワード
- **ローカル設定**: `.mcp.local.json` を使用
- **環境変数**: 本番環境では環境変数を使用

```bash
# ❌ 危険 - コミットしない
.mcp.json (トークン含む)

# ✅ 安全 - ローカルのみ
.mcp.local.json (gitignore済み)
.env.local (gitignore済み)
```

## 📞 サポート

- 📧 Email: [your-email@example.com]  
- 🐛 Issues: [GitHub Issues](https://github.com/YuukiKawabata/chatting/issues)
- 📖 Documentation: [詳細ドキュメント](CLAUDE.md)