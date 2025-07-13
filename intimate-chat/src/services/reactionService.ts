import { supabase } from '../lib/supabase';

// リアクションタイプの定義
export type ReactionType = 'heart' | 'smile' | 'zap' | 'coffee' | 'star';

// リアクション情報の型定義
export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
  user_display_name?: string;
  user_username?: string;
}

// リアクション集計情報の型
export interface ReactionSummary {
  reaction_type: ReactionType;
  count: number;
  users: {
    user_id: string;
    display_name: string;
    username: string;
  }[];
  currentUserReacted: boolean;
}

// リアクション操作結果の型
export interface ReactionResult {
  success: boolean;
  error?: string;
}

class ReactionService {
  // 利用可能なリアクションタイプとその絵文字マッピング
  public readonly reactionEmojis: Record<ReactionType, string> = {
    heart: '❤️',
    smile: '😊',
    zap: '⚡',
    coffee: '☕',
    star: '⭐',
  };

  /**
   * メッセージにリアクションを追加する
   */
  async addReaction(messageId: string, reactionType: ReactionType): Promise<ReactionResult> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        return { success: false, error: 'ログインが必要です' };
      }

      // 同じユーザー・同じメッセージ・同じリアクションタイプの重複をチェック
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', currentUser.data.user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existingReaction) {
        return { success: false, error: 'すでに同じリアクションを追加済みです' };
      }

      // リアクションを追加
      const { error } = await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: currentUser.data.user.id,
          reaction_type: reactionType,
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error adding reaction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'リアクションの追加に失敗しました' 
      };
    }
  }

  /**
   * リアクションを削除する
   */
  async removeReaction(messageId: string, reactionType: ReactionType): Promise<ReactionResult> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        return { success: false, error: 'ログインが必要です' };
      }

      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUser.data.user.id)
        .eq('reaction_type', reactionType);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error removing reaction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'リアクションの削除に失敗しました' 
      };
    }
  }

  /**
   * リアクションを切り替える（追加/削除）
   */
  async toggleReaction(messageId: string, reactionType: ReactionType): Promise<ReactionResult> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        return { success: false, error: 'ログインが必要です' };
      }

      // 既存のリアクションをチェック
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', currentUser.data.user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existingReaction) {
        // 既存のリアクションがある場合は削除
        return await this.removeReaction(messageId, reactionType);
      } else {
        // 既存のリアクションがない場合は追加
        return await this.addReaction(messageId, reactionType);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'リアクションの操作に失敗しました' 
      };
    }
  }

  /**
   * メッセージのリアクション一覧を取得する
   */
  async getMessageReactions(messageId: string): Promise<Reaction[]> {
    try {
      const { data, error } = await supabase
        .from('reactions')
        .select(`
          id,
          message_id,
          user_id,
          reaction_type,
          created_at
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // ユーザー情報を付加
      const reactionsWithUserInfo = await Promise.all(
        (data || []).map(async (reaction) => {
          const { data: userData } = await supabase.auth.admin.getUserById(reaction.user_id);
          return {
            ...reaction,
            user_display_name: userData.user?.user_metadata?.display_name || 
                              userData.user?.user_metadata?.username || 
                              'Unknown User',
            user_username: userData.user?.user_metadata?.username || 'unknown',
          };
        })
      );

      return reactionsWithUserInfo;
    } catch (error) {
      console.error('Error fetching message reactions:', error);
      return [];
    }
  }

  /**
   * メッセージのリアクション集計情報を取得する
   */
  async getReactionSummary(messageId: string): Promise<ReactionSummary[]> {
    try {
      const currentUser = await supabase.auth.getUser();
      const currentUserId = currentUser.data.user?.id;

      const reactions = await this.getMessageReactions(messageId);

      // リアクションタイプごとに集計
      const summaryMap = new Map<ReactionType, ReactionSummary>();

      reactions.forEach((reaction) => {
        const type = reaction.reaction_type;
        
        if (!summaryMap.has(type)) {
          summaryMap.set(type, {
            reaction_type: type,
            count: 0,
            users: [],
            currentUserReacted: false,
          });
        }

        const summary = summaryMap.get(type)!;
        summary.count++;
        summary.users.push({
          user_id: reaction.user_id,
          display_name: reaction.user_display_name || 'Unknown User',
          username: reaction.user_username || 'unknown',
        });

        if (currentUserId && reaction.user_id === currentUserId) {
          summary.currentUserReacted = true;
        }
      });

      return Array.from(summaryMap.values()).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error getting reaction summary:', error);
      return [];
    }
  }

  /**
   * 複数メッセージのリアクション情報を一括取得する
   */
  async getMultipleMessageReactions(messageIds: string[]): Promise<Record<string, ReactionSummary[]>> {
    try {
      const result: Record<string, ReactionSummary[]> = {};

      // 並列処理で各メッセージのリアクションを取得
      await Promise.all(
        messageIds.map(async (messageId) => {
          result[messageId] = await this.getReactionSummary(messageId);
        })
      );

      return result;
    } catch (error) {
      console.error('Error fetching multiple message reactions:', error);
      return {};
    }
  }

  /**
   * リアクションの変更をリアルタイムで監視する
   */
  subscribeToReactions(messageId: string, callback: (reactions: ReactionSummary[]) => void) {
    return supabase
      .channel(`reactions:${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `message_id=eq.${messageId}`,
      }, async () => {
        // リアクションが変更されたら最新の集計情報を取得して通知
        const summary = await this.getReactionSummary(messageId);
        callback(summary);
      })
      .subscribe();
  }

  /**
   * リアクションタイプの表示名を取得する
   */
  getReactionDisplayName(reactionType: ReactionType): string {
    const displayNames: Record<ReactionType, string> = {
      heart: 'ハート',
      smile: 'スマイル',
      zap: '稲妻',
      coffee: 'コーヒー',
      star: '星',
    };
    return displayNames[reactionType];
  }

  /**
   * 人気のリアクションを取得する（統計用）
   */
  async getPopularReactions(roomId?: string, limit: number = 10): Promise<{
    reaction_type: ReactionType;
    count: number;
    emoji: string;
  }[]> {
    try {
      let query = supabase
        .from('reactions')
        .select(`
          reaction_type,
          current_messages!inner(room_id)
        `);

      if (roomId) {
        query = query.eq('current_messages.room_id', roomId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // リアクションタイプごとにカウント
      const counts = new Map<ReactionType, number>();
      (data || []).forEach((item) => {
        const type = item.reaction_type as ReactionType;
        counts.set(type, (counts.get(type) || 0) + 1);
      });

      // 人気順にソート
      return Array.from(counts.entries())
        .map(([type, count]) => ({
          reaction_type: type,
          count,
          emoji: this.reactionEmojis[type],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching popular reactions:', error);
      return [];
    }
  }
}

export const reactionService = new ReactionService();