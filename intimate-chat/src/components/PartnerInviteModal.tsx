import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { InviteQRCode } from './InviteQRCode';

interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: {
      primary: string;
      secondary?: string;
      card: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
    border: string;
    success?: string;
    error?: string;
  };
}

interface Invitation {
  id: string;
  invite_code: string;
  invite_url: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

interface Partnership {
  id: string;
  partner_name: string;
  partner_username: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

interface PartnerInviteModalProps {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onCreateInvite: () => Promise<Invitation>;
  onAcceptInvite: (code: string) => Promise<boolean>;
  onCancelInvite: (inviteId: string) => Promise<boolean>;
  currentInvite?: Invitation | null;
  partnerships: Partnership[];
  isLoading?: boolean;
}

type TabType = 'invite' | 'accept' | 'status';

export const PartnerInviteModal: React.FC<PartnerInviteModalProps> = ({
  visible,
  theme,
  onClose,
  onCreateInvite,
  onAcceptInvite,
  onCancelInvite,
  currentInvite,
  partnerships,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // モーダル表示時のアニメーション
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleCreateInvite = async () => {
    setIsProcessing(true);
    try {
      await onCreateInvite();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to create invite:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '招待の作成に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('エラー', '招待コードを入力してください');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await onAcceptInvite(inviteCode.trim().toUpperCase());
      if (success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('成功', 'パートナーシップが確立されました！');
        setInviteCode('');
        setActiveTab('status');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('エラー', '無効な招待コードです');
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '招待の受諾に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!currentInvite) return;

    Alert.alert(
      '招待をキャンセル',
      '招待をキャンセルしますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await onCancelInvite(currentInvite.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Failed to cancel invite:', error);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('エラー', '招待のキャンセルに失敗しました');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderTabButton = (tab: TabType, title: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { backgroundColor: theme.colors.primary },
        { borderColor: theme.colors.border }
      ]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.8}
    >
      <Feather 
        name={icon as any} 
        size={18} 
        color={activeTab === tab ? '#FFFFFF' : theme.colors.text.secondary} 
      />
      <Text 
        style={[
          styles.tabButtonText,
          { color: activeTab === tab ? '#FFFFFF' : theme.colors.text.secondary }
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderInviteTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {currentInvite && currentInvite.status === 'pending' ? (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            作成済みの招待
          </Text>
          
          <InviteQRCode
            inviteCode={currentInvite.invite_code}
            inviteUrl={currentInvite.invite_url}
            theme={theme}
            onCopyCode={() => Alert.alert('コピー完了', '招待コードをコピーしました')}
            onCopyUrl={() => Alert.alert('コピー完了', '招待リンクをコピーしました')}
            onShare={() => console.log('Shared invite')}
          />

          <View style={[styles.inviteInfo, { backgroundColor: theme.colors.background.primary }]}>
            <Text style={[styles.inviteInfoText, { color: theme.colors.text.secondary }]}>
              作成日時: {new Date(currentInvite.created_at).toLocaleDateString('ja-JP')}
            </Text>
            <Text style={[styles.inviteInfoText, { color: theme.colors.text.secondary }]}>
              有効期限: {new Date(currentInvite.expires_at).toLocaleDateString('ja-JP')}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.error || '#EF4444' }]}
            onPress={handleCancelInvite}
            disabled={isProcessing}
          >
            <Feather name="x" size={20} color={theme.colors.error || '#EF4444'} />
            <Text style={[styles.cancelButtonText, { color: theme.colors.error || '#EF4444' }]}>
              招待をキャンセル
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            パートナーを招待
          </Text>
          
          <View style={[styles.emptyState, { backgroundColor: theme.colors.background.card }]}>
            <Feather name="users" size={48} color={theme.colors.text.secondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text.primary }]}>
              新しい招待を作成
            </Text>
            <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
              パートナーを招待してプライベートチャットを始めましょう
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateInvite}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={styles.createButtonGradient}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="plus" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.createButtonText}>
                {isProcessing ? '作成中...' : '招待を作成'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderAcceptTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        招待を受諾
      </Text>
      
      <View style={[styles.acceptCard, { backgroundColor: theme.colors.background.card }]}>
        <Text style={[styles.acceptLabel, { color: theme.colors.text.secondary }]}>
          招待コードを入力
        </Text>
        
        <TextInput
          style={[
            styles.codeInput,
            { 
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border,
              color: theme.colors.text.primary 
            }
          ]}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="例: ABC12345"
          placeholderTextColor={theme.colors.text.secondary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
        />
        
        <TouchableOpacity
          style={[
            styles.acceptButton,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={handleAcceptInvite}
          disabled={isProcessing || !inviteCode.trim()}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="check" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.acceptButtonText}>
            {isProcessing ? '処理中...' : '招待を受諾'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStatusTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        パートナーシップ
      </Text>
      
      {partnerships.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.colors.background.card }]}>
          <Feather name="heart" size={48} color={theme.colors.text.secondary} />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text.primary }]}>
            パートナーがいません
          </Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
            招待を作成または受諾してパートナーシップを確立しましょう
          </Text>
        </View>
      ) : (
        partnerships.map((partnership) => (
          <View
            key={partnership.id}
            style={[styles.partnershipCard, { backgroundColor: theme.colors.background.card }]}
          >
            <View style={styles.partnershipInfo}>
              <Text style={[styles.partnerName, { color: theme.colors.text.primary }]}>
                {partnership.partner_name}
              </Text>
              <Text style={[styles.partnerUsername, { color: theme.colors.text.secondary }]}>
                @{partnership.partner_username}
              </Text>
              <Text style={[styles.partnershipDate, { color: theme.colors.text.secondary }]}>
                {new Date(partnership.created_at).toLocaleDateString('ja-JP')}から
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge,
              { backgroundColor: partnership.status === 'active' ? theme.colors.success || '#10B981' : '#6B7280' }
            ]}>
              <Text style={styles.statusText}>
                {partnership.status === 'active' ? 'アクティブ' : '非アクティブ'}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={[
            theme.colors.background.primary,
            theme.colors.background.secondary || theme.colors.background.primary,
          ]}
          style={styles.container}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Feather name="x" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              パートナー招待
            </Text>
            
            <View style={styles.headerSpacer} />
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {renderTabButton('invite', '招待', 'send')}
            {renderTabButton('accept', '受諾', 'download')}
            {renderTabButton('status', 'ステータス', 'users')}
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
                読み込み中...
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              {activeTab === 'invite' && renderInviteTab()}
              {activeTab === 'accept' && renderAcceptTab()}
              {activeTab === 'status' && renderStatusTab()}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
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
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inviteInfo: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  inviteInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  acceptCard: {
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  partnershipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partnershipInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partnerUsername: {
    fontSize: 14,
    marginBottom: 4,
  },
  partnershipDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
}); 