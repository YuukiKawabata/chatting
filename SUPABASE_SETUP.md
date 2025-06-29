# Supabase環境構築手順

このドキュメントでは、親密チャットアプリケーションのSupabase環境を構築する手順を説明します。

## 前提条件

- Supabaseアカウント（https://supabase.com で無料登録）
- Node.js と npm/yarn がインストール済み
- Expo CLI がインストール済み

## 1. Supabaseプロジェクト作成

### 1.1 新しいプロジェクトを作成

1. [Supabase ダッシュボード](https://app.supabase.com) にログイン
2. 「New project」をクリック
3. 以下の設定で作成：
   - **Name**: `intimate-chat` (任意の名前)
   - **Database Password**: 強力なパスワードを設定
   - **Region**: `Northeast Asia (Tokyo)` (日本の場合)
4. 「Create new project」をクリック

### 1.2 プロジェクト情報の確認

プロジェクト作成後、以下の情報を控えておきます：

- **Project URL**: `https://your-project-ref.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

これらは「Settings」→「API」で確認できます。

## 2. データベース設定

### 2.1 SQLエディタでテーブル作成

1. Supabaseダッシュボードで「SQL Editor」を開く
2. 新しいクエリを作成
3. `supabase/config.sql` の内容をコピーして実行

```sql
-- ファイルの内容をそのまま実行
-- users, chat_rooms, messages などのテーブルが作成されます
```

### 2.2 Row Level Security (RLS) の確認

テーブル作成時に RLS ポリシーも自動的に設定されます。「Authentication」→「Policies」で確認できます。

### 2.3 Storageバケットの作成

1. 「Storage」タブを開く
2. 「Create bucket」をクリック
3. 以下の設定でバケットを作成：
   - **Name**: `chat-files`
   - **Public**: チェックを入れる
4. 作成後、「Policies」タブでアクセス権限を設定

## 3. Authentication設定

### 3.1 認証プロバイダー設定

1. 「Authentication」→「Settings」を開く
2. 「Auth Providers」で以下を設定：
   - **Email**: 有効化
   - **Confirm email**: 開発中は無効化可能（本番では有効化推奨）

### 3.2 メール設定（オプション）

本番環境では、メール送信設定を行うことを推奨します。

## 4. アプリケーション設定

### 4.1 環境変数ファイルの作成

プロジェクトルートで `.env` ファイルを作成：

```bash
cp .env.example .env
```

### 4.2 環境変数の設定

`.env` ファイルを以下の内容で更新：

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Expo設定
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id

# Development Settings
EXPO_PUBLIC_DEV_MODE=true
NODE_ENV=development
```

**重要**: 実際の値に置き換えてください。

### 4.3 app.json の更新（オプション）

`app.json` に Supabase 設定を追加することも可能：

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://your-project-ref.supabase.co",
      "supabaseAnonKey": "your-anon-key-here"
    }
  }
}
```

## 5. 接続テスト

### 5.1 テストコンポーネントの実行

アプリケーションに `SupabaseConnectionTest` コンポーネントを追加してテストを実行：

```typescript
import { SupabaseConnectionTest } from './src/components';

// App.tsx や適当な画面に追加
<SupabaseConnectionTest />
```

### 5.2 テスト項目

以下の項目がテストされます：

1. ✅ Supabase URL設定確認
2. ✅ Supabase Anon Key設定確認  
3. ✅ Supabaseクライアント初期化
4. ✅ データベース接続テスト
5. ✅ Authサービステスト
6. ✅ Realtimeサービステスト
7. ✅ Storageサービステスト

## 6. 初期データの投入（オプション）

### 6.1 デモ用ルームの作成

```sql
-- デモ用チャットルームを作成
INSERT INTO chat_rooms (id, name, room_type, created_by) 
VALUES ('00000000-0000-0000-0000-000000000001', 'デモルーム', '1on1', NULL);
```

### 6.2 デモ用ユーザーの作成

認証画面から実際にユーザー登録を行ってテストしてください。

## 7. トラブルシューティング

### よくある問題と解決方法

#### 7.1 「Supabase URL and Anon Key are required」エラー

**原因**: 環境変数が正しく設定されていない

**解決策**:
1. `.env` ファイルが存在し、正しい値が設定されているか確認
2. Expo を再起動: `expo start --clear`
3. 環境変数名が `EXPO_PUBLIC_` プレフィックス付きか確認

#### 7.2 「Failed to connect to database」エラー

**原因**: データベーステーブルが作成されていない、または RLS の設定問題

**解決策**:
1. `supabase/config.sql` が正しく実行されているか確認
2. Supabase ダッシュボードの「Table Editor」でテーブルを確認
3. RLS ポリシーが正しく設定されているか確認

#### 7.3 「Auth サービス エラー」

**原因**: 認証設定の問題

**解決策**:
1. 「Authentication」→「Settings」で Email プロバイダーが有効化されているか確認
2. 「Confirm email」設定を確認

#### 7.4 「Storage サービス エラー」

**原因**: Storageバケットが作成されていない

**解決策**:
1. `chat-files` バケットが作成されているか確認
2. バケットのアクセス権限（RLS ポリシー）を確認

## 8. 本番環境への展開

### 8.1 セキュリティ設定

本番環境では以下を実施：

1. **RLS ポリシーの厳格化**
2. **API キーの適切な管理**
3. **CORS 設定の制限**
4. **メール認証の有効化**
5. **定期的なバックアップ設定**

### 8.2 スケーリング考慮事項

- データベース接続数制限
- Realtime 接続数制限  
- Storage 容量制限
- 従量課金の監視

## 9. 参考リンク

- [Supabase ドキュメント](https://supabase.com/docs)
- [Supabase React Native クイックスタート](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Row Level Security ガイド](https://supabase.com/docs/guides/auth/row-level-security)
- [Expo 環境変数ガイド](https://docs.expo.dev/guides/environment-variables/)

---

## チェックリスト

設定完了後、以下をチェック：

- [ ] Supabase プロジェクト作成完了
- [ ] データベーステーブル作成完了
- [ ] Storage バケット作成完了
- [ ] 環境変数設定完了
- [ ] 接続テスト全項目パス
- [ ] ユーザー登録・ログイン動作確認
- [ ] メッセージ送受信動作確認
- [ ] リアルタイム機能動作確認

すべて完了したら、親密チャットアプリケーションが Supabase と完全に統合された状態になります！