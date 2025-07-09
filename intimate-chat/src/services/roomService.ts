import { supabase } from '../lib/supabase';

export interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at?: string;
}

export interface CreateRoomResult {
  success: boolean;
  room?: ChatRoom;
  error?: string;
}

export interface JoinRoomResult {
  success: boolean;
  error?: string;
}

class RoomService {
  private static instance: RoomService;

  static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  /**
   * 新しいルームを作成
   */
  async createRoom(name: string, roomType: string = '1on1'): Promise<CreateRoomResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'ユーザーが認証されていません'
        };
      }

      console.log('Creating room:', { name, roomType, userId: user.id });

      // ルームを作成
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: name.trim(),
          room_type: roomType,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) {
        console.error('Room creation error:', roomError);
        return {
          success: false,
          error: `ルーム作成エラー: ${roomError.message}`
        };
      }

      console.log('Room created successfully:', roomData);

      // 作成者を参加者として追加
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          role: 'admin',
        });

      if (participantError) {
        console.error('Participant addition error:', participantError);
        // ルームは作成されているので、参加者追加エラーでも成功として返す
        console.warn('Room created but failed to add participant automatically');
      }

      return {
        success: true,
        room: {
          ...roomData,
          participant_count: 1
        }
      };
    } catch (error) {
      console.error('Unexpected error in createRoom:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ルームの作成に失敗しました'
      };
    }
  }

  /**
   * ルームに参加
   */
  async joinRoom(roomId: string): Promise<JoinRoomResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'ユーザーが認証されていません'
        };
      }

      console.log('Joining room:', { roomId, userId: user.id });

      // 既に参加しているかチェック
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        console.log('User already participant in room');
        return { success: true };
      }

      // 参加者として追加
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
          role: 'member',
        });

      if (error) {
        console.error('Join room error:', error);
        return {
          success: false,
          error: `ルーム参加エラー: ${error.message}`
        };
      }

      console.log('Successfully joined room');
      return { success: true };
    } catch (error) {
      console.error('Unexpected error in joinRoom:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ルームへの参加に失敗しました'
      };
    }
  }

  /**
   * ルーム一覧を取得
   */
  async getRooms(): Promise<ChatRoom[]> {
    try {
      console.log('Fetching rooms...');

      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          room_type,
          created_by,
          created_at,
          updated_at,
          room_participants(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get rooms error:', error);
        throw error;
      }

      console.log('Rooms fetched:', data?.length || 0);

      const roomsWithCounts = (data || []).map(room => ({
        id: room.id,
        name: room.name,
        room_type: room.room_type,
        created_by: room.created_by,
        created_at: room.created_at,
        updated_at: room.updated_at,
        participant_count: Array.isArray(room.room_participants) 
          ? room.room_participants.length 
          : 0
      }));

      return roomsWithCounts;
    } catch (error) {
      console.error('Unexpected error in getRooms:', error);
      return [];
    }
  }

  /**
   * ユーザーが参加しているルーム一覧を取得
   */
  async getUserRooms(): Promise<ChatRoom[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      console.log('Fetching user rooms for:', user.id);

      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          room_type,
          created_by,
          created_at,
          updated_at,
          room_participants!inner(user_id, count)
        `)
        .eq('room_participants.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get user rooms error:', error);
        throw error;
      }

      console.log('User rooms fetched:', data?.length || 0);

      const roomsWithCounts = (data || []).map(room => ({
        id: room.id,
        name: room.name,
        room_type: room.room_type,
        created_by: room.created_by,
        created_at: room.created_at,
        updated_at: room.updated_at,
        participant_count: Array.isArray(room.room_participants) 
          ? room.room_participants.length 
          : 0
      }));

      return roomsWithCounts;
    } catch (error) {
      console.error('Unexpected error in getUserRooms:', error);
      return [];
    }
  }

  /**
   * ルームの詳細情報を取得
   */
  async getRoomDetails(roomId: string): Promise<ChatRoom | null> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          room_type,
          created_by,
          created_at,
          updated_at,
          room_participants(count)
        `)
        .eq('id', roomId)
        .single();

      if (error) {
        console.error('Get room details error:', error);
        return null;
      }

      return {
        ...data,
        participant_count: Array.isArray(data.room_participants) 
          ? data.room_participants.length 
          : 0
      };
    } catch (error) {
      console.error('Unexpected error in getRoomDetails:', error);
      return null;
    }
  }

  /**
   * ルームを削除（作成者のみ）
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', roomId)
        .eq('created_by', user.id);

      if (error) {
        console.error('Delete room error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in deleteRoom:', error);
      return false;
    }
  }

  /**
   * ルームから退出
   */
  async leaveRoom(roomId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Leave room error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error in leaveRoom:', error);
      return false;
    }
  }
}

// シングルトンインスタンスのエクスポート
export const roomService = RoomService.getInstance();
export default roomService;