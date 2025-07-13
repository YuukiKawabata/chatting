import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { partnerService } from '../services/partnerService';

interface RandomMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onMatchFound: (roomId: string) => void;
}

export const RandomMatchModal: React.FC<RandomMatchModalProps> = ({
  visible,
  onClose,
  onMatchFound,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [matchingStatus, setMatchingStatus] = useState<'waiting' | 'searching' | 'found' | 'error'>('waiting');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSearching) {
      startPulseAnimation();
      startMatching();
    } else {
      stopPulseAnimation();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isSearching]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const startMatching = async () => {
    setMatchingStatus('searching');
    const currentUser = await supabase.auth.getUser();
    
    if (!currentUser.data.user) {
      Alert.alert('エラー', 'ログインが必要です');
      setIsSearching(false);
      return;
    }

    try {
      // 1. まず既存の待機中ユーザーを探す
      const { data: waitingUsers, error: queueError } = await supabase
        .from('matching_queue')
        .select('user_id, id')
        .neq('user_id', currentUser.data.user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (queueError) throw queueError;

      if (waitingUsers && waitingUsers.length > 0) {
        // マッチング相手が見つかった
        const partner = waitingUsers[0];
        await createMatchedRoom(currentUser.data.user.id, partner.user_id, partner.id);
      } else {
        // 待機キューに自分を追加
        const { error: insertError } = await supabase
          .from('matching_queue')
          .insert({
            user_id: currentUser.data.user.id,
            preferences: {},
          });

        if (insertError) throw insertError;

        // マッチング待ち
        waitForMatch(currentUser.data.user.id);
      }
    } catch (error) {
      console.error('Matching error:', error);
      setMatchingStatus('error');
      Alert.alert('エラー', 'マッチングに失敗しました');
      setIsSearching(false);
    }
  };

  const createMatchedRoom = async (userId1: string, userId2: string, queueIdToRemove: string) => {
    try {
      // 1. ルーム作成
      const roomName = `ランダムチャット ${new Date().toLocaleTimeString()}`;
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: roomName,
          room_type: 'random',
          created_by: userId1,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. 両方のユーザーをルームに追加
      const { error: participantsError } = await supabase
        .from('room_participants')
        .insert([
          { room_id: room.id, user_id: userId1, role: 'member' },
          { room_id: room.id, user_id: userId2, role: 'member' },
        ]);

      if (participantsError) throw participantsError;

      // 3. マッチングキューからエントリを削除
      await supabase
        .from('matching_queue')
        .delete()
        .in('user_id', [userId1, userId2]);

      // 4. パートナー関係を自動作成
      try {
        await partnerService.createPartnership(userId2, room.id);
        console.log('Partnership created automatically for matched users');
      } catch (error) {
        console.error('Failed to create partnership:', error);
        // パートナー関係作成失敗はマッチング成功には影響しない
      }

      setMatchingStatus('found');
      setTimeout(() => {
        onMatchFound(room.id);
        setIsSearching(false);
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error creating matched room:', error);
      throw error;
    }
  };

  const waitForMatch = (userId: string) => {
    // リアルタイムでマッチング通知を待つ
    const subscription = supabase
      .channel('matching')
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'matching_queue',
        filter: `user_id=eq.${userId}`,
      }, async () => {
        // キューから削除された = マッチングされた
        setMatchingStatus('found');
        subscription.unsubscribe();
        
        // 新しく作成されたルームを探す
        const { data: rooms } = await supabase
          .from('room_participants')
          .select('room_id')
          .eq('user_id', userId)
          .order('joined_at', { ascending: false })
          .limit(1);

        if (rooms && rooms.length > 0) {
          setTimeout(() => {
            onMatchFound(rooms[0].room_id);
            setIsSearching(false);
            onClose();
          }, 1500);
        }
      })
      .subscribe();

    // 30秒でタイムアウト
    searchTimeoutRef.current = setTimeout(() => {
      subscription.unsubscribe();
      cancelMatching();
      Alert.alert('タイムアウト', 'マッチングする相手が見つかりませんでした。もう一度お試しください。');
    }, 30000);
  };

  const cancelMatching = async () => {
    setIsSearching(false);
    setMatchingStatus('waiting');
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    try {
      const currentUser = await supabase.auth.getUser();
      if (currentUser.data.user) {
        await supabase
          .from('matching_queue')
          .delete()
          .eq('user_id', currentUser.data.user.id);
      }
    } catch (error) {
      console.error('Error canceling matching:', error);
    }
  };

  const handleClose = () => {
    if (isSearching) {
      cancelMatching();
    }
    onClose();
  };

  const getStatusText = () => {
    switch (matchingStatus) {
      case 'waiting':
        return 'ランダムマッチングを開始しますか？';
      case 'searching':
        return 'マッチング相手を探しています...';
      case 'found':
        return 'マッチングしました！';
      case 'error':
        return 'エラーが発生しました';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (matchingStatus) {
      case 'searching':
        return '🔍';
      case 'found':
        return '🎉';
      case 'error':
        return '❌';
      default:
        return '👋';
    }
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
          <Animated.View 
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Text style={styles.icon}>{getStatusIcon()}</Text>
          </Animated.View>

          <Text style={styles.title}>ランダムマッチング</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          {matchingStatus === 'searching' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>最大30秒お待ちください</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!isSearching && matchingStatus !== 'found' && (
              <TouchableOpacity 
                style={styles.startButton} 
                onPress={() => setIsSearching(true)}
              >
                <Text style={styles.buttonText}>マッチング開始</Text>
              </TouchableOpacity>
            )}

            {isSearching && matchingStatus === 'searching' && (
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelMatching}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
            )}

            {matchingStatus !== 'searching' && matchingStatus !== 'found' && (
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>閉じる</Text>
              </TouchableOpacity>
            )}
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
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
});