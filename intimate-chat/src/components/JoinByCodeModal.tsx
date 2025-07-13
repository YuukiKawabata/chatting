import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { partnerService } from '../services/partnerService';

interface JoinByCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onRoomJoined: (roomId: string) => void;
}

export const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({
  visible,
  onClose,
  onRoomJoined,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const joinRoomByCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('エラー', '招待コードを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      // 招待コードからルームIDを検索
      // コードは最初の8文字なので、それにマッチするルームを探す
      const { data: rooms, error: roomError } = await supabase
        .from('chat_rooms')
        .select('id, name, created_by')
        .ilike('id', `${inviteCode.toLowerCase()}%`)
        .eq('status', 'active')
        .limit(1);

      if (roomError) throw roomError;

      if (!rooms || rooms.length === 0) {
        Alert.alert('エラー', '有効な招待コードが見つかりません');
        return;
      }

      const room = rooms[0];
      const currentUser = await supabase.auth.getUser();
      
      if (!currentUser.data.user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      // 既に参加しているかチェック
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', currentUser.data.user.id)
        .single();

      if (existingParticipant) {
        Alert.alert('情報', 'すでにこのルームに参加しています');
        onRoomJoined(room.id);
        onClose();
        return;
      }

      // ルームに参加
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: currentUser.data.user.id,
          role: 'member',
        });

      if (joinError) throw joinError;

      // パートナー関係を自動作成（ルーム作成者と）
      try {
        await partnerService.createPartnership(room.created_by, room.id);
        console.log('Partnership created automatically with room creator');
      } catch (error) {
        console.error('Failed to create partnership:', error);
        // パートナー関係作成失敗は参加成功には影響しない
      }

      Alert.alert('成功', `${room.name}に参加しました！`);
      onRoomJoined(room.id);
      onClose();
      setInviteCode('');
    } catch (error) {
      console.error('Error joining room:', error);
      Alert.alert('エラー', 'ルームへの参加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>招待コードで参加</Text>
          <Text style={styles.subtitle}>
            パートナーから受け取った招待コードを入力してください
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>招待コード</Text>
            <TextInput
              style={styles.input}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="ABCD1234"
              autoCapitalize="characters"
              maxLength={8}
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.joinButton, isLoading && styles.disabledButton]} 
              onPress={joinRoomByCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>参加する</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
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
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 1,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
});