# CLAUDE.md

ユーザーとのやり取りは日本語を使用してください。

このファイルは、このリポジトリのコードを作業する際にClaude Code (claude.ai/code) にガイダンスを提供します。

## 🎯 プロジェクト概要

**親密なチャットアプリケーション** - React Native + Supabaseによるシンプル構成

### 📱 **アプリケーション構成**
- **モバイルアプリ**: React Native (Expo) - iOS/Android対応
- **バックエンド**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **デプロイメント**: Expo Application Services + Supabase Cloud

### 🌟 **主要機能**
- ✅ **リアルタイムメッセージング** - Supabase Realtime
- ✅ **ユーザー認証** - Supabase Auth (auth.usersのみ使用)
- ✅ **リアクション** - 絵文字リアクション (❤️ 😊 ⚡ ☕ ⭐)
- ✅ **タイピング表示** - リアルタイムタイピングステータス
- ✅ **テーマシステム** - 4つのテーマ (cute, cool, minimal, warm)
- ✅ **タッチ位置共有** - 親密なパートナー向け機能
- ✅ **プレゼンス機能** - オンライン/オフライン状態
- ✅ **ファイル共有** - 画像・ファイルアップロード

## 🏗️ アーキテクチャ

### 📐 **システム構成**

```
┌─────────────────────────────────┐
│        React Native App         │
│    (Expo + TypeScript)          │
│  ┌─────────────────────────────┐ │
│  │     Frontend Components     │ │
│  │  • ChatScreen               │ │
│  │  • LoginScreen              │ │
│  │  • MessageBubble            │ │
│  │  • ReactionPicker           │ │
│  │  • ThemeSelector            │ │
│  │  • TouchIndicator           │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │       State Management      │ │
│  │  • Redux Toolkit + RTK Query│ │
│  │  • Real-time Subscriptions │ │
│  │  • auth.users メタデータ   │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │      Supabase Client        │ │
│  │  • Database Operations     │ │
│  │  • Authentication          │ │
│  │  • Real-time Subscriptions │ │
│  │  • File Storage            │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
                 │
                 │ HTTPS/WSS
                 ▼
┌─────────────────────────────────┐
│           Supabase              │
│  ┌─────────────────────────────┐ │
│  │      PostgreSQL Database    │ │
│  │  • auth.users (標準)       │ │
│  │  • chat_rooms               │ │
│  │  • messages                 │ │
│  │  • reactions                │ │
│  │  • typing_status            │ │
│  │  • user_presence            │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │      Authentication         │ │
│  │  • JWT Token Management     │ │
│  │  • Social Auth (Optional)   │ │
│  │  • Row Level Security       │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │      Real-time Engine       │ │
│  │  • WebSocket Connections    │ │
│  │  • Change Data Capture      │ │
│  │  • Presence System          │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │         Storage             │ │
│  │  • Media Files              │ │
│  │  • Profile Images           │ │
│  │  • File Attachments         │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 🔧 **技術スタック**

#### **フロントエンド**
- **React Native** - クロスプラットフォームモバイル開発
- **Expo SDK 52+** - 開発・ビルド・デプロイ統合環境
- **TypeScript** - 型安全な開発
- **Redux Toolkit** - 状態管理
- **React Navigation v6** - ナビゲーション
- **React Native Reanimated 3** - アニメーション
- **auth.users metadata** - ユーザー情報保存

#### **バックエンド**
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - リレーショナルデータベース
- **Supabase Auth** - 認証・ユーザー管理 (auth.usersテーブル)
- **Row Level Security** - データベースレベルセキュリティ
- **Realtime** - WebSocketベースリアルタイム通信
- **Storage** - ファイルストレージ

## 📂 プロジェクト構造

```
chatting/
├── intimate-chat/                    # React Native アプリ
│   ├── app.json                      # Expo設定
│   ├── App.tsx                       # アプリエントリーポイント
│   ├── package.json                  # 依存関係
│   ├── tsconfig.json                 # TypeScript設定
│   └── src/
│       ├── components/               # 再利用可能コンポーネント
│       │   ├── ConnectionStatus.tsx  # 接続状態表示
│       │   ├── InputArea.tsx         # メッセージ入力エリア
│       │   ├── MessageBubble.tsx     # メッセージ表示
│       │   ├── ReactionPicker.tsx    # リアクション選択
│       │   ├── ThemeSelector.tsx     # テーマ選択
│       │   └── TouchIndicator.tsx    # タッチ位置表示
│       ├── hooks/                    # カスタムフック
│       │   ├── useAuth.ts            # 認証管理
│       │   ├── useMessages.ts        # メッセージ管理
│       │   ├── useSocket.ts          # リアルタイム接続
│       │   └── useTheme.ts           # テーマ管理
│       ├── screens/                  # 画面コンポーネント
│       │   ├── ChatScreen.tsx        # チャット画面
│       │   └── LoginScreen.tsx       # ログイン画面
│       ├── services/                 # API・外部サービス
│       │   ├── apiService.ts         # API通信
│       │   └── socketService.ts      # WebSocket通信
│       ├── store/                    # 状態管理
│       │   ├── index.ts              # ストア設定
│       │   └── slices/               # Redux slices
│       │       ├── authSlice.ts      # 認証状態
│       │       ├── chatSlice.ts      # チャット状態
│       │       └── themeSlice.ts     # テーマ状態
│       ├── styles/                   # スタイル定義
│       │   └── themes.ts             # テーマ定義
│       ├── types/                    # 型定義
│       │   └── index.ts              # 共通型定義
│       └── utils/                    # ユーティリティ
│           ├── constants.ts          # 定数定義
│           ├── helpers.ts            # ヘルパー関数
│           └── validations.ts        # バリデーション
├── supabase/                         # Supabase設定
│   ├── config.sql                    # データベース設定
│   ├── seed.sql                      # 初期データ
│   └── functions/                    # Edge Functions
├── docs/                             # ドキュメント
│   ├── api.md                        # API仕様
│   ├── database.md                   # DB設計
│   └── deployment.md                 # デプロイ手順
├── .mcp.json                         # MCP設定
├── CLAUDE.md                         # このファイル
└── README.md                         # プロジェクト概要
```

## 💾 データベース設計

### 📊 **ERD (Entity Relationship Diagram)**

🎯 **設計方針**: auth.usersのみ使用（独自usersテーブルなし）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │     │   chat_rooms    │     │    messages     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID) PK    │────┐│ id (UUID) PK    │────┐│ id (UUID) PK    │
│ email           │    ││ name            │    ││ room_id FK      │
│ user_metadata:  │    ││ room_type       │    ││ sender_id FK    │
│  - username     │    ││ created_by FK   │    ││ content         │
│  - display_name │    ││ created_at      │    ││ message_type    │
│  - theme_prefer │    ││ updated_at      │    ││ metadata        │
│ created_at      │    │└─────────────────┘    ││ reply_to FK     │
│ updated_at      │    │                       ││ is_deleted      │
└─────────────────┘    │                       ││ created_at      │
         │              │                       ││ updated_at      │
         │              │                       └─────────────────┘
         │              │                                │
         │              │       ┌─────────────────┐     │
         │              │       │   reactions     │     │
         │              │       ├─────────────────┤     │
         │              │       │ id (UUID) PK    │     │
         │              │       │ message_id FK   │─────┘
         │              │       │ user_id FK      │─────┐
         │              │       │ reaction_type   │     │
         │              │       │ created_at      │     │
         │              │       └─────────────────┘     │
         │              │                               │
         │              │       ┌─────────────────┐     │
         │              └───────│room_participants│     │
         │                      ├─────────────────┤     │
         └──────────────────────│ user_id FK      │     │
                                │ room_id FK      │─────┘
                                │ role            │
                                │ joined_at       │
                                │ last_read_at    │
                                └─────────────────┘
```

