-- パートナー招待システム用テーブル

-- 1. 招待テーブル
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  invite_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id)
);

-- 2. パートナーシップテーブル
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じユーザー同士の重複パートナーシップを防ぐ
  UNIQUE(user1_id, user2_id),
  -- 自分自身とのパートナーシップを防ぐ
  CHECK (user1_id != user2_id),
  
  -- 明示的な外部キー制約名を指定
  CONSTRAINT partnerships_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT partnerships_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invite_code ON invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_partnerships_user1_id ON partnerships(user1_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_user2_id ON partnerships(user2_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);

-- 4. RLS (Row Level Security) ポリシー
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- 招待テーブルのRLSポリシー
CREATE POLICY "Users can view their own invitations" ON invitations
  FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Users can create invitations" ON invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Users can update their own invitations" ON invitations
  FOR UPDATE USING (inviter_id = auth.uid());

CREATE POLICY "Anyone can view pending invitations by code" ON invitations
  FOR SELECT USING (status = 'pending' AND expires_at > NOW());

-- パートナーシップテーブルのRLSポリシー
CREATE POLICY "Users can view their partnerships" ON partnerships
  FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create partnerships when accepting invitations" ON partnerships
  FOR INSERT WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can update their partnerships" ON partnerships
  FOR UPDATE USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- 5. 関数: 招待コード生成
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- 8文字のランダムな英数字コードを生成
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    -- 既存のコードと重複していないかチェック
    SELECT EXISTS(SELECT 1 FROM invitations WHERE invite_code = code) INTO exists_check;
    
    -- 重複していなければループを抜ける
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 6. 関数: 招待受諾処理
CREATE OR REPLACE FUNCTION accept_invitation(
  p_invite_code TEXT,
  p_accepter_id UUID
)
RETURNS JSON AS $$
DECLARE
  invite_record invitations%ROWTYPE;
  partnership_id UUID;
  result JSON;
BEGIN
  -- 招待を取得
  SELECT * INTO invite_record
  FROM invitations
  WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND expires_at > NOW();
  
  -- 招待が見つからない場合
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation code'
    );
  END IF;
  
  -- 自分自身の招待を受諾しようとしている場合
  IF invite_record.inviter_id = p_accepter_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot accept your own invitation'
    );
  END IF;
  
  -- 既にパートナーシップが存在するかチェック
  IF EXISTS(
    SELECT 1 FROM partnerships
    WHERE (user1_id = invite_record.inviter_id AND user2_id = p_accepter_id)
       OR (user1_id = p_accepter_id AND user2_id = invite_record.inviter_id)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Partnership already exists'
    );
  END IF;
  
  -- 招待を受諾済みに更新
  UPDATE invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_accepter_id
  WHERE id = invite_record.id;
  
  -- パートナーシップを作成
  INSERT INTO partnerships (user1_id, user2_id)
  VALUES (invite_record.inviter_id, p_accepter_id)
  RETURNING id INTO partnership_id;
  
  RETURN json_build_object(
    'success', true,
    'partnership_id', partnership_id,
    'inviter_id', invite_record.inviter_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 期限切れ招待のクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 