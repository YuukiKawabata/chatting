import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Text 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../types';
import { useFileUpload } from '../hooks/useFileUpload';

interface InputAreaProps {
  theme: Theme;
  onSendMessage: (message: string) => void;
  onTyping: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  partnerTyping?: string;
  currentInput?: string;
  roomId?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  theme,
  onSendMessage,
  onTyping,
  placeholder = 'メッセージを入力...',
  disabled = false,
  partnerTyping = '',
  currentInput = '',
  roomId,
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { showUploadOptions, isUploading, uploadProgress } = useFileUpload();

  const handleSendPress = () => {
    if (message.trim() && !disabled) {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Send animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      onSendMessage(message.trim());
      setMessage('');
      onTyping(''); // Stop typing
      
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    onTyping(text);
  };

  const handleSubmitEditing = () => {
    handleSendPress();
  };

  const handleFileUpload = () => {
    if (!roomId || disabled || isUploading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showUploadOptions(roomId);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.card }]}>
      {/* Partner's Input Display */}
      <View style={[styles.inputDisplay, { borderColor: theme.colors.border }]}>
        <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
          相手の入力:
        </Text>
        <View style={styles.inputTextContainer}>
          <Text style={[styles.inputText, { color: theme.colors.text.primary }]}>
            {partnerTyping || '...'}
          </Text>
          {partnerTyping && (
            <View style={[styles.typingIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </View>
      </View>

      {/* Your Input Display */}
      <View style={[styles.inputDisplay, { borderColor: theme.colors.border }]}>
        <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
          あなたの入力:
        </Text>
        <View style={styles.inputTextContainer}>
          <Text style={[styles.inputText, { color: theme.colors.text.primary }]}>
            {currentInput || '...'}
          </Text>
          {currentInput && (
            <View style={[styles.typingIndicator, { backgroundColor: theme.colors.secondary }]} />
          )}
        </View>
      </View>

      {/* Upload Progress Display */}
      {isUploading && uploadProgress && (
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.background.primary }]}>
          <Text style={[styles.progressText, { color: theme.colors.text.primary }]}>
            アップロード中... {uploadProgress.percentage}%
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: theme.colors.primary,
                  width: `${uploadProgress.percentage}%`,
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Input Field */}
      <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
        {/* File Upload Button */}
        <TouchableOpacity
          style={[
            styles.attachButton,
            { 
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border,
            }
          ]}
          onPress={handleFileUpload}
          disabled={disabled || isUploading}
          activeOpacity={0.8}
        >
          <Feather 
            name={isUploading ? "upload-cloud" : "paperclip"} 
            size={20} 
            color={disabled || isUploading ? theme.colors.text.secondary : theme.colors.primary} 
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              backgroundColor: theme.colors.background.primary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border,
              maxHeight: 100, // 入力欄の最大高さを制限
            }
          ]}
          value={message}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.secondary}
          multiline
          maxLength={1000}
          editable={!disabled && !isUploading}
          returnKeyType="send"
          blurOnSubmit={false}
          scrollEnabled={false}
        />
        
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: message.trim() && !disabled && !isUploading
                  ? theme.colors.primary 
                  : theme.colors.text.secondary,
              }
            ]}
            onPress={handleSendPress}
            disabled={!message.trim() || disabled || isUploading}
            activeOpacity={0.8}
          >
            <Feather 
              name="send" 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    maxHeight: 300, // 最大高さを制限
  },
  progressContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  inputDisplay: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  inputText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  typingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    paddingVertical: 8,
    borderWidth: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});