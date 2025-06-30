-- =====================================
-- Supabase データベース リセット用SQL
-- =====================================
-- このファイルは開発中にデータベースを完全にリセットする際に使用します
-- 本番環境では絶対に実行しないでください！

-- 使用方法:
-- 1. Supabase Dashboard > SQL Editor でこのファイルの内容を実行
-- 2. その後、config.sqlを実行してテーブルを再作成

-- ⚠️  警告: このスクリプトはすべてのデータを削除します！

-- =====================================
-- 1. テーブル削除 (依存関係順)
-- =====================================

-- 依存テーブルから順に削除
DROP TABLE IF EXISTS user_push_tokens CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS typing_status CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
-- usersテーブルは削除（auth.usersのみ使用）
-- DROP TABLE IF EXISTS users CASCADE;

-- =====================================
-- 2. 関数とトリガー削除
-- =====================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =====================================
-- 3. ポリシー削除 (自動的に削除されるが明示的に記述)
-- =====================================

-- テーブル削除時に自動的に削除されますが、
-- 必要に応じて個別に削除することも可能:

-- DROP POLICY IF EXISTS "Users can view own profile" ON users;
-- DROP POLICY IF EXISTS "Users can update own profile" ON users;
-- DROP POLICY IF EXISTS "Users can insert own profile" ON users;
-- 他のポリシーも同様...

-- =====================================
-- 4. インデックス削除 (自動的に削除されるが参考用)
-- =====================================

-- テーブル削除時に自動的に削除されます
-- 個別削除が必要な場合:
-- DROP INDEX IF EXISTS idx_messages_room_created;
-- DROP INDEX IF EXISTS idx_messages_sender;
-- DROP INDEX IF EXISTS idx_reactions_message;
-- 他のインデックスも同様...

-- =====================================
-- 実行後の確認
-- =====================================

-- テーブル一覧を確認 (publicスキーマのみ)
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- =====================================
-- 次のステップ
-- =====================================

-- このスクリプト実行後:
-- 1. config.sqlを実行してテーブルを再作成
-- 2. seed.sqlを実行して初期データを投入（オプション）
-- 3. アプリケーションで新規登録をテスト
--    注意: ユーザー情報はauth.usersのmetadataに保存されます

-- =====================================
-- 部分的リセット用 (開発時に便利)
-- =====================================

-- データのみ削除（テーブル構造は保持）:
-- TRUNCATE TABLE user_push_tokens RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE notification_settings RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE reactions RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE messages RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE typing_status RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE user_presence RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE room_participants RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE chat_rooms RESTART IDENTITY CASCADE;
-- 注意: usersテーブルは使用しません（auth.usersを使用）

-- =====================================
-- 完了メッセージ
-- =====================================

SELECT 'データベースリセット完了 - config.sqlを実行してテーブルを再作成してください' as status;