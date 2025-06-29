import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // モバイル用設定
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    // リアルタイム機能設定
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 型定義用データベース型
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          theme_preference: string;
          is_online: boolean;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          theme_preference?: string;
          is_online?: boolean;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          theme_preference?: string;
          is_online?: boolean;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_rooms: {
        Row: {
          id: string;
          name: string | null;
          room_type: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          room_type?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          room_type?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          room_id: string | null;
          sender_id: string | null;
          content: string | null;
          message_type: string;
          metadata: any;
          reply_to: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          sender_id?: string | null;
          content?: string | null;
          message_type?: string;
          metadata?: any;
          reply_to?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string | null;
          sender_id?: string | null;
          content?: string | null;
          message_type?: string;
          metadata?: any;
          reply_to?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      reactions: {
        Row: {
          id: string;
          message_id: string | null;
          user_id: string | null;
          reaction_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id?: string | null;
          user_id?: string | null;
          reaction_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string | null;
          user_id?: string | null;
          reaction_type?: string;
          created_at?: string;
        };
      };
    };
  };
};