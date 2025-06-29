import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Heart, Palette, Smile, Zap, Coffee, Star, Send, Users, Settings, LogOut } from 'lucide-react';

// Socket.IO Client (シミュレーション)
class SocketIOClient {
  constructor() {
    this.listeners = new Map();
    this.connected = false;
    this.userId = null;
    this.rooms = new Set();
  }
  
  connect(token) {
    // Simulate connection
    setTimeout(() => {
      this.connected = true;
      this.emit('connect');
      this.startSimulation();
    }, 1000);
  }
  
  disconnect() {
    this.connected = false;
    this.emit('disconnect');
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
    
    // Handle outgoing events
    this.handleOutgoingEvent(event, data);
  }
  
  handleOutgoingEvent(event, data) {
    // Simulate server responses
    switch (event) {
      case 'join_room':
        setTimeout(() => this.emit('joined_room', { roomId: data.roomId }), 100);
        break;
      case 'send_message':
        setTimeout(() => {
          this.emit('message_received', {
            id: 'msg_' + Date.now(),
            ...data,
            senderId: this.userId,
            sender: {
              id: this.userId,
              username: 'あなた',
              displayName: 'あなた'
            },
            createdAt: new Date().toISOString()
          });
        }, 100);
        break;
      case 'typing_start':
      case 'typing_update':
        // Echo typing to other users (simulated)
        break;
      case 'add_reaction':
        setTimeout(() => {
          this.emit('reaction_added', {
            messageId: data.messageId,
            reaction: {
              userId: this.userId,
              username: 'あなた',
              type: data.type,
              createdAt: new Date().toISOString()
            }
          });
        }, 100);
        break;
    }
  }
  
  startSimulation() {
    // Simulate partner messages
    const messages = [
      'こんにちは！',
      '今何してる？',
      'そうなんだ〜',
      'いいね！',
      '今度会おうね💕',
      'お疲れさま',
      'ありがとう',
      '楽しかった！',
      'おやすみ🌙'
    ];
    
    const reactions = ['heart', 'smile', 'zap', 'coffee', 'star'];
    
    const simulatePartnerActivity = () => {
      if (!this.connected) return;
      
      const random = Math.random();
      
      if (random > 0.7) {
        // Simulate partner message
        const message = messages[Math.floor(Math.random() * messages.length)];
        this.emit('message_received', {
          id: 'msg_partner_' + Date.now(),
          roomId: 'room_demo',
          content: message,
          type: 'text',
          senderId: 'partner_id',
          sender: {
            id: 'partner_id',
            username: '愛しの人',
            displayName: '愛しの人'
          },
          createdAt: new Date().toISOString()
        });
      } else if (random > 0.85) {
        // Simulate partner reaction
        const reaction = reactions[Math.floor(Math.random() * reactions.length)];
        this.emit('reaction_added', {
          messageId: 'msg_demo',
          reaction: {
            userId: 'partner_id',
            username: '愛しの人',
            type: reaction,
            createdAt: new Date().toISOString()
          }
        });
      }
    };
    
    setInterval(simulatePartnerActivity, 5000 + Math.random() * 10000);
  }
}

// API Client
class APIClient {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.token = localStorage.getItem('auth_token');
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers
    };
    
    // Simulate API calls for demo
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock responses
        if (endpoint === '/auth/login') {
          const mockUser = {
            id: 'user_demo',
            username: 'demo_user',
            email: 'demo@example.com',
            displayName: 'Demo User',
            themePreference: 'cute',
            isOnline: true
          };
          const mockToken = 'demo_jwt_token';
          this.token = mockToken;
          localStorage.setItem('auth_token', mockToken);
          resolve({ user: mockUser, token: mockToken });
        } else if (endpoint === '/users/me') {
          resolve({
            id: 'user_demo',
            username: 'demo_user',
            email: 'demo@example.com',
            displayName: 'Demo User',
            themePreference: 'cute',
            isOnline: true
          });
        } else if (endpoint === '/rooms') {
          resolve([{
            id: 'room_demo',
            name: '愛しの人との会話',
            type: '1on1',
            participants: [
              { userId: 'user_demo', role: 'admin' },
              { userId: 'partner_id', role: 'member' }
            ]
          }]);
        }
      }, 500);
    });
  }
  
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }
  
  async getProfile() {
    return this.request('/users/me');
  }
  
  async updateTheme(theme) {
    return this.request('/users/theme', {
      method: 'PUT',
      body: JSON.stringify({ theme })
    });
  }
  
  async getRooms() {
    return this.request('/rooms');
  }
}

