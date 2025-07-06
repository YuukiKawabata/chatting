import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Database } from '../lib/supabase';

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

  const getReactionEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      heart: '❤️',
      smile: '😊',
      lightning: '⚡',
      coffee: '☕',
      star: '⭐',
      like: '👍',
      love: '💕',
      laugh: '😂',
      wow: '😮',
      sad: '😢',
      angry: '😠'
    };
    return emojis[type] || '👍';
  };

  // リアクションを集計
  const aggregateReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return [];

    const reactionMap = new Map<string, { type: string; count: number; users: string[] }>();

    message.reactions.forEach(reaction => {
      const existing = reactionMap.get(reaction.reaction_type);
      if (existing) {
        existing.count++;
        if (reaction.user_id) existing.users.push(reaction.user_id);
      } else {
        reactionMap.set(reaction.reaction_type, {
          type: reaction.reaction_type,
          count: 1,
          users: reaction.user_id ? [reaction.user_id] : []
        });
      }
    });

    return Array.from(reactionMap.values());
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

  const reactions = aggregateReactions();

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
        {reactions.length > 0 && (
          <View style={[styles.reactionsContainer, { alignSelf: isOwn ? 'flex-end' : 'flex-start' }]}>
            {reactions.map((reaction) => (
              <TouchableOpacity
                key={reaction.type}
                style={[
                  styles.reactionBubble,
                  { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border }
                ]}
                onPress={() => onReaction?.(message.id)}
              >
                <Text style={styles.reactionEmoji}>
                  {getReactionEmoji(reaction.type)}
                </Text>
                {reaction.count > 1 && (
                  <Text style={[styles.reactionCount, { color: theme.colors.text.secondary }]}>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ownBubble: {
    borderBottomRightRadius: 6,
  },
  partnerBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  timeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  senderText: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
  deletedText: {
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  reactionButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});