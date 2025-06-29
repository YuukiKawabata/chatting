import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

// アプリケーション用のUser型定義
type AppUser = Database['public']['Tables']['users']['Row'];

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
    // 初期セッション取得
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
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
        const appUser = await fetchUserProfile(session.user.id);
        setAuthState({
          user: appUser,
          session,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('認証状態変更:', event, session?.user?.email);

        if (session?.user) {
          const appUser = await fetchUserProfile(session.user.id);
          setAuthState({
            user: appUser,
            session,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    getInitialSession();

    // クリーンアップ
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ユーザープロファイル取得
  const fetchUserProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('ユーザープロファイル取得エラー:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('プロファイル取得失敗:', error);
      return null;
    }
  };

  // メールアドレスとパスワードでログイン
  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // AuthStateChangeで自動的に状態更新される
      return { user: data.user, session: data.session };
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  // ユーザー登録
  const register = useCallback(async (userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Supabase Authでユーザー作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // usersテーブルにプロファイル情報を保存
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: userData.email,
            username: userData.username,
            display_name: userData.displayName || userData.username,
            theme_preference: 'cute',
          })
          .select()
          .single();

        if (profileError) {
          // プロファイル作成に失敗した場合、認証ユーザーを削除
          console.error('プロファイル作成エラー:', profileError);
          throw profileError;
        }

        return { user: authData.user, session: authData.session, profile: profileData };
      }

      throw new Error('ユーザー作成に失敗しました');
    } catch (error) {
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

  // プロファイル更新
  const updateProfile = useCallback(async (updates: Partial<AppUser>) => {
    if (!authState.user) throw new Error('ユーザーが認証されていません');

    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authState.user.id)
        .select()
        .single();

      if (error) throw error;

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      return updatedUser;
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

  // オンライン状態更新
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!authState.user) return;

    try {
      // user_presenceテーブルを更新
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: authState.user.id,
          status: isOnline ? 'online' : 'offline',
          last_seen: new Date().toISOString(),
        });

      if (error) throw error;

      // usersテーブルのis_onlineも更新
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