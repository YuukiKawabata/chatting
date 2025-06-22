import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import screens
import { LoginScreen, ChatScreen } from './src/screens';

// Import hooks
import { useAuth } from './src/hooks/useAuth';
import { useTheme } from './src/hooks/useTheme';

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme, isLoading: themeLoading } = useTheme();

  // Show loading screen while initializing
  if (authLoading || themeLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show appropriate screen based on auth state
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {user ? <ChatScreen /> : <LoginScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
