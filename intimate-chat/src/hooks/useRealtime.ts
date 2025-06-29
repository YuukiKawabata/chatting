import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

type Message = Database['public']['Tables']['messages']['Row'];
type Reaction = Database['public']['Tables']['reactions']['Row'];
type TypingStatus = Database['public']['Tables']['typing_status']['Row'];
type UserPresence = Database['public']['Tables']['user_presence']['Row'];

interface RealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectionStatus: 'CLOSED' | 'CONNECTING' | 'OPEN';
}

export const useRealtime = () => {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    connectionStatus: 'CLOSED',
  });

  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const callbacksRef = useRef<Map<string, Set<Function>>>(new Map());

  // リアルタイム接続状態監視
  useEffect(() => {
    const handleStatusChange = (status: string) => {
      setState(prev => ({
        ...prev,
        connectionStatus: status as any,
        isConnected: status === 'OPEN',
        isConnecting: status === 'CONNECTING',
        error: status === 'CLOSED' ? 'Connection closed' : null,
      }));
    };

    // Supabaseリアルタイム接続状態監視
    supabase.realtime.onOpen(() => handleStatusChange('OPEN'));
    supabase.realtime.onClose(() => handleStatusChange('CLOSED'));
    supabase.realtime.onError((error) => {
      console.error('Realtime error:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Realtime connection error',
      }));
    });

    return () => {
      // 全てのチャンネルを閉じる
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      callbacksRef.current.clear();
    };
  }, []);

  // チャンネル管理ヘルパー
  const getOrCreateChannel = useCallback((channelName: string) => {
    if (!channelsRef.current.has(channelName)) {
      const channel = supabase.channel(channelName);
      channelsRef.current.set(channelName, channel);
      callbacksRef.current.set(channelName, new Set());
    }
    return channelsRef.current.get(channelName)!;
  }, []);

  // コールバック管理ヘルパー
  const addCallback = useCallback((channelName: string, callback: Function) => {
    if (!callbacksRef.current.has(channelName)) {
      callbacksRef.current.set(channelName, new Set());
    }
    callbacksRef.current.get(channelName)!.add(callback);
  }, []);

  const removeCallback = useCallback((channelName: string, callback: Function) => {
    const callbacks = callbacksRef.current.get(channelName);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        // チャンネルを閉じる
        const channel = channelsRef.current.get(channelName);
        if (channel) {
          supabase.removeChannel(channel);
          channelsRef.current.delete(channelName);
          callbacksRef.current.delete(channelName);
        }
      }
    }
  }, []);

  // ルーム参加
  const joinRoom = useCallback(async (roomId: string) => {
    const channel = getOrCreateChannel(`room:${roomId}`);
    
    // まだ購読していない場合のみ購読
    if (channel.state !== 'joined') {
      await channel.subscribe((status) => {
        console.log(`Room ${roomId} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully joined room: ${roomId}`);
        }
      });
    }

    return channel;
  }, [getOrCreateChannel]);

  // ルーム退出
  const leaveRoom = useCallback(async (roomId: string) => {
    const channelName = `room:${roomId}`;
    const channel = channelsRef.current.get(channelName);
    
    if (channel) {
      await supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
      callbacksRef.current.delete(channelName);
    }
  }, []);

  // メッセージ送信（Supabaseデータベース経由）
  const sendMessage = useCallback(async (
    roomId: string, 
    content: string, 
    messageType: string = 'text',
    metadata: any = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content,
          message_type: messageType,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, []);

  // タイピング状態開始
  const startTyping = useCallback(async (roomId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('typing_status')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          is_typing: true,
          content_preview: '',
        });
    } catch (error) {
      console.error('Failed to start typing:', error);
    }
  }, []);

  // タイピング内容更新
  const updateTyping = useCallback(async (roomId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('typing_status')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          is_typing: true,
          content_preview: content.slice(0, 100), // 最初の100文字のみ
        });
    } catch (error) {
      console.error('Failed to update typing:', error);
    }
  }, []);

  // タイピング終了
  const stopTyping = useCallback(async (roomId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('typing_status')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          is_typing: false,
          content_preview: null,
        });
    } catch (error) {
      console.error('Failed to stop typing:', error);
    }
  }, []);

  // リアクション追加
  const sendReaction = useCallback(async (
    messageId: string, 
    reactionType: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to send reaction:', error);
      throw error;
    }
  }, []);

  // リアクション削除
  const removeReaction = useCallback(async (
    messageId: string, 
    reactionType: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      throw error;
    }
  }, []);

  // タッチ位置送信（メタデータとしてメッセージで送信）
  const sendTouchPosition = useCallback(async (
    roomId: string, 
    x: number, 
    y: number
  ) => {
    await sendMessage(roomId, '', 'touch', { x, y });
  }, [sendMessage]);

  // プレゼンス状態更新
  const updatePresence = useCallback(async (status: 'online' | 'offline' | 'away') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          last_seen: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, []);

  // イベントリスナー - メッセージ受信
  const onMessageReceived = useCallback((
    roomId: string,
    callback: (payload: RealtimePostgresChangesPayload<Message>) => void
  ) => {
    const channel = getOrCreateChannel(`room:${roomId}`);
    const channelName = `room:${roomId}`;

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      callback
    );

    addCallback(channelName, callback);

    return () => removeCallback(channelName, callback);
  }, [getOrCreateChannel, addCallback, removeCallback]);

  // イベントリスナー - タイピング更新
  const onTypingUpdate = useCallback((
    roomId: string,
    callback: (payload: RealtimePostgresChangesPayload<TypingStatus>) => void
  ) => {
    const channel = getOrCreateChannel(`room:${roomId}`);
    const channelName = `room:${roomId}`;

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_status',
        filter: `room_id=eq.${roomId}`,
      },
      callback
    );

    addCallback(channelName, callback);

    return () => removeCallback(channelName, callback);
  }, [getOrCreateChannel, addCallback, removeCallback]);

  // イベントリスナー - リアクション追加
  const onReactionUpdate = useCallback((
    callback: (payload: RealtimePostgresChangesPayload<Reaction>) => void
  ) => {
    const channel = getOrCreateChannel('reactions');

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reactions',
      },
      callback
    );

    addCallback('reactions', callback);

    return () => removeCallback('reactions', callback);
  }, [getOrCreateChannel, addCallback, removeCallback]);

  // イベントリスナー - プレゼンス更新
  const onPresenceUpdate = useCallback((
    callback: (payload: RealtimePostgresChangesPayload<UserPresence>) => void
  ) => {
    const channel = getOrCreateChannel('presence');

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
      },
      callback
    );

    addCallback('presence', callback);

    return () => removeCallback('presence', callback);
  }, [getOrCreateChannel, addCallback, removeCallback]);

  return {
    ...state,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    updateTyping,
    stopTyping,
    sendReaction,
    removeReaction,
    sendTouchPosition,
    updatePresence,
    // イベントリスナー
    onMessageReceived,
    onTypingUpdate,
    onReactionUpdate,
    onPresenceUpdate,
  };
};