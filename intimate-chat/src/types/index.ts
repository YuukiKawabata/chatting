// Type definitions for Intimate Chat App

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  themePreference: ThemeName;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  reactions?: Reaction[];
  sender?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface Reaction {
  id?: string;
  messageId: string;
  userId: string;
  username: string;
  type: ReactionType;
  createdAt: string;
}

export type ReactionType = 'heart' | 'smile' | 'zap' | 'coffee' | 'star';

export interface ChatRoom {
  id: string;
  name?: string;
  type: '1on1' | 'group';
  participants: RoomParticipant[];
  createdBy: string;
  createdAt: string;
  lastMessage?: Message;
}

export interface RoomParticipant {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  lastReadAt?: string;
}

export interface TypingUser {
  userId: string;
  username: string;
  content?: string;
  startedAt: number;
}

export interface TouchPosition {
  x: number;
  y: number;
  userId: string;
}

export type ThemeName = 'cute' | 'cool' | 'minimal' | 'warm';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning?: string;
    danger?: string;
    background: {
      primary: string;
      secondary?: string;
      card: string;
    };
    text: {
      primary: string;
      secondary: string;
      accent: string;
    };
    border: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  typography: {
    heading1: TextStyle;
    heading2: TextStyle;
    body: TextStyle;
    caption: TextStyle;
    message: TextStyle;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

interface TextStyle {
  fontSize: number;
  fontWeight: string | number;
  lineHeight: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SocketEvents {
  // Client to Server
  'authenticate': { token: string };
  'join_room': { roomId: string };
  'leave_room': { roomId: string };
  'send_message': { roomId: string; content: string; type?: string };
  'typing_start': { roomId: string };
  'typing_update': { roomId: string; content: string };
  'typing_stop': { roomId: string };
  'add_reaction': { messageId: string; type: ReactionType; roomId: string };
  'remove_reaction': { messageId: string; type: ReactionType; roomId: string };
  'touch_position': { roomId: string; x: number; y: number };

  // Server to Client
  'connect': void;
  'disconnect': void;
  'authenticated': { userId: string };
  'joined_room': { roomId: string };
  'left_room': { roomId: string };
  'message_received': Message;
  'message_updated': Message;
  'message_deleted': { messageId: string };
  'user_typing': { userId: string; username: string; roomId: string; content?: string };
  'user_stopped_typing': { userId: string; roomId: string };
  'reaction_added': { messageId: string; reaction: Reaction };
  'reaction_removed': { messageId: string; userId: string; type: ReactionType };
  'user_online': { userId: string; username: string };
  'user_offline': { userId: string; username: string };
  'partner_touch': { userId: string; x: number; y: number; roomId: string };
  'error': { message: string };
  'notification': { type: string; message: string };
}