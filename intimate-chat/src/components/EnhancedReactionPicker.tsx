import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { reactionService, ReactionType, ReactionSummary } from '../services/reactionService';
import { useTheme } from '../hooks/useTheme';

interface EnhancedReactionPickerProps {
  messageId: string;
  visible: boolean;
  onClose: () => void;
  onReactionAdded?: (reactionType: ReactionType) => void;
}

export const EnhancedReactionPicker: React.FC<EnhancedReactionPickerProps> = ({
  messageId,
  visible,
  onClose,
  onReactionAdded,
}) => {
  const [reactionSummaries, setReactionSummaries] = useState<ReactionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  // アニメーション値
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  const reactionTypes: ReactionType[] = ['heart', 'smile', 'zap', 'coffee', 'star'];

  useEffect(() => {
    if (visible) {
      loadReactions();
      showModal();
    } else {
      hideModal();
    }
  }, [visible]);

  useEffect(() => {
    if (!messageId) return;

    // リアルタイムでリアクションの変更を監視
    const subscription = reactionService.subscribeToReactions(messageId, (reactions) => {
      setReactionSummaries(reactions);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [messageId]);

  const showModal = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1.7)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadReactions = async () => {
    try {
      const reactions = await reactionService.getReactionSummary(messageId);
      setReactionSummaries(reactions);
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };

  const handleReactionPress = async (reactionType: ReactionType) => {
    if (isLoading) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await reactionService.toggleReaction(messageId, reactionType);
      
      if (result.success) {
        if (onReactionAdded) {
          onReactionAdded(reactionType);
        }
        // リアクションの状態は自動的にリアルタイム更新される
      } else {
        Alert.alert('エラー', result.error || 'リアクションの操作に失敗しました');
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      Alert.alert('エラー', 'リアクションの操作に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getReactionSummary = (reactionType: ReactionType): ReactionSummary | undefined => {
    return reactionSummaries.find(summary => summary.reaction_type === reactionType);
  };

  const formatUserList = (users: ReactionSummary['users']): string => {
    if (users.length === 0) return '';
    if (users.length === 1) return users[0].display_name;
    if (users.length === 2) return `${users[0].display_name}、${users[1].display_name}`;
    return `${users[0].display_name}、${users[1].display_name} 他${users.length - 2}人`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            <LinearGradient
              colors={[theme.colors.background.card, theme.colors.background.primary]}
              style={styles.modalContent}
            >
              {/* ヘッダー */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                  リアクションを選択
                </Text>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: theme.colors.background.secondary || theme.colors.background.card }]}
                  onPress={onClose}
                >
                  <Feather name="x" size={18} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* リアクションボタン */}
              <View style={styles.reactionsGrid}>
                {reactionTypes.map((reactionType, index) => {
                  const summary = getReactionSummary(reactionType);
                  const count = summary?.count || 0;
                  const isSelected = summary?.currentUserReacted || false;
                  const users = summary?.users || [];

                  return (
                    <TouchableOpacity
                      key={reactionType}
                      style={[
                        styles.reactionButton,
                        {
                          backgroundColor: isSelected 
                            ? `${theme.colors.primary}20` 
                            : theme.colors.background.card,
                          borderColor: isSelected 
                            ? theme.colors.primary 
                            : theme.colors.background.secondary || '#E0E0E0',
                        },
                      ]}
                      onPress={() => handleReactionPress(reactionType)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      {/* リアクション絵文字 */}
                      <Text style={styles.reactionEmoji}>
                        {reactionService.reactionEmojis[reactionType]}
                      </Text>
                      
                      {/* カウント */}
                      {count > 0 && (
                        <View style={[styles.countBadge, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.countText}>{count}</Text>
                        </View>
                      )}

                      {/* リアクション名 */}
                      <Text style={[
                        styles.reactionName,
                        { 
                          color: isSelected 
                            ? theme.colors.primary 
                            : theme.colors.text.secondary 
                        }
                      ]}>
                        {reactionService.getReactionDisplayName(reactionType)}
                      </Text>

                      {/* ユーザーリスト（ツールチップ風） */}
                      {count > 0 && (
                        <Text style={[styles.usersList, { color: theme.colors.text.secondary }]}>
                          {formatUserList(users)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* フッター情報 */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.colors.text.secondary }]}>
                  タップしてリアクションを追加・削除
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  reactionButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reactionName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  usersList: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 12,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});