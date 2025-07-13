import { supabase } from '../lib/supabase';

// パートナー情報の型定義
export interface Partner {
  partner_id: string;
  partner_user_id: string;
  username: string;
  display_name: string;
  online_status: 'online' | 'offline' | 'away';
  last_seen: string | null;
  relationship_type: string;
  created_at: string;
  has_active_room: boolean;
}

// パートナーシップ作成結果の型
export interface PartnershipResult {
  success: boolean;
  partner_id?: string;
  error?: string;
}

// パートナーチャットルーム作成結果の型
export interface PartnerChatResult {
  success: boolean;
  room_id?: string;
  error?: string;
}

class PartnerService {
  /**
   * パートナー関係を作成する
   */
  async createPartnership(
    partnerUserId: string, 
    roomId?: string
  ): Promise<PartnershipResult> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        return { success: false, error: 'ログインが必要です' };
      }

      // PostgreSQL関数を呼び出してパートナー関係を作成
      const { data, error } = await supabase.rpc('create_partnership', {
        user_a: currentUser.data.user.id,
        user_b: partnerUserId,
        room_id: roomId
      });

      if (error) throw error;

      return { success: true, partner_id: data };
    } catch (error) {
      console.error('Error creating partnership:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'パートナー関係の作成に失敗しました' 
      };
    }
  }

  /**
   * ユーザーのパートナー一覧を取得する
   */
  async getPartners(): Promise<Partner[]> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        throw new Error('ログインが必要です');
      }

      // PostgreSQL関数を呼び出してパートナー一覧を取得
      const { data, error } = await supabase.rpc('get_user_partners', {
        target_user_id: currentUser.data.user.id
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching partners:', error);
      return [];
    }
  }

  /**
   * パートナーとの専用チャットルームを作成する
   */
  async createPartnerChatRoom(partnerId: string): Promise<PartnerChatResult> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        return { success: false, error: 'ログインが必要です' };
      }

      // パートナー情報を取得
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select(`
          id,
          user1_id,
          user2_id,
          user1:user1_id(raw_user_meta_data),
          user2:user2_id(raw_user_meta_data)
        `)
        .eq('id', partnerId)
        .single();

      if (partnerError) throw partnerError;

      // パートナーのユーザー情報を取得
      const partnerUserId = partnerData.user1_id === currentUser.data.user.id 
        ? partnerData.user2_id 
        : partnerData.user1_id;

      const partnerUserData = partnerData.user1_id === currentUser.data.user.id 
        ? partnerData.user2 
        : partnerData.user1;

      const partnerName = partnerUserData?.raw_user_meta_data?.display_name || 
                         partnerUserData?.raw_user_meta_data?.username || 
                         'パートナー';

      // チャットルームを作成
      const roomName = `💕 ${partnerName}との専用チャット`;
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: roomName,
          room_type: 'partner',
          created_by: currentUser.data.user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 両方のユーザーをルームに追加
      const { error: participantsError } = await supabase
        .from('room_participants')
        .insert([
          { room_id: roomData.id, user_id: currentUser.data.user.id, role: 'member' },
          { room_id: roomData.id, user_id: partnerUserId, role: 'member' },
        ]);

      if (participantsError) throw participantsError;

      // パートナーチャットルームテーブルに登録
      const { error: partnerRoomError } = await supabase
        .from('partner_chat_rooms')
        .insert({
          partner_id: partnerId,
          room_id: roomData.id,
        });

      if (partnerRoomError) throw partnerRoomError;

      return { success: true, room_id: roomData.id };
    } catch (error) {
      console.error('Error creating partner chat room:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'パートナーチャットルームの作成に失敗しました' 
      };
    }
  }

  /**
   * パートナーとの既存チャットルームを取得する
   */
  async getPartnerChatRoom(partnerId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('partner_chat_rooms')
        .select('room_id')
        .eq('partner_id', partnerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data?.room_id || null;
    } catch (error) {
      console.error('Error fetching partner chat room:', error);
      return null;
    }
  }

  /**
   * ユーザーのオンライン状態を更新する
   */
  async updateOnlineStatus(status: 'online' | 'offline' | 'away'): Promise<void> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) return;

      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: currentUser.data.user.id,
          status,
          last_seen: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }

  /**
   * ルーム参加時にパートナー関係を自動作成する
   */
  async autoCreatePartnershipFromRoom(roomId: string): Promise<void> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) return;

      // ルームの参加者を取得（自分以外）
      const { data: participants, error } = await supabase
        .from('room_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .neq('user_id', currentUser.data.user.id);

      if (error) throw error;

      // 各参加者とのパートナー関係を作成
      for (const participant of participants || []) {
        await this.createPartnership(participant.user_id, roomId);
      }
    } catch (error) {
      console.error('Error auto-creating partnerships:', error);
    }
  }

  /**
   * パートナーのオンライン状態をリアルタイムで監視する
   */
  subscribeToPartnerPresence(callback: (partner: Partial<Partner>) => void) {
    return supabase
      .channel('partner-presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, (payload) => {
        const presenceData = payload.new as any;
        if (presenceData) {
          callback({
            partner_user_id: presenceData.user_id,
            online_status: presenceData.status,
            last_seen: presenceData.last_seen,
          });
        }
      })
      .subscribe();
  }
}

export const partnerService = new PartnerService();