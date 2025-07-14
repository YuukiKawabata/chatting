import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

type AuthMode = 'login' | 'register';

export const LoginScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, register, isLoading, resetPassword } = useAuth();
  const { theme, currentTheme } = useTheme();

  const handleAuth = async () => {
    if (authMode === 'login') {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await login(formData.email.trim(), formData.password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Supabaseエラーメッセージの日本語化
      let errorMessage = 'ログインに失敗しました';
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'メールアドレスの確認が必要です';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください';
      }
      
      Alert.alert('ログインエラー', errorMessage);
    }
  };

  const handleRegister = async () => {
    // バリデーション
    if (!formData.email.trim() || !formData.password.trim() || !formData.username.trim()) {
      Alert.alert('エラー', '必須項目をすべて入力してください');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return;
    }

    if (formData.username.length < 3) {
      Alert.alert('エラー', 'ユーザー名は3文字以上で入力してください');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await register({
        email: formData.email.trim(),
        password: formData.password,
        username: formData.username.trim(),
        displayName: formData.displayName.trim() || formData.username.trim(),
      });
      
      console.log('📝 登録結果:', {
        hasUser: !!result.user,
        hasSession: !!result.session,
        userConfirmed: result.user?.email_confirmed_at
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (result.user && !result.session) {
        // メール確認が必要な場合
        Alert.alert(
          '登録完了', 
          'アカウントが作成されました。\n確認メールをお送りしましたので、メール内のリンクをクリックしてアカウントを有効化してください。\n\n開発中のため、メール確認を無効化することも可能です。',
          [{ text: 'OK' }]
        );
      } else if (result.session) {
        // 即座にログイン状態になる場合
        Alert.alert(
          '登録完了', 
          'アカウントが正常に作成され、ログインしました！',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Supabaseエラーメッセージの日本語化
      let errorMessage = 'アカウント作成に失敗しました';
      if (error.message?.includes('User already registered')) {
        errorMessage = 'このメールアドレスは既に登録されています';
      } else if (error.message?.includes('Password should be at least 6 characters')) {
        errorMessage = 'パスワードは6文字以上で設定してください';
      } else if (error.message?.includes('duplicate key value violates unique constraint')) {
        errorMessage = 'このユーザー名は既に使用されています';
      }
      
      Alert.alert('登録エラー', errorMessage);
    }
  };

  const handlePasswordReset = () => {
    if (!formData.email.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    Alert.alert(
      'パスワードリセット',
      `${formData.email} にパスワードリセットのメールを送信しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '送信',
          onPress: async () => {
            try {
              await resetPassword(formData.email.trim());
              Alert.alert(
                '送信完了',
                'パスワードリセットのメールを送信しました。メールをご確認ください。'
              );
            } catch (error: any) {
              Alert.alert('エラー', 'パスワードリセットメールの送信に失敗しました');
            }
          },
        },
      ]
    );
  };

  const toggleAuthMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    // フォームをリセット
    setFormData({
      email: '',
      password: '',
      username: '',
      displayName: '',
      confirmPassword: '',
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const togglePasswordVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmPassword(!showConfirmPassword);
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <StatusBar 
        barStyle={currentTheme === 'cool' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background.primary}
      />
      
      <LinearGradient
        colors={[
          theme.colors.background.primary,
          theme.colors.background.secondary || theme.colors.background.primary,
        ]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  style={styles.logo}
                >
                  <Feather name="heart" size={32} color="#FFFFFF" />
                </LinearGradient>
                
                <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                  Intimate Chat
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                  親密なリアルタイムチャット
                </Text>
              </View>

              {/* Auth Form */}
              <View style={[styles.form, { backgroundColor: theme.colors.background.card }]}>
                {/* Mode Switcher */}
                <View style={styles.modeSwitcher}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      authMode === 'login' && { backgroundColor: theme.colors.primary + '20' }
                    ]}
                    onPress={() => authMode !== 'login' && toggleAuthMode()}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      { color: authMode === 'login' ? theme.colors.primary : theme.colors.text.secondary }
                    ]}>
                      ログイン
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      authMode === 'register' && { backgroundColor: theme.colors.primary + '20' }
                    ]}
                    onPress={() => authMode !== 'register' && toggleAuthMode()}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      { color: authMode === 'register' ? theme.colors.primary : theme.colors.text.secondary }
                    ]}>
                      新規登録
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                    メールアドレス*
                  </Text>
                  <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
                    <Feather 
                      name="mail" 
                      size={20} 
                      color={theme.colors.text.secondary} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text.primary }]}
                      value={formData.email}
                      onChangeText={(value) => updateFormData('email', value)}
                      placeholder="example@email.com"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Username Input (Register only) */}
                {authMode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                      ユーザー名*
                    </Text>
                    <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
                      <Feather 
                        name="user" 
                        size={20} 
                        color={theme.colors.text.secondary} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text.primary }]}
                        value={formData.username}
                        onChangeText={(value) => updateFormData('username', value)}
                        placeholder="ユーザー名 (3文字以上)"
                        placeholderTextColor={theme.colors.text.secondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                        maxLength={20}
                      />
                    </View>
                  </View>
                )}

                {/* Display Name Input (Register only) */}
                {authMode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                      表示名
                    </Text>
                    <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
                      <Feather 
                        name="edit-3" 
                        size={20} 
                        color={theme.colors.text.secondary} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text.primary }]}
                        value={formData.displayName}
                        onChangeText={(value) => updateFormData('displayName', value)}
                        placeholder="表示名 (省略可)"
                        placeholderTextColor={theme.colors.text.secondary}
                        editable={!isLoading}
                        maxLength={30}
                      />
                    </View>
                  </View>
                )}

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                    パスワード*
                  </Text>
                  <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
                    <Feather 
                      name="lock" 
                      size={20} 
                      color={theme.colors.text.secondary} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text.primary }]}
                      value={formData.password}
                      onChangeText={(value) => updateFormData('password', value)}
                      placeholder={authMode === 'register' ? "パスワード (6文字以上)" : "パスワード"}
                      placeholderTextColor={theme.colors.text.secondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      style={styles.eyeButton}
                      disabled={isLoading}
                    >
                      <Feather 
                        name={showPassword ? 'eye-off' : 'eye'} 
                        size={20} 
                        color={theme.colors.text.secondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input (Register only) */}
                {authMode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                      パスワード確認*
                    </Text>
                    <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
                      <Feather 
                        name="lock" 
                        size={20} 
                        color={theme.colors.text.secondary} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text.primary }]}
                        value={formData.confirmPassword}
                        onChangeText={(value) => updateFormData('confirmPassword', value)}
                        placeholder="パスワードを再入力"
                        placeholderTextColor={theme.colors.text.secondary}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={toggleConfirmPasswordVisibility}
                        style={styles.eyeButton}
                        disabled={isLoading}
                      >
                        <Feather 
                          name={showConfirmPassword ? 'eye-off' : 'eye'} 
                          size={20} 
                          color={theme.colors.text.secondary} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { 
                      backgroundColor: isLoading ? theme.colors.text.secondary : theme.colors.primary,
                      opacity: isLoading ? 0.7 : 1,
                    }
                  ]}
                  onPress={handleAuth}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isLoading 
                        ? [theme.colors.text.secondary, theme.colors.text.secondary]
                        : [theme.colors.primary, theme.colors.secondary]
                    }
                    style={styles.actionButtonGradient}
                  >
                    <Text style={styles.actionButtonText}>
                      {isLoading 
                        ? (authMode === 'login' ? 'ログイン中...' : '登録中...')
                        : (authMode === 'login' ? 'ログイン' : 'アカウント作成')
                      }
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Password Reset (Login only) */}
                {authMode === 'login' && (
                  <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={handlePasswordReset}
                    disabled={isLoading}
                  >
                    <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                      パスワードを忘れた場合
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Demo Info (Login only) */}
              {authMode === 'login' && (
                <View style={[styles.demoInfo, { backgroundColor: theme.colors.background.card }]}>
                  <Text style={[styles.demoTitle, { color: theme.colors.text.primary }]}>
                    デモアカウント
                  </Text>
                  <Text style={[styles.demoText, { color: theme.colors.text.secondary }]}>
                    Email: demo@example.com{'\n'}
                    Password: password
                  </Text>
                  <TouchableOpacity
                    style={styles.useDemoButton}
                    onPress={() => {
                      updateFormData('email', 'demo@example.com');
                      updateFormData('password', 'password');
                    }}
                  >
                    <Text style={[styles.useDemoText, { color: theme.colors.primary }]}>
                      デモアカウントを使用
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Background Decorations */}
        <View 
          style={[
            styles.backgroundDecoration1,
            { backgroundColor: theme.colors.primary + '20' }
          ]} 
        />
        <View 
          style={[
            styles.backgroundDecoration2,
            { backgroundColor: theme.colors.secondary + '20' }
          ]} 
        />
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
  },
  form: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 6,
    marginBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: '100%',
    textAlignVertical: 'center',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  demoInfo: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  useDemoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  useDemoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  backgroundDecoration1: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.08,
  },
  backgroundDecoration2: {
    position: 'absolute',
    bottom: 50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.08,
  },
});