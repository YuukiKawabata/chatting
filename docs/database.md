# データベース設計

## ERD (Entity Relationship Diagram)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │   chat_rooms    │     │    messages     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID) PK    │────┐│ id (UUID) PK    │────┐│ id (UUID) PK    │
│ email           │    ││ name            │    ││ room_id FK      │
│ username        │    ││ room_type       │    ││ sender_id FK    │
│ display_name    │    ││ created_by FK   │    ││ content         │
│ avatar_url      │    ││ created_at      │    ││ message_type    │
│ theme_preference│    ││ updated_at      │    ││ metadata        │
│ is_online       │    │└─────────────────┘    ││ reply_to FK     │
│ last_seen_at    │    │                       ││ is_deleted      │
│ created_at      │    │                       ││ created_at      │
│ updated_at      │    │                       ││ updated_at      │
└─────────────────┘    │                       └─────────────────┘
         │              │                                │
         │              │       ┌─────────────────┐     │
         │              │       │   reactions     │     │
         │              │       ├─────────────────┤     │
         │              │       │ id (UUID) PK    │     │
         │              │       │ message_id FK   │─────┘
         │              │       │ user_id FK      │─────┐
         │              │       │ reaction_type   │     │
         │              │       │ created_at      │     │
         │              │       └─────────────────┘     │
         │              │                               │
         │              │       ┌─────────────────┐     │
         │              └───────│room_participants│     │
         │                      ├─────────────────┤     │
         └──────────────────────│ user_id FK      │     │
                                │ room_id FK      │─────┘
                                │ role            │
                                │ joined_at       │
                                │ last_read_at    │
                                └─────────────────┘
```

## テーブル詳細

### 1. users テーブル
親密チャットアプリのユーザー情報を管理

- **id**: ユーザー固有ID（UUID）
- **email**: メールアドレス（一意）
- **username**: ユーザー名（一意）
- **display_name**: 表示名
- **avatar_url**: プロフィール画像URL
- **theme_preference**: テーマ設定（cute, cool, minimal, warm）
- **is_online**: オンライン状態
- **last_seen_at**: 最終ログイン時刻
- **created_at, updated_at**: 作成・更新時刻

### 2. chat_rooms テーブル
チャットルーム情報

- **id**: ルーム固有ID（UUID）
- **name**: ルーム名
- **room_type**: ルームタイプ（1on1, group）
- **created_by**: 作成者ID（外部キー）
- **created_at, updated_at**: 作成・更新時刻

### 3. room_participants テーブル
ルーム参加者管理

- **id**: 参加レコード固有ID
- **room_id**: ルームID（外部キー）
- **user_id**: ユーザーID（外部キー）
- **role**: 役割（admin, member）
- **joined_at**: 参加日時
- **last_read_at**: 最終既読時刻

### 4. messages テーブル
メッセージ管理

- **id**: メッセージ固有ID（UUID）
- **room_id**: ルームID（外部キー）
- **sender_id**: 送信者ID（外部キー）
- **content**: メッセージ内容
- **message_type**: メッセージタイプ（text, image, file, touch）
- **metadata**: 追加情報（JSON）
- **reply_to**: 返信先メッセージID
- **is_deleted**: 削除フラグ
- **created_at, updated_at**: 作成・更新時刻

### 5. reactions テーブル
メッセージリアクション

- **id**: リアクション固有ID
- **message_id**: メッセージID（外部キー）
- **user_id**: ユーザーID（外部キー）
- **reaction_type**: リアクションタイプ（heart, smile, lightning, coffee, star）
- **created_at**: 作成時刻

### 6. typing_status テーブル
リアルタイムタイピング表示

- **id**: レコード固有ID
- **room_id**: ルームID（外部キー）
- **user_id**: ユーザーID（外部キー）
- **is_typing**: タイピング中フラグ
- **content_preview**: 入力内容プレビュー
- **updated_at**: 更新時刻

### 7. user_presence テーブル
ユーザープレゼンス管理

- **id**: プレゼンスレコード固有ID
- **user_id**: ユーザーID（外部キー・一意）
- **status**: ステータス（online, offline, away）
- **last_seen**: 最終アクティビティ時刻
- **updated_at**: 更新時刻

## セキュリティ

### Row Level Security (RLS)
すべてのテーブルでRLSが有効化されており、ユーザーは自分に関連するデータのみアクセス可能

### インデックス
パフォーマンス最適化のため、よく使用されるクエリに対してインデックスが設定されています