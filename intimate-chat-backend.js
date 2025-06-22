// server/index.js - Express + Socket.IO Backend
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Message rate limiting for Socket.IO
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: 'Too many messages sent'
});

// In-memory storage (replace with database in production)
const users = new Map();
const rooms = new Map();
const messages = new Map();
const typingUsers = new Map();
const userSockets = new Map();
const reactions = new Map();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Utility functions
const generateUserId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
const generateRoomId = () => 'room_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
const generateMessageId = () => 'msg_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Socket.IO authentication middleware
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.userId = decoded.userId;
    socket.user = users.get(decoded.userId);
    next();
  });
};

// REST API Routes

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = Array.from(users.values()).find(
      user => user.email === email || user.username === username
    );
    
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = generateUserId();
    const user = {
      id: userId,
      username,
      email,
      displayName: displayName || username,
      password: hashedPassword,
      avatarUrl: null,
      themePreference: 'cute',
      isOnline: false,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    users.set(userId, user);
    
    // Generate JWT
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    
    // Return user without password
    const { password: _, ...userResponse } = user;
    res.status(201).json({ user: userResponse, token });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = Array.from(users.values()).find(user => user.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Update last seen
    user.lastSeenAt = new Date().toISOString();
    users.set(user.id, user);
    
    // Return user without password
    const { password: _, ...userResponse } = user;
    res.json({ user: userResponse, token });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User endpoints
app.get('/api/users/me', authenticateToken, (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password, ...userResponse } = user;
  res.json(userResponse);
});

app.put('/api/users/theme', authenticateToken, (req, res) => {
  const { theme } = req.body;
  const user = users.get(req.user.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  user.themePreference = theme;
  users.set(user.id, user);
  
  const { password, ...userResponse } = user;
  res.json(userResponse);
});

// Room endpoints
app.get('/api/rooms', authenticateToken, (req, res) => {
  const userRooms = Array.from(rooms.values()).filter(room => 
    room.participants.some(p => p.userId === req.user.userId)
  );
  
  res.json(userRooms);
});

app.post('/api/rooms', authenticateToken, (req, res) => {
  const { name, participantEmails } = req.body;
  const roomId = generateRoomId();
  
  // Find participants by email
  const participants = [
    { userId: req.user.userId, role: 'admin', joinedAt: new Date().toISOString() }
  ];
  
  if (participantEmails && participantEmails.length > 0) {
    participantEmails.forEach(email => {
      const user = Array.from(users.values()).find(u => u.email === email);
      if (user) {
        participants.push({
          userId: user.id,
          role: 'member',
          joinedAt: new Date().toISOString()
        });
      }
    });
  }
  
  const room = {
    id: roomId,
    name: name || '1on1 Chat',
    type: participants.length === 2 ? '1on1' : 'group',
    participants,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString()
  };
  
  rooms.set(roomId, room);
  messages.set(roomId, []);
  
  res.status(201).json(room);
});

// Message endpoints
app.get('/api/rooms/:roomId/messages', authenticateToken, (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  // Check if user is participant
  const isParticipant = room.participants.some(p => p.userId === req.user.userId);
  if (!isParticipant) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const roomMessages = messages.get(roomId) || [];
  const paginatedMessages = roomMessages
    .slice(offset, offset + parseInt(limit))
    .reverse(); // Most recent first
  
  res.json(paginatedMessages);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.IO Connection Handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`User ${socket.user.username} connected`);
  
  // Store socket reference
  userSockets.set(socket.userId, socket.id);
  
  // Update user online status
  const user = users.get(socket.userId);
  if (user) {
    user.isOnline = true;
    user.lastSeenAt = new Date().toISOString();
    users.set(socket.userId, user);
  }
  
  // Broadcast user online status
  socket.broadcast.emit('user_online', {
    userId: socket.userId,
    username: socket.user.username
  });
  
  // Join user's rooms
  const userRooms = Array.from(rooms.values()).filter(room => 
    room.participants.some(p => p.userId === socket.userId)
  );
  
  userRooms.forEach(room => {
    socket.join(room.id);
  });
  
  // Handle joining specific room
  socket.on('join_room', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    
    if (room && room.participants.some(p => p.userId === socket.userId)) {
      socket.join(roomId);
      socket.emit('joined_room', { roomId });
    }
  });
  
  // Handle leaving room
  socket.on('leave_room', (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    socket.emit('left_room', { roomId });
  });
  
  // Handle sending message
  socket.on('send_message', async (data) => {
    try {
      const { roomId, content, type = 'text' } = data;
      
      // Validate room access
      const room = rooms.get(roomId);
      if (!room || !room.participants.some(p => p.userId === socket.userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }
      
      // Create message
      const messageId = generateMessageId();
      const message = {
        id: messageId,
        roomId,
        senderId: socket.userId,
        content,
        type,
        createdAt: new Date().toISOString(),
        reactions: []
      };
      
      // Store message
      const roomMessages = messages.get(roomId) || [];
      roomMessages.push(message);
      messages.set(roomId, roomMessages);
      
      // Add sender info for broadcast
      const messageWithSender = {
        ...message,
        sender: {
          id: socket.userId,
          username: socket.user.username,
          displayName: socket.user.displayName
        }
      };
      
      // Broadcast to room
      io.to(roomId).emit('message_received', messageWithSender);
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing events
  socket.on('typing_start', (data) => {
    const { roomId } = data;
    
    typingUsers.set(`${roomId}_${socket.userId}`, {
      userId: socket.userId,
      username: socket.user.username,
      startedAt: Date.now()
    });
    
    socket.to(roomId).emit('user_typing', {
      userId: socket.userId,
      username: socket.user.username,
      roomId
    });
  });
  
  socket.on('typing_update', (data) => {
    const { roomId, content } = data;
    
    socket.to(roomId).emit('user_typing_update', {
      userId: socket.userId,
      username: socket.user.username,
      content,
      roomId
    });
  });
  
  socket.on('typing_stop', (data) => {
    const { roomId } = data;
    
    typingUsers.delete(`${roomId}_${socket.userId}`);
    
    socket.to(roomId).emit('user_stopped_typing', {
      userId: socket.userId,
      roomId
    });
  });
  
  // Handle reactions
  socket.on('add_reaction', (data) => {
    const { messageId, type, roomId } = data;
    
    const reactionKey = `${messageId}_${socket.userId}_${type}`;
    const reaction = {
      messageId,
      userId: socket.userId,
      username: socket.user.username,
      type,
      createdAt: new Date().toISOString()
    };
    
    reactions.set(reactionKey, reaction);
    
    // Broadcast reaction
    io.to(roomId).emit('reaction_added', {
      messageId,
      reaction
    });
  });
  
  socket.on('remove_reaction', (data) => {
    const { messageId, type, roomId } = data;
    
    const reactionKey = `${messageId}_${socket.userId}_${type}`;
    reactions.delete(reactionKey);
    
    // Broadcast reaction removal
    io.to(roomId).emit('reaction_removed', {
      messageId,
      userId: socket.userId,
      type
    });
  });
  
  // Handle touch position sharing
  socket.on('touch_position', (data) => {
    const { roomId, x, y } = data;
    
    socket.to(roomId).emit('partner_touch', {
      userId: socket.userId,
      x,
      y,
      roomId
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.username} disconnected`);
    
    // Update user offline status
    const user = users.get(socket.userId);
    if (user) {
      user.isOnline = false;
      user.lastSeenAt = new Date().toISOString();
      users.set(socket.userId, user);
    }
    
    // Remove socket reference
    userSockets.delete(socket.userId);
    
    // Clean up typing status
    for (const [key, typingUser] of typingUsers.entries()) {
      if (typingUser.userId === socket.userId) {
        typingUsers.delete(key);
        const roomId = key.split('_')[0];
        socket.to(roomId).emit('user_stopped_typing', {
          userId: socket.userId,
          roomId
        });
      }
    }
    
    // Broadcast user offline status
    socket.broadcast.emit('user_offline', {
      userId: socket.userId,
      username: socket.user.username
    });
  });
});

// Clean up old typing status (every 30 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, typingUser] of typingUsers.entries()) {
    if (now - typingUser.startedAt > 30000) { // 30 seconds
      typingUsers.delete(key);
      const roomId = key.split('_')[0];
      io.to(roomId).emit('user_stopped_typing', {
        userId: typingUser.userId,
        roomId
      });
    }
  }
}, 30000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Intimate Chat Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };