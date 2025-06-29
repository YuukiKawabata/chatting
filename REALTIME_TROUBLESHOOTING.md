# Supabase Realtime トラブルシューティング

## 🔄 Supabase Realtimeとは？

Supabase Realtimeは、データベースの変更をリアルタイムで監視し、WebSocket接続を通じてクライアントアプリケーションに即座に通知するサービスです。

### 主な用途
- **チャットアプリ**: 新しいメッセージのリアルタイム配信
- **コラボレーション**: 複数ユーザーの同時編集
- **通知システム**: データ変更の即座な通知
- **ライブ更新**: ダッシュボードやフィードの自動更新

### 技術的仕組み
```
[Database] → [Change Detection] → [WebSocket] → [Client App]
    ↓              ↓                   ↓           ↓
  データ変更    → CDC機能で検出    → リアルタイム送信 → アプリで受信
```

## 🔍 接続テストの流れ

テストコンポーネントが実行している内容：

### 1. チャンネル作成
```typescript
const channel = supabase.channel('test-connection-' + Date.now());
```
- ユニークなチャンネル名でテスト用チャンネルを作成
- タイムスタンプを付与してチャンネル名の衝突を回避

### 2. WebSocket接続確立
```typescript
channel.subscribe((status, err) => {
  // 接続状態の監視
});
```
- WebSocket接続を開始
- 接続状態の変化を監視

### 3. 状態判定
- **SUBSCRIBED**: 接続成功 ✅
- **CLOSED**: 接続が閉じられた ❌
- **CHANNEL_ERROR**: チャンネルエラー ❌
- **TIMED_OUT**: サーバー側タイムアウト ❌

## ❌ よくある失敗原因と解決策

### 1. ネットワーク関連

#### 原因
- インターネット接続不良
- ファイアウォールによるWebSocket通信ブロック
- プロキシサーバーの設定問題

#### 解決策
```bash
# ネットワーク接続確認
ping supabase.com

# WebSocket接続テスト（ブラウザのコンソールで）
const ws = new WebSocket('wss://your-project.supabase.co/realtime/v1/websocket');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (err) => console.error('WebSocket error:', err);
```

### 2. Supabase設定問題

#### 原因
- プロジェクトURLまたはAPI Keyが間違っている
- Realtime機能が無効になっている
- Row Level Security (RLS) の設定問題

#### 解決策
1. **プロジェクト設定確認**
   ```bash
   # .envファイルの確認
   cat .env
   
   # 正しい形式：
   # EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   # EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

2. **Realtime機能確認**
   - Supabaseダッシュボード → Settings → API
   - Realtime が Enabled になっているか確認

3. **RLS設定確認**
   ```sql
   -- テーブルのRLS状態確認
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

### 3. クライアント側の問題

#### 原因
- React Nativeの非同期処理タイミング
- メモリ不足やアプリの状態管理問題
- 複数の同時接続試行

#### 解決策
1. **再試行機能**
   ```typescript
   const retryConnection = async (maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const channel = supabase.channel(`test-${Date.now()}`);
         await channel.subscribe();
         return 'success';
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

2. **接続状態の監視**
   ```typescript
   // Supabase Realtimeクライアントの状態確認
   console.log('Realtime client state:', supabase.realtime);
   ```

### 4. 開発環境固有の問題

#### Expo Go制限
- Expo GoではWebSocket接続に制限がある場合があります
- 開発ビルドでの動作確認を推奨

#### Metro Bundler
- 開発サーバーの再起動で解決する場合があります
```bash
npx expo start --clear
```

## 🔧 デバッグ手順

### 1. 基本確認
```typescript
// 1. Supabaseクライアント状態
console.log('Supabase client:', supabase);

// 2. 環境変数確認
console.log('URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('Key:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

// 3. ネットワーク状態
import NetInfo from '@react-native-async-storage/async-storage';
NetInfo.fetch().then(state => {
  console.log('Network state:', state);
});
```

### 2. 詳細ログ有効化
```typescript
// Supabase Realtimeのデバッグログ有効化
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
      log_level: 'debug', // デバッグログ有効化
    },
  },
});
```

### 3. 段階的テスト
```typescript
// 1. 基本接続テスト
const testBasicConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count');
    console.log('Basic DB connection:', data, error);
  } catch (err) {
    console.error('Basic connection failed:', err);
  }
};

// 2. Realtimeクライアント状態
const testRealtimeClient = () => {
  console.log('Realtime client status:', {
    accessToken: supabase.realtime.accessToken,
    channels: supabase.realtime.channels.length,
    connection: supabase.realtime.connection?.readyState
  });
};
```

## 💡 最適化のコツ

### 1. 接続プール管理
```typescript
// 不要なチャンネルのクリーンアップ
const cleanupChannels = () => {
  supabase.realtime.channels.forEach(channel => {
    if (channel.state === 'closed') {
      supabase.removeChannel(channel);
    }
  });
};
```

### 2. 再接続ロジック
```typescript
// 自動再接続
const setupAutoReconnect = () => {
  supabase.realtime.onOpen(() => {
    console.log('Realtime connected');
  });
  
  supabase.realtime.onClose(() => {
    console.log('Realtime disconnected, attempting reconnect...');
    setTimeout(() => {
      supabase.realtime.connect();
    }, 1000);
  });
};
```

### 3. エラーハンドリング
```typescript
// 包括的エラーハンドリング
const robustChannelSubscription = (channelName) => {
  const channel = supabase.channel(channelName);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout after 10 seconds`));
    }, 10000);
    
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve(channel);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        clearTimeout(timeout);
        reject(err || new Error(`Connection failed: ${status}`));
      }
    });
  });
};
```

## 📊 成功時の期待値

正常に動作している場合：

1. **接続時間**: 通常1-3秒以内
2. **状態遷移**: `JOINING` → `SUBSCRIBED`
3. **ログ出力**: WebSocket接続成功メッセージ
4. **チャンネル**: アクティブなチャンネルとして登録

## 🆘 緊急時の対処法

### すぐに試せる解決策
1. **アプリ再起動** - 一時的な状態問題の解決
2. **ネットワーク切り替え** - WiFi ↔ モバイルデータ
3. **キャッシュクリア** - `npx expo start --clear`
4. **別のデバイス/環境** - 環境固有の問題の特定

### 最後の手段
- Supabaseプロジェクトの再作成
- 新しいAPI Keyの生成
- 開発ビルドでの動作確認

これらの手順で、ほとんどのRealtime接続問題を解決できるはずです！