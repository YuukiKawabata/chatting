import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet,
  Animated,
  Dimensions 
} from 'react-native';
// import { BlurView } from 'expo-blur'; // Not available, using View instead
import * as Haptics from 'expo-haptics';
import { Theme, ReactionType } from '../types';

interface ReactionPickerProps {
  visible: boolean;
  theme: Theme;
  onSelectReaction: (type: ReactionType) => void;
  onClose: () => void;
}

const reactions = [
  { type: 'heart' as ReactionType, emoji: '❤️', name: 'ハート' },
  { type: 'smile' as ReactionType, emoji: '😊', name: 'スマイル' },
  { type: 'zap' as ReactionType, emoji: '⚡', name: 'エキサイト' },
  { type: 'coffee' as ReactionType, emoji: '☕', name: 'リラックス' },
  { type: 'star' as ReactionType, emoji: '⭐', name: 'すごい' },
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  theme,
  onSelectReaction,
  onClose,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim]);

  const handleReactionPress = (reactionType: ReactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectReaction(reactionType);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.blurContainer}>
          <Animated.View 
            style={[
              styles.pickerContainer,
              {
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              リアクションを選択
            </Text>
            
            <View style={styles.reactionsGrid}>
              {reactions.map((reaction) => (
                <TouchableOpacity
                  key={reaction.type}
                  style={[
                    styles.reactionButton,
                    { borderColor: theme.colors.border }
                  ]}
                  onPress={() => handleReactionPress(reaction.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={[styles.reactionName, { color: theme.colors.text.primary }]}>
                    {reaction.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: theme.colors.text.secondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pickerContainer: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 300,
    width: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  reactionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  reactionName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});