import { io, Socket } from 'socket.io-client';
import { SocketEvents, Message, Reaction, TypingUser, TouchPosition } from '../types';

type SocketEventMap = {
  [K in keyof SocketEvents]: SocketEvents[K] extends void 
    ? () => void 
    : (data: SocketEvents[K]) => void;
};

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 20000,
        });

        this.socket.on('connect', () => {
          console.log('Socket connected successfully');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, reconnect manually
            this.reconnect(token);
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          reject(error);
        });

        // Authentication success/failure
        this.socket.on('authenticated', (data) => {
          console.log('Socket authenticated:', data);
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

      } catch (error) {
        console.error('Failed to initialize socket:', error);
        reject(error);
      }
    });
  }

  private reconnect(token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      
      setTimeout(() => {
        this.connect(token).catch(console.error);
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Event listeners
  on<K extends keyof SocketEvents>(event: K, callback: SocketEventMap[K]): void {
    if (this.socket) {
      this.socket.on(event as string, callback);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEventMap[K]): void {
    if (this.socket) {
      this.socket.off(event as string, callback);
    }
  }

  // Event emitters
  emit<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event as string, data);
    } else {
      console.warn(`Cannot emit ${event as string}: Socket not connected`);
    }
  }

  // Convenience methods for common events
  joinRoom(roomId: string): void {
    this.emit('join_room', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.emit('leave_room', { roomId });
  }

  sendMessage(roomId: string, content: string, type: string = 'text'): void {
    this.emit('send_message', { roomId, content, type });
  }

  startTyping(roomId: string): void {
    this.emit('typing_start', { roomId });
  }

  updateTyping(roomId: string, content: string): void {
    this.emit('typing_update', { roomId, content });
  }

  stopTyping(roomId: string): void {
    this.emit('typing_stop', { roomId });
  }

  sendReaction(messageId: string, type: string, roomId: string): void {
    this.emit('add_reaction', { messageId, type: type as any, roomId });
  }

  removeReaction(messageId: string, type: string, roomId: string): void {
    this.emit('remove_reaction', { messageId, type: type as any, roomId });
  }

  sendTouchPosition(roomId: string, x: number, y: number): void {
    this.emit('touch_position', { roomId, x, y });
  }

  // Message listeners with proper typing
  onMessageReceived(callback: (message: Message) => void): void {
    this.on('message_received', callback);
  }

  onTypingUpdate(callback: (data: { userId: string; username: string; roomId: string; content?: string }) => void): void {
    this.on('user_typing', callback);
  }

  onTypingStopped(callback: (data: { userId: string; roomId: string }) => void): void {
    this.on('user_stopped_typing', callback);
  }

  onReactionAdded(callback: (data: { messageId: string; reaction: Reaction }) => void): void {
    this.on('reaction_added', callback);
  }

  onUserOnline(callback: (data: { userId: string; username: string }) => void): void {
    this.on('user_online', callback);
  }

  onUserOffline(callback: (data: { userId: string; username: string }) => void): void {
    this.on('user_offline', callback);
  }

  onPartnerTouch(callback: (data: { userId: string; x: number; y: number; roomId: string }) => void): void {
    this.on('partner_touch', callback);
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;