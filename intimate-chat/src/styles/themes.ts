import { Theme, ThemeName } from '../types';

const createTheme = (baseTheme: Omit<Theme, 'spacing' | 'typography' | 'borderRadius' | 'shadows'>): Theme => ({
  ...baseTheme,
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  typography: {
    heading1: { fontSize: 32, fontWeight: '700', lineHeight: 1.25 },
    heading2: { fontSize: 24, fontWeight: '600', lineHeight: 1.33 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 1.5 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 1.33 },
    message: { fontSize: 16, fontWeight: '400', lineHeight: 1.375 },
  },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  }
});

export const themes: Record<ThemeName, Theme> = {
  cute: createTheme({
    name: '可愛い',
    colors: {
      primary: '#FF6B9D',
      secondary: '#A855F7',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#FFEEF7',
        secondary: '#FDF2F8',
        card: 'rgba(255, 255, 255, 0.85)',
      },
      text: { primary: '#1F2937', secondary: '#6B7280', accent: '#FF6B9D' },
      border: '#F3E8FF',
    }
  }),
  cool: createTheme({
    name: 'クール',
    colors: {
      primary: '#3B82F6',
      secondary: '#06B6D4',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#0F172A',
        secondary: '#1E293B',
        card: 'rgba(51, 65, 85, 0.85)',
      },
      text: { primary: '#F8FAFC', secondary: '#CBD5E1', accent: '#3B82F6' },
      border: '#374151',
    }
  }),
  minimal: createTheme({
    name: 'ミニマル',
    colors: {
      primary: '#374151',
      secondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#F9FAFB',
        secondary: '#F3F4F6',
        card: 'rgba(255, 255, 255, 0.9)',
      },
      text: { primary: '#111827', secondary: '#6B7280', accent: '#374151' },
      border: '#E5E7EB',
    }
  }),
  warm: createTheme({
    name: 'ウォーム',
    colors: {
      primary: '#EA580C',
      secondary: '#D97706',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#FFF7ED',
        secondary: '#FFEDD5',
        card: 'rgba(255, 255, 255, 0.85)',
      },
      text: { primary: '#1F2937', secondary: '#78716C', accent: '#EA580C' },
      border: '#FED7AA',
    }
  }),
};

export const getTheme = (themeName: ThemeName): Theme => themes[themeName];
export const getThemeNames = (): ThemeName[] => Object.keys(themes) as ThemeName[];