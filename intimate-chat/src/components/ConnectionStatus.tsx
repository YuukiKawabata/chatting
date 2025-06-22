import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated 
} from 'react-native';
import { Theme } from '../types';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  theme: Theme;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  theme,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConnected) {
      // Connected pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else if (isConnecting) {
      // Connecting fade animation
      const fade = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      fade.start();
      return () => fade.stop();
    }
  }, [isConnected, isConnecting, pulseAnim, fadeAnim]);

  const getStatusText = () => {
    if (isConnecting) return '接続中...';
    if (isConnected) return 'リアルタイム接続中';
    return '接続待機中';
  };

  const getStatusColor = () => {
    if (isConnecting) return '#F59E0B'; // Warning color
    if (isConnected) return theme.colors.success;
    return '#6B7280'; // Gray
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      <Animated.View 
        style={[
          styles.indicator,
          {
            backgroundColor: '#FFFFFF',
            transform: [{ scale: isConnected ? pulseAnim : 1 }],
            opacity: isConnecting ? fadeAnim : 1,
          }
        ]} 
      />
      <Text style={styles.statusText}>
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});