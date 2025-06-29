# TODO: 親密チャットアプリ実装タスク

## 📋 実装が必要な項目

### 🔧 高優先度

#### **Supabaseクライアント統合**
- [ ] 認証フック (useAuth) のSupabase対応
- [ ] リアルタイム購読 (useSocket → useRealtime) 
- [ ] メッセージ管理 (useMessages) のSupabase対応

#### **Redux Store の更新**
- [ ] authSlice の Supabase Auth 対応
- [ ] chatSlice の Supabase Realtime 対応
- [ ] RTK Query 統合

#### **コンポーネント更新**
- [ ] LoginScreen - Supabase Auth UI
- [ ] ChatScreen - リアルタイム機能
- [ ] MessageBubble - 新しいメッセージ形式対応

### 🎨 中優先度  

#### **新機能実装**
- [ ] タイピング表示システム
- [ ] プレゼンス機能
- [ ] ファイルアップロード (Supabase Storage)
- [ ] プッシュ通知

#### **UI/UX 改善**
- [ ] テーマシステムの拡張
- [ ] アニメーション強化
- [ ] レスポンシブデザイン最適化

### 🧪 低優先度

#### **テスト実装** 
- [ ] コンポーネントテスト
- [ ] フック単体テスト
- [ ] E2Eテスト

#### **パフォーマンス最適化**
- [ ] メモリ使用量最適化
- [ ] バッテリー消費最適化
- [ ] ネットワーク効率化

### 🚀 デプロイメント準備

#### **EAS設定完了**
- [ ] ビルド設定ファイル確認
- [ ] 環境変数設定
- [ ] アプリアイコン・スプラッシュ画面

#### **ストア公開準備**
- [ ] アプリストア説明文
- [ ] スクリーンショット作成
- [ ] プライバシーポリシー

## 📝 備考

- ✅ プロジェクト構造整理完了
- ✅ 新しいSupabase + React Native構成に移行済み
- ✅ 古いSocket.IOベースの実装はarchiveフォルダに移動済み
- ✅ データベース設計・セットアップファイル作成済み
- ✅ ドキュメント整備完了

## 🎯 次のステップ

1. **Supabaseプロジェクト作成** - [Supabase Console](https://supabase.com)
2. **データベース初期化** - `supabase/config.sql` を実行
3. **環境変数設定** - `.env` ファイル作成
4. **依存関係インストール** - `npm install`
5. **開発開始** - 高優先度タスクから実装

## 📱 開発環境確認コマンド

```bash
# プロジェクトディレクトリで実行
cd intimate-chat

# 依存関係確認
npm list --depth=0

# 型チェック
npm run type-check

# リント確認
npm run lint

# 開発サーバー起動
npm start
```