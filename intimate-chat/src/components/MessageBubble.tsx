import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Message, Theme, Reaction } from '../types';

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

  const getReactionEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      heart: '❤️',
      smile: '😊',
      zap: '⚡',
      coffee: '☕',
      star: '⭐'
    };
    return emojis[type] || '👍';
  };

  const bubbleStyle = {
    backgroundColor: isOwn ? theme.colors.primary : theme.colors.background.card,
    borderColor: isOwn ? 'transparent' : theme.colors.border,
    alignSelf: isOwn ? 'flex-end' : 'flex-start',
  };

  const textStyle = {
    color: isOwn ? '#FFFFFF' : theme.colors.text.primary,
  };

  return (
    <View style={[styles.container, { alignItems: isOwn ? 'flex-end' : 'flex-start' }]}>
      <TouchableOpacity
        style={[styles.bubble, bubbleStyle]}
        onPress={() => onReaction?.(message.id)}
        activeOpacity={0.8}
      >
        <Text style={[styles.messageText, textStyle]}>
          {message.content}
        </Text>
        
        {message.reactions && message.reactions.length > 0 && (
          <View style={styles.reactionsContainer}>
            {message.reactions.map((reaction, index) => (
              <View key={index} style={styles.reactionBubble}>
                <Text style={styles.reactionEmoji}>
                  {getReactionEmoji(reaction.type)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
      
      <View style={[styles.metaContainer, { alignItems: isOwn ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.timeText, { color: theme.colors.text.secondary }]}>
          {formatTime(message.createdAt)}
        </Text>
        {!isOwn && onReaction && (
          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => onReaction(message.id)}
          >
            <Text style={[styles.reactionButtonText, { color: theme.colors.text.secondary }]}>
              + React
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  reactionBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  metaContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  reactionButton: {
    paddingHorizontal: 4,
  },
  reactionButtonText: {
    fontSize: 12,
    opacity: 0.6,
  },
});