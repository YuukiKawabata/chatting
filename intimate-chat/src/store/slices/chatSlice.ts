import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message, ChatRoom, TypingUser } from '../../types';

interface ChatState {
  currentRoom: ChatRoom | null;
  messages: Message[];
  typingUsers: TypingUser[];
  isConnected: boolean;
}

const initialState: ChatState = {
  currentRoom: null,
  messages: [],
  typingUsers: [],
  isConnected: false,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentRoom: (state, action: PayloadAction<ChatRoom>) => {
      state.currentRoom = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const index = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = action.payload;
      }
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    setTypingUsers: (state, action: PayloadAction<TypingUser[]>) => {
      state.typingUsers = action.payload;
    },
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
  },
});

export const {
  setCurrentRoom,
  addMessage,
  updateMessage,
  setMessages,
  setTypingUsers,
  setConnectionStatus,
} = chatSlice.actions;