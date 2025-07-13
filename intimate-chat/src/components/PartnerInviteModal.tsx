import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface PartnerInviteModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}

export const PartnerInviteModal: React.FC<PartnerInviteModalProps> = ({
  visible,
  onClose,
  roomId,
  roomName,
}) => {
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      generateInviteCode();
    }
  }, [visible, roomId]);

  const generateInviteCode = () => {
    // 簡単な招待コード（実際のアプリではもっと複雑にする）
    const code = roomId.substring(0, 8).toUpperCase();
    setInviteCode(code);
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(inviteCode);
      Alert.alert('コピー完了', '招待コードをクリップボードにコピーしました');
    } catch (error) {
      console.error('Copy failed:', error);
      Alert.alert('エラー', 'コピーに失敗しました');
    }
  };

  const shareInvite = async () => {
    try {
      const message = `${roomName}のチャットルームに招待します！\n\n招待コード: ${inviteCode}\n\nアプリを開いて「招待コードで参加」を選択し、このコードを入力してください。`;
      
      await Share.share({
        message,
        title: 'チャットルーム招待',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const addPartnerToRoom = async (partnerUserId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: partnerUserId,
          role: 'member',
        });

      if (error) throw error;

      Alert.alert('成功', 'パートナーがルームに追加されました');
      onClose();
    } catch (error) {
      console.error('Error adding partner:', error);
      Alert.alert('エラー', 'パートナーの追加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>パートナーを招待</Text>
          <Text style={styles.subtitle}>{roomName}</Text>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>招待コード</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{inviteCode}</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.copyButton} 
              onPress={copyToClipboard}
            >
              <Text style={styles.buttonText}>コピー</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={shareInvite}
            >
              <Text style={styles.buttonText}>共有</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructions}>
            パートナーがアプリで「招待コードで参加」を選択し、
            このコードを入力すると、あなたとチャットできます。
          </Text>

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
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
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  codeBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#333',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flex: 1,
  },
  shareButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 100,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});