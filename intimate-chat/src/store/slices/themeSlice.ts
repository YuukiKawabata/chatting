import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeType } from '../../types';

interface ThemeState {
  currentTheme: ThemeType;
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
    setTheme: (state, action: PayloadAction<ThemeType>) => {
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