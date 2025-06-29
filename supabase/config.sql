-- 親密チャットアプリケーション データベース設定
-- Supabase SQL Editor で実行してください

-- 1. users テーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    theme_preference VARCHAR(20) DEFAULT 'cute',
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. chat_rooms テーブル
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    room_type VARCHAR(20) DEFAULT '1on1',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. room_participants テーブル
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, user_id)
);

-- 4. messages テーブル
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    reply_to UUID REFERENCES messages(id),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. reactions テーブル
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- 6. typing_status テーブル (リアルタイムタイピング表示用)
CREATE TABLE typing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT false,
    content_preview TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 7. user_presence テーブル (プレゼンス機能用)
CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_reactions_message ON reactions(message_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_room_participants_user ON room_participants(user_id);
CREATE INDEX idx_room_participants_room ON room_participants(room_id);
CREATE INDEX idx_typing_status_room ON typing_status(room_id);
CREATE INDEX idx_user_presence_user ON user_presence(user_id);

-- Row Level Security (RLS) 設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー

-- users テーブル
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- chat_rooms テーブル
CREATE POLICY "Users can view joined rooms" ON chat_rooms FOR SELECT 
    USING (id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can create rooms" ON chat_rooms FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

-- room_participants テーブル
CREATE POLICY "Users can view own participation" ON room_participants FOR SELECT 
    USING (user_id = auth.uid());
CREATE POLICY "Room creators can manage participants" ON room_participants FOR ALL
    USING (room_id IN (SELECT id FROM chat_rooms WHERE created_by = auth.uid()));

-- messages テーブル
CREATE POLICY "Users can view messages in joined rooms" ON messages FOR SELECT 
    USING (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert messages in joined rooms" ON messages FOR INSERT 
    WITH CHECK (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE 
    USING (sender_id = auth.uid());

-- reactions テーブル
CREATE POLICY "Users can view reactions in joined rooms" ON reactions FOR SELECT 
    USING (message_id IN (
        SELECT m.id FROM messages m 
        JOIN room_participants rp ON m.room_id = rp.room_id 
        WHERE rp.user_id = auth.uid()
    ));
CREATE POLICY "Users can manage own reactions" ON reactions FOR ALL
    USING (user_id = auth.uid());

-- typing_status テーブル
CREATE POLICY "Users can view typing status in joined rooms" ON typing_status FOR SELECT
    USING (room_id IN (SELECT room_id FROM room_participants WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own typing status" ON typing_status FOR ALL
    USING (user_id = auth.uid());

-- user_presence テーブル
CREATE POLICY "Users can view all presence" ON user_presence FOR SELECT TO authenticated;
CREATE POLICY "Users can update own presence" ON user_presence FOR ALL
    USING (user_id = auth.uid());

-- user_push_tokens テーブル (プッシュ通知用)
CREATE TABLE user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL, -- 'ios', 'android', 'web'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- notification_settings テーブル (通知設定)
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enable_messages BOOLEAN DEFAULT true,
    enable_reactions BOOLEAN DEFAULT true,
    enable_touch_notifications BOOLEAN DEFAULT true,
    enable_sound BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 追加インデックス
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- 追加のRLS設定
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- user_push_tokens ポリシー
CREATE POLICY "Users can manage own push tokens" ON user_push_tokens FOR ALL
    USING (user_id = auth.uid());

-- notification_settings ポリシー
CREATE POLICY "Users can manage own notification settings" ON notification_settings FOR ALL
    USING (user_id = auth.uid());

-- 自動更新タイムスタンプ関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_typing_status_updated_at BEFORE UPDATE ON typing_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();