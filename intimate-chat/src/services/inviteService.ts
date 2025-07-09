import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

export interface Invitation {
  id: string;
  invite_code: string;
  invite_url: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  inviter_id: string;
  accepted_by?: string;
  accepted_at?: string;
}

export interface Partnership {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
  partner_name: string;
  partner_username: string;
}

export interface InviteResult {
  success: boolean;
  data?: any;
  error?: string;
}

class InviteService {
  private static instance: InviteService;

  static getInstance(): InviteService {
    if (!InviteService.instance) {
      InviteService.instance = new InviteService();
    }
    return InviteService.instance;
  }

  /**
   * 招待URLを生成
   */
  private generateInviteUrl(inviteCode: string): string {
    const scheme = Linking.createURL('invite');
    return `${scheme}/${inviteCode}`;
  }

  /**
   * 新しい招待を作成
   */
  async createInvitation(): Promise<Invitation> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 既存のpending招待があるかチェック
      const { data: existingInvite } = await supabase
        .from('invitations')
        .select('*')
        .eq('inviter_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvite) {
        return existingInvite as Invitation;
      }

      // 招待コードを生成
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) throw codeError;

      const inviteCode = codeData as string;
      const inviteUrl = this.generateInviteUrl(inviteCode);

      // 新しい招待を作成
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          inviter_id: user.id,
          invite_code: inviteCode,
          invite_url: inviteUrl,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7日後
        })
        .select()
        .single();

      if (error) throw error;

      return data as Invitation;
    } catch (error) {
      console.error('Failed to create invitation:', error);
      throw new Error('招待の作成に失敗しました');
    }
  }

  /**
   * 招待を受諾
   */
  async acceptInvitation(inviteCode: string): Promise<InviteResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 招待受諾処理
      const { data, error } = await supabase
        .rpc('accept_invitation', {
          p_invite_code: inviteCode.toUpperCase(),
          p_accepter_id: user.id,
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; partnership_id?: string };

      if (!result.success) {
        return {
          success: false,
          error: result.error || '招待の受諾に失敗しました',
        };
      }

      return {
        success: true,
        data: { partnership_id: result.partnership_id },
      };
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      return {
        success: false,
        error: '招待の受諾に失敗しました',
      };
    }
  }

  /**
   * 招待をキャンセル
   */
  async cancelInvitation(inviteId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', inviteId)
        .eq('inviter_id', user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      throw new Error('招待のキャンセルに失敗しました');
    }
  }

  /**
   * 現在の招待を取得
   */
  async getCurrentInvitation(): Promise<Invitation | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('inviter_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = No rows found

      return data as Invitation | null;
    } catch (error) {
      console.error('Failed to get current invitation:', error);
      return null;
    }
  }

  /**
   * パートナーシップ一覧を取得
   */
  async getPartnerships(): Promise<Partnership[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // パートナーシップを取得（user1として参加）
      const { data: data1, error: error1 } = await supabase
        .from('partnerships')
        .select('*')
        .eq('user1_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error1) throw error1;

      // パートナーシップを取得（user2として参加）
      const { data: data2, error: error2 } = await supabase
        .from('partnerships')
        .select('*')
        .eq('user2_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error2) throw error2;

      // 全てのパートナーシップを結合
      const allPartnerships = [...(data1 || []), ...(data2 || [])];
      
      // 各パートナーシップについて、相手のユーザー情報を個別に取得
      const partnershipPromises = allPartnerships.map(async (partnership) => {
        const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
        
        // 一時的にpartnerId情報のみを返す（auth.usersの直接取得は困難）
        // 将来的にはuser_metadataを保存する独自テーブルを作成するか、
        // Supabase Edge Functionsを使用してauth.usersにアクセスする
        const userData = null;
        const userError = new Error('Client-side auth.users access not supported');
        
        // 一時的にpartnerId情報のみを返す
        return {
          id: partnership.id,
          user1_id: partnership.user1_id,
          user2_id: partnership.user2_id,
          status: partnership.status,
          created_at: partnership.created_at,
          updated_at: partnership.updated_at,
          partner_name: `User ${partnerId.substring(0, 8)}`,
          partner_username: `user_${partnerId.substring(0, 8)}`,
        };
      });

      const results = await Promise.all(partnershipPromises);
      return results;
    } catch (error) {
      console.error('Failed to get partnerships:', error);
      return [];
    }
  }

  /**
   * 招待URLからコードを抽出
   */
  parseInviteUrl(url: string): string | null {
    try {
      const parsed = Linking.parse(url);
      if (parsed.hostname === 'invite' && parsed.path) {
        return parsed.path.replace('/', '').toUpperCase();
      }
      
      // 直接コードが渡された場合
      if (url.length === 8 && /^[A-Z0-9]+$/.test(url.toUpperCase())) {
        return url.toUpperCase();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse invite URL:', error);
      return null;
    }
  }

  /**
   * パートナーシップの存在チェック
   */
  async hasActivePartnership(): Promise<boolean> {
    try {
      const partnerships = await this.getPartnerships();
      return partnerships.length > 0;
    } catch (error) {
      console.error('Failed to check partnership:', error);
      return false;
    }
  }

  /**
   * 招待リンクのハンドリング設定
   */
  setupInviteLinkHandler(onInviteReceived: (code: string) => void) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const code = this.parseInviteUrl(url);
      if (code) {
        onInviteReceived(code);
      }
    });

    return () => subscription?.remove();
  }

  /**
   * 期限切れ招待のクリーンアップ
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_invitations');

      if (error) throw error;

      return data as number;
    } catch (error) {
      console.error('Failed to cleanup expired invitations:', error);
      return 0;
    }
  }

  /**
   * パートナーのオンライン状態を取得
   */
  async getPartnerOnlineStatus(partnerId: string): Promise<boolean> {
    try {
      // プレゼンステーブルまたはオンライン状態テーブルから取得
      // 実装はリアルタイム機能の設計に依存
      return false; // 暫定実装
    } catch (error) {
      console.error('Failed to get partner online status:', error);
      return false;
    }
  }
}

// シングルトンインスタンスのエクスポート
export const inviteService = InviteService.getInstance();
export default inviteService; 