import { useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '../types';
import apiService from '../services/apiService';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load user data on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = apiService.getToken();
        if (token) {
          const user = await apiService.getProfile();
          setAuthState({
            user,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false,
          }));
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Clear invalid token
        await apiService.logout();
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user, token } = await apiService.login(email, password);
      setAuthState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
      return { user, token };
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user, token } = await apiService.register(userData);
      setAuthState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
      return { user, token };
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!authState.user) throw new Error('User not authenticated');

    try {
      const updatedUser = await apiService.updateProfile(updates);
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
      return updatedUser;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }, [authState.user]);

  const updateTheme = useCallback(async (theme: string) => {
    if (!authState.user) throw new Error('User not authenticated');

    try {
      const updatedUser = await apiService.updateTheme(theme);
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
      return updatedUser;
    } catch (error) {
      console.error('Theme update failed:', error);
      throw error;
    }
  }, [authState.user]);

  const refreshToken = useCallback(async () => {
    try {
      const { user, token } = await apiService.refreshToken();
      setAuthState(prev => ({
        ...prev,
        user,
        token,
        isAuthenticated: true,
      }));
      return { user, token };
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  }, [logout]);

  return {
    ...authState,
    login,
    register,
    logout,
    updateProfile,
    updateTheme,
    refreshToken,
  };
};