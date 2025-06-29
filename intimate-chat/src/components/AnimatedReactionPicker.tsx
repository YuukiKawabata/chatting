import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

interface AnimatedReactionPickerProps {
  visible: boolean;
  theme: Theme;
  onSelectReaction: (reactionType: string) => void;
  onClose: () => void;
}

const REACTIONS = [
  { type: 'heart', emoji: '❤️', label: 'ハート' },
  { type: 'smile', emoji: '😊', label: '笑顔' },
  { type: 'lightning', emoji: '⚡', label: '稲妻' },
  { type: 'coffee', emoji: '☕', label: 'コーヒー' },
  { type: 'star', emoji: '⭐', label: '星' },
  { type: 'like', emoji: '👍', label: 'いいね' },
  { type: 'love', emoji: '💕', label: '愛' },
  { type: 'laugh', emoji: '😂', label: '大笑い' },
  { type: 'wow', emoji: '😮', label: 'びっくり' },
  { type: 'sad', emoji: '😢', label: '悲しい' },
];

export const AnimatedReactionPicker: React.FC<AnimatedReactionPickerProps> = ({
  visible,
  theme,
  onSelectReaction,
  onClose,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  // リアクションアイテムのアニメーション値
  const reactionAnims = useRef(
    REACTIONS.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // エントランスアニメーション
  useEffect(() => {
    if (visible) {
      // 背景とコンテナのアニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // リアクションアイテムの順次アニメーション
      const animateReactions = () => {
        const animations = reactionAnims.map((anim, index) => 
          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 1,
              tension: 150,
              friction: 4,
              delay: index * 50,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 200,
              delay: index * 50,
              useNativeDriver: true,
            }),
          ])
        );

        Animated.parallel(animations).start();
      };

      // 少し遅らせてリアクションアニメーションを開始
      const timer = setTimeout(animateReactions, 100);
      return () => clearTimeout(timer);
    } else {
      // 退場アニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // リアクションアイテムをリセット
      reactionAnims.forEach(anim => {
        anim.scale.setValue(0);
        anim.opacity.setValue(0);
      });
    }
  }, [visible, fadeAnim, scaleAnim, slideAnim, reactionAnims]);

  const handleReactionSelect = (reactionType: string) => {
    setSelectedReaction(reactionType);
    
    // 選択フィードバック
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // 選択アニメーション
    const selectedIndex = REACTIONS.findIndex(r => r.type === reactionType);
    if (selectedIndex !== -1) {
      const anim = reactionAnims[selectedIndex];
      
      Animated.sequence([
        Animated.timing(anim.scale, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // アニメーション完了後にコールバック実行
        setTimeout(() => {
          onSelectReaction(reactionType);
          setSelectedReaction(null);
        }, 100);
      });
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.background.card,
              borderColor: theme.colors.border,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
            }
          ]}
        >
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={styles.headerIcon}
            >
              <Feather name="smile" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              リアクションを選択
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Feather 
                name="x" 
                size={20} 
                color={theme.colors.text.secondary} 
              />
            </TouchableOpacity>
          </View>

          {/* リアクション選択エリア */}
          <View style={styles.reactionsContainer}>
            {REACTIONS.map((reaction, index) => {
              const isSelected = selectedReaction === reaction.type;
              const anim = reactionAnims[index];

              return (
                <Animated.View
                  key={reaction.type}
                  style={[
                    styles.reactionItemContainer,
                    {
                      opacity: anim.opacity,
                      transform: [{ scale: anim.scale }],
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.reactionItem,
                      {
                        backgroundColor: isSelected 
                          ? theme.colors.primary + '20'
                          : theme.colors.background.card,
                        borderColor: isSelected 
                          ? theme.colors.primary
                          : theme.colors.border,
                      }
                    ]}
                    onPress={() => handleReactionSelect(reaction.type)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reactionEmoji}>
                      {reaction.emoji}
                    </Text>
                    <Text style={[styles.reactionLabel, { color: theme.colors.text.secondary }]}>
                      {reaction.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* フッター */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.footerText, { color: theme.colors.text.secondary }]}>
              タップしてリアクションを追加
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
    justifyContent: 'center',
  },
  reactionItemContainer: {
    width: '18%',
    aspectRatio: 1,
    minWidth: 60,
  },
  reactionItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  reactionLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.8,
  },
});