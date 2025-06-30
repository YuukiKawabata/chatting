import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Theme, ThemeName } from '../types';
import { themes } from '../styles/themes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EnhancedThemeSelectorProps {
  currentTheme: ThemeName;
  theme: Theme;
  onThemeChange: (themeName: ThemeName) => void;
  visible: boolean;
  onClose: () => void;
}

export const EnhancedThemeSelector: React.FC<EnhancedThemeSelectorProps> = ({
  currentTheme,
  theme,
  onThemeChange,
  visible,
  onClose,
}) => {
  const [selectedPreview, setSelectedPreview] = useState<ThemeName>(currentTheme);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // テーマプレビューデータ
  const themeData: Record<ThemeName, { icon: string; gradient: string[]; description: string }> = {
    cute: { 
      icon: 'heart', 
      gradient: ['#FF6B9D', '#A855F7'],
      description: 'ピンクベースの可愛らしいテーマ'
    },
    cool: { 
      icon: 'zap', 
      gradient: ['#3B82F6', '#06B6D4'],
      description: 'ブルーベースのクールなテーマ'
    },
    minimal: { 
      icon: 'circle', 
      gradient: ['#374151', '#6B7280'],
      description: 'シンプルで洗練されたテーマ'
    },
    warm: { 
      icon: 'sun', 
      gradient: ['#EA580C', '#D97706'],
      description: 'オレンジベースの暖かいテーマ'
    },
    romantic: { 
      icon: 'heart', 
      gradient: ['#EC4899', '#F97316'],
      description: 'ロマンティックなピンクテーマ'
    },
    galaxy: { 
      icon: 'star', 
      gradient: ['#8B5CF6', '#06B6D4'],
      description: '神秘的な宇宙風テーマ'
    },
    forest: { 
      icon: 'leaf', 
      gradient: ['#16A34A', '#15803D'],
      description: '自然豊かなグリーンテーマ'
    },
    sunset: { 
      icon: 'sun', 
      gradient: ['#F97316', '#EAB308'],
      description: '夕日をイメージしたテーマ'
    },
  };

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, slideAnim, scaleAnim]);

  const handleThemeSelect = (themeName: ThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreview(themeName);
  };

  const handleApplyTheme = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onThemeChange(selectedPreview);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreview(currentTheme);
    onClose();
  };

  const previewTheme = themes[selectedPreview];

  const renderThemeCard = (themeName: ThemeName) => {
    const themeConfig = themes[themeName];
    const themeInfo = themeData[themeName];
    const isSelected = selectedPreview === themeName;
    const isCurrent = currentTheme === themeName;

    return (
      <TouchableOpacity
        key={themeName}
        style={[
          styles.themeCard,
          isSelected && styles.selectedCard,
          { borderColor: isSelected ? previewTheme.colors.primary : theme.colors.border }
        ]}
        onPress={() => handleThemeSelect(themeName)}
        activeOpacity={0.8}
      >
        {/* テーマプレビューグラデーション */}
        <LinearGradient
          colors={themeInfo.gradient}
          style={styles.themePreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather 
            name={themeInfo.icon as any} 
            size={24} 
            color="#FFFFFF" 
          />
        </LinearGradient>

        {/* テーマ情報 */}
        <View style={styles.themeInfo}>
          <View style={styles.themeHeader}>
            <Text style={[styles.themeName, { color: theme.colors.text.primary }]}>
              {themeConfig.name}
            </Text>
            {isCurrent && (
              <View style={[styles.currentBadge, { backgroundColor: theme.colors.success }]}>
                <Text style={styles.currentBadgeText}>現在</Text>
              </View>
            )}
          </View>
          <Text style={[styles.themeDescription, { color: theme.colors.text.secondary }]}>
            {themeInfo.description}
          </Text>
        </View>

        {/* 選択インジケーター */}
        {isSelected && (
          <View style={[styles.selectionIndicator, { backgroundColor: previewTheme.colors.primary }]}>
            <Feather name="check" size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="rgba(0,0,0,0.8)"
        translucent
      />
      
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: slideAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: previewTheme.colors.background.primary,
              transform: [
                { 
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SCREEN_HEIGHT, 0],
                  })
                },
                { scale: scaleAnim }
              ],
            }
          ]}
        >
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: previewTheme.colors.border }]}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={[previewTheme.colors.primary, previewTheme.colors.secondary]}
                style={styles.headerIcon}
              >
                <Feather name="droplet" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.headerTitle, { color: previewTheme.colors.text.primary }]}>
                テーマ選択
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Feather 
                name="x" 
                size={24} 
                color={previewTheme.colors.text.primary} 
              />
            </TouchableOpacity>
          </View>

          {/* テーマ選択エリア */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.themesGrid}>
              {(Object.keys(themes) as ThemeName[]).map(renderThemeCard)}
            </View>

            {/* プレビューエリア */}
            <View style={[styles.previewSection, { backgroundColor: previewTheme.colors.background.card }]}>
              <Text style={[styles.previewTitle, { color: previewTheme.colors.text.primary }]}>
                プレビュー
              </Text>
              
              {/* サンプルメッセージ */}
              <View style={styles.previewMessages}>
                {/* 相手のメッセージ */}
                <View style={[styles.partnerMessage, { backgroundColor: previewTheme.colors.background.card, borderColor: previewTheme.colors.border }]}>
                  <Text style={[styles.messageText, { color: previewTheme.colors.text.primary }]}>
                    新しいテーマはどう？ ✨
                  </Text>
                </View>

                {/* 自分のメッセージ */}
                <LinearGradient
                  colors={[previewTheme.colors.primary, previewTheme.colors.secondary]}
                  style={styles.ownMessage}
                >
                  <Text style={styles.ownMessageText}>
                    とても素敵です！ 💕
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </ScrollView>

          {/* フッター */}
          <View style={[styles.footer, { borderTopColor: previewTheme.colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: previewTheme.colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: previewTheme.colors.text.secondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyTheme}
              disabled={selectedPreview === currentTheme}
            >
              <LinearGradient
                colors={
                  selectedPreview === currentTheme
                    ? [previewTheme.colors.text.secondary, previewTheme.colors.text.secondary]
                    : [previewTheme.colors.primary, previewTheme.colors.secondary]
                }
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>
                  {selectedPreview === currentTheme ? '適用済み' : 'テーマを適用'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  themesGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    position: 'relative',
  },
  selectedCard: {
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  themePreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  themeDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSection: {
    margin: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewMessages: {
    gap: 8,
  },
  partnerMessage: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});