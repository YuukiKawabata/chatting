-- 親密チャットアプリケーション 初期データ
-- 開発・デモ用のサンプルデータ

-- サンプルユーザー作成
INSERT INTO users (id, email, username, display_name, theme_preference) VALUES
('00000000-0000-0000-0000-000000000001', 'demo@example.com', 'demo', 'Demo User', 'cute'),
('00000000-0000-0000-0000-000000000002', 'partner@example.com', 'partner', 'Partner User', 'warm');

-- サンプルチャットルーム作成
INSERT INTO chat_rooms (id, name, room_type, created_by) VALUES
('00000000-0000-0000-0000-000000000001', 'Demo Chat', '1on1', '00000000-0000-0000-0000-000000000001');

-- ルーム参加者追加
INSERT INTO room_participants (room_id, user_id, role) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member');

-- サンプルメッセージ作成
INSERT INTO messages (room_id, sender_id, content, message_type) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'こんにちは！', 'text'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'おはよう！今日はいい天気ですね ☀️', 'text'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '本当ですね！散歩でもしませんか？', 'text');

-- サンプルリアクション追加
INSERT INTO reactions (message_id, user_id, reaction_type) VALUES
((SELECT id FROM messages WHERE content = 'おはよう！今日はいい天気ですね ☀️'), '00000000-0000-0000-0000-000000000001', 'heart'),
((SELECT id FROM messages WHERE content = '本当ですね！散歩でもしませんか？'), '00000000-0000-0000-0000-000000000002', 'smile');

-- ユーザープレゼンス初期化
INSERT INTO user_presence (user_id, status) VALUES
('00000000-0000-0000-0000-000000000001', 'online'),
('00000000-0000-0000-0000-000000000002', 'online');