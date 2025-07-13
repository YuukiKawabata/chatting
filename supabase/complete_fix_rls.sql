-- =====================================
-- 完全なRLSポリシー修正スクリプト
-- =====================================
-- 🎯 すべてのポリシーを削除してから新しいポリシーを作成

-- =====================================
-- Step 1: 全てのポリシーを完全削除
-- =====================================

-- chat_roomsテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Users can view joined rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they joined" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view all active rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Room creators can update rooms" ON chat_rooms;

-- room_participantsテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Users can view own participation" ON room_participants;
DROP POLICY IF EXISTS "System can manage participants" ON room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_participants;
DROP POLICY IF EXISTS "Room creators can manage participants" ON room_participants;

-- current_messagesテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Users can view messages in joined rooms" ON current_messages;
DROP POLICY IF EXISTS "Users can insert messages in joined rooms" ON current_messages;
DROP POLICY IF EXISTS "Users can view messages in rooms" ON current_messages;
DROP POLICY IF EXISTS "Users can send messages" ON current_messages;

-- reactionsテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Users can view reactions in joined rooms" ON reactions;
DROP POLICY IF EXISTS "Users can manage own reactions" ON reactions;

-- typing_statusテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Users can view typing status in joined rooms" ON typing_status;
DROP POLICY IF EXISTS "Users can update own typing status" ON typing_status;
DROP POLICY IF EXISTS "Users can view typing status" ON typing_status;
DROP POLICY IF EXISTS "Users can manage own typing status" ON typing_status;

-- user_presenceテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;

-- matching_queueテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Users can manage own queue entry" ON matching_queue;

-- =====================================
-- Step 2: シンプルで動作するポリシーを作成
-- =====================================

-- chat_rooms テーブル - シンプル版
CREATE POLICY "chat_rooms_select" ON chat_rooms FOR SELECT 
    TO authenticated USING (true); -- 認証済みユーザーはすべてのルーム閲覧可能

CREATE POLICY "chat_rooms_insert" ON chat_rooms FOR INSERT 
    TO authenticated WITH CHECK (created_by = auth.uid()); -- 自分を作成者として設定

CREATE POLICY "chat_rooms_update" ON chat_rooms FOR UPDATE
    TO authenticated USING (created_by = auth.uid()); -- 作成者のみ更新可能

-- room_participants テーブル - シンプル版
CREATE POLICY "room_participants_select" ON room_participants FOR SELECT 
    TO authenticated USING (true); -- すべての参加情報閲覧可能

CREATE POLICY "room_participants_insert" ON room_participants FOR INSERT
    TO authenticated WITH CHECK (user_id = auth.uid()); -- 自分自身の参加のみ追加可能

CREATE POLICY "room_participants_update" ON room_participants FOR UPDATE
    TO authenticated USING (user_id = auth.uid()); -- 自分の参加情報のみ更新可能

CREATE POLICY "room_participants_delete" ON room_participants FOR DELETE
    TO authenticated USING (user_id = auth.uid()); -- 自分の参加のみ削除可能

-- current_messages テーブル - シンプル版
CREATE POLICY "current_messages_select" ON current_messages FOR SELECT 
    TO authenticated USING (true); -- すべてのメッセージ閲覧可能

CREATE POLICY "current_messages_insert" ON current_messages FOR INSERT 
    TO authenticated WITH CHECK (sender_id = auth.uid()); -- 自分のIDでメッセージ送信

-- reactions テーブル - シンプル版
CREATE POLICY "reactions_select" ON reactions FOR SELECT 
    TO authenticated USING (true); -- すべてのリアクション閲覧可能

CREATE POLICY "reactions_insert" ON reactions FOR INSERT
    TO authenticated WITH CHECK (user_id = auth.uid()); -- 自分のリアクションのみ追加

CREATE POLICY "reactions_delete" ON reactions FOR DELETE
    TO authenticated USING (user_id = auth.uid()); -- 自分のリアクションのみ削除

-- typing_status テーブル - シンプル版
CREATE POLICY "typing_status_select" ON typing_status FOR SELECT
    TO authenticated USING (true); -- すべてのタイピング状態閲覧可能

CREATE POLICY "typing_status_insert" ON typing_status FOR INSERT
    TO authenticated WITH CHECK (user_id = auth.uid()); -- 自分のタイピング状態のみ追加

CREATE POLICY "typing_status_update" ON typing_status FOR UPDATE
    TO authenticated USING (user_id = auth.uid()); -- 自分のタイピング状態のみ更新

CREATE POLICY "typing_status_delete" ON typing_status FOR DELETE
    TO authenticated USING (user_id = auth.uid()); -- 自分のタイピング状態のみ削除

-- user_presence テーブル - シンプル版
CREATE POLICY "user_presence_select" ON user_presence FOR SELECT 
    TO authenticated USING (true); -- すべてのプレゼンス情報閲覧可能

CREATE POLICY "user_presence_insert" ON user_presence FOR INSERT
    TO authenticated WITH CHECK (user_id = auth.uid()); -- 自分のプレゼンスのみ追加

CREATE POLICY "user_presence_update" ON user_presence FOR UPDATE
    TO authenticated USING (user_id = auth.uid()); -- 自分のプレゼンスのみ更新

CREATE POLICY "user_presence_delete" ON user_presence FOR DELETE
    TO authenticated USING (user_id = auth.uid()); -- 自分のプレゼンスのみ削除

-- matching_queue テーブル - シンプル版
CREATE POLICY "matching_queue_all" ON matching_queue FOR ALL
    TO authenticated USING (user_id = auth.uid()); -- 自分のキューエントリのみ管理

-- =====================================
-- Step 3: ポリシー確認
-- =====================================

-- 作成されたポリシー一覧を確認
SELECT 
    schemaname, 
    tablename, 
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================
-- 完了メッセージ
-- =====================================
SELECT 'RLSポリシー完全修正完了' as status,
       'シンプルなポリシーで再構築されました' as result,
       'アプリでルーム作成をテストしてください' as next_step;

-- =====================================
-- 📝 修正された内容
-- =====================================
-- 
-- ✅ すべてのポリシーを完全削除
-- ✅ シンプルで動作するポリシーに変更
-- ✅ 認証済みユーザーに基本的なアクセス権限を付与
-- ✅ 自分のデータのみ変更可能に制限
-- ✅ テスト用に閲覧権限を緩和
--
-- 🔧 テスト項目:
-- - ルーム作成
-- - ルーム参加
-- - メッセージ送信
-- - タイピング表示
-- - リアルタイム更新
--
-- =====================================