import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

export const ExpoGoNotice: React.FC = () => {
  if (!isExpoGo) return null;

  const handleOpenDocs = () => {
    Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        style={styles.notice}
      >
        <View style={styles.iconContainer}>
          <Feather name="alert-triangle" size={24} color="#FFFFFF" />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>Expo Go 制限事項</Text>
          <Text style={styles.description}>
            プッシュ通知機能はExpo Goでは利用できません。完全な機能を体験するには開発ビルドをご利用ください。
          </Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenDocs}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>開発ビルドについて</Text>
            <Feather name="external-link" size={16} color="#D97706" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {/* 閉じる処理は親コンポーネントで実装 */}}
        >
          <Feather name="x" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D97706',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});