// Theme System (前回と同じ)
const createTheme = (baseTheme) => ({
  ...baseTheme,
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  typography: {
    heading1: { fontSize: 32, fontWeight: 700, lineHeight: 1.25 },
    heading2: { fontSize: 24, fontWeight: 600, lineHeight: 1.33 },
    body: { fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.33 },
    message: { fontSize: 16, fontWeight: 400, lineHeight: 1.375 },
  },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  }
});

const themes = {
  cute: createTheme({
    name: '可愛い',
    colors: {
      primary: '#FF6B9D',
      secondary: '#A855F7',
      success: '#10B981',
      background: {
        primary: 'linear-gradient(135deg, #FFEEF7 0%, #FDF2F8 50%, #F3E8FF 100%)',
        card: 'rgba(255, 255, 255, 0.7)',
      },
      text: { primary: '#1F2937', secondary: '#6B7280', accent: '#FF6B9D' },
      border: '#F3E8FF',
    }
  }),
  cool: createTheme({
    name: 'クール',
    colors: {
      primary: '#3B82F6',
      secondary: '#06B6D4',
      success: '#10B981',
      background: {
        primary: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
        card: 'rgba(51, 65, 85, 0.7)',
      },
      text: { primary: '#F8FAFC', secondary: '#CBD5E1', accent: '#3B82F6' },
      border: '#374151',
    }
  }),
  minimal: createTheme({
    name: 'ミニマル',
    colors: {
      primary: '#374151',
      secondary: '#6B7280',
      success: '#10B981',
      background: {
        primary: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 50%, #E5E7EB 100%)',
        card: 'rgba(255, 255, 255, 0.8)',
      },
      text: { primary: '#111827', secondary: '#6B7280', accent: '#374151' },
      border: '#E5E7EB',
    }
  }),
  warm: createTheme({
    name: 'ウォーム',
    colors: {
      primary: '#EA580C',
      secondary: '#D97706',
      success: '#10B981',
      background: {
        primary: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FED7AA 100%)',
        card: 'rgba(255, 255, 255, 0.7)',
      },
      text: { primary: '#1F2937', secondary: '#78716C', accent: '#EA580C' },
      border: '#FED7AA',
    }
  }),
};

// Custom Hooks
const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const socketInstance = new SocketIOClient();
    setSocket(socketInstance);
    
    socketInstance.on('connect', () => setConnected(true));
    socketInstance.on('disconnect', () => setConnected(false));
    
    return () => {
      socketInstance.disconnect();
    };
  }, []);
  
  const connect = useCallback((token) => {
    if (socket) {
      socket.userId = 'user_demo';
      socket.connect(token);
    }
  }, [socket]);
  
  return { socket, connected, connect };
};

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiClient = useMemo(() => new APIClient(), []);
  
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const userData = await apiClient.getProfile();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };
    
    initAuth();
  }, [apiClient]);
  
  const login = useCallback(async (email, password) => {
    const { user, token } = await apiClient.login(email, password);
    setUser(user);
    return { user, token };
  }, [apiClient]);
  
  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);
  
  return { user, loading, login, logout, apiClient };
};

const useMessages = (socket, roomId) => {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Map());
  
  useEffect(() => {
    if (!socket || !roomId) return;
    
    const handleMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };
    
    const handleTyping = (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          username: data.username,
          content: data.content || '',
          startedAt: Date.now()
        });
        return newMap;
      });
    };
    
    const handleStoppedTyping = (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    };
    
    const handleReactionAdded = (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: [...(msg.reactions || []), data.reaction] }
          : msg
      ));
    };
    
    socket.on('message_received', handleMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_typing_update', handleTyping);
    socket.on('user_stopped_typing', handleStoppedTyping);
    socket.on('reaction_added', handleReactionAdded);
    
    // Join room
    socket.emit('join_room', { roomId });
    
    return () => {
      socket.off('message_received', handleMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_typing_update', handleTyping);
      socket.off('user_stopped_typing', handleStoppedTyping);
      socket.off('reaction_added', handleReactionAdded);
    };
  }, [socket, roomId]);
  
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
  
  const sendMessage = useCallback((content, type = 'text') => {
    if (socket && roomId) {
      socket.emit('send_message', { roomId, content, type });
    }
  }, [socket, roomId]);
  
  const sendTyping = useCallback((content) => {
    if (socket && roomId) {
      if (content) {
        socket.emit('typing_update', { roomId, content });
      } else {
        socket.emit('typing_stop', { roomId });
      }
    }
  }, [socket, roomId]);
  
  const sendReaction = useCallback((messageId, type) => {
    if (socket && roomId) {
      socket.emit('add_reaction', { messageId, type, roomId });
    }
  }, [socket, roomId]);
  
  return {
    messages,
    typingUsers,
    sendMessage,
    sendTyping,
    sendReaction
  };
};

