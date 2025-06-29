# API仕様

## Supabase API エンドポイント

### 認証

#### ユーザー登録
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

#### ログイン
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

#### ログアウト
```typescript
const { error } = await supabase.auth.signOut();
```

### メッセージ関連

#### メッセージ一覧取得
```typescript
const { data, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:users(*),
    reactions(*)
  `)
  .eq('room_id', roomId)
  .order('created_at', { ascending: true });
```

#### メッセージ送信
```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    room_id: roomId,
    sender_id: userId,
    content: messageContent,
    message_type: 'text'
  });
```

#### リアクション追加
```typescript
const { data, error } = await supabase
  .from('reactions')
  .insert({
    message_id: messageId,
    user_id: userId,
    reaction_type: 'heart'
  });
```

### リアルタイム機能

#### メッセージリアルタイム購読
```typescript
const subscription = supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `room_id=eq.${roomId}`
  }, (payload) => {
    // 新しいメッセージ処理
  })
  .subscribe();
```

#### タイピング状態管理
```typescript
// タイピング開始
const { error } = await supabase
  .from('typing_status')
  .upsert({
    room_id: roomId,
    user_id: userId,
    is_typing: true,
    content_preview: 'テキストプレビュー...'
  });

// タイピング終了
const { error } = await supabase
  .from('typing_status')
  .upsert({
    room_id: roomId,
    user_id: userId,
    is_typing: false,
    content_preview: null
  });
```

### プレゼンス機能

#### オンライン状態更新
```typescript
const { error } = await supabase
  .from('user_presence')
  .upsert({
    user_id: userId,
    status: 'online',
    last_seen: new Date().toISOString()
  });
```