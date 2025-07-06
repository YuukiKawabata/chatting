import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeName } from '../../types';

interface ThemeState {
  currentTheme: ThemeName;
  isDarkMode: boolean;
}

const initialState: ThemeState = {
  currentTheme: 'cute',
  isDarkMode: false,
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeName>) => {
      state.currentTheme = action.payload;
    },
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
  },
});

export const { setTheme, toggleDarkMode, setDarkMode } = themeSlice.actions;