### 🗂️ **テーブル定義**

#### 1. **auth.users テーブル（Supabase標準）**
```sql
-- Supabaseが自動で作成・管理
-- ユーザー情報はuser_metadataに保存
-- 
-- 新規登録例:
-- supabase.auth.signUp({
--   email: 'user@example.com',
--   password: 'password',
--   options: {
--     data: {
--       username: 'myusername',
--       display_name: 'My Display Name',
--       theme_preference: 'cute'
--     }
--   }
-- })
--
-- プロファイル更新例:
-- supabase.auth.updateUser({
--   data: { theme_preference: 'cool' }
-- })
```

#### 2. **chat_rooms テーブル**
```sql
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    room_type VARCHAR(20) DEFAULT '1on1',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view joined rooms" ON chat_rooms FOR SELECT 
    USING (id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
```

#### 3. **room_participants テーブル**
```sql
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, user_id)
);

-- Row Level Security
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own participation" ON room_participants FOR SELECT 
    USING (user_id = auth.uid());
```

#### 4. **messages テーブル**
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    reply_to UUID REFERENCES messages(id),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in joined rooms" ON messages FOR SELECT 
    USING (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert messages in joined rooms" ON messages FOR INSERT 
    WITH CHECK (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
```

#### 5. **reactions テーブル**
```sql
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- Row Level Security
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reactions in joined rooms" ON reactions FOR SELECT 
    USING (message_id IN (
        SELECT m.id FROM messages m 
        JOIN room_participants rp ON m.room_id = rp.room_id 
        WHERE rp.user_id = auth.uid()
    ));
```

## 🛠️ セットアップ手順

### 1. **環境準備**

```bash
# Node.js 18+ インストール確認
node --version

# Expo CLI インストール
npm install -g @expo/cli

# プロジェクトディレクトリに移動
cd intimate-chat

# 依存関係インストール
npm install

# Supabase CLI インストール (オプション)
npm install -g supabase
```

### 2. **Supabase セットアップ**

#### **Step 1: Supabaseプロジェクト作成**
1. [Supabase](https://supabase.com) でアカウント作成
2. 新しいプロジェクトを作成
3. データベースパスワードを設定

#### **Step 2: データベース設定**
```sql
-- SQL Editor で実行
-- テーブル作成 (上記のテーブル定義を使用)

-- 注意: ユーザー情報はauth.usersテーブルに保存されます
-- 新規登録はSupabase Authのsignup APIで行います
-- 初期データ挿入は不要（auth.usersのmetadataで管理）
```

#### **Step 3: 認証設定**
- Settings → Authentication → Email確認を無効化 (開発時)
- Settings → API → anon keyとservice_role keyをコピー

### 3. **環境変数設定**

```bash
# intimate-chat/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. **アプリケーション起動**

```bash
# 開発サーバー起動
cd intimate-chat
npx expo start

# iOS シミュレータ
npx expo start --ios

# Android エミュレータ
npx expo start --android

# 実機テスト (Expo Go アプリ使用)
# QRコードをスキャン
```

## 🚀 デプロイメント手順

### 📱 **モバイルアプリ デプロイ**

#### **Step 1: Expo Application Services (EAS) セットアップ**
```bash
# EAS CLI インストール
npm install -g eas-cli

# Expo アカウントでログイン
eas login

# プロジェクト設定
eas build:configure
```

#### **Step 2: ビルド設定**
```json
// eas.json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

#### **Step 3: ビルド実行**
```bash
# Android APK ビルド
eas build --platform android --profile preview

# iOS TestFlight ビルド
eas build --platform ios --profile production

# 両方同時ビルド
eas build --platform all --profile production
```

#### **Step 4: ストア公開**
```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

### 🗄️ **Supabase 本番環境設定**

#### **Step 1: 本番データベース最適化**
```sql
-- インデックス作成
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_reactions_message ON reactions(message_id);
-- auth.usersのインデックスは不要（Supabaseが管理）

-- パフォーマンス監視
SELECT * FROM pg_stat_user_tables WHERE relname IN ('messages', 'users', 'chat_rooms');
```

#### **Step 2: セキュリティ強化**
```sql
-- Row Level Security 有効化 (全テーブル)
-- 注意: auth.usersテーブルはSupabaseが管理
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- API制限設定
-- Settings → API → Rate Limiting 設定
```

#### **Step 3: バックアップ設定**
- Settings → Database → Backups
- 自動バックアップを有効化
- Point-in-time recovery 設定

## 🔧 開発ワークフロー

### 🏃‍♂️ **日常的な開発手順**

```bash
# 1. 機能ブランチ作成
git checkout -b feature/new-message-reactions

# 2. 開発サーバー起動
cd intimate-chat
npx expo start

# 3. 変更をテスト
# - iOS シミュレータ
# - Android エミュレータ  
# - 実機 (Expo Go)

# 4. 型チェック
npx tsc --noEmit

# 5. リント
npx eslint src/

# 6. テスト実行
npm test

# 7. コミット
git add .
git commit -m "feat: add message reactions functionality"

# 8. プッシュ
git push origin feature/new-message-reactions
```

### 🧪 **テスト戦略**

```bash
# Jest + React Native Testing Library
npm install --save-dev jest @testing-library/react-native

# コンポーネントテスト例
// __tests__/MessageBubble.test.tsx
import { render, screen } from '@testing-library/react-native';
import MessageBubble from '../src/components/MessageBubble';

test('renders message content', () => {
  render(<MessageBubble message={{content: 'Hello World'}} />);
  expect(screen.getByText('Hello World')).toBeTruthy();
});
```

### 📊 **パフォーマンス監視**

```typescript
// パフォーマンス計測
import { performance } from 'perf_hooks';

const measureRenderTime = (componentName: string) => {
  const start = performance.now();
  // レンダリング処理
  const end = performance.now();
  console.log(`${componentName} render time: ${end - start}ms`);
};
```

## 🔒 セキュリティ考慮事項

### 🛡️ **認証・認可**
- **Supabase Auth**: JWT トークンベース認証
- **Row Level Security**: データベースレベルでのアクセス制御
- **API Key 管理**: 環境変数での機密情報管理

### 🚫 **入力検証**
```typescript
// バリデーション例
import { z } from 'zod';

const MessageSchema = z.object({
  content: z.string().min(1).max(1000),
  roomId: z.string().uuid(),
  messageType: z.enum(['text', 'image', 'file'])
});

export const validateMessage = (data: unknown) => {
  return MessageSchema.safeParse(data);
};
```

### 🔐 **データ暗号化**
- **通信**: HTTPS/WSS強制
- **保存**: Supabase自動暗号化
- **ファイル**: Supabase Storage暗号化

## 📈 パフォーマンス最適化

### ⚡ **リアルタイム最適化**
```typescript
// 効率的なSubscription管理
const useOptimizedSubscription = (roomId: string) => {
  useEffect(() => {
    const subscription = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, handleNewMessage)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);
};
```

### 🎯 **メモリ最適化**
```typescript
// React.memo でのコンポーネント最適化
const MessageBubble = React.memo(({ message }) => {
  return <View>{/* メッセージ表示 */}</View>;
}, (prevProps, nextProps) => {
  return prevProps.message.id === nextProps.message.id;
});
```

### 📱 **モバイル特有の最適化**
- **画像圧縮**: Expo ImageManipulator使用
- **キャッシュ**: MMKV高速ストレージ
- **バッテリー**: Background Task最適化

## 🚨 トラブルシューティング

### ❌ **よくある問題と解決策**

#### **1. Supabase接続エラー**
```typescript
// 接続状態確認
const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('chat_rooms').select('count');
    if (error) throw error;
    console.log('✅ Supabase connected');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
};
```

#### **2. リアルタイム機能不動作**
```typescript
// WebSocket状態確認
supabase.realtime.onOpen(() => console.log('✅ WebSocket connected'));
supabase.realtime.onClose(() => console.log('❌ WebSocket disconnected'));
supabase.realtime.onError((error) => console.error('WebSocket error:', error));
```

#### **3. 認証問題**
```typescript
// 認証状態デバッグ
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);
});
```

#### **4. 新規登録エラー "アカウント作成に失敗しました"**
**原因**: usersテーブルがauth.usersと連携していない、またはINSERTポリシーが不足

**解決策**:
⚡ **現在はauth.usersのみ使用** - 独自usersテーブルは不要

```typescript
// 新規登録例 (useAuth.ts)
const { data, error } = await supabase.auth.signUp({
  email: userData.email,
  password: userData.password,
  options: {
    data: {
      username: userData.username,
      display_name: userData.displayName || userData.username,
      theme_preference: 'cute'
    }
  }
});

// プロファイル更新例
const { data, error } = await supabase.auth.updateUser({
  data: { theme_preference: 'cool' }
});

// ユーザー情報取得例
const username = user?.user_metadata?.username;
const theme = user?.user_metadata?.theme_preference || 'cute';
```

#### **5. EAS Buildエラー "react-native-mmkv compilation failed"**
**原因**: React Native新アーキテクチャとの互換性問題

**解決策**:
```json
// app.json
"newArchEnabled": false
```
```json
// package.json から削除
// "react-native-mmkv": "^3.0.2"
```

### 🔍 **デバッグ手順**
1. **ログ確認**: `npx expo logs`
2. **ネットワーク**: React Native Debugger
3. **データベース**: Supabase Dashboard → Logs
4. **パフォーマンス**: Flipper使用

### 🗂️ **データベース管理**

#### **完全リセット**
```bash
# Supabase SQL Editorで実行
cat supabase/reset.sql  # 全テーブル削除
cat supabase/config.sql # テーブル再作成
```

#### **部分的リセット（データのみ削除）**
```sql
-- テーブル構造は保持してデータのみ削除
TRUNCATE TABLE reactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE messages RESTART IDENTITY CASCADE;
TRUNCATE TABLE room_participants RESTART IDENTITY CASCADE;
TRUNCATE TABLE chat_rooms RESTART IDENTITY CASCADE;
-- 注意: auth.usersテーブルは使用しません（Supabaseが管理）
```

## 📚 参考資料

### 📖 **公式ドキュメント**
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)

### 🎓 **学習リソース**
- [React Native Tutorial](https://reactnative.dev/docs/tutorial)
- [Supabase Getting Started](https://supabase.com/docs/guides/getting-started)
- [Expo Router](https://docs.expo.dev/router/introduction/)

### 🛠️ **開発ツール**
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/)
- [Expo Dev Tools](https://docs.expo.dev/debugging/tools/)

---

## 💡 開発のコツ

1. **段階的開発**: まず基本機能から実装
2. **テスト駆動**: 重要な機能は必ずテストを書く
3. **パフォーマンス優先**: モバイルではパフォーマンスが重要
4. **セキュリティ重視**: 認証・認可を最初から考慮
5. **ユーザビリティ**: モバイルUXを重視した設計

**🎯 目標**: シンプルで美しく、高性能な親密チャットアプリケーションの構築