import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated,
  Dimensions 
} from 'react-native';
import { Theme } from '../types';

interface TouchIndicatorProps {
  x: number;
  y: number;
  theme: Theme;
  visible: boolean;
}

export const TouchIndicator: React.FC<TouchIndicatorProps> = ({
  x,
  y,
  theme,
  visible,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x - 20,
          top: y - 20,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]}
      pointerEvents="none"
    >
      <View style={[styles.outerRing, { borderColor: theme.colors.primary }]} />
      <View style={[styles.innerDot, { backgroundColor: theme.colors.primary }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  outerRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    opacity: 0.6,
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.8,
  },
});