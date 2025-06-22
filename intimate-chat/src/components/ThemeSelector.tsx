import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemeName, Theme } from '../types';
import { themes } from '../styles/themes';

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  theme: Theme;
  onThemeChange: (themeName: ThemeName) => void;
  visible: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  theme,
  onThemeChange,
  visible,
}) => {
  if (!visible) return null;

  const handleThemePress = (themeName: ThemeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onThemeChange(themeName);
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.background.card,
      borderColor: theme.colors.border 
    }]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        テーマを選択
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.themesContainer}
      >
        {Object.entries(themes).map(([key, themeOption]) => {
          const themeName = key as ThemeName;
          const isSelected = currentTheme === themeName;
          
          return (
            <TouchableOpacity
              key={themeName}
              style={[
                styles.themeButton,
                {
                  backgroundColor: isSelected 
                    ? themeOption.colors.primary 
                    : 'transparent',
                  borderColor: isSelected 
                    ? themeOption.colors.primary 
                    : theme.colors.border,
                }
              ]}
              onPress={() => handleThemePress(themeName)}
              activeOpacity={0.8}
            >
              {/* Theme Preview */}
              <View style={styles.themePreview}>
                <View 
                  style={[
                    styles.previewPrimary,
                    { backgroundColor: themeOption.colors.primary }
                  ]} 
                />
                <View 
                  style={[
                    styles.previewSecondary,
                    { backgroundColor: themeOption.colors.secondary }
                  ]} 
                />
                <View 
                  style={[
                    styles.previewBackground,
                    { backgroundColor: themeOption.colors.background.primary }
                  ]} 
                />
              </View>
              
              <Text 
                style={[
                  styles.themeName,
                  {
                    color: isSelected ? '#FFFFFF' : theme.colors.text.primary,
                    fontWeight: isSelected ? '600' : '400',
                  }
                ]}
              >
                {themeOption.name}
              </Text>
              
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  themesContainer: {
    gap: 12,
    paddingHorizontal: 4,
  },
  themeButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 80,
    position: 'relative',
  },
  themePreview: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  previewPrimary: {
    width: 12,
    height: 12,
  },
  previewSecondary: {
    width: 8,
    height: 12,
  },
  previewBackground: {
    width: 8,
    height: 12,
  },
  themeName: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});