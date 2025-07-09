import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

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

interface InviteQRCodeProps {
  inviteCode: string;
  inviteUrl: string;
  theme: Theme;
  onCopyCode?: () => void;
  onCopyUrl?: () => void;
  onShare?: () => void;
}

export const InviteQRCode: React.FC<InviteQRCodeProps> = ({
  inviteCode,
  inviteUrl,
  theme,
  onCopyCode,
  onCopyUrl,
  onShare,
}) => {
  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(inviteCode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCopyCode?.();
    } catch (error) {
      console.error('Failed to copy invite code:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCopyUrl?.();
    } catch (error) {
      console.error('Failed to copy invite URL:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleShare = async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(inviteUrl, {
          dialogTitle: 'パートナーを招待',
        });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onShare?.();
      } else {
        // Sharing not available, fallback to clipboard
        await handleCopyUrl();
      }
    } catch (error) {
      console.error('Failed to share invite:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.card }]}>
      {/* QRコード表示 */}
      <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
        <QRCode
          value={inviteUrl}
          size={200}
          color={theme.colors.text.primary}
          backgroundColor="#FFFFFF"
          logoSize={30}
          logoBackgroundColor="transparent"
        />
      </View>

      {/* 招待コード表示 */}
      <View style={styles.codeSection}>
        <Text style={[styles.codeLabel, { color: theme.colors.text.secondary }]}>
          招待コード
        </Text>
        <View style={[styles.codeContainer, { borderColor: theme.colors.border }]}>
          <Text style={[styles.codeText, { color: theme.colors.text.primary }]}>
            {inviteCode}
          </Text>
          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCopyCode}
            activeOpacity={0.8}
          >
            <Feather name="copy" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* アクションボタン */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.background.primary, borderColor: theme.colors.border }
          ]}
          onPress={handleCopyUrl}
          activeOpacity={0.8}
        >
          <Feather name="link" size={20} color={theme.colors.text.primary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
            リンクをコピー
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Feather name="share-2" size={20} color="#FFFFFF" />
          <Text style={[styles.actionButtonText, styles.shareButtonText]}>
            共有
          </Text>
        </TouchableOpacity>
      </View>

      {/* 説明テキスト */}
      <Text style={[styles.instructionText, { color: theme.colors.text.secondary }]}>
        パートナーにQRコードを見せるか、招待リンクを共有してください。{'\n'}
        招待は7日間有効です。
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  qrContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeSection: {
    width: '100%',
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  shareButton: {
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButtonText: {
    color: '#FFFFFF',
  },
  instructionText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.8,
  },
}); 