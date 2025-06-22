import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Reaction, TypingUser } from '../types';
import { useSocket } from './useSocket';

export const useMessages = (roomId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = useRef<string>('user_demo'); // TODO: Get from auth context
  
  const {
    isConnected,
    sendMessage: socketSendMessage,
    updateTyping,
    stopTyping,
    sendReaction,
    onMessageReceived,
    onTypingUpdate,
    onTypingStopped,
    onReactionAdded,
  } = useSocket();

  // Setup message listeners
  useEffect(() => {
    if (!roomId || !isConnected) return;

    const unsubscribeMessage = onMessageReceived((message: Message) => {
      setMessages(prev => {
        // Avoid duplicates
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    });

    const unsubscribeTyping = onTypingUpdate((data: { userId: string; username: string; roomId: string; content?: string }) => {
      if (data.roomId === roomId && data.userId !== currentUserId.current) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, {
            userId: data.userId,
            username: data.username,
            content: data.content || '',
            startedAt: Date.now()
          });
          return newMap;
        });
      }
    });

    const unsubscribeTypingStopped = onTypingStopped((data: { userId: string; roomId: string }) => {
      if (data.roomId === roomId) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      }
    });

    const unsubscribeReaction = onReactionAdded((data: { messageId: string; reaction: Reaction }) => {
      setMessages(prev => prev.map(message => 
        message.id === data.messageId 
          ? { 
              ...message, 
              reactions: [...(message.reactions || []), data.reaction]
            }
          : message
      ));
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeTypingStopped();
      unsubscribeReaction();
    };
  }, [roomId, isConnected, onMessageReceived, onTypingUpdate, onTypingStopped, onReactionAdded]);

  // Clean up old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const newMap = new Map();
        const now = Date.now();
        for (const [userId, data] of prev.entries()) {
          if (now - data.startedAt < 10000) { // 10 seconds timeout
            newMap.set(userId, data);
          }
        }
        return newMap;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Load initial messages
  const loadMessages = useCallback(async (limit: number = 50, offset: number = 0) => {
    if (!roomId) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const messages = await apiService.getMessages(roomId, { limit, offset });
      // setMessages(prev => offset === 0 ? messages : [...prev, ...messages]);
      
      // For now, simulate with empty array
      if (offset === 0) {
        setMessages([]);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load messages');
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const sendMessage = useCallback((content: string, type: string = 'text') => {
    if (!roomId || !content.trim()) return;

    try {
      socketSendMessage(roomId, content.trim(), type);
    } catch (error: any) {
      setError(error.message || 'Failed to send message');
      console.error('Failed to send message:', error);
    }
  }, [roomId, socketSendMessage]);

  const handleTyping = useCallback((content: string) => {
    if (!roomId) return;

    if (content.trim()) {
      updateTyping(roomId, content);
    } else {
      stopTyping(roomId);
    }
  }, [roomId, updateTyping, stopTyping]);

  const addReaction = useCallback((messageId: string, reactionType: string) => {
    if (!roomId) return;

    try {
      sendReaction(messageId, reactionType, roomId);
    } catch (error: any) {
      setError(error.message || 'Failed to add reaction');
      console.error('Failed to add reaction:', error);
    }
  }, [roomId, sendReaction]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTypingUsers(new Map());
    setError(null);
  }, []);

  // Get current typing users (excluding current user)
  const currentTyping = Array.from(typingUsers.values()).filter(
    user => user.userId !== currentUserId.current
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
    clearMessages,
  };
};