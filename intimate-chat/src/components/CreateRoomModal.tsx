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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateRoom: (roomName: string) => Promise<void>;
  theme: any;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  visible,
  onClose,
  onCreateRoom,
  theme,
}) => {
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // モーダルが開いたら入力フィールドにフォーカス
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setRoomName('');
      setIsLoading(false);
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!roomName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    
    try {
      await onCreateRoom(roomName.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Create room modal error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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

            {/* Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
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
                placeholder="例: 二人だけの秘密の部屋"
                placeholderTextColor={theme.colors.text.secondary}
                maxLength={50}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <Text style={[styles.helperText, { color: theme.colors.text.secondary }]}>
                {roomName.length}/50文字
              </Text>
            </View>

            {/* Buttons */}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
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
    fontSize: 20,
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
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    textAlign: 'right',
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
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