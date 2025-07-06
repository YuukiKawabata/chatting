import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// Expo Goかどうかを確認
const isExpoGo = Constants.appOwnership === 'expo';

// 通知設定（Expo Go以外でのみ設定）
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface NotificationData {
  type: 'message' | 'reaction' | 'touch' | 'system';
  roomId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  content?: string;
  reactionType?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 通知サービスの初期化
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Expo Goでの実行チェック
      if (isExpoGo) {
        console.warn('Push notifications are not supported in Expo Go. Use development build instead.');
        this.isInitialized = true;
        return false;
      }

      // デバイスの物理チェック
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // 通知権限の取得
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        return false;
      }

      // Expo Push Tokenの取得
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.expoPushToken = token.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Android用チャンネル設定
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // プッシュトークンをSupabaseに保存
      await this.savePushTokenToDatabase();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Androidの通知チャンネル設定
   */
  private async setupAndroidChannels() {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'メッセージ',
      description: '新しいメッセージの通知',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B9D',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('reactions', {
      name: 'リアクション',
      description: 'メッセージへのリアクション通知',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#A855F7',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('system', {
      name: 'システム',
      description: 'システム関連の通知',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lightColor: '#10B981',
      sound: 'default',
    });
  }

  /**
   * プッシュトークンをデータベースに保存
   */
  private async savePushTokenToDatabase() {
    if (!this.expoPushToken) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          token: this.expoPushToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      console.log('Push token saved to database');
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  /**
   * ローカル通知の送信
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data ? { ...data as unknown as Record<string, unknown> } : undefined,
          sound: 'default',
        },
        trigger: null, // 即座に送信
      });
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  /**
   * メッセージ通知
   */
  async notifyNewMessage(
    senderName: string,
    messageContent: string,
    roomId: string,
    messageId: string,
    senderId: string
  ) {
    const data: NotificationData = {
      type: 'message',
      roomId,
      messageId,
      senderId,
      senderName,
      content: messageContent,
    };

    await this.sendLocalNotification(
      `${senderName}からのメッセージ`,
      messageContent.length > 50 
        ? messageContent.substring(0, 50) + '...'
        : messageContent,
      data
    );
  }

  /**
   * リアクション通知
   */
  async notifyNewReaction(
    senderName: string,
    reactionType: string,
    messageContent: string,
    roomId: string,
    messageId: string
  ) {
    const reactionEmojis: Record<string, string> = {
      heart: '❤️',
      smile: '😊',
      lightning: '⚡',
      coffee: '☕',
      star: '⭐',
      like: '👍',
      love: '💕',
      laugh: '😂',
      wow: '😮',
      sad: '😢',
    };

    const emoji = reactionEmojis[reactionType] || '👍';
    const shortContent = messageContent.length > 30 
      ? messageContent.substring(0, 30) + '...'
      : messageContent;

    const data: NotificationData = {
      type: 'reaction',
      roomId,
      messageId,
      reactionType,
      senderName,
    };

    await this.sendLocalNotification(
      `${senderName}がリアクションしました`,
      `${emoji} "${shortContent}"`,
      data
    );
  }

  /**
   * タッチ位置通知
   */
  async notifyTouchPosition(
    senderName: string,
    roomId: string
  ) {
    const data: NotificationData = {
      type: 'touch',
      roomId,
      senderName,
    };

    await this.sendLocalNotification(
      `${senderName}からのタッチ`,
      'タッチ位置が共有されました ✨',
      data
    );
  }

  /**
   * 通知リスナーの設定
   */
  setupNotificationListeners() {
    // 通知がタップされた時の処理
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // アプリがフォアグラウンドの場合の処理
        // 必要に応じてカスタムUI表示など
      }
    );

    // 通知レスポンス（タップ等）の処理
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        const data = response.notification.request.content.data as unknown as NotificationData;
        
        // 通知タイプに応じた画面遷移やアクション
        this.handleNotificationResponse(data);
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  /**
   * 通知レスポンスの処理
   */
  private handleNotificationResponse(data: NotificationData) {
    switch (data.type) {
      case 'message':
        // メッセージ通知 - チャット画面に遷移
        if (data.roomId) {
          // Navigation logic here
          console.log('Navigate to chat room:', data.roomId);
        }
        break;

      case 'reaction':
        // リアクション通知 - 該当メッセージに遷移
        if (data.roomId && data.messageId) {
          // Navigation logic here
          console.log('Navigate to message:', data.messageId);
        }
        break;

      case 'touch':
        // タッチ通知 - チャット画面に遷移
        if (data.roomId) {
          // Navigation logic here
          console.log('Navigate to chat room:', data.roomId);
        }
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  /**
   * バッジ数の設定
   */
  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  /**
   * バッジ数のクリア
   */
  async clearBadgeCount() {
    await this.setBadgeCount(0);
  }

  /**
   * 通知の消去
   */
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.clearBadgeCount();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * プッシュトークンの取得
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * 通知設定の確認
   */
  async getNotificationSettings() {
    const settings = await Notifications.getPermissionsAsync();
    return {
      granted: settings.status === 'granted',
      canAskAgain: settings.canAskAgain,
      expires: settings.expires,
    };
  }

  /**
   * 通知権限の再要求
   */
  async requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
}

// シングルトンインスタンスのエクスポート
export const notificationService = NotificationService.getInstance();