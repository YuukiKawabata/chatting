import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { useRealtime } from './useRealtime';
import { useAuth } from './useAuth';

// データベース型定義（auth.usersベース）
type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: {
    id: string;
    email: string;
    user_metadata?: {
      username?: string;
      display_name?: string;
      theme_preference?: string;
    };
  };
  reactions?: Database['public']['Tables']['reactions']['Row'][];
};

type Reaction = Database['public']['Tables']['reactions']['Row'];
type TypingStatus = Database['public']['Tables']['typing_status']['Row'];

interface TypingUser {
  userId: string;
  username: string;
  content: string;
  startedAt: number;
}

export const useMessages = (roomId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // メッセージの自動削除タイマーを管理
  const messageTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const { user } = useAuth();
  const {
    sendMessage: realtimeSendMessage,
    updateTyping,
    stopTyping,
    sendReaction,
    removeReaction,
    onMessageReceived,
    onTypingUpdate,
    onReactionUpdate,
    joinRoom,
    leaveRoom,
  } = useRealtime();

  const currentUserId = user?.id;
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // メッセージの自動削除機能（30秒後）
  const scheduleMessageRemoval = useCallback((messageId: string) => {
    // 既存のタイマーがあれば削除
    const existingTimer = messageTimers.current.get(messageId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 30秒後にメッセージを削除
    const timer = setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      messageTimers.current.delete(messageId);
    }, 30000); // 30秒

    messageTimers.current.set(messageId, timer);
  }, []);

  // コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      messageTimers.current.forEach(timer => clearTimeout(timer));
      messageTimers.current.clear();
    };
  }, []);

  // ルーム参加・退出管理
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const setupRoom = async () => {
      try {
        // ルーム参加
        await joinRoom(roomId);
        
        // 初期メッセージ読み込み
        await loadMessages();
      } catch (error) {
        console.error('Room setup failed:', error);
        setError('ルームへの接続に失敗しました');
      }
    };

    setupRoom();

    return () => {
      // ルーム退出
      leaveRoom(roomId);
      // 購読解除
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [roomId, currentUserId, joinRoom, leaveRoom]);

  // リアルタイムイベント設定
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    // メッセージ受信監視
    const messageUnsubscribe = onMessageReceived(roomId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMessage = payload.new as Message;
        // 送信者情報を取得して追加
        fetchMessageWithSender(newMessage).then(enrichedMessage => {
          setMessages(prev => {
            // 重複チェック
            const exists = prev.some(m => m.id === enrichedMessage.id);
            if (exists) return prev;
            
            // 時間順でソート挿入
            const newMessages = [...prev, enrichedMessage];
            const sortedMessages = newMessages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            // 新しいメッセージの自動削除をスケジュール
            scheduleMessageRemoval(enrichedMessage.id);
            
            return sortedMessages;
          });
        });
      }
    });

    // タイピング状態監視
    const typingUnsubscribe = onTypingUpdate(roomId, (payload) => {
      const typingData = payload.new as TypingStatus;
      
      if (typingData.user_id === currentUserId) return; // 自分のタイピングは無視

      if (typingData.is_typing && payload.eventType !== 'DELETE') {
        // タイピング開始/更新
        if (typingData.user_id) {
          fetchUserInfo(typingData.user_id).then(userInfo => {
          if (userInfo) {
            setTypingUsers(prev => {
              const newMap = new Map(prev);
              newMap.set(typingData.user_id!, {
                userId: typingData.user_id!,
                username: userInfo.display_name || userInfo.username,
                content: typingData.content_preview || '',
                startedAt: Date.now(),
              });
              return newMap;
            });
          }
        });
        }
      } else {
        // タイピング終了
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (typingData.user_id) {
            newMap.delete(typingData.user_id);
          }
          return newMap;
        });
      }
    });

    // リアクション更新監視
    const reactionUnsubscribe = onReactionUpdate((payload) => {
      const reaction = payload.new as Reaction;
      
      if (payload.eventType === 'INSERT') {
        // リアクション追加
        setMessages(prev => prev.map(message => 
          message.id === reaction.message_id
            ? {
                ...message,
                reactions: [...(message.reactions || []), reaction]
              }
            : message
        ));
      } else if (payload.eventType === 'DELETE') {
        // リアクション削除
        const deletedReaction = payload.old as Reaction;
        setMessages(prev => prev.map(message => 
          message.id === deletedReaction.message_id
            ? {
                ...message,
                reactions: (message.reactions || []).filter(r => r.id !== deletedReaction.id)
              }
            : message
        ));
      }
    });

    // 購読解除関数を保存
    unsubscribeRefs.current = [messageUnsubscribe, typingUnsubscribe, reactionUnsubscribe];

    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [roomId, currentUserId, onMessageReceived, onTypingUpdate, onReactionUpdate]);

  // タイピング状態の自動クリーンアップ
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const newMap = new Map();
        const now = Date.now();
        for (const [userId, data] of prev.entries()) {
          if (now - data.startedAt < 10000) { // 10秒でタイムアウト
            newMap.set(userId, data);
          }
        }
        return newMap.size !== prev.size ? newMap : prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ユーザー情報取得ヘルパー（auth.usersベース）
  const fetchUserInfo = async (userId: string) => {
    try {
      // auth.usersから直接ユーザー情報を取得する方法はSupabaseクライアントでは制限されているため
      // 代替として、ローカルキャッシュまたはuser_metadataを使用
      if (userId === currentUserId && user) {
        return {
          id: user.id,
          username: user.user_metadata?.username || 'Unknown',
          display_name: user.user_metadata?.display_name || user.user_metadata?.username || 'Unknown'
        };
      }
      
      // 他のユーザーの場合はデフォルト値を返す
      return {
        id: userId,
        username: 'User',
        display_name: 'User'
      };
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return null;
    }
  };

  // メッセージと送信者情報を取得（auth.usersベース）
  const fetchMessageWithSender = async (message: Message): Promise<Message> => {
    if (!message.sender_id) return message;

    try {
      // 送信者情報を構築（auth.usersベース）
      let sender;
      if (message.sender_id === currentUserId && user) {
        sender = {
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata
        };
      } else {
        // 他のユーザーの場合はデフォルト値
        sender = {
          id: message.sender_id,
          email: '',
          user_metadata: {
            username: 'User',
            display_name: 'User'
          }
        };
      }

      return { ...message, sender };
    } catch (error) {
      console.error('Failed to fetch sender info:', error);
      return message;
    }
  };

  // 初期メッセージ読み込み（一時的メッセージ用に制限）
  const loadMessages = useCallback(async (limit: number = 10, offset: number = 0) => {
    if (!roomId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 最新のメッセージのみ取得（過去のメッセージは非表示）
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          reactions(*)
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5分以内のメッセージのみ
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // 各メッセージに送信者情報を追加
      const enrichedMessages = await Promise.all(
        (messagesData || []).map(message => fetchMessageWithSender(message))
      );

      if (offset === 0) {
        setMessages(enrichedMessages);
        // 既存メッセージにも自動削除をスケジュール
        enrichedMessages.forEach(message => {
          const messageAge = Date.now() - new Date(message.created_at).getTime();
          const remainingTime = Math.max(30000 - messageAge, 1000); // 最低1秒
          setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== message.id));
          }, remainingTime);
        });
      } else {
        setMessages(prev => [...prev, ...enrichedMessages]);
        enrichedMessages.forEach(message => scheduleMessageRemoval(message.id));
      }
    } catch (error: any) {
      setError(error.message || 'メッセージの読み込みに失敗しました');
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, scheduleMessageRemoval]);

  // メッセージ送信
  const sendMessage = useCallback(async (content: string, messageType: string = 'text') => {
    if (!roomId || !content.trim()) return;

    try {
      // タイピング状態を停止
      await stopTyping(roomId);
      
      // メッセージ送信
      const message = await realtimeSendMessage(roomId, content.trim(), messageType);
      return message;
    } catch (error: any) {
      setError(error.message || 'メッセージの送信に失敗しました');
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [roomId, realtimeSendMessage, stopTyping]);

  // タイピング状態管理
  const handleTyping = useCallback(async (content: string) => {
    if (!roomId) return;

    try {
      if (content.trim()) {
        await updateTyping(roomId, content);
      } else {
        await stopTyping(roomId);
      }
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  }, [roomId, updateTyping, stopTyping]);

  // リアクション追加
  const addReaction = useCallback(async (messageId: string, reactionType: string) => {
    try {
      await sendReaction(messageId, reactionType);
    } catch (error: any) {
      setError(error.message || 'リアクションの追加に失敗しました');
      console.error('Failed to add reaction:', error);
    }
  }, [sendReaction]);

  // リアクション削除
  const deleteReaction = useCallback(async (messageId: string, reactionType: string) => {
    try {
      await removeReaction(messageId, reactionType);
    } catch (error: any) {
      setError(error.message || 'リアクションの削除に失敗しました');
      console.error('Failed to remove reaction:', error);
    }
  }, [removeReaction]);

  // メッセージ削除（論理削除）
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('sender_id', currentUserId); // 自分のメッセージのみ削除可能

      if (error) throw error;

      // ローカル状態からも削除
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error: any) {
      setError(error.message || 'メッセージの削除に失敗しました');
      console.error('Failed to delete message:', error);
    }
  }, [currentUserId]);

  // ローカル状態クリア
  const clearMessages = useCallback(() => {
    setMessages([]);
    setTypingUsers(new Map());
    setError(null);
  }, []);

  // 既読状態更新
  const markAsRead = useCallback(async () => {
    if (!roomId || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [roomId, currentUserId]);

  // 現在タイピング中のユーザー（自分以外）
  const currentTyping = Array.from(typingUsers.values()).filter(
    user => user.userId !== currentUserId
  );

  return {
    messages,
    typingUsers: currentTyping,
    isLoading,
    error,
    loadMessages,
    sendMessage,
    handleTyping,
    addReaction,
    deleteReaction,
    deleteMessage,
    clearMessages,
    markAsRead,
  };
};