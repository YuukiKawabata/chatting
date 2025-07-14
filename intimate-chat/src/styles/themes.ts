import { Theme, ThemeName } from '../types';

const createTheme = (baseTheme: Omit<Theme, 'spacing' | 'typography' | 'borderRadius' | 'shadows'>): Theme => ({
  ...baseTheme,
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  typography: {
    heading1: { fontSize: 34, fontWeight: '800', lineHeight: 1.2 },
    heading2: { fontSize: 26, fontWeight: '700', lineHeight: 1.3 },
    body: { fontSize: 17, fontWeight: '400', lineHeight: 1.5 },
    caption: { fontSize: 13, fontWeight: '500', lineHeight: 1.4 },
    message: { fontSize: 17, fontWeight: '400', lineHeight: 1.4 },
  },
  borderRadius: { sm: 12, md: 16, lg: 20, xl: 24, full: 9999 },
  shadows: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 8px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
  }
});

export const themes: Record<ThemeName, Theme> = {
  cute: createTheme({
    name: '可愛い',
    colors: {
      primary: '#FF6B9D',
      secondary: '#FF9ECD',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#FFEEF7',
        secondary: '#FDF2F8',
        card: 'rgba(255, 255, 255, 0.95)',
      },
      text: { primary: '#1F2937', secondary: '#6B7280', accent: '#FF6B9D' },
      border: '#F3E8FF',
    }
  }),
  cool: createTheme({
    name: 'クール',
    colors: {
      primary: '#3B82F6',
      secondary: '#60A5FA',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#0F172A',
        secondary: '#1E293B',
        card: 'rgba(51, 65, 85, 0.95)',
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
        card: 'rgba(255, 255, 255, 0.98)',
      },
      text: { primary: '#111827', secondary: '#6B7280', accent: '#374151' },
      border: '#E5E7EB',
    }
  }),
  warm: createTheme({
    name: 'ウォーム',
    colors: {
      primary: '#EA580C',
      secondary: '#FB923C',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#FFF7ED',
        secondary: '#FFEDD5',
        card: 'rgba(255, 255, 255, 0.95)',
      },
      text: { primary: '#1F2937', secondary: '#78716C', accent: '#EA580C' },
      border: '#FED7AA',
    }
  }),
  romantic: createTheme({
    name: 'ロマンティック',
    colors: {
      primary: '#EC4899',
      secondary: '#F472B6',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 50%, #FFEEF7 100%)',
        secondary: '#FDF2F8',
        card: 'rgba(255, 255, 255, 0.95)',
      },
      text: { primary: '#1F2937', secondary: '#831843', accent: '#EC4899' },
      border: '#F9A8D4',
    }
  }),
  galaxy: createTheme({
    name: 'ギャラクシー',
    colors: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: 'linear-gradient(135deg, #0C0A09 0%, #1C1917 30%, #312E81 100%)',
        secondary: '#1E1B4B',
        card: 'rgba(75, 85, 99, 0.95)',
      },
      text: { primary: '#F3F4F6', secondary: '#A78BFA', accent: '#8B5CF6' },
      border: '#4C1D95',
    }
  }),
  forest: createTheme({
    name: 'フォレスト',
    colors: {
      primary: '#16A34A',
      secondary: '#22C55E',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: '#F0FDF4',
        secondary: '#DCFCE7',
        card: 'rgba(255, 255, 255, 0.95)',
      },
      text: { primary: '#14532D', secondary: '#166534', accent: '#16A34A' },
      border: '#BBF7D0',
    }
  }),
  sunset: createTheme({
    name: 'サンセット',
    colors: {
      primary: '#F97316',
      secondary: '#FB923C',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      background: {
        primary: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FED7AA 100%)',
        secondary: '#FFEDD5',
        card: 'rgba(255, 255, 255, 0.95)',
      },
      text: { primary: '#9A3412', secondary: '#C2410C', accent: '#F97316' },
      border: '#FB923C',
    }
  }),
};

export const getTheme = (themeName: ThemeName): Theme => themes[themeName];
export const getThemeNames = (): ThemeName[] => Object.keys(themes) as ThemeName[];