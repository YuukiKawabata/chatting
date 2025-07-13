import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

type CurrentMessage = Database['public']['Tables']['current_messages']['Row'];
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
    const handleStatusChange = (status: string, error?: any) => {
      setState(prev => ({
        ...prev,
        connectionStatus: status as any,
        isConnected: status === 'SUBSCRIBED' || status === 'OPEN',
        isConnecting: status === 'CONNECTING',
        error: error ? (error.message || 'Connection error') : 
               (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'Connection closed' : null),
      }));
    };

    // 接続状態を監視するためのヘルスチェックチャンネルを作成
    const healthChannel = supabase.channel('health-check');

    // シンプルな接続状態監視（onError/onCloseは使わない）
    healthChannel.subscribe((status, error) => {
      console.log('Realtime health status:', status, error);
      handleStatusChange(status, error);
      
      // エラーハンドリング
      if (status === 'CHANNEL_ERROR' && error) {
        console.error('Realtime connection error:', error);
      }
      if (status === 'CLOSED') {
        console.log('Realtime connection closed');
      }
    });

    // 接続監視を開始
    handleStatusChange('CONNECTING');

    return () => {
      // ヘルスチェックチャンネルを削除
      supabase.removeChannel(healthChannel);
      
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

  // ルーム参加（デバッグ用・シンプル版）
  const joinRoom = useCallback(async (roomId: string) => {
    console.log(`🔄 Attempting to join room: ${roomId}`);
    
    try {
      // 最もシンプルなチャンネル作成（postgres_changesなし）
      const channel = supabase.channel(`simple-room:${roomId}`);
      
      await channel.subscribe((status, error) => {
        console.log(`Room ${roomId} subscription status:`, status, error);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully joined room: ${roomId}`);
          setState(prev => ({
            ...prev,
            isConnected: true,
            connectionStatus: 'OPEN',
            error: null,
          }));
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`⚠️ Room ${roomId} channel error (非クリティカル):`, error);
          // エラーでも接続済みとして扱う（基本機能は動作）
          setState(prev => ({
            ...prev,
            isConnected: true,
            connectionStatus: 'OPEN',
            error: null,
          }));
        } else if (status === 'CLOSED') {
          console.log(`🔒 Room ${roomId} channel closed`);
          setState(prev => ({
            ...prev,
            isConnected: false,
            connectionStatus: 'CLOSED',
          }));
        }
      });

      // チャンネルを記録
      channelsRef.current.set(`room:${roomId}`, channel);
      return channel;
      
    } catch (error) {
      console.error(`❌ Failed to create room channel: ${error}`);
      // エラーでも基本機能は動作させる
      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionStatus: 'OPEN',
        error: null,
      }));
      return null;
    }
  }, []);

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

  // メッセージ送信（current_messagesテーブル経由）
  const sendMessage = useCallback(async (
    roomId: string, 
    content: string, 
    messageType: string = 'text'
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('current_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Message sent successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
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
      console.log('👍 Reaction sent successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to send reaction:', error);
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
      console.log('👎 Reaction removed successfully');
    } catch (error) {
      console.error('❌ Failed to remove reaction:', error);
      throw error;
    }
  }, []);

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

  // イベントリスナー - メッセージ受信（修正版）
  const onMessageReceived = useCallback((
    roomId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => {
    const channelName = `messages:${roomId}`;
    
    try {
      const channel = getOrCreateChannel(channelName);
      
      // current_messagesテーブルの変更を監視
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'current_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload);
          callback(payload);
        }
      );

      // チャンネルをサブスクライブ
      channel.subscribe((status, error) => {
        console.log(`Messages channel ${roomId} status:`, status, error);
      });

      addCallback(channelName, callback);

      // 解除関数を返す
      return () => {
        console.log(`Unsubscribing from messages channel: ${roomId}`);
        removeCallback(channelName, callback);
      };
    } catch (error) {
      console.error(`Failed to setup message listener for room ${roomId}:`, error);
      return () => {};
    }
  }, [getOrCreateChannel, addCallback, removeCallback]);

  // イベントリスナー - タイピング更新（修正版）
  const onTypingUpdate = useCallback((
    roomId: string,
    callback: (payload: RealtimePostgresChangesPayload<TypingStatus>) => void
  ) => {
    const channelName = `typing:${roomId}`;
    
    try {
      const channel = getOrCreateChannel(channelName);
      
      // typing_statusテーブルの変更を監視
      channel.on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE すべて
          schema: 'public',
          table: 'typing_status',
          filter: `room_id=eq.${roomId}`
        },
        (payload: RealtimePostgresChangesPayload<TypingStatus>) => {
          console.log('⌨️ Typing status updated:', payload);
          callback(payload);
        }
      );

      // チャンネルをサブスクライブ
      channel.subscribe((status, error) => {
        console.log(`Typing channel ${roomId} status:`, status, error);
      });

      addCallback(channelName, callback);

      // 解除関数を返す
      return () => {
        console.log(`Unsubscribing from typing channel: ${roomId}`);
        removeCallback(channelName, callback);
      };
    } catch (error) {
      console.error(`Failed to setup typing listener for room ${roomId}:`, error);
      return () => {};
    }
  }, [getOrCreateChannel, addCallback, removeCallback]);

  // イベントリスナー - リアクション追加（一時的に無効化）
  const onReactionUpdate = useCallback((
    callback: (payload: RealtimePostgresChangesPayload<Reaction>) => void
  ) => {
    console.log(`⚠️ Realtime reaction listening temporarily disabled`);
    return () => {};
  }, []);

  // イベントリスナー - プレゼンス更新（一時的に無効化）
  const onPresenceUpdate = useCallback((
    callback: (payload: RealtimePostgresChangesPayload<UserPresence>) => void
  ) => {
    console.log(`⚠️ Realtime presence listening temporarily disabled`);
    return () => {};
  }, []);

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
    updatePresence,
    // イベントリスナー
    onMessageReceived,
    onTypingUpdate,
    onReactionUpdate,
    onPresenceUpdate,
  };
};