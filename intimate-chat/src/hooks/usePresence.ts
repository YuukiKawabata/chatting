import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { partnerService } from '../services/partnerService';

/**
 * ユーザーのオンライン状態を自動管理するフック
 */
export const usePresence = () => {
  const appStateRef = useRef(AppState.currentState);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateStatus = async (status: 'online' | 'offline' | 'away') => {
    try {
      await partnerService.updateOnlineStatus(status);
      console.log(`Presence updated to: ${status}`);
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  };

  const startHeartbeat = () => {
    // 既存のハートビートをクリア
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // 30秒ごとにオンライン状態を更新
    heartbeatIntervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        updateStatus('online');
      }
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    const previousAppState = appStateRef.current;
    appStateRef.current = nextAppState;

    console.log(`App state changed from ${previousAppState} to ${nextAppState}`);

    switch (nextAppState) {
      case 'active':
        // アプリがアクティブになった
        updateStatus('online');
        startHeartbeat();
        break;
      
      case 'background':
        // アプリがバックグラウンドに移行
        updateStatus('away');
        stopHeartbeat();
        break;
      
      case 'inactive':
        // アプリが非アクティブに（通知センターを開いた時など）
        updateStatus('away');
        break;
    }
  };

  useEffect(() => {
    // 初期状態を設定
    updateStatus('online');
    startHeartbeat();

    // アプリ状態の変化を監視
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // ページを離れる時（Webの場合）やアプリが閉じられる時
    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    // Webブラウザの場合のイベントリスナー
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handleBeforeUnload);
    }

    return () => {
      // クリーンアップ
      subscription.remove();
      stopHeartbeat();
      updateStatus('offline');

      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handleBeforeUnload);
      }
    };
  }, []);

  return {
    updateStatus,
  };
};