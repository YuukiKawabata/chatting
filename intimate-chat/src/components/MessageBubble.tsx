import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Database } from '../lib/supabase';
import { reactionService, ReactionSummary } from '../services/reactionService';

// Supabaseデータベース型定義
type Message = {
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
  sender?: {
    id: string;
    email: string;
    user_metadata?: {
      username?: string;
      display_name?: string;
      theme_preference?: string;
    };
  };
  reactions?: Database['public']['Tables']['reactions']['Row'][];
};

type Theme = {
  colors: {
    primary: string;
    secondary: string;
    background: {
      primary: string;
      secondary?: string;
      card: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
    border: string;
    success?: string;
    error?: string;
  };
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  theme: Theme;
  onReaction?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  theme,
  onReaction,
}) => {
  const [reactionSummaries, setReactionSummaries] = useState<ReactionSummary[]>([]);

  useEffect(() => {
    // 初期リアクション情報を読み込み
    loadReactions();

    // リアルタイムでリアクションの変更を監視
    const subscription = reactionService.subscribeToReactions(message.id, (reactions) => {
      setReactionSummaries(reactions);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [message.id]);

  const loadReactions = async () => {
    try {
      const reactions = await reactionService.getReactionSummary(message.id);
      setReactionSummaries(reactions);
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今日';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    } else {
      return new Intl.DateTimeFormat('ja-JP', {
        month: 'numeric',
        day: 'numeric'
      }).format(date);
    }
  };

  const formatUserList = (users: ReactionSummary['users']): string => {
    if (users.length === 0) return '';
    if (users.length === 1) return users[0].display_name;
    if (users.length === 2) return `${users[0].display_name}、${users[1].display_name}`;
    return `${users[0].display_name}、${users[1].display_name} 他${users.length - 2}人`;
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'touch':
        // タッチ位置メッセージ
        return (
          <View style={styles.touchMessage}>
            <Feather name="navigation" size={16} color={isOwn ? '#FFFFFF' : theme.colors.primary} />
            <Text style={[styles.touchText, { color: isOwn ? '#FFFFFF' : theme.colors.text.primary }]}>
              タッチ位置を共有しました
            </Text>
          </View>
        );
      
      case 'image':
        // 画像メッセージ（将来の実装）
        return (
          <View style={styles.imageMessage}>
            <Feather name="image" size={16} color={isOwn ? '#FFFFFF' : theme.colors.primary} />
            <Text style={[styles.imageText, { color: isOwn ? '#FFFFFF' : theme.colors.text.primary }]}>
              画像を送信しました
            </Text>
          </View>
        );
      
      case 'file':
        // ファイルメッセージ（将来の実装）
        return (
          <View style={styles.fileMessage}>
            <Feather name="file" size={16} color={isOwn ? '#FFFFFF' : theme.colors.primary} />
            <Text style={[styles.fileText, { color: isOwn ? '#FFFFFF' : theme.colors.text.primary }]}>
              ファイルを送信しました
            </Text>
          </View>
        );
      
      default:
        // テキストメッセージ
        return (
          <Text style={[styles.messageText, { color: isOwn ? '#FFFFFF' : theme.colors.text.primary }]}>
            {message.content}
          </Text>
        );
    }
  };

  const bubbleStyle = {
    alignSelf: isOwn ? 'flex-end' as const : 'flex-start' as const,
  };

  return (
    <View style={[styles.container, { alignItems: isOwn ? 'flex-end' : 'flex-start' }]}>
      <TouchableOpacity
        style={[styles.bubbleContainer, bubbleStyle]}
        onLongPress={() => onReaction?.(message.id)}
        activeOpacity={0.8}
      >
        {/* メッセージバブル */}
        {isOwn ? (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={[styles.bubble, styles.ownBubble]}
          >
            {renderMessageContent()}
          </LinearGradient>
        ) : (
          <View 
            style={[
              styles.bubble, 
              styles.partnerBubble,
              { 
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border 
              }
            ]}
          >
            {renderMessageContent()}
          </View>
        )}

        {/* リアクション表示 */}
        {reactionSummaries.length > 0 && (
          <View style={[styles.reactionsContainer, { alignSelf: isOwn ? 'flex-end' : 'flex-start' }]}>
            {reactionSummaries.map((reaction) => (
              <TouchableOpacity
                key={reaction.reaction_type}
                style={[
                  styles.reactionBubble,
                  { 
                    backgroundColor: reaction.currentUserReacted 
                      ? `${theme.colors.primary}20` 
                      : theme.colors.background.card,
                    borderColor: reaction.currentUserReacted 
                      ? theme.colors.primary 
                      : theme.colors.border 
                  }
                ]}
                onPress={() => onReaction?.(message.id)}
                onLongPress={() => {
                  // ツールチップでユーザーリストを表示（将来の実装）
                  console.log(`Reacted users: ${formatUserList(reaction.users)}`);
                }}
              >
                <Text style={styles.reactionEmoji}>
                  {reactionService.reactionEmojis[reaction.reaction_type]}
                </Text>
                {reaction.count > 1 && (
                  <Text style={[
                    styles.reactionCount, 
                    { 
                      color: reaction.currentUserReacted 
                        ? theme.colors.primary 
                        : theme.colors.text.secondary 
                    }
                  ]}>
                    {reaction.count}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
      
      {/* メタ情報 */}
      <View style={[styles.metaContainer, { alignItems: isOwn ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.timeText, { color: theme.colors.text.secondary }]}>
          {formatTime(message.created_at)}
        </Text>
        
        {/* 送信者名（自分のメッセージでない場合のみ） */}
        {!isOwn && message.sender && (
          <Text style={[styles.senderText, { color: theme.colors.text.secondary }]}>
            {message.sender.user_metadata?.display_name || message.sender.user_metadata?.username}
          </Text>
        )}
        
        {/* 削除済みメッセージの表示 */}
        {message.is_deleted && (
          <Text style={[styles.deletedText, { color: theme.colors.text.secondary }]}>
            削除済み
          </Text>
        )}
      </View>

      {/* リアクション追加ボタン（相手のメッセージのみ） */}
      {!isOwn && onReaction && (
        <TouchableOpacity
          style={[styles.reactionButton, { backgroundColor: theme.colors.background.card }]}
          onPress={() => onReaction(message.id)}
        >
          <Feather 
            name="plus" 
            size={16} 
            color={theme.colors.text.secondary} 
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
    position: 'relative',
  },
  bubbleContainer: {
    maxWidth: '80%',
    position: 'relative',
  },
  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  ownBubble: {
    borderBottomRightRadius: 8,
  },
  partnerBubble: {
    borderBottomLeftRadius: 8,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '500',
  },
  touchMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  touchText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  imageMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  timeText: {
    fontSize: 13,
    opacity: 0.7,
    fontWeight: '500',
  },
  senderText: {
    fontSize: 13,
    opacity: 0.7,
    fontWeight: '600',
  },
  deletedText: {
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  reactionButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});