-- =====================================
-- パートナーシステム データベース設定
-- =====================================
-- 🎯 パートナー管理とオンライン状態追跡システム

-- =====================================
-- Step 1: パートナー関係テーブル作成
-- =====================================

-- 1. partners テーブル（パートナー関係管理）
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'partner', -- 'partner', 'friend', 'blocked'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'pending', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_chat_room_id UUID, -- 最初にチャットしたルームID
    
    -- 制約: 同じペアは1つまで、自分自身とは関係不可
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id != user2_id),
    CHECK (user1_id < user2_id) -- 常にuser1_id < user2_idになるよう順序を保証
);

-- 2. partner_chat_rooms テーブル（パートナー専用チャットルーム）
CREATE TABLE IF NOT EXISTS partner_chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(partner_id, room_id)
);

-- =====================================
-- Step 2: インデックス作成
-- =====================================
CREATE INDEX IF NOT EXISTS idx_partners_user1 ON partners(user1_id);
CREATE INDEX IF NOT EXISTS idx_partners_user2 ON partners(user2_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partner_chat_rooms_partner ON partner_chat_rooms(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_chat_rooms_room ON partner_chat_rooms(room_id);

-- =====================================
-- Step 3: Row Level Security 設定
-- =====================================
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_chat_rooms ENABLE ROW LEVEL SECURITY;

-- partners テーブルのポリシー
CREATE POLICY "Users can view own partnerships" ON partners FOR SELECT 
    TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create partnerships" ON partners FOR INSERT 
    TO authenticated WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can update own partnerships" ON partners FOR UPDATE
    TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- partner_chat_rooms テーブルのポリシー
CREATE POLICY "Users can view partner chat rooms" ON partner_chat_rooms FOR SELECT 
    TO authenticated USING (
        partner_id IN (
            SELECT id FROM partners 
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage partner chat rooms" ON partner_chat_rooms FOR ALL
    TO authenticated USING (
        partner_id IN (
            SELECT id FROM partners 
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

-- =====================================
-- Step 4: 便利な関数を作成
-- =====================================

-- パートナー関係を作成する関数（ユーザーID順序を自動調整）
CREATE OR REPLACE FUNCTION create_partnership(
    user_a UUID,
    user_b UUID,
    room_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    partner_record_id UUID;
    user1_id UUID;
    user2_id UUID;
BEGIN
    -- ユーザーIDの順序を調整（常にuser1_id < user2_id）
    IF user_a < user_b THEN
        user1_id := user_a;
        user2_id := user_b;
    ELSE
        user1_id := user_b;
        user2_id := user_a;
    END IF;
    
    -- 既存のパートナー関係をチェック
    SELECT id INTO partner_record_id 
    FROM partners 
    WHERE user1_id = user1_id AND user2_id = user2_id;
    
    -- 存在しない場合は新規作成
    IF partner_record_id IS NULL THEN
        INSERT INTO partners (user1_id, user2_id, first_chat_room_id)
        VALUES (user1_id, user2_id, room_id)
        RETURNING id INTO partner_record_id;
    ELSE
        -- 既存の場合は最初のチャットルームIDを更新（まだ設定されていない場合）
        UPDATE partners 
        SET first_chat_room_id = COALESCE(first_chat_room_id, room_id),
            updated_at = NOW()
        WHERE id = partner_record_id;
    END IF;
    
    RETURN partner_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- パートナー一覧を取得する関数（オンライン状態付き）
CREATE OR REPLACE FUNCTION get_user_partners(target_user_id UUID)
RETURNS TABLE (
    partner_id UUID,
    partner_user_id UUID,
    username TEXT,
    display_name TEXT,
    online_status TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    relationship_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    has_active_room BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as partner_id,
        CASE 
            WHEN p.user1_id = target_user_id THEN p.user2_id 
            ELSE p.user1_id 
        END as partner_user_id,
        COALESCE((
            SELECT raw_user_meta_data->>'username' 
            FROM auth.users 
            WHERE id = CASE 
                WHEN p.user1_id = target_user_id THEN p.user2_id 
                ELSE p.user1_id 
            END
        ), 'Unknown') as username,
        COALESCE((
            SELECT raw_user_meta_data->>'display_name' 
            FROM auth.users 
            WHERE id = CASE 
                WHEN p.user1_id = target_user_id THEN p.user2_id 
                ELSE p.user1_id 
            END
        ), 'Unknown User') as display_name,
        COALESCE(up.status, 'offline') as online_status,
        up.last_seen,
        p.relationship_type,
        p.created_at,
        EXISTS(
            SELECT 1 FROM partner_chat_rooms pcr 
            WHERE pcr.partner_id = p.id AND pcr.is_active = true
        ) as has_active_room
    FROM partners p
    LEFT JOIN user_presence up ON (
        up.user_id = CASE 
            WHEN p.user1_id = target_user_id THEN p.user2_id 
            ELSE p.user1_id 
        END
    )
    WHERE (p.user1_id = target_user_id OR p.user2_id = target_user_id)
      AND p.status = 'active'
    ORDER BY 
        CASE up.status 
            WHEN 'online' THEN 1 
            WHEN 'away' THEN 2 
            ELSE 3 
        END,
        p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================
-- Step 5: トリガー設定
-- =====================================

-- updated_atカラムの自動更新
CREATE TRIGGER update_partners_updated_at 
    BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- Step 6: 初期データとテスト
-- =====================================

-- テーブル作成確認
SELECT 
    schemaname, 
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('partners', 'partner_chat_rooms')
ORDER BY tablename;

-- ポリシー確認
SELECT 
    schemaname, 
    tablename, 
    policyname,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('partners', 'partner_chat_rooms')
ORDER BY tablename, policyname;

-- 関数確認
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('create_partnership', 'get_user_partners');

-- =====================================
-- 完了メッセージ
-- =====================================
SELECT 'パートナーシステム データベース設定完了' as status,
       'パートナー管理とオンライン状態追跡が利用可能' as result,
       'アプリでパートナー機能をテストしてください' as next_step;

-- =====================================
-- 📝 使用方法
-- =====================================
-- 
-- 🔹 パートナー関係作成:
-- SELECT create_partnership('user1-uuid', 'user2-uuid', 'room-uuid');
--
-- 🔹 パートナー一覧取得:
-- SELECT * FROM get_user_partners('user-uuid');
--
-- 🔹 オンライン状態更新:
-- INSERT INTO user_presence (user_id, status) VALUES ('user-uuid', 'online')
-- ON CONFLICT (user_id) DO UPDATE SET status = 'online', updated_at = NOW();
--
-- =====================================