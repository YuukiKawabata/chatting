-- =====================================
-- シンプルリアルタイムチャット データベース設定
-- =====================================
-- 🎯 設計方針: メッセージ履歴なし、リアルタイム重視
-- ユーザー情報はauth.usersのuser_metadataに保存

-- =====================================
-- 1. chat_rooms テーブル（シンプル版）
-- =====================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    room_type VARCHAR(20) DEFAULT 'random', -- 'random', 'partner'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed'
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 2. room_participants テーブル
-- =====================================
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(room_id, user_id)
);

-- =====================================
-- 3. current_messages テーブル（一時的なメッセージのみ）
-- =====================================
CREATE TABLE IF NOT EXISTS current_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- =====================================
-- 4. reactions テーブル（シンプル版）
-- =====================================
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES current_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL, -- 'heart', 'smile', 'zap', 'coffee', 'star'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- =====================================
-- 5. typing_status テーブル
-- =====================================
CREATE TABLE IF NOT EXISTS typing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT false,
    content_preview TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- =====================================
-- 6. user_presence テーブル
-- =====================================
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'away'
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 7. matching_queue テーブル（ランダムマッチング用）
-- =====================================
CREATE TABLE IF NOT EXISTS matching_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- インデックス作成
-- =====================================
CREATE INDEX IF NOT EXISTS idx_current_messages_room_created ON current_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_current_messages_expires ON current_messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_room ON typing_status(room_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_queue_created ON matching_queue(created_at);

-- =====================================
-- Row Level Security (RLS) 設定
-- =====================================
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_queue ENABLE ROW LEVEL SECURITY;

-- =====================================
-- RLS ポリシー
-- =====================================

-- chat_rooms テーブル
CREATE POLICY "Users can view joined rooms" ON chat_rooms FOR SELECT 
    TO authenticated USING (id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can create rooms" ON chat_rooms FOR INSERT 
    TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update rooms they joined" ON chat_rooms FOR UPDATE
    TO authenticated USING (id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));

-- room_participants テーブル
CREATE POLICY "Users can view own participation" ON room_participants FOR SELECT 
    TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can manage participants" ON room_participants FOR ALL
    TO authenticated USING (true);

-- current_messages テーブル
CREATE POLICY "Users can view messages in joined rooms" ON current_messages FOR SELECT 
    TO authenticated USING (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert messages in joined rooms" ON current_messages FOR INSERT 
    TO authenticated WITH CHECK (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));

-- reactions テーブル
CREATE POLICY "Users can view reactions in joined rooms" ON reactions FOR SELECT 
    TO authenticated USING (message_id IN (
        SELECT m.id FROM current_messages m 
        JOIN room_participants rp ON m.room_id = rp.room_id 
        WHERE rp.user_id = auth.uid()
    ));
CREATE POLICY "Users can manage own reactions" ON reactions FOR ALL
    TO authenticated USING (user_id = auth.uid());

-- typing_status テーブル
CREATE POLICY "Users can view typing status in joined rooms" ON typing_status FOR SELECT
    TO authenticated USING (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own typing status" ON typing_status FOR ALL
    TO authenticated USING (user_id = auth.uid());

-- user_presence テーブル
CREATE POLICY "Users can view all presence" ON user_presence FOR SELECT TO authenticated;
CREATE POLICY "Users can update own presence" ON user_presence FOR ALL
    TO authenticated USING (user_id = auth.uid());

-- matching_queue テーブル
CREATE POLICY "Users can manage own queue entry" ON matching_queue FOR ALL
    TO authenticated USING (user_id = auth.uid());

-- =====================================
-- 自動更新タイムスタンプ関数
-- =====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================
-- メッセージ自動削除関数
-- =====================================
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM current_messages WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- =====================================
-- トリガー設定
-- =====================================
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_typing_status_updated_at BEFORE UPDATE ON typing_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matching_queue_updated_at BEFORE UPDATE ON matching_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- 定期クリーンアップ（pg_cron拡張が利用可能な場合）
-- =====================================
-- SELECT cron.schedule('cleanup-messages', '*/30 * * * *', 'SELECT cleanup_expired_messages();');

-- =====================================
-- 完了メッセージ
-- =====================================
SELECT 'シンプルリアルタイムチャット データベース設定完了' as status;

-- =====================================
-- 📝 重要な設計変更点
-- =====================================
-- 
-- 🔹 メッセージ履歴なし:
--   - current_messagesテーブルで一時的なメッセージのみ管理
--   - 1時間後に自動削除（expires_at）
--
-- 🔹 ランダムマッチング:
--   - matching_queueテーブルでマッチング待ちユーザーを管理
--   - preferencesでマッチング条件を設定可能
--
-- 🔹 削除された機能:
--   - タッチ位置共有関連
--   - ファイル共有関連
--   - プッシュ通知関連（後で追加予定）
--   - 複雑なパートナー招待システム
--
-- =====================================