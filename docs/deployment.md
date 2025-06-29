# デプロイメント手順

## 1. Supabase セットアップ

### Step 1: プロジェクト作成
1. [Supabase](https://supabase.com) でアカウント作成
2. 新しいプロジェクトを作成
3. データベースパスワードを設定

### Step 2: データベース設定
1. Supabase Dashboard → SQL Editor
2. `supabase/config.sql` の内容を実行
3. `supabase/seed.sql` の内容を実行（デモデータ）

### Step 3: 認証設定
1. Settings → Authentication
2. Email確認を無効化（開発時）
3. anon key と service_role key をコピー

## 2. 環境変数設定

```bash
# intimate-chat/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. 開発環境起動

```bash
cd intimate-chat
npm install
npx expo start
```

## 4. EAS Build & Deploy

### Step 1: EAS CLI セットアップ
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Step 2: ビルド実行
```bash
# Android APK
eas build --platform android --profile preview

# iOS (TestFlight)
eas build --platform ios --profile production

# 両方同時
eas build --platform all --profile production
```

### Step 3: ストア公開
```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

## 5. 本番環境最適化

### データベース最適化
```sql
-- パフォーマンス監視
SELECT * FROM pg_stat_user_tables 
WHERE relname IN ('messages', 'users', 'chat_rooms');
```

### セキュリティ設定
- Row Level Security 有効化確認
- API制限設定（Rate Limiting）
- 自動バックアップ設定

## 6. モニタリング

### アプリケーション監視
- Expo Analytics
- Supabase Dashboard メトリクス
- エラー追跡（Sentry推奨）

### パフォーマンス監視
- データベースクエリ最適化
- リアルタイム接続監視
- モバイルバッテリー使用量監視