// Styled Components
const StyledComponents = {
  Container: ({ theme, children, className, ...props }) => (
    <div 
      className={`flex flex-col h-screen transition-all duration-500 ${className || ''}`}
      style={{ background: theme.colors.background.primary }}
      {...props}
    >
      {children}
    </div>
  ),
  
  Card: ({ theme, children, className, ...props }) => (
    <div 
      className={`backdrop-blur-md rounded-xl shadow-lg border transition-all duration-300 ${className || ''}`}
      style={{ 
        backgroundColor: theme.colors.background.card,
        borderColor: theme.colors.border,
        boxShadow: theme.shadows.md,
      }}
      {...props}
    >
      {children}
    </div>
  ),
  
  Button: ({ theme, variant = 'primary', size = 'md', children, className, disabled, ...props }) => {
    const sizes = {
      sm: 'p-2 text-sm',
      md: 'p-3 text-base',
      lg: 'p-4 text-lg',
    };
    
    const variants = {
      primary: `bg-gradient-to-r text-white hover:shadow-lg ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
      secondary: `bg-gray-100 bg-opacity-20 text-current hover:bg-opacity-30 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
      ghost: `bg-transparent hover:bg-gray-100 hover:bg-opacity-20 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    };
    
    return (
      <button 
        className={`rounded-full transition-all duration-200 hover:scale-110 ${sizes[size]} ${variants[variant]} ${className || ''}`}
        disabled={disabled}
        style={{
          background: variant === 'primary' ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` : undefined
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
  
  MessageBubble: ({ theme, message, isOwn, onReaction }) => (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      <div className="max-w-xs lg:max-w-md">
        <div 
          className="px-4 py-2 rounded-2xl shadow-sm"
          style={{
            backgroundColor: isOwn ? theme.colors.primary : theme.colors.background.card,
            color: isOwn ? 'white' : theme.colors.text.primary,
          }}
        >
          <p className="text-sm lg:text-base">{message.content}</p>
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white bg-opacity-20"
                  title={`${reaction.username} - ${reaction.type}`}
                >
                  {getReactionEmoji(reaction.type)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center mt-1 space-x-2">
          <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
            {formatTime(new Date(message.createdAt))}
          </p>
          {!isOwn && (
            <button
              onClick={() => onReaction(message.id)}
              className="text-xs opacity-60 hover:opacity-100"
              style={{ color: theme.colors.text.secondary }}
            >
              + React
            </button>
          )}
        </div>
      </div>
    </div>
  ),
};

// Helper functions
const getReactionEmoji = (type) => {
  const emojis = {
    heart: '❤️',
    smile: '😊',
    zap: '⚡',
    coffee: '☕',
    star: '⭐'
  };
  return emojis[type] || '👍';
};

const formatTime = (date) => {
  return new Intl.DateTimeFormat('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  }).format(date);
};

// Login Component
const LoginScreen = ({ onLogin, theme }) => {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    }
    setLoading(false);
  };
  
  return (
    <StyledComponents.Container theme={theme} className="justify-center items-center p-6">
      <StyledComponents.Card theme={theme} className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: theme.colors.text.primary }}>
            Intimate Chat
          </h1>
          <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
            親密なリアルタイムチャット
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text.primary }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border,
                color: theme.colors.text.primary,
                focusRingColor: theme.colors.primary
              }}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text.primary }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border,
                color: theme.colors.text.primary
              }}
              required
            />
          </div>
          
          <StyledComponents.Button
            theme={theme}
            variant="primary"
            size="lg"
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </StyledComponents.Button>
        </form>
        
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: theme.colors.background.card }}>
          <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
            デモ用アカウント:<br />
            Email: demo@example.com<br />
            Password: password
          </p>
        </div>
      </StyledComponents.Card>
    </StyledComponents.Container>
  );
};

