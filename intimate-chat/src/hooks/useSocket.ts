import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<boolean>(false);

  const connect = useCallback(async (token: string) => {
    if (connectionRef.current || isConnecting) {
      console.log('Socket already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await socketService.connect(token);
      connectionRef.current = true;
      setIsConnected(true);
      
      // Setup connection event listeners
      socketService.on('connect', () => {
        setIsConnected(true);
        setError(null);
      });

      socketService.on('disconnect', () => {
        setIsConnected(false);
        connectionRef.current = false;
      });

      socketService.on('error', (error: any) => {
        setError(error.message || 'Socket error occurred');
        console.error('Socket error:', error);
      });

    } catch (error: any) {
      setError(error.message || 'Failed to connect to server');
      console.error('Socket connection failed:', error);
      connectionRef.current = false;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      socketService.disconnect();
      connectionRef.current = false;
      setIsConnected(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Socket event methods
  const joinRoom = useCallback((roomId: string) => {
    socketService.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketService.leaveRoom(roomId);
  }, []);

  const sendMessage = useCallback((roomId: string, content: string, type: string = 'text') => {
    socketService.sendMessage(roomId, content, type);
  }, []);

  const startTyping = useCallback((roomId: string) => {
    socketService.startTyping(roomId);
  }, []);

  const updateTyping = useCallback((roomId: string, content: string) => {
    socketService.updateTyping(roomId, content);
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    socketService.stopTyping(roomId);
  }, []);

  const sendReaction = useCallback((messageId: string, type: string, roomId: string) => {
    socketService.sendReaction(messageId, type, roomId);
  }, []);

  const removeReaction = useCallback((messageId: string, type: string, roomId: string) => {
    socketService.removeReaction(messageId, type, roomId);
  }, []);

  const sendTouchPosition = useCallback((roomId: string, x: number, y: number) => {
    socketService.sendTouchPosition(roomId, x, y);
  }, []);

  // Event listener helpers
  const onMessageReceived = useCallback((callback: (message: any) => void) => {
    socketService.onMessageReceived(callback);
    return () => socketService.off('message_received', callback);
  }, []);

  const onTypingUpdate = useCallback((callback: (data: any) => void) => {
    socketService.onTypingUpdate(callback);
    return () => socketService.off('user_typing', callback);
  }, []);

  const onTypingStopped = useCallback((callback: (data: any) => void) => {
    socketService.onTypingStopped(callback);
    return () => socketService.off('user_stopped_typing', callback);
  }, []);

  const onReactionAdded = useCallback((callback: (data: any) => void) => {
    socketService.onReactionAdded(callback);
    return () => socketService.off('reaction_added', callback);
  }, []);

  const onUserOnline = useCallback((callback: (data: any) => void) => {
    socketService.onUserOnline(callback);
    return () => socketService.off('user_online', callback);
  }, []);

  const onUserOffline = useCallback((callback: (data: any) => void) => {
    socketService.onUserOffline(callback);
    return () => socketService.off('user_offline', callback);
  }, []);

  const onPartnerTouch = useCallback((callback: (data: any) => void) => {
    socketService.onPartnerTouch(callback);
    return () => socketService.off('partner_touch', callback);
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    updateTyping,
    stopTyping,
    sendReaction,
    removeReaction,
    sendTouchPosition,
    onMessageReceived,
    onTypingUpdate,
    onTypingStopped,
    onReactionAdded,
    onUserOnline,
    onUserOffline,
    onPartnerTouch,
  };
};