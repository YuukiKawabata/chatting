# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an intimate chat application consisting of:
- **Backend**: Node.js/Express + Socket.IO server (`intimate-chat-backend.js`)
- **Frontend**: React frontend with real-time features (`intimate-chat-frontend-realtime.tsx`)
- **Technical Specs**: Detailed Japanese specification document (`intimate-chat-technical-specs.md`)

The application features real-time messaging, reactions, typing indicators, theme switching, and unique features like touch position sharing between intimate partners.

## Development Commands

Since no package.json files were found, this appears to be a standalone demo/prototype. To run the application:

```bash
# Backend (Node.js server)
node intimate-chat-backend.js

# Frontend (if using a React dev server)
# Note: The frontend file is currently a standalone React component
# You may need to set up a proper React project structure first
```

## Architecture Overview

### Backend Architecture (`intimate-chat-backend.js`)
- **Framework**: Express.js with Socket.IO for real-time communication
- **Authentication**: JWT-based with bcrypt password hashing
- **Data Storage**: In-memory storage (Maps) - needs database integration for production
- **Real-time Features**: Socket.IO handles messaging, reactions, typing indicators, presence
- **Security**: Helmet, CORS, rate limiting, authentication middleware

Key data structures:
- `users` - User accounts and profiles
- `rooms` - Chat rooms and participants
- `messages` - Chat messages with reactions
- `typingUsers` - Real-time typing status
- `userSockets` - Socket connection mapping

### Frontend Architecture (`intimate-chat-frontend-realtime.tsx`)
- **Framework**: React with custom hooks for state management
- **Styling**: Custom styled components with theme system
- **Real-time**: Socket.IO client with simulation layer for demo
- **Themes**: Multiple UI themes (cute, cool, minimal, warm)
- **State Management**: React hooks with local state

Key components:
- `useSocket()` - Socket connection management
- `useAuth()` - Authentication state
- `useMessages()` - Message and reaction handling
- `StyledComponents` - Themed UI components

### Database Design (from specs)
The technical specs define a PostgreSQL schema with:
- Users table with Firebase auth integration
- Chat rooms with 1-on-1 and group support
- Messages with reactions and metadata
- Real-time typing and presence tracking

## Key Features

1. **Real-time Messaging**: Bi-directional message exchange
2. **Reactions**: Emoji reactions (heart, smile, zap, coffee, star)
3. **Typing Indicators**: Live typing status with content preview
4. **Presence System**: Online/offline status tracking
5. **Touch Position Sharing**: Unique intimate feature for partners
6. **Theme System**: Multiple customizable UI themes
7. **Rate Limiting**: Protection against message spam
8. **Authentication**: Secure JWT-based user sessions

## File Structure

```
/
├── intimate-chat-backend.js          # Node.js/Express/Socket.IO server
├── intimate-chat-frontend-realtime.tsx  # React frontend component
├── intimate-chat-technical-specs.md  # Comprehensive technical documentation
└── CLAUDE.md                         # This file
```

## Production Considerations

- **Database**: Replace in-memory storage with PostgreSQL/Supabase
- **Authentication**: Integrate Firebase Auth as specified
- **File Upload**: Add Cloudinary for media sharing
- **Deployment**: Backend to Railway/Render, Frontend to Vercel
- **Monitoring**: Add Sentry for error tracking
- **Caching**: Implement Redis for sessions and real-time data

## Environment Variables

The backend expects these environment variables:
- `JWT_SECRET` - Secret key for JWT tokens
- `CLIENT_URL` - Frontend URL for CORS
- `PORT` - Server port (defaults to 3001)
- `NODE_ENV` - Environment (development/production)

## Security Notes

- All passwords are bcrypt hashed
- JWT tokens expire after 7 days
- Rate limiting prevents spam (100 requests/min API, 60 messages/min)
- Socket.IO authentication required for all real-time features
- Input validation on all message content

## Testing Notes

The frontend includes simulation mode for development/demo purposes. The SocketIOClient class simulates server responses for testing without a running backend.