import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface EnhancedCreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateRoom: (roomName: string, roomType: 'public' | 'private' | 'partner') => Promise<void>;
  theme: any;
}

export const EnhancedCreateRoomModal: React.FC<EnhancedCreateRoomModalProps> = ({
  visible,
  onClose,
  onCreateRoom,
  theme,
}) => {
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'public' | 'private' | 'partner'>('private');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ルームタイプの設定
  const roomTypes = [
    {
      id: 'private' as const,
      name: 'プライベート',
      description: '招待された人のみ参加可能',
      icon: 'lock',
      color: theme.colors.primary,
    },
    {
      id: 'partner' as const,
      name: 'パートナー専用',
      description: '特別な人との親密な空間',
      icon: 'heart',
      color: '#FF6B8A',
    },
    {
      id: 'public' as const,
      name: 'オープン',
      description: '誰でも参加可能',
      icon: 'globe',
      color: theme.colors.secondary,
    },
  ];

  // 推奨ルーム名
  const suggestedNames = [
    '💕 二人だけの秘密の部屋',
    '✨ 特別な時間',
    '🌙 夜のおしゃべり',
    '☕ コーヒータイム',
    '💌 メッセージ交換',
    '🎵 音楽と会話',
    '📚 読書クラブ',
    '🎮 ゲーム部屋',
  ];

  // モーダルが開いたら入力フィールドにフォーカス
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setRoomName('');
    setRoomType('private');
    setDescription('');
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!roomName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('入力エラー', 'ルーム名を入力してください');
      return;
    }

    setIsLoading(true);
    
    try {
      await onCreateRoom(roomName.trim(), roomType);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Create room modal error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', 'ルームの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  const selectSuggestedName = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoomName(name);
  };

  const selectRoomType = (type: 'public' | 'private' | 'partner') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoomType(type);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={[styles.modal, { backgroundColor: theme.colors.background.card }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                新しいルームを作成
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.background.secondary }]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Feather name="x" size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
              {/* ルームタイプ選択 */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  ルームタイプ
                </Text>
                <View style={styles.roomTypeContainer}>
                  {roomTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.roomTypeCard,
                        {
                          backgroundColor: roomType === type.id 
                            ? `${type.color}20` 
                            : theme.colors.background.secondary,
                          borderColor: roomType === type.id 
                            ? type.color 
                            : theme.colors.border,
                        }
                      ]}
                      onPress={() => selectRoomType(type.id)}
                      disabled={isLoading}
                    >
                      <View style={[styles.roomTypeIcon, { backgroundColor: type.color }]}>
                        <Feather name={type.icon as any} size={16} color="#FFFFFF" />
                      </View>
                      <Text style={[
                        styles.roomTypeName, 
                        { color: theme.colors.text.primary }
                      ]}>
                        {type.name}
                      </Text>
                      <Text style={[
                        styles.roomTypeDescription, 
                        { color: theme.colors.text.secondary }
                      ]}>
                        {type.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ルーム名入力 */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  ルーム名
                </Text>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text.primary,
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: roomName ? theme.colors.primary : theme.colors.border,
                    }
                  ]}
                  value={roomName}
                  onChangeText={setRoomName}
                  placeholder="ルーム名を入力..."
                  placeholderTextColor={theme.colors.text.secondary}
                  maxLength={50}
                  editable={!isLoading}
                  returnKeyType="next"
                />
                <Text style={[styles.helperText, { color: theme.colors.text.secondary }]}>
                  {roomName.length}/50文字
                </Text>
              </View>

              {/* 推奨ルーム名 */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  推奨ルーム名
                </Text>
                <View style={styles.suggestionsContainer}>
                  {suggestedNames.map((name, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionChip,
                        { 
                          backgroundColor: theme.colors.background.secondary,
                          borderColor: theme.colors.border,
                        }
                      ]}
                      onPress={() => selectSuggestedName(name)}
                      disabled={isLoading}
                    >
                      <Text style={[styles.suggestionText, { color: theme.colors.text.primary }]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 説明（オプション） */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                  説明（オプション）
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      color: theme.colors.text.primary,
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: description ? theme.colors.primary : theme.colors.border,
                    }
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="このルームについて説明を追加..."
                  placeholderTextColor={theme.colors.text.secondary}
                  maxLength={200}
                  multiline
                  numberOfLines={3}
                  editable={!isLoading}
                />
                <Text style={[styles.helperText, { color: theme.colors.text.secondary }]}>
                  {description.length}/200文字
                </Text>
              </View>
            </ScrollView>

            {/* ボタン */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: theme.colors.background.secondary }
                ]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text.primary }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.createButton,
                  { opacity: (!roomName.trim() || isLoading) ? 0.5 : 1 }
                ]}
                onPress={handleCreate}
                disabled={!roomName.trim() || isLoading}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  style={styles.createButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="plus" size={16} color="#FFFFFF" />
                      <Text style={styles.createButtonText}>作成</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  roomTypeContainer: {
    gap: 8,
  },
  roomTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  roomTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomTypeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  roomTypeDescription: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    textAlign: 'right',
    opacity: 0.7,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});