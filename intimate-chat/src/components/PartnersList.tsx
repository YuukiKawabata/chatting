import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { partnerService, Partner } from '../services/partnerService';
import { useTheme } from '../hooks/useTheme';

interface PartnersListProps {
  onStartChat: (roomId: string) => void;
  onRefresh?: () => void;
}

export const PartnersList: React.FC<PartnersListProps> = ({ 
  onStartChat, 
  onRefresh 
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { theme } = useTheme();

  const loadPartners = useCallback(async () => {
    try {
      console.log('Loading partners...');
      const partnersData = await partnerService.getPartners();
      console.log('Partners loaded:', partnersData.length);
      setPartners(partnersData);
    } catch (error) {
      console.error('Failed to load partners:', error);
      Alert.alert('エラー', 'パートナー一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPartners();
    if (onRefresh) onRefresh();
    setIsRefreshing(false);
  }, [loadPartners, onRefresh]);

  useEffect(() => {
    loadPartners();

    // パートナーのオンライン状態をリアルタイムで監視
    const subscription = partnerService.subscribeToPartnerPresence((updatedPartner) => {
      setPartners(prevPartners => 
        prevPartners.map(partner => 
          partner.partner_user_id === updatedPartner.partner_user_id
            ? { ...partner, ...updatedPartner }
            : partner
        )
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadPartners]);

  const startChatWithPartner = async (partner: Partner) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // 既存のチャットルームを確認
      let roomId = await partnerService.getPartnerChatRoom(partner.partner_id);

      // 既存ルームがない場合は新規作成
      if (!roomId) {
        const result = await partnerService.createPartnerChatRoom(partner.partner_id);
        if (result.success && result.room_id) {
          roomId = result.room_id;
        } else {
          throw new Error(result.error || 'チャットルームの作成に失敗しました');
        }
      }

      onStartChat(roomId);
    } catch (error) {
      console.error('Error starting chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'チャットの開始に失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  };

  const getOnlineStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#34C759'; // 緑
      case 'away':
        return '#FF9500'; // オレンジ
      default:
        return '#8E8E93'; // グレー
    }
  };

  const getOnlineStatusText = (status: string, lastSeen: string | null) => {
    switch (status) {
      case 'online':
        return 'オンライン';
      case 'away':
        return '離席中';
      default:
        if (lastSeen) {
          const lastSeenDate = new Date(lastSeen);
          const now = new Date();
          const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
          
          if (diffMinutes < 60) {
            return `${diffMinutes}分前に接続`;
          } else if (diffMinutes < 1440) { // 24時間
            const hours = Math.floor(diffMinutes / 60);
            return `${hours}時間前に接続`;
          } else {
            const days = Math.floor(diffMinutes / 1440);
            return `${days}日前に接続`;
          }
        }
        return 'オフライン';
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
          パートナーを読み込み中...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {partners.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background.card }]}>
          <Feather name="users" size={48} color={theme.colors.text.secondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
            パートナーがいません
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
            招待コードまたはランダムマッチングで{'\n'}新しいパートナーと出会いましょう
          </Text>
        </View>
      ) : (
        partners.map((partner) => (
          <TouchableOpacity
            key={partner.partner_id}
            style={[styles.partnerCard, { backgroundColor: theme.colors.background.card }]}
            onPress={() => startChatWithPartner(partner)}
            activeOpacity={0.7}
          >
            <View style={styles.partnerInfo}>
              {/* アバター */}
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {partner.display_name.charAt(0).toUpperCase()}
                </Text>
                {/* オンライン状態インジケーター */}
                <View 
                  style={[
                    styles.statusIndicator, 
                    { backgroundColor: getOnlineStatusColor(partner.online_status) }
                  ]} 
                />
              </LinearGradient>

              {/* パートナー詳細 */}
              <View style={styles.partnerDetails}>
                <Text style={[styles.displayName, { color: theme.colors.text.primary }]}>
                  {partner.display_name}
                </Text>
                <Text style={[styles.username, { color: theme.colors.text.secondary }]}>
                  @{partner.username}
                </Text>
                <Text style={[styles.onlineStatus, { color: getOnlineStatusColor(partner.online_status) }]}>
                  {getOnlineStatusText(partner.online_status, partner.last_seen)}
                </Text>
                <Text style={[styles.joinDate, { color: theme.colors.text.secondary }]}>
                  パートナー登録: {formatJoinDate(partner.created_at)}
                </Text>
              </View>
            </View>

            {/* チャットアクション */}
            <View style={styles.actionArea}>
              {partner.has_active_room && (
                <View style={[styles.activeChatBadge, { backgroundColor: theme.colors.primary }]}>
                  <Feather name="message-circle" size={12} color="#FFFFFF" />
                </View>
              )}
              <Feather name="message-square" size={24} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  partnerDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  onlineStatus: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  actionArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeChatBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});