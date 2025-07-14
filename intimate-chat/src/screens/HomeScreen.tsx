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
import { usePresence } from '../hooks/usePresence';
import { EnhancedThemeSelector, EnhancedCreateRoomModal } from '../components';
import { PartnerInviteModal } from '../components/PartnerInviteModal';
import { JoinByCodeModal } from '../components/JoinByCodeModal';
import { RandomMatchModal } from '../components/RandomMatchModal';
import { PartnersList } from '../components/PartnersList';
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
  const [showPartnerInviteModal, setShowPartnerInviteModal] = useState(false);
  const [showJoinByCodeModal, setShowJoinByCodeModal] = useState(false);
  const [showRandomMatchModal, setShowRandomMatchModal] = useState(false);
  const [selectedRoomForInvite, setSelectedRoomForInvite] = useState<ChatRoom | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'partners'>('rooms');

  const { user, logout } = useAuth();
  const { theme, currentTheme, changeTheme } = useTheme();
  
  // オンライン状態管理を開始
  usePresence();

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
  const handleCreateRoom = async (roomName: string, roomType: 'public' | 'private' | 'partner' = 'private') => {
    try {
      console.log('Creating room with name:', roomName, 'type:', roomType);
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

  // パートナー招待モーダルを開く
  const openInviteModal = (room: ChatRoom) => {
    setSelectedRoomForInvite(room);
    setShowPartnerInviteModal(true);
  };

  // ランダムマッチングからルームに移動
  const handleMatchFound = (roomId: string) => {
    onJoinRoom(roomId);
    loadRooms(); // ルーム一覧を更新
  };

  // 招待コードでルームに移動
  const handleRoomJoined = (roomId: string) => {
    onJoinRoom(roomId);
    loadRooms(); // ルーム一覧を更新
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

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { backgroundColor: activeTab === 'rooms' ? theme.colors.primary : theme.colors.background.card }
                ]}
                onPress={() => setActiveTab('rooms')}
                activeOpacity={0.8}
              >
                <Feather 
                  name="home" 
                  size={18} 
                  color={activeTab === 'rooms' ? '#FFFFFF' : theme.colors.text.primary} 
                />
                <Text style={[
                  styles.tabButtonText,
                  { color: activeTab === 'rooms' ? '#FFFFFF' : theme.colors.text.primary }
                ]}>
                  ルーム
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { backgroundColor: activeTab === 'partners' ? theme.colors.primary : theme.colors.background.card }
                ]}
                onPress={() => setActiveTab('partners')}
                activeOpacity={0.8}
              >
                <Feather 
                  name="users" 
                  size={18} 
                  color={activeTab === 'partners' ? '#FFFFFF' : theme.colors.text.primary} 
                />
                <Text style={[
                  styles.tabButtonText,
                  { color: activeTab === 'partners' ? '#FFFFFF' : theme.colors.text.primary }
                ]}>
                  パートナー
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons - ルームタブでのみ表示 */}
            {activeTab === 'rooms' && (
            <View style={styles.actionButtonsContainer}>
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
                  <Text style={styles.createButtonText}>新しいルーム</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Join by Code Button */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.background.card }]}
                onPress={() => setShowJoinByCodeModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="key" size={20} color={theme.colors.primary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
                  招待コードで参加
                </Text>
              </TouchableOpacity>

              {/* Random Match Button */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.background.card }]}
                onPress={() => setShowRandomMatchModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="shuffle" size={20} color={theme.colors.secondary} />
                <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
                  ランダムマッチング
                </Text>
              </TouchableOpacity>
            </View>
            )}

            {/* Content Area */}
            {activeTab === 'rooms' ? (
            /* Rooms List */
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
                  <View key={room.id} style={[styles.roomCard, { backgroundColor: theme.colors.background.card }]}>
                    <TouchableOpacity
                      style={styles.roomMainArea}
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
                    
                    <TouchableOpacity
                      style={[styles.inviteButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => openInviteModal(room)}
                      activeOpacity={0.8}
                    >
                      <Feather name="share" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
            ) : (
            /* Partners List */
            <View style={styles.partnersSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                パートナー一覧
              </Text>
              <PartnersList 
                onStartChat={onJoinRoom}
                onRefresh={loadRooms}
              />
            </View>
            )}
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

        {/* Enhanced Create Room Modal */}
        <EnhancedCreateRoomModal
          visible={showCreateRoomModal}
          theme={theme}
          onClose={() => setShowCreateRoomModal(false)}
          onCreateRoom={handleCreateRoom}
        />

        {/* Partner Invite Modal */}
        {selectedRoomForInvite && (
          <PartnerInviteModal
            visible={showPartnerInviteModal}
            onClose={() => {
              setShowPartnerInviteModal(false);
              setSelectedRoomForInvite(null);
            }}
            roomId={selectedRoomForInvite.id}
            roomName={selectedRoomForInvite.name}
          />
        )}

        {/* Join by Code Modal */}
        <JoinByCodeModal
          visible={showJoinByCodeModal}
          onClose={() => setShowJoinByCodeModal(false)}
          onRoomJoined={handleRoomJoined}
        />

        {/* Random Match Modal */}
        <RandomMatchModal
          visible={showRandomMatchModal}
          onClose={() => setShowRandomMatchModal(false)}
          onMatchFound={handleMatchFound}
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  username: {
    fontSize: 15,
    opacity: 0.8,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  welcomeCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  roomsSection: {
    marginBottom: 20,
  },
  partnersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.2,
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
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  roomMainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  roomInfo: {
    flex: 1,
  },
  inviteButton: {
    width: 48,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  roomDetails: {
    fontSize: 15,
    opacity: 0.8,
    fontWeight: '500',
  },
});