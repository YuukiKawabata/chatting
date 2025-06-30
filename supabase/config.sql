-- =====================================
-- 親密チャットアプリケーション データベース設定
-- =====================================
-- Supabase SQL Editor で実行してください
-- 
-- 🎯 設計方針: auth.usersのみ使用（独自usersテーブルなし）
-- ユーザー情報はauth.usersのuser_metadataに保存されます

-- =====================================
-- 1. chat_rooms テーブル
-- =====================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    room_type VARCHAR(20) DEFAULT '1on1',
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
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, user_id)
);

-- =====================================
-- 3. messages テーブル
-- =====================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    reply_to UUID REFERENCES messages(id),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 4. reactions テーブル
-- =====================================
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- =====================================
-- 5. typing_status テーブル (リアルタイムタイピング表示用)
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
-- 6. user_presence テーブル (プレゼンス機能用)
-- =====================================
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 7. user_push_tokens テーブル (プッシュ通知用)
-- =====================================
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL, -- 'ios', 'android', 'web'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- =====================================
-- 8. notification_settings テーブル (通知設定)
-- =====================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    enable_messages BOOLEAN DEFAULT true,
    enable_reactions BOOLEAN DEFAULT true,
    enable_touch_notifications BOOLEAN DEFAULT true,
    enable_sound BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- インデックス作成
-- =====================================
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_room ON typing_status(room_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- =====================================
-- Row Level Security (RLS) 設定
-- =====================================
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- =====================================
-- RLS ポリシー
-- =====================================

-- chat_rooms テーブル
CREATE POLICY "Users can view joined rooms" ON chat_rooms FOR SELECT 
    TO authenticated USING (id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can create rooms" ON chat_rooms FOR INSERT 
    TO authenticated WITH CHECK (auth.uid() = created_by);

-- room_participants テーブル
CREATE POLICY "Users can view own participation" ON room_participants FOR SELECT 
    TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Room creators can manage participants" ON room_participants FOR ALL
    TO authenticated USING (room_id IN (SELECT id FROM chat_rooms WHERE created_by = auth.uid()));

-- messages テーブル
CREATE POLICY "Users can view messages in joined rooms" ON messages FOR SELECT 
    TO authenticated USING (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert messages in joined rooms" ON messages FOR INSERT 
    TO authenticated WITH CHECK (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE 
    TO authenticated USING (sender_id = auth.uid());

-- reactions テーブル
CREATE POLICY "Users can view reactions in joined rooms" ON reactions FOR SELECT 
    TO authenticated USING (message_id IN (
        SELECT m.id FROM messages m 
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

-- user_push_tokens ポリシー
CREATE POLICY "Users can manage own push tokens" ON user_push_tokens FOR ALL
    TO authenticated USING (user_id = auth.uid());

-- notification_settings ポリシー
CREATE POLICY "Users can manage own notification settings" ON notification_settings FOR ALL
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
-- トリガー設定
-- =====================================
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_typing_status_updated_at BEFORE UPDATE ON typing_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_push_tokens_updated_at BEFORE UPDATE ON user_push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- 完了メッセージ
-- =====================================
SELECT 'データベース設定完了 - auth.usersベース構成' as status;

-- =====================================
-- 📝 重要な注意事項
-- =====================================
-- 
-- 🔹 ユーザー情報の取得方法:
--   - ユーザー名: auth.jwt() ->> 'user_metadata' ->> 'username'
--   - 表示名: auth.jwt() ->> 'user_metadata' ->> 'display_name'  
--   - テーマ: auth.jwt() ->> 'user_metadata' ->> 'theme_preference'
--
-- 🔹 新規登録時のメタデータ設定例:
--   supabase.auth.signUp({
--     email: 'user@example.com',
--     password: 'password',
--     options: {
--       data: {
--         username: 'myusername',
--         display_name: 'My Display Name',
--         theme_preference: 'cute'
--       }
--     }
--   })
--
-- 🔹 プロファイル更新例:
--   supabase.auth.updateUser({
--     data: { theme_preference: 'cool' }
--   })
--
-- =====================================