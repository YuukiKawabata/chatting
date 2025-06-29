export const THEMES = {
  CUTE: 'cute',
  COOL: 'cool',
  MINIMAL: 'minimal',
  WARM: 'warm',
} as const;

export const REACTION_TYPES = {
  HEART: 'heart',
  SMILE: 'smile',
  ZAP: 'zap',
  COFFEE: 'coffee',
  STAR: 'star',
} as const;

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
} as const;

export const SOCKET_EVENTS = {
  // Client to Server
  AUTHENTICATE: 'authenticate',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_UPDATE: 'typing_update',
  TYPING_STOP: 'typing_stop',
  ADD_REACTION: 'add_reaction',
  REMOVE_REACTION: 'remove_reaction',
  TOUCH_POSITION: 'touch_position',

  // Server to Client
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_DELETED: 'message_deleted',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  REACTION_ADDED: 'reaction_added',
  REACTION_REMOVED: 'reaction_removed',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  PARTNER_TOUCH: 'partner_touch',
  ERROR: 'error',
  NOTIFICATION: 'notification',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
  },
  USERS: {
    PROFILE: '/api/users/profile',
    THEME: '/api/users/theme',
    SEARCH: '/api/users/search',
  },
  ROOMS: {
    LIST: '/api/rooms',
    CREATE: '/api/rooms',
    DETAILS: (id: string) => `/api/rooms/${id}`,
    UPDATE: (id: string) => `/api/rooms/${id}`,
    DELETE: (id: string) => `/api/rooms/${id}`,
    JOIN: (id: string) => `/api/rooms/${id}/join`,
    LEAVE: (id: string) => `/api/rooms/${id}/leave`,
    MESSAGES: (id: string) => `/api/rooms/${id}/messages`,
  },
  MESSAGES: {
    UPDATE: (id: string) => `/api/messages/${id}`,
    DELETE: (id: string) => `/api/messages/${id}`,
    REACTIONS: (id: string) => `/api/messages/${id}/reactions`,
    REMOVE_REACTION: (id: string, type: string) => `/api/messages/${id}/reactions/${type}`,
  },
} as const;