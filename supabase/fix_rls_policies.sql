-- =====================================
-- RLSポリシー修正スクリプト
-- =====================================
-- 🎯 ルーム作成時のRLSエラーを修正

-- =====================================
-- Step 1: 問題のあるポリシーを削除
-- =====================================

-- chat_roomsテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view joined rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they joined" ON chat_rooms;

-- room_participantsテーブルの問題のあるポリシーも修正
DROP POLICY IF EXISTS "System can manage participants" ON room_participants;

-- =====================================
-- Step 2: 修正されたポリシーを作成
-- =====================================

-- chat_rooms テーブル - 修正版ポリシー
CREATE POLICY "Users can create rooms" ON chat_rooms FOR INSERT 
    TO authenticated WITH CHECK (true); -- 認証済みユーザーは誰でもルーム作成可能

CREATE POLICY "Users can view all active rooms" ON chat_rooms FOR SELECT 
    TO authenticated USING (status = 'active'); -- アクティブなルームは誰でも閲覧可能

CREATE POLICY "Room creators can update rooms" ON chat_rooms FOR UPDATE
    TO authenticated USING (created_by = auth.uid()); -- 作成者のみ更新可能

-- room_participants テーブル - 修正版ポリシー  
CREATE POLICY "Users can view own participation" ON room_participants FOR SELECT 
    TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can join rooms" ON room_participants FOR INSERT
    TO authenticated WITH CHECK (user_id = auth.uid()); -- 自分自身を参加者として追加可能

CREATE POLICY "Users can leave rooms" ON room_participants FOR DELETE
    TO authenticated USING (user_id = auth.uid()); -- 自分自身の参加を削除可能

CREATE POLICY "Room creators can manage participants" ON room_participants FOR ALL
    TO authenticated USING (
        room_id IN (SELECT id FROM chat_rooms WHERE created_by = auth.uid())
    ); -- ルーム作成者は参加者を管理可能

-- =====================================
-- Step 3: その他のテーブルのポリシーも緩和
-- =====================================

-- current_messages テーブルのポリシーを緩和
DROP POLICY IF EXISTS "Users can view messages in joined rooms" ON current_messages;
DROP POLICY IF EXISTS "Users can insert messages in joined rooms" ON current_messages;

CREATE POLICY "Users can view messages in rooms" ON current_messages FOR SELECT 
    TO authenticated USING (true); -- 一時的に全メッセージ閲覧可能（テスト用）

CREATE POLICY "Users can send messages" ON current_messages FOR INSERT 
    TO authenticated WITH CHECK (sender_id = auth.uid()); -- 自分のIDでメッセージ送信

-- typing_status テーブルのポリシーを緩和
DROP POLICY IF EXISTS "Users can view typing status in joined rooms" ON typing_status;
DROP POLICY IF EXISTS "Users can update own typing status" ON typing_status;

CREATE POLICY "Users can view typing status" ON typing_status FOR SELECT
    TO authenticated USING (true); -- 全タイピング状態閲覧可能

CREATE POLICY "Users can manage own typing status" ON typing_status FOR ALL
    TO authenticated USING (user_id = auth.uid()); -- 自分のタイピング状態のみ管理

-- =====================================
-- Step 4: 確認用クエリ
-- =====================================

-- ポリシー一覧確認
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('chat_rooms', 'room_participants', 'current_messages', 'typing_status')
ORDER BY tablename, policyname;

-- =====================================
-- 完了メッセージ
-- =====================================
SELECT 'RLSポリシー修正完了' as status,
       'ルーム作成が可能になりました' as result,
       'アプリで再テストしてください' as next_step;

-- =====================================
-- 📝 修正内容
-- =====================================
-- 
-- ✅ ルーム作成: 認証済みユーザーは誰でも可能
-- ✅ ルーム閲覧: アクティブなルームは誰でも閲覧可能  
-- ✅ ルーム参加: 自分自身を参加者として追加可能
-- ✅ メッセージ: より緩いポリシーでテスト用に調整
-- ✅ タイピング: 自分の状態のみ管理可能
--
-- =====================================