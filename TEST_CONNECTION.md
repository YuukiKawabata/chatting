# Supabase接続テスト手順

## 1. テスト画面への切り替え

### 方法1: App.tsxを一時的に変更（推奨）

`App.tsx` を以下のように変更してテスト画面を表示：

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// テスト画面をインポート
import { TestScreen } from './src/screens';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <TestScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### 方法2: 既存のApp.tsxに切り替えスイッチを追加

```typescript
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import screens
import { LoginScreen, ChatScreen, TestScreen } from './src/screens';

// Import hooks
import { useAuth } from './src/hooks/useAuth';
import { useTheme } from './src/hooks/useTheme';

// テストモード切り替え（開発時のみ）
const SHOW_TEST_SCREEN = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme, isLoading: themeLoading } = useTheme();

  // テスト画面を表示
  if (SHOW_TEST_SCREEN) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <TestScreen />
      </View>
    );
  }

  // 通常のアプリフロー
  if (authLoading || themeLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {user ? <ChatScreen /> : <LoginScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

## 2. 環境変数の設定

**重要**: テストを実行する前に環境変数を設定する必要があります。

### `.env` ファイルの作成

```bash
# プロジェクトルートで実行
cp .env.example .env
```

### `.env` ファイルの編集

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Development Settings
EXPO_PUBLIC_DEV_MODE=true
NODE_ENV=development
```

**注意**: `your-project-ref` と anon key は実際のSupabaseプロジェクトの値に置き換えてください。

## 3. アプリの起動

```bash
# 依存関係のインストール（初回のみ）
npm install

# Expoサーバーの起動
npm start

# または
expo start --clear
```

## 4. テストの実行

1. アプリが起動したら「テスト開始」ボタンをタップ
2. 各テスト項目の結果を確認
3. 失敗したテストがある場合は詳細をタップして確認

## 5. テスト項目の説明

### ✅ Supabase URL設定確認
- 環境変数 `EXPO_PUBLIC_SUPABASE_URL` が正しく設定されているかチェック

### ✅ Supabase Anon Key設定確認
- 環境変数 `EXPO_PUBLIC_SUPABASE_ANON_KEY` が正しく設定されているかチェック

### ✅ Supabaseクライアント初期化
- Supabaseクライアントが正常に初期化されているかチェック

### ✅ データベース接続テスト
- データベースへの接続と基本的なクエリ実行をテスト
- usersテーブルへのアクセスを確認

### ✅ Authサービステスト
- 認証サービスの動作をテスト
- セッション情報の取得を確認

### ✅ Realtimeサービステスト
- リアルタイム機能の接続をテスト
- WebSocket接続の確立を確認

### ✅ Storageサービステスト
- ストレージサービスの動作をテスト
- バケット一覧の取得を確認

## 6. よくあるエラーと対処法

### 「Supabase URL and Anon Key are required」
- `.env` ファイルが存在し、正しい値が設定されているか確認
- Expo を再起動: `expo start --clear`

### 「Database connection failed」
- Supabaseプロジェクトでテーブルが作成されているか確認
- `supabase/config.sql` を実行

### 「Realtime connection timeout」
- インターネット接続を確認
- Supabaseプロジェクトのステータスを確認

### 「Storage access denied」
- `chat-files` バケットが作成されているか確認
- バケットの公開設定を確認

## 7. テスト完了後

テストが完了したら、`App.tsx` を元に戻して通常のアプリフローに戻します：

```typescript
// 元のApp.tsxの内容に戻す
const SHOW_TEST_SCREEN = false; // または .env の DEV_MODE を false に
```

## 8. 次のステップ

すべてのテストがパスしたら：

1. ユーザー登録テスト
2. ログインテスト  
3. メッセージ送受信テスト
4. リアルタイム機能テスト

を実際のアプリ画面で確認してください。