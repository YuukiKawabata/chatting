import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { notificationService } from '../services/notificationService';
import { useAuth } from './useAuth';

// Expo Goかどうかを確認
const isExpoGo = Constants.appOwnership === 'expo';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  // 通知サービスの初期化
  useEffect(() => {
    if (user && !isInitialized) {
      initializeNotifications();
    }
  }, [user, isInitialized]);

  // アプリステートの監視
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // アプリがフォアグラウンドに戻った時
        handleAppForeground();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // アプリがバックグラウンドに移った時
        handleAppBackground();
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initializeNotifications = async () => {
    try {
      const success = await notificationService.initialize();
      setHasPermission(success);
      setIsInitialized(true);

      if (success) {
        // 通知リスナーの設定
        const removeListeners = notificationService.setupNotificationListeners();
        
        return () => {
          removeListeners();
        };
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setIsInitialized(true);
      setHasPermission(false);
    }
  };

  const handleAppForeground = async () => {
    // アプリがフォアグラウンドに戻った時にバッジをクリア
    await notificationService.clearBadgeCount();
    setBadgeCount(0);
  };

  const handleAppBackground = () => {
    // アプリがバックグラウンドに移った時の処理
    console.log('App moved to background');
  };

  // メッセージ通知の送信
  const notifyNewMessage = async (
    senderName: string,
    messageContent: string,
    roomId: string,
    messageId: string,
    senderId: string
  ) => {
    if (!hasPermission || appState.current === 'active' || isExpoGo) return;

    await notificationService.notifyNewMessage(
      senderName,
      messageContent,
      roomId,
      messageId,
      senderId
    );

    // バッジカウントを増加
    const newCount = badgeCount + 1;
    setBadgeCount(newCount);
    await notificationService.setBadgeCount(newCount);
  };

  // リアクション通知の送信
  const notifyNewReaction = async (
    senderName: string,
    reactionType: string,
    messageContent: string,
    roomId: string,
    messageId: string
  ) => {
    if (!hasPermission || appState.current === 'active' || isExpoGo) return;

    await notificationService.notifyNewReaction(
      senderName,
      reactionType,
      messageContent,
      roomId,
      messageId
    );
  };

  // タッチ位置通知の送信
  const notifyTouchPosition = async (
    senderName: string,
    roomId: string
  ) => {
    if (!hasPermission || appState.current === 'active' || isExpoGo) return;

    await notificationService.notifyTouchPosition(senderName, roomId);
  };

  // 通知権限の再要求
  const requestPermissions = async () => {
    const granted = await notificationService.requestPermissions();
    setHasPermission(granted);
    return granted;
  };

  // 通知設定の確認
  const getNotificationSettings = async () => {
    return await notificationService.getNotificationSettings();
  };

  // バッジ数のクリア
  const clearBadgeCount = async () => {
    setBadgeCount(0);
    await notificationService.clearBadgeCount();
  };

  // 全通知のクリア
  const clearAllNotifications = async () => {
    await notificationService.clearAllNotifications();
    setBadgeCount(0);
  };

  // プッシュトークンの取得
  const getExpoPushToken = () => {
    return notificationService.getExpoPushToken();
  };

  return {
    isInitialized,
    hasPermission,
    badgeCount,
    notifyNewMessage,
    notifyNewReaction,
    notifyTouchPosition,
    requestPermissions,
    getNotificationSettings,
    clearBadgeCount,
    clearAllNotifications,
    getExpoPushToken,
  };
};