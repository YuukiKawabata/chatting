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
    onTypingUpdate,
    joinRoom,
    leaveRoom,
  } = useRealtime();

  // State
  const [myInput, setMyInput] = useState('');
  const [partnerInput, setPartnerInput] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
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
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
    gap: 60,
  },
  inputSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputDisplay: {
    minHeight: 120,
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  inputContainer: {
    minHeight: 120,
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
  },
  textInput: {
    fontSize: 18,
    lineHeight: 24,
    flex: 1,
    textAlignVertical: 'top',
  },
  inputText: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
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