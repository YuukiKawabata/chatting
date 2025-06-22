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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  MessageBubble,
  InputArea,
  ReactionPicker,
  ThemeSelector,
  ConnectionStatus,
  TouchIndicator,
} from '../components';

import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';
import { useTheme } from '../hooks/useTheme';

import { ReactionType, TouchPosition } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ChatScreen: React.FC = () => {
  // Hooks
  const { user, logout } = useAuth();
  const { currentTheme, theme, changeTheme } = useTheme();
  const { 
    isConnected, 
    isConnecting, 
    connect, 
    sendTouchPosition, 
    onPartnerTouch 
  } = useSocket();
  
  const { 
    messages, 
    typingUsers, 
    sendMessage, 
    handleTyping, 
    addReaction 
  } = useMessages('room_demo');

  // State
  const [currentInput, setCurrentInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [touchPosition, setTouchPosition] = useState<TouchPosition | null>(null);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const partnerInputRef = useRef<string>('');

  // Connect socket when component mounts
  useEffect(() => {
    if (user && !isConnected && !isConnecting) {
      connect('demo_token'); // TODO: Use real token
    }
  }, [user, isConnected, isConnecting, connect]);

  // Handle partner typing updates
  useEffect(() => {
    const currentTypingUser = typingUsers[0];
    if (currentTypingUser) {
      setPartnerTyping(currentTypingUser.content || '入力中...');
      partnerInputRef.current = currentTypingUser.content || '';
    } else {
      setPartnerTyping('');
      partnerInputRef.current = '';
    }
  }, [typingUsers]);

  // Handle partner touch events
  useEffect(() => {
    const unsubscribe = onPartnerTouch((data) => {
      setTouchPosition({
        x: data.x,
        y: data.y,
        userId: data.userId,
      });
      
      // Auto hide after 1.5 seconds
      setTimeout(() => setTouchPosition(null), 1500);
    });

    return unsubscribe;
  }, [onPartnerTouch]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Handlers
  const handleSendMessage = useCallback((message: string) => {
    sendMessage(message);
    setCurrentInput('');
  }, [sendMessage]);

  const handleInputChange = useCallback((text: string) => {
    setCurrentInput(text);
    handleTyping(text);
  }, [handleTyping]);

  const handleReactionPress = useCallback((messageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMessageId(messageId);
    setShowReactionPicker(true);
  }, []);

  const handleSelectReaction = useCallback((reactionType: ReactionType) => {
    if (selectedMessageId) {
      addReaction(selectedMessageId, reactionType);
    }
    setShowReactionPicker(false);
    setSelectedMessageId(null);
  }, [selectedMessageId, addReaction]);

  const handleThemePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowThemeSelector(!showThemeSelector);
  }, [showThemeSelector]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログアウト', style: 'destructive', onPress: logout },
      ]
    );
  }, [logout]);

  const handleScreenTouch = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    
    // Send touch position to partner
    sendTouchPosition('room_demo', locationX, locationY);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [sendTouchPosition]);

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
                  <Text style={styles.avatarText}>愛</Text>
                </LinearGradient>
                <View 
                  style={[
                    styles.onlineIndicator,
                    { backgroundColor: isConnected ? theme.colors.success : '#6B7280' }
                  ]} 
                />
              </View>
              
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
                  愛しの人
                </Text>
                <Text style={[styles.userStatus, { color: theme.colors.text.secondary }]}>
                  {partnerTyping ? `✨ ${partnerTyping}` : (isConnected ? '💭 オンライン' : 'オフライン')}
                </Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleThemePress}
              >
                <Feather 
                  name="palette" 
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

          {/* Theme Selector */}
          <ThemeSelector
            currentTheme={currentTheme}
            theme={theme}
            onThemeChange={changeTheme}
            visible={showThemeSelector}
          />

          {/* Messages Area */}
          <View style={styles.messagesContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              onTouchStart={handleScreenTouch}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    メッセージを送信して会話を始めましょう ✨
                  </Text>
                </View>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === user?.id}
                    theme={theme}
                    onReaction={handleReactionPress}
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
            partnerTyping={partnerTyping}
            currentInput={currentInput}
          />
        </SafeAreaView>

        {/* Connection Status */}
        <ConnectionStatus
          isConnected={isConnected}
          isConnecting={isConnecting}
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

        {/* Reaction Picker Modal */}
        <ReactionPicker
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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