import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { EnhancedThemeSelector } from '../components';
import { supabase } from '../lib/supabase';

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  created_at: string;
  participant_count: number;
}

interface HomeScreenProps {
  onJoinRoom: (roomId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onJoinRoom }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const { user, logout } = useAuth();
  const { theme, currentTheme, changeTheme } = useTheme();

  // ユーザー表示名の取得
  const displayName = user?.user_metadata?.display_name || 
                     user?.user_metadata?.username || 
                     user?.email?.split('@')[0] || 
                     'ユーザー';

  const username = user?.user_metadata?.username || 'user';

  // ルーム一覧を取得
  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          room_type,
          created_at,
          room_participants(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roomsWithCounts = (data || []).map(room => ({
        ...room,
        participant_count: room.room_participants?.length || 0
      }));

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      Alert.alert('エラー', 'ルーム一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // 新しいルームを作成
  const createRoom = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.prompt(
      'ルーム作成',
      'ルーム名を入力してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '作成',
          onPress: async (roomName) => {
            if (!roomName?.trim()) return;

            try {
              const { data: roomData, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({
                  name: roomName.trim(),
                  room_type: '1on1',
                  created_by: user?.id,
                })
                .select()
                .single();

              if (roomError) throw roomError;

              // 作成者を参加者として追加
              const { error: participantError } = await supabase
                .from('room_participants')
                .insert({
                  room_id: roomData.id,
                  user_id: user?.id,
                  role: 'admin',
                });

              if (participantError) throw participantError;

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('成功', 'ルームが作成されました！');
              loadRooms(); // ルーム一覧を再読み込み
            } catch (error) {
              console.error('Failed to create room:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('エラー', 'ルームの作成に失敗しました');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  // ルームに参加
  const joinRoom = async (roomId: string, roomName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // 既に参加しているかチェック
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user?.id)
        .single();

      if (!existingParticipant) {
        // 参加者として追加
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomId,
            user_id: user?.id,
            role: 'member',
          });

        if (error) throw error;
      }

      // チャット画面に遷移
      onJoinRoom(roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
      Alert.alert('エラー', 'ルームへの参加に失敗しました');
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Logout failed:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <StatusBar 
        barStyle={currentTheme === 'cool' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background.primary}
      />
      
      <LinearGradient
        colors={[
          theme.colors.background.primary,
          theme.colors.background.secondary || theme.colors.background.primary,
        ]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              
              <View style={styles.userDetails}>
                <Text style={[styles.displayName, { color: theme.colors.text.primary }]}>
                  {displayName}
                </Text>
                <Text style={[styles.username, { color: theme.colors.text.secondary }]}>
                  @{username}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.background.card }]}
                onPress={() => setShowThemeSelector(true)}
              >
                <Feather name="settings" size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.background.card }]}
                onPress={handleLogout}
              >
                <Feather name="log-out" size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadRooms}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            {/* Welcome Section */}
            <View style={[styles.welcomeCard, { backgroundColor: theme.colors.background.card }]}>
              <Text style={[styles.welcomeTitle, { color: theme.colors.text.primary }]}>
                ようこそ、Intimate Chatへ！
              </Text>
              <Text style={[styles.welcomeText, { color: theme.colors.text.secondary }]}>
                パートナーや親しい人とのプライベートなチャットを楽しみましょう
              </Text>
            </View>

            {/* Create Room Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={createRoom}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.createButtonGradient}
              >
                <Feather name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>新しいルームを作成</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Rooms List */}
            <View style={styles.roomsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                ルーム一覧
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
                    読み込み中...
                  </Text>
                </View>
              ) : rooms.length === 0 ? (
                <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background.card }]}>
                  <Feather name="message-circle" size={48} color={theme.colors.text.secondary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                    ルームがありません
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    最初のルームを作成してチャットを始めましょう
                  </Text>
                </View>
              ) : (
                rooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={[styles.roomCard, { backgroundColor: theme.colors.background.card }]}
                    onPress={() => joinRoom(room.id, room.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roomInfo}>
                      <Text style={[styles.roomName, { color: theme.colors.text.primary }]}>
                        {room.name}
                      </Text>
                      <Text style={[styles.roomDetails, { color: theme.colors.text.secondary }]}>
                        {room.participant_count} 人参加 • {new Date(room.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Theme Selector Modal */}
        <EnhancedThemeSelector
          currentTheme={currentTheme}
          theme={theme}
          onThemeChange={changeTheme}
          visible={showThemeSelector}
          onClose={() => setShowThemeSelector(false)}
        />
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  roomsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roomDetails: {
    fontSize: 14,
    opacity: 0.8,
  },
});