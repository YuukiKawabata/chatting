import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import screens
import { LoginScreen, ChatScreen, HomeScreen } from './src/screens';

// Import hooks
import { useAuth } from './src/hooks/useAuth';
import { useTheme } from './src/hooks/useTheme';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'chat'>('home');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();

  console.log('App.tsx - 認証状態:', { user: !!user, authLoading, userId: user?.id });

  // Show loading screen while auth is initializing
  if (authLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
          <StatusBar style="auto" />
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Handle room joining from HomeScreen
  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentScreen('chat');
  };

  // Handle back to home from ChatScreen
  const handleBackToHome = () => {
    setCurrentScreen('home');
    setCurrentRoomId(null);
  };

  // Show appropriate screen based on auth state
  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <LoginScreen />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Authenticated user screens
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        {currentScreen === 'home' ? (
          <HomeScreen onJoinRoom={handleJoinRoom} />
        ) : (
          <ChatScreen 
            roomId={currentRoomId} 
            onBackToHome={handleBackToHome} 
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
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
    padding: 20,
  },
});