// Main Chat Application
const IntimateChat = () => {
  const [currentTheme, setCurrentTheme] = useState('cute');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [myInput, setMyInput] = useState('');
  const [connectionPulse, setConnectionPulse] = useState(true);
  const [touchPosition, setTouchPosition] = useState(null);
  
  const theme = themes[currentTheme];
  const { user, loading: authLoading, login, logout } = useAuth();
  const { socket, connected, connect } = useSocket();
  const { messages, typingUsers, sendMessage, sendTyping, sendReaction } = useMessages(socket, 'room_demo');
  
  const reactions = useMemo(() => [
    { type: 'heart', emoji: '❤️', name: 'ハート' },
    { type: 'smile', emoji: '😊', name: 'スマイル' },
    { type: 'zap', emoji: '⚡', name: 'エキサイト' },
    { type: 'coffee', emoji: '☕', name: 'リラックス' },
    { type: 'star', emoji: '⭐', name: 'すごい' }
  ], []);
  
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Connection pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionPulse(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Touch position simulation
  useEffect(() => {
    if (!socket) return;
    
    const handlePartnerTouch = (data) => {
      setTouchPosition({ x: data.x, y: data.y });
      setTimeout(() => setTouchPosition(null), 1500);
    };
    
    socket.on('partner_touch', handlePartnerTouch);
    return () => socket.off('partner_touch', handlePartnerTouch);
  }, [socket]);
  
  // Connect socket when user logs in
  useEffect(() => {
    if (user && !connected) {
      connect(localStorage.getItem('auth_token'));
    }
  }, [user, connected, connect]);
  
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setMyInput(value);
    sendTyping(value);
  }, [sendTyping]);
  
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && myInput.trim()) {
      sendMessage(myInput.trim());
      setMyInput('');
      sendTyping(''); // Stop typing
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [myInput, sendMessage, sendTyping]);
  
  const handleReactionClick = useCallback((messageId) => {
    setSelectedMessageId(messageId);
    setShowReactionPicker(true);
  }, []);
  
  const handleSendReaction = useCallback((reaction) => {
    if (selectedMessageId) {
      sendReaction(selectedMessageId, reaction.type);
    }
    setShowReactionPicker(false);
    setSelectedMessageId(null);
  }, [selectedMessageId, sendReaction]);
  
  // Get current typing user (partner)
  const currentTyping = useMemo(() => {
    const typingArray = Array.from(typingUsers.entries());
    return typingArray.find(([userId]) => userId !== 'user_demo');
  }, [typingUsers]);
  
  if (authLoading) {
    return (
      <StyledComponents.Container theme={theme} className="justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
               style={{ borderColor: theme.colors.primary }}></div>
          <p style={{ color: theme.colors.text.secondary }}>読み込み中...</p>
        </div>
      </StyledComponents.Container>
    );
  }
  
  if (!user) {
    return <LoginScreen onLogin={login} theme={theme} />;
  }
  
  return (
    <StyledComponents.Container theme={theme}>
      {/* Touch Position Indicator */}
      {touchPosition && (
        <div 
          className="absolute w-6 h-6 rounded-full opacity-60 animate-ping pointer-events-none z-20"
          style={{ 
            left: touchPosition.x - 12, 
            top: touchPosition.y - 12,
            backgroundColor: theme.colors.primary,
          }}
        />
      )}
      
      {/* Header */}
      <StyledComponents.Card theme={theme} className="m-0 rounded-none border-x-0 border-t-0">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
                >
                  <span className="text-white font-bold">あ</span>
                </div>
                <div 
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white transition-all duration-1000 ${
                    connectionPulse ? 'scale-110' : 'scale-100'
                  }`}
                  style={{ backgroundColor: connected ? theme.colors.success : '#6B7280' }}
                />
              </div>
              <div>
                <h2 className="font-semibold text-lg" style={{ color: theme.colors.text.primary }}>
                  愛しの人
                </h2>
                <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  {currentTyping ? `✨ ${currentTyping[1].content || '入力中...'}` : `💭 ${connected ? 'オンライン' : 'オフライン'}`}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <StyledComponents.Button
                theme={theme}
                variant="ghost"
                size="sm"
                onClick={() => setShowThemeSelector(!showThemeSelector)}
              >
                <Palette className="w-5 h-5" style={{ color: theme.colors.text.primary }} />
              </StyledComponents.Button>
              
              <StyledComponents.Button
                theme={theme}
                variant="ghost"
                size="sm"
                onClick={logout}
              >
                <LogOut className="w-5 h-5" style={{ color: theme.colors.text.primary }} />
              </StyledComponents.Button>
            </div>
          </div>
          
          {/* Theme Selector */}
          {showThemeSelector && (
            <StyledComponents.Card theme={theme} className="mt-4 p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(themes).map(([key, themeOption]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCurrentTheme(key);
                      setShowThemeSelector(false);
                    }}
                    className={`p-2 rounded-lg text-sm transition-all duration-200 ${
                      currentTheme === key 
                        ? 'text-white' 
                        : 'hover:bg-gray-100 hover:bg-opacity-20'
                    }`}
                    style={{ 
                      backgroundColor: currentTheme === key ? themeOption.colors.primary : 'transparent',
                      color: currentTheme === key ? 'white' : theme.colors.text.primary,
                    }}
                  >
                    {themeOption.name}
                  </button>
                ))}
              </div>
            </StyledComponents.Card>
          )}
        </div>
      </StyledComponents.Card>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <StyledComponents.MessageBubble
            key={message.id}
            theme={theme}
            message={message}
            isOwn={message.senderId === 'user_demo'}
            onReaction={handleReactionClick}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <StyledComponents.Card theme={theme} className="m-0 rounded-none border-x-0 border-b-0">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={myInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="メッセージを入力..."
                className="w-full px-4 py-2 rounded-full focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: theme.colors.background.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text.primary
                }}
                disabled={!connected}
              />
            </div>
            
            <StyledComponents.Button
              theme={theme}
              variant="primary"
              size="md"
              onClick={() => {
                if (myInput.trim()) {
                  sendMessage(myInput.trim());
                  setMyInput('');
                  sendTyping('');
                }
              }}
              disabled={!connected || !myInput.trim()}
            >
              <Send className="w-5 h-5" />
            </StyledComponents.Button>
          </div>
          
          {/* Quick Reactions */}
          <div className="flex justify-center space-x-2 mt-3">
            {reactions.slice(0, 5).map((reaction) => (
              <button
                key={reaction.type}
                onClick={() => {
                  // Quick reaction to last message
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.senderId !== 'user_demo') {
                    sendReaction(lastMessage.id, reaction.type);
                  }
                }}
                className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-full transition-all duration-200 hover:scale-110"
                title={reaction.name}
                disabled={!connected}
              >
                <span className="text-lg">{reaction.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      </StyledComponents.Card>
      
      {/* Reaction Picker Modal */}
      {showReactionPicker && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <StyledComponents.Card theme={theme} className="p-6 m-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text.primary }}>
              リアクションを選択
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {reactions.map((reaction) => (
                <button
                  key={reaction.type}
                  onClick={() => handleSendReaction(reaction)}
                  className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 hover:bg-opacity-20 transition-all duration-200"
                  style={{ color: theme.colors.text.primary }}
                >
                  <span className="text-2xl mb-1">{reaction.emoji}</span>
                  <span className="text-xs">{reaction.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowReactionPicker(false);
                setSelectedMessageId(null);
              }}
              className="mt-4 w-full py-2 rounded-lg hover:bg-gray-100 hover:bg-opacity-20"
              style={{ color: theme.colors.text.secondary }}
            >
              キャンセル
            </button>
          </StyledComponents.Card>
        </div>
      )}
      
      {/* Connection Status */}
      <div className="absolute top-20 right-4 z-10">
        <div 
          className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs"
          style={{ 
            backgroundColor: connected ? theme.colors.success : '#6B7280',
            color: 'white'
          }}
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
          <span>{connected ? 'リアルタイム接続中' : '接続中...'}</span>
        </div>
      </div>
      
      {/* Background Decorations */}
      <div 
        className="absolute top-10 left-10 w-20 h-20 rounded-full opacity-20 animate-pulse pointer-events-none"
        style={{ backgroundColor: theme.colors.primary }}
      />
      <div 
        className="absolute bottom-20 right-10 w-16 h-16 rounded-full opacity-20 animate-pulse pointer-events-none"
        style={{ 
          backgroundColor: theme.colors.secondary,
          animationDelay: '1s',
        }}
      />
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </StyledComponents.Container>
  );
};

export default IntimateChat;