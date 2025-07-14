import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { useTheme } from '../hooks/useTheme';
import { EnhancedReactionPicker } from '../components/EnhancedReactionPicker';

// デモ用のルームID
const DEMO_ROOM_ID = '00000000-0000-0000-0000-000000000001';

interface ChatScreenProps {
  roomId?: string | null;
  onBackToHome?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ 
  roomId = DEMO_ROOM_ID, 
  onBackToHome 
}) => {
  // Hooks
  const { user, logout } = useAuth();
  const { currentTheme, theme } = useTheme();
  const { 
    isConnected, 
    updateTyping, 
    stopTyping,
    sendMessage,
    onTypingUpdate,
    onMessageReceived,
    joinRoom,
    leaveRoom,
  } = useRealtime();

  // State
  const [myInput, setMyInput] = useState('');
  const [partnerInput, setPartnerInput] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // ルーム参加・退出管理
  useEffect(() => {
    if (!roomId || !user?.id) return;

    const setupRoom = async () => {
      try {
        await joinRoom(roomId);
      } catch (error) {
        console.error('Room setup failed:', error);
      }
    };

    setupRoom();

    return () => {
      leaveRoom(roomId);
    };
  }, [roomId, user?.id, joinRoom, leaveRoom]);

  // タイピング状態監視
  useEffect(() => {
    if (!roomId || !user?.id) return;

    const typingUnsubscribe = onTypingUpdate(roomId, (payload) => {
      if (!payload.new || !('user_id' in payload.new)) return;
      
      const typingData = payload.new;
      
      if (typingData.user_id === user.id) return; // 自分のタイピングは無視

      if (typingData.is_typing && payload.eventType !== 'DELETE') {
        // パートナーが入力中
        setPartnerInput(typingData.content_preview || '');
        setIsPartnerTyping(true);
      } else {
        // パートナーが入力停止
        setPartnerInput('');
        setIsPartnerTyping(false);
      }
    });

    return typingUnsubscribe;
  }, [roomId, user?.id, onTypingUpdate]);

  // メッセージ受信監視
  useEffect(() => {
    if (!roomId || !user?.id) return;

    const messageUnsubscribe = onMessageReceived(roomId, (payload: any) => {
      if (!payload.new) return;
      
      const messageData = payload.new;
      console.log('📨 New message received:', messageData);
      
      // メッセージを一時的に表示リストに追加
      setMessages(prev => [...prev, {
        id: messageData.id,
        content: messageData.content,
        senderId: messageData.sender_id,
        createdAt: messageData.created_at,
        isMine: messageData.sender_id === user.id
      }]);

      // 1時間後に自動削除（実際のデータベース削除はサーバーサイドで）
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== messageData.id));
      }, 3600000); // 1時間
    });

    return messageUnsubscribe;
  }, [roomId, user?.id, onMessageReceived]);

  // 自分の入力変更ハンドラー
  const handleMyInputChange = useCallback(async (text: string) => {
    setMyInput(text);
    
    try {
      if (text.trim()) {
        await updateTyping(roomId!, text);
      } else {
        await stopTyping(roomId!);
      }
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  }, [roomId, updateTyping, stopTyping]);

  // メッセージ送信ハンドラー
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !roomId) return;

    try {
      await sendMessage(roomId, message.trim());
      setMyInput(''); // 入力をクリア
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  }, [roomId, sendMessage]);

  // 戻るボタンハンドラー
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBackToHome) {
      onBackToHome();
    }
  }, [onBackToHome]);

  // ログアウトハンドラー
  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logout();
  }, [logout]);

  // リアクションハンドラー
  const handleReaction = useCallback((messageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMessageId(messageId);
    setShowReactionPicker(true);
  }, []);

  // リアクション追加ハンドラー
  const handleReactionAdded = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowReactionPicker(false);
    setSelectedMessageId(null);
  }, []);

  // リアクションピッカーを閉じる
  const handleCloseReactionPicker = useCallback(() => {
    setShowReactionPicker(false);
    setSelectedMessageId(null);
  }, []);

  return (
    <>
      <StatusBar style={currentTheme === 'cool' ? 'light' : 'dark'} />
      
      <LinearGradient
        colors={[
          theme.colors.background.primary,
          theme.colors.background.secondary || theme.colors.background.primary,
        ]}
        style={styles.container}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ミニマルヘッダー */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleBack}
            >
              <Feather 
                name="arrow-left" 
                size={24} 
                color={theme.colors.text.primary} 
              />
            </TouchableOpacity>
            
            <View style={styles.connectionStatus}>
              <View 
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? theme.colors.success || '#10B981' : '#6B7280' }
                ]} 
              />
              <Text style={[styles.statusText, { color: theme.colors.text.secondary }]}>
                {isConnected ? 'つながっています' : 'オフライン'}
              </Text>
            </View>

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

          {/* メインコンテンツエリア */}
          <View style={styles.contentArea}>
            {/* メッセージ表示エリア */}
            <View style={styles.messagesArea}>
              <Text style={[styles.messagesLabel, { color: theme.colors.text.secondary }]}>
                現在のメッセージ ({messages.length}件)
              </Text>
              <View style={[styles.messagesContainer, { backgroundColor: theme.colors.background.card }]}>
                {messages.length === 0 ? (
                  <Text style={[styles.emptyMessages, { color: theme.colors.text.secondary }]}>
                    まだメッセージがありません
                  </Text>
                ) : (
                  messages.map((message) => (
                    <TouchableOpacity
                      key={message.id} 
                      style={[
                        styles.messageItem,
                        {
                          backgroundColor: message.isMine 
                            ? theme.colors.primary + '20' 
                            : theme.colors.background.secondary || theme.colors.background.primary,
                          alignSelf: message.isMine ? 'flex-end' : 'flex-start',
                        }
                      ]}
                      onLongPress={() => handleReaction(message.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.messageText, { color: theme.colors.text.primary }]}>
                        {message.content}
                      </Text>
                      <Text style={[styles.messageTime, { color: theme.colors.text.secondary }]}>
                        {new Date(message.createdAt).toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
            {/* 相手の入力エリア */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                相手の入力
              </Text>
              <View style={[
                styles.inputDisplay, 
                { 
                  backgroundColor: theme.colors.background.secondary || theme.colors.background.primary,
                  borderColor: isPartnerTyping ? theme.colors.primary : theme.colors.border,
                }
              ]}>
                {isPartnerTyping ? (
                  <Text style={[styles.inputText, { color: theme.colors.text.primary }]}>
                    {partnerInput || '入力中...'}
                  </Text>
                ) : (
                  <Text style={[styles.placeholderText, { color: theme.colors.text.secondary }]}>
                    待機中...
                  </Text>
                )}
                {isPartnerTyping && (
                  <View style={styles.typingIndicator}>
                    <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
                    <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
                    <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
                  </View>
                )}
              </View>
            </View>

            {/* 自分の入力エリア */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
                あなたの入力
              </Text>
              <View style={[
                styles.inputContainer, 
                { 
                  backgroundColor: theme.colors.background.secondary || theme.colors.background.primary,
                  borderColor: myInput ? theme.colors.primary : theme.colors.border,
                }
              ]}>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      color: theme.colors.text.primary,
                    }
                  ]}
                  value={myInput}
                  onChangeText={handleMyInputChange}
                  placeholder="ここに入力してください..."
                  placeholderTextColor={theme.colors.text.secondary}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                />
                
                {/* 送信ボタン */}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor: myInput.trim() 
                        ? theme.colors.primary 
                        : theme.colors.text.secondary,
                    }
                  ]}
                  onPress={() => handleSendMessage(myInput)}
                  disabled={!myInput.trim()}
                  activeOpacity={0.8}
                >
                  <Feather 
                    name="send" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* 背景装飾 */}
        <View 
          style={[
            styles.backgroundDecoration1,
            { backgroundColor: theme.colors.primary + '10' }
          ]} 
        />
        <View 
          style={[
            styles.backgroundDecoration2,
            { backgroundColor: theme.colors.secondary + '10' }
          ]} 
        />

        {/* リアクションピッカーモーダル */}
        {selectedMessageId && (
          <EnhancedReactionPicker
            messageId={selectedMessageId}
            visible={showReactionPicker}
            onClose={handleCloseReactionPicker}
            onReactionAdded={handleReactionAdded}
          />
        )}
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 20,
  },
  messagesArea: {
    flex: 1,
    gap: 8,
  },
  messagesLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyMessages: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  messageItem: {
    maxWidth: '85%',
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 6,
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  inputSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  inputDisplay: {
    minHeight: 120,
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainer: {
    minHeight: 120,
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    fontSize: 18,
    lineHeight: 24,
    flex: 1,
    textAlignVertical: 'top',
    maxHeight: 80,
    fontWeight: '500',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  inputText: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.6,
  },
  typingIndicator: {
    position: 'absolute',
    bottom: 15,
    right: 20,
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
  backgroundDecoration1: {
    position: 'absolute',
    top: 100,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.08,
  },
  backgroundDecoration2: {
    position: 'absolute',
    bottom: 100,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.08,
  },
});