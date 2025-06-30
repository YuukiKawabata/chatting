import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

// アプリケーション用のUser型定義（auth.usersベース）
type AppUser = User;

interface AuthState {
  user: AppUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // セッション状態の監視
  useEffect(() => {
    let mounted = true;

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 認証状態変更:', {
          event,
          userEmail: session?.user?.email || 'no user',
          userId: session?.user?.id || 'no id',
          mounted
        });

        if (!mounted) {
          console.log('⚠️ コンポーネントがアンマウント済み - 状態更新をスキップ');
          return;
        }

        if (session?.user) {
          console.log('✅ ユーザー認証成功 - 状態を更新');
          setAuthState({
            user: session.user,
            session,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          console.log('❌ ユーザー未認証 - 状態をクリア');
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    // 初期セッション取得
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('セッション取得エラー:', error);
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
          return;
        }

        if (session?.user) {
          console.log('初期セッション取得成功:', session.user.email);
          setAuthState({
            user: session.user,
            session,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          console.log('初期セッション無し');
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('初期セッション取得失敗:', error);
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    getInitialSession();

    // クリーンアップ
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // auth.usersベースなので、fetchUserProfileは不要
  // ユーザー情報はsession.userに含まれています

  // メールアドレスとパスワードでログイン
  const login = useCallback(async (email: string, password: string) => {
    console.log('🔐 ログイン試行開始:', email);
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ ログイン失敗:', error.message);
        throw error;
      }

      console.log('✅ ログイン成功:', data.user?.email);
      // AuthStateChangeで自動的に状態更新される
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('❌ ログイン例外:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  // ユーザー登録（シンプル版 - auth.usersのみ使用）
  const register = useCallback(async (userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => {
    console.log('📝 新規登録試行開始:', userData.email, userData.username);
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Supabase Authでユーザー作成 + メタデータ保存
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            display_name: userData.displayName || userData.username,
            theme_preference: 'cute'
          },
          // 開発環境ではメール確認をスキップ（本番では削除）
          emailRedirectTo: undefined
        }
      });

      if (authError) {
        console.error('❌ 新規登録失敗:', authError.message);
        throw authError;
      }

      console.log('✅ 認証ユーザー作成成功:', {
        userId: authData.user?.id,
        email: authData.user?.email,
        hasSession: !!authData.session,
        userConfirmedAt: authData.user?.email_confirmed_at,
        userRole: authData.user?.role,
        sessionAccessToken: authData.session?.access_token ? 'あり' : 'なし'
      });

      // メール確認が必要かチェック
      if (authData.user && !authData.session) {
        console.log('⚠️ ユーザー作成済みだが、セッションなし（メール確認が必要な可能性）');
        
        // 開発環境では手動でログインを試行
        if (__DEV__) {
          console.log('🔄 開発環境 - 自動ログイン試行...');
          try {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: userData.email,
              password: userData.password,
            });
            
            if (loginData.session) {
              console.log('✅ 開発環境 - 自動ログイン成功');
              return { user: loginData.user, session: loginData.session };
            } else {
              console.log('❌ 開発環境 - 自動ログイン失敗（メール確認が必要）');
            }
          } catch (devLoginError) {
            console.log('❌ 開発環境 - 自動ログイン例外:', devLoginError);
          }
        }
      }
      
      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('❌ 新規登録例外:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  // ログアウト
  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // AuthStateChangeで自動的に状態更新される
    } catch (error) {
      console.error('ログアウト失敗:', error);
      // エラーでも状態をリセット
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  }, []);

  // プロファイル更新（auth.usersのメタデータ更新）
  const updateProfile = useCallback(async (updates: any) => {
    if (!authState.user) throw new Error('ユーザーが認証されていません');

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...authState.user.user_metadata,
          ...updates
        }
      });

      if (error) throw error;

      setAuthState(prev => ({
        ...prev,
        user: data.user,
      }));

      return data.user;
    } catch (error) {
      console.error('プロファイル更新失敗:', error);
      throw error;
    }
  }, [authState.user]);

  // テーマ更新
  const updateTheme = useCallback(async (theme: string) => {
    if (!authState.user) throw new Error('ユーザーが認証されていません');

    try {
      const updatedUser = await updateProfile({ theme_preference: theme });
      return updatedUser;
    } catch (error) {
      console.error('テーマ更新失敗:', error);
      throw error;
    }
  }, [authState.user, updateProfile]);

  // オンライン状態更新（レート制限対応）
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!authState.user) return;
    
    // レート制限を避けるため、頻繁な更新を制限
    console.log('⚠️ オンライン状態更新は一時的に無効化（Rate Limit対策）');
    return;

    try {
      await updateProfile({ 
        is_online: isOnline,
        last_seen_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('オンライン状態更新失敗:', error);
    }
  }, [authState.user, updateProfile]);

  // パスワードリセット
  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'com.yourapp.intimatechat://reset-password',
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('パスワードリセット失敗:', error);
      throw error;
    }
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
    updateProfile,
    updateTheme,
    updateOnlineStatus,
    resetPassword,
    // ヘルパー関数
    getCurrentUser: () => authState.user,
    getCurrentSession: () => authState.session,
    getUserId: () => authState.user?.id || null,
  };
};