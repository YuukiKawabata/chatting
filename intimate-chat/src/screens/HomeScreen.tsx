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
import { EnhancedThemeSelector, CreateRoomModal } from '../components';
import { supabase } from '../lib/supabase';
import { roomService, ChatRoom } from '../services/roomService';


interface HomeScreenProps {
  onJoinRoom: (roomId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onJoinRoom }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

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
      console.log('Loading rooms...');
      const roomsData = await roomService.getRooms();
      console.log('Rooms loaded:', roomsData.length);
      setRooms(roomsData);
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

  // 新しいルーム作成ボタンのハンドラー
  const handleCreateRoomPress = () => {
    console.log('Create room button pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCreateRoomModal(true);
  };

  // ルーム作成処理
  const handleCreateRoom = async (roomName: string) => {
    try {
      console.log('Creating room with name:', roomName);
      const result = await roomService.createRoom(roomName.trim());
      
      if (result.success) {
        console.log('Room created successfully:', result.room);
        await loadRooms(); // ルーム一覧を再読み込み
        
        // 作成したルームに自動で参加
        if (result.room) {
          onJoinRoom(result.room.id);
        }
      } else {
        throw new Error(result.error || 'ルームの作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      const errorMessage = error instanceof Error ? error.message : 'ルームの作成に失敗しました';
      Alert.alert('エラー', errorMessage);
      throw error; // モーダルでエラーハンドリングするために再スロー
    }
  };

  // ルームに参加
  const joinRoom = async (roomId: string, roomName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      console.log('Joining room:', { roomId, roomName });
      const result = await roomService.joinRoom(roomId);
      
      if (result.success) {
        console.log('Successfully joined room, navigating to chat');
        // チャット画面に遷移
        onJoinRoom(roomId);
      } else {
        throw new Error(result.error || 'ルームへの参加に失敗しました');
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      const errorMessage = error instanceof Error ? error.message : 'ルームへの参加に失敗しました';
      Alert.alert('エラー', errorMessage);
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
              onPress={handleCreateRoomPress}
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

        {/* Create Room Modal */}
        <CreateRoomModal
          visible={showCreateRoomModal}
          theme={theme}
          onClose={() => setShowCreateRoomModal(false)}
          onCreateRoom={handleCreateRoom}
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