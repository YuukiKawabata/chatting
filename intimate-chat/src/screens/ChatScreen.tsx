import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  GestureResponderEvent,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  AnimatedMessageBubble,
  InputArea,
  AnimatedReactionPicker,
  EnhancedThemeSelector,
  ConnectionStatus,
  TouchIndicator,
} from '../components';

import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { useMessages } from '../hooks/useMessages';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// デモ用のルームID - 実際のアプリでは動的に設定
const DEMO_ROOM_ID = '00000000-0000-0000-0000-000000000001';

export const ChatScreen: React.FC = () => {
  // Hooks
  const { user, logout, updateOnlineStatus } = useAuth();
  const { currentTheme, theme, changeTheme } = useTheme();
  const { 
    notifyNewMessage,
    notifyNewReaction,
    notifyTouchPosition,
    clearBadgeCount,
  } = useNotifications();
  const { 
    isConnected, 
    connectionStatus,
    sendTouchPosition, 
    updatePresence 
  } = useRealtime();
  
  const { 
    messages, 
    typingUsers, 
    isLoading,
    error,
    sendMessage, 
    handleTyping, 
    addReaction,
    deleteReaction,
    markAsRead 
  } = useMessages(DEMO_ROOM_ID);

  // State
  const [currentInput, setCurrentInput] = useState('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number; userId: string } | null>(null);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);

  // プレゼンス状態管理
  useEffect(() => {
    if (user) {
      // オンライン状態に更新
      updateOnlineStatus?.(true);
      updatePresence('online');

      // アプリ終了時のクリーンアップ
      return () => {
        updateOnlineStatus?.(false);
        updatePresence('offline');
      };
    }
  }, [user, updateOnlineStatus, updatePresence]);

  // 現在タイピング中のユーザー監視
  const partnerTyping = typingUsers.length > 0 ? typingUsers[0] : null;

  // メッセージ受信時のスクロール
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 既読状態更新とバッジクリア
  useEffect(() => {
    if (messages.length > 0 && user) {
      markAsRead();
      clearBadgeCount(); // チャット画面表示時にバッジをクリア
    }
  }, [messages, user, markAsRead, clearBadgeCount]);

  // キーボード表示時のスクロール調整
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // エラーハンドリング
  useEffect(() => {
    if (error) {
      Alert.alert('エラー', error);
    }
  }, [error]);

  // メッセージ送信ハンドラー
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    try {
      await sendMessage(message.trim());
      setCurrentInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Message send failed:', error);
    }
  }, [sendMessage]);

  // 入力変更ハンドラー
  const handleInputChange = useCallback((text: string) => {
    setCurrentInput(text);
    handleTyping(text);
  }, [handleTyping]);

  // リアクション選択ハンドラー
  const handleReactionPress = useCallback((messageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMessageId(messageId);
    setShowReactionPicker(true);
  }, []);

  // リアクション追加/削除ハンドラー
  const handleSelectReaction = useCallback(async (reactionType: string) => {
    if (!selectedMessageId) return;

    try {
      // 既存のリアクションをチェック
      const message = messages.find(m => m.id === selectedMessageId);
      const existingReaction = message?.reactions?.find(
        r => r.user_id === user?.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // 既存のリアクションを削除
        await deleteReaction(selectedMessageId, reactionType);
      } else {
        // 新しいリアクションを追加
        await addReaction(selectedMessageId, reactionType);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Reaction failed:', error);
    }

    setShowReactionPicker(false);
    setSelectedMessageId(null);
  }, [selectedMessageId, messages, user?.id, addReaction, deleteReaction]);

  // テーマ選択ハンドラー
  const handleThemePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowThemeSelector(!showThemeSelector);
  }, [showThemeSelector]);

  // ログアウトハンドラー
  const handleLogout = useCallback(() => {
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
              await updateOnlineStatus?.(false);
              await updatePresence('offline');
              await logout();
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }
        },
      ]
    );
  }, [logout, updateOnlineStatus, updatePresence]);

  // 画面タッチハンドラー（タッチ位置共有）
  const handleScreenTouch = useCallback(async (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    
    try {
      // タッチ位置をパートナーに送信
      await sendTouchPosition(DEMO_ROOM_ID, locationX, locationY);
      
      // ローカルでタッチエフェクト表示
      setTouchPosition({
        x: locationX,
        y: locationY,
        userId: user?.id || '',
      });

      // ハプティクフィードバック
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 1.5秒後にエフェクトを非表示
      setTimeout(() => setTouchPosition(null), 1500);
    } catch (error) {
      console.error('Touch position send failed:', error);
    }
  }, [sendTouchPosition, user?.id]);

  // 接続状態の表示文字列
  const getConnectionStatusText = () => {
    if (isLoading) return '接続中...';
    if (!isConnected) return 'オフライン';
    if (partnerTyping) return `💭 ${partnerTyping.content ? `"${partnerTyping.content}"` : '入力中...'}`;
    return '💚 オンライン';
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
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>{user?.display_name?.charAt(0) || '愛'}</Text>
                </LinearGradient>
                <View 
                  style={[
                    styles.onlineIndicator,
                    { backgroundColor: isConnected ? theme.colors.success || '#10B981' : '#6B7280' }
                  ]} 
                />
              </View>
              
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
                  {user?.display_name || '愛しの人'}
                </Text>
                <Text style={[styles.userStatus, { color: theme.colors.text.secondary }]}>
                  {getConnectionStatusText()}
                </Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleThemePress}
              >
                <Feather 
                  name="settings" 
                  size={24} 
                  color={theme.colors.text.primary} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleLogout}
              >
                <Feather 
                  name="log-out" 
                  size={24} 
                  color={theme.colors.text.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Theme Selector */}
          <EnhancedThemeSelector
            currentTheme={currentTheme}
            theme={theme}
            onThemeChange={changeTheme}
            visible={showThemeSelector}
            onClose={() => setShowThemeSelector(false)}
          />

          {/* Content with Keyboard Avoiding */}
          <KeyboardAvoidingView 
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {/* Messages Area */}
            <View style={styles.messagesContainer}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onTouchStart={handleScreenTouch}
                keyboardShouldPersistTaps="handled"
              >
                {isLoading && messages.length === 0 ? (
                  <View style={styles.loadingState}>
                    <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
                      メッセージを読み込み中...
                    </Text>
                  </View>
                ) : messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Feather 
                      name="message-circle" 
                      size={48} 
                      color={theme.colors.text.secondary}
                      style={styles.emptyIcon}
                    />
                    <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                      メッセージを送信して会話を始めましょう ✨
                    </Text>
                  </View>
                ) : (
                  messages.map((message, index) => (
                    <AnimatedMessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === user?.id}
                      theme={theme}
                      onReaction={handleReactionPress}
                      isNew={index === messages.length - 1}
                    />
                  ))
                )}
              </ScrollView>
            </View>

            {/* Input Area */}
            <InputArea
              theme={theme}
              onSendMessage={handleSendMessage}
              onTyping={handleInputChange}
              disabled={!isConnected}
              partnerTyping={partnerTyping?.content || ''}
              currentInput={currentInput}
              roomId={DEMO_ROOM_ID}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Connection Status */}
        <ConnectionStatus
          isConnected={isConnected}
          isConnecting={connectionStatus === 'CONNECTING'}
          theme={theme}
        />

        {/* Touch Indicator */}
        {touchPosition && (
          <TouchIndicator
            x={touchPosition.x}
            y={touchPosition.y}
            theme={theme}
            visible={!!touchPosition}
          />
        )}

        {/* Animated Reaction Picker Modal */}
        <AnimatedReactionPicker
          visible={showReactionPicker}
          theme={theme}
          onSelectReaction={handleSelectReaction}
          onClose={() => {
            setShowReactionPicker(false);
            setSelectedMessageId(null);
          }}
        />

        {/* Background Decorations */}
        <View 
          style={[
            styles.backgroundDecoration1,
            { backgroundColor: theme.colors.primary + '20' }
          ]} 
        />
        <View 
          style={[
            styles.backgroundDecoration2,
            { backgroundColor: theme.colors.secondary + '20' }
          ]} 
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 14,
    opacity: 0.8,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    minHeight: '100%',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  backgroundDecoration1: {
    position: 'absolute',
    top: 100,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.1,
  },
  backgroundDecoration2: {
    position: 'absolute',
    bottom: 100,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.1,
  },
});