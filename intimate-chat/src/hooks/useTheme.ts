import { useState, useEffect, useCallback } from 'react';
import { Theme, ThemeName } from '../types';
import { themes, getTheme } from '../styles/themes';
import * as SecureStore from 'expo-secure-store';

const THEME_STORAGE_KEY = 'selected_theme';

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('cute');
  const [theme, setTheme] = useState<Theme>(themes.cute);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (savedTheme && savedTheme in themes) {
          const themeName = savedTheme as ThemeName;
          setCurrentTheme(themeName);
          setTheme(getTheme(themeName));
        }
      } catch (error) {
        console.error('Failed to load saved theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedTheme();
  }, []);

  const changeTheme = useCallback(async (themeName: ThemeName) => {
    try {
      setCurrentTheme(themeName);
      setTheme(getTheme(themeName));
      
      // Save to storage
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, themeName);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, []);

  const getAvailableThemes = useCallback(() => {
    return Object.keys(themes) as ThemeName[];
  }, []);

  const getThemeByName = useCallback((themeName: ThemeName) => {
    return getTheme(themeName);
  }, []);

  return {
    currentTheme,
    theme,
    isLoading,
    changeTheme,
    getAvailableThemes,
    getThemeByName,
    themes,
  };
};