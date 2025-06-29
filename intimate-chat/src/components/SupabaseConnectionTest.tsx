import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export const SupabaseConnectionTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (index: number, status: TestResult['status'], message: string, details?: any) => {
    setResults(prev => prev.map((result, i) => 
      i === index ? { ...result, status, message, details } : result
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    const tests: Omit<TestResult, 'status' | 'message' | 'details'>[] = [
      { test: 'Supabase URL設定確認' },
      { test: 'Supabase Anon Key設定確認' },
      { test: 'Supabaseクライアント初期化' },
      { test: 'データベース接続テスト' },
      { test: 'Authサービステスト' },
      { test: 'Realtimeサービステスト' },
      { test: 'Storageサービステスト' },
    ];

    // テスト結果を初期化
    setResults(tests.map(test => ({ ...test, status: 'pending', message: '実行中...' })));

    try {
      // 1. Supabase URL設定確認
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && supabaseUrl !== 'https://your-project-ref.supabase.co') {
        updateResult(0, 'success', `URL設定済み: ${supabaseUrl}`);
      } else {
        updateResult(0, 'error', 'Supabase URLが設定されていません');
        setIsRunning(false);
        return;
      }

      // 2. Supabase Anon Key設定確認  
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseKey && supabaseKey !== 'your-anon-key-here') {
        updateResult(1, 'success', `Anon Key設定済み: ${supabaseKey.slice(0, 20)}...`);
      } else {
        updateResult(1, 'error', 'Supabase Anon Keyが設定されていません');
        setIsRunning(false);
        return;
      }

      // 3. Supabaseクライアント初期化
      try {
        if (supabase) {
          updateResult(2, 'success', 'Supabaseクライアント正常に初期化');
        } else {
          updateResult(2, 'error', 'Supabaseクライアント初期化失敗');
          setIsRunning(false);
          return;
        }
      } catch (error: any) {
        updateResult(2, 'error', `初期化エラー: ${error.message}`);
        setIsRunning(false);
        return;
      }

      // 4. データベース接続テスト
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        if (error) {
          updateResult(3, 'error', `DB接続エラー: ${error.message}`, error);
        } else {
          updateResult(3, 'success', 'データベース接続成功', data);
        }
      } catch (error: any) {
        updateResult(3, 'error', `DB接続例外: ${error.message}`, error);
      }

      // 5. Authサービステスト
      try {
        const { data: session, error } = await supabase.auth.getSession();
        
        if (error) {
          updateResult(4, 'error', `Auth エラー: ${error.message}`, error);
        } else {
          updateResult(4, 'success', `Auth サービス正常 (セッション: ${session.session ? 'あり' : 'なし'})`, session);
        }
      } catch (error: any) {
        updateResult(4, 'error', `Auth 例外: ${error.message}`, error);
      }

      // 6. Realtimeサービステスト
      try {
        const channel = supabase.channel('test-connection-' + Date.now());
        let isCompleted = false;
        
        // チャンネル作成テスト
        const subscriptionPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (!isCompleted) {
              isCompleted = true;
              updateResult(5, 'error', 'Realtime 接続タイムアウト (5秒)', {
                reason: 'WebSocket接続が5秒以内に確立されませんでした',
                suggestions: [
                  'インターネット接続を確認してください',
                  'Supabaseプロジェクトの設定を確認してください',
                  'ファイアウォールやプロキシ設定を確認してください'
                ]
              });
              supabase.removeChannel(channel);
              reject(new Error('Timeout'));
            }
          }, 5000);

          channel.subscribe((status, err) => {
            if (isCompleted) return;

            console.log('Realtime status:', status, err);
            
            if (status === 'SUBSCRIBED') {
              isCompleted = true;
              clearTimeout(timeout);
              updateResult(5, 'success', 'Realtime サービス接続成功', {
                status: 'SUBSCRIBED',
                channel: channel.topic,
                connectionTime: Date.now()
              });
              supabase.removeChannel(channel);
              resolve();
            } else if (status === 'CLOSED') {
              isCompleted = true;
              clearTimeout(timeout);
              updateResult(5, 'error', 'Realtime 接続が閉じられました', {
                status: 'CLOSED',
                error: err,
                suggestions: [
                  'ネットワーク接続を確認してください',
                  'Supabaseプロジェクトが有効か確認してください'
                ]
              });
              reject(err || new Error('Connection closed'));
            } else if (status === 'CHANNEL_ERROR') {
              isCompleted = true;
              clearTimeout(timeout);
              updateResult(5, 'error', 'Realtime チャンネルエラー', {
                status: 'CHANNEL_ERROR',
                error: err,
                suggestions: [
                  'Supabaseプロジェクトの設定を確認してください',
                  'API Keyが正しいか確認してください'
                ]
              });
              reject(err || new Error('Channel error'));
            } else if (status === 'TIMED_OUT') {
              isCompleted = true;
              clearTimeout(timeout);
              updateResult(5, 'error', 'Realtime 接続タイムアウト (サーバー側)', {
                status: 'TIMED_OUT',
                error: err,
                suggestions: [
                  'サーバーの応答時間が遅い可能性があります',
                  'しばらく待ってから再試行してください'
                ]
              });
              reject(err || new Error('Server timeout'));
            }
          });
        });

        await subscriptionPromise;
      } catch (error: any) {
        if (!error.message?.includes('Timeout')) {
          updateResult(5, 'error', `Realtime 例外: ${error.message}`, {
            error: error,
            stack: error.stack,
            suggestions: [
              'コンソールログで詳細なエラー情報を確認してください',
              'Supabase Realtime機能が有効になっているか確認してください'
            ]
          });
        }
      }

      // 7. Storageサービステスト
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          updateResult(6, 'error', `Storage エラー: ${error.message}`, error);
        } else {
          updateResult(6, 'success', `Storage サービス正常 (バケット数: ${buckets?.length || 0})`, buckets);
        }
      } catch (error: any) {
        updateResult(6, 'error', `Storage 例外: ${error.message}`, error);
      }

    } catch (error: any) {
      Alert.alert('テストエラー', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'check-circle';
      case 'error': return 'x-circle';
      case 'pending': return 'clock';
      default: return 'help-circle';
    }
  };

  const showDetails = (result: TestResult) => {
    if (result.details) {
      Alert.alert(
        `${result.test} - 詳細`,
        JSON.stringify(result.details, null, 2),
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#06B6D4']}
        style={styles.header}
      >
        <Feather name="database" size={24} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Supabase 接続テスト</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Supabaseサービスとの接続状態を確認します。
        </Text>

        <TouchableOpacity
          style={[styles.runButton, { opacity: isRunning ? 0.7 : 1 }]}
          onPress={runTests}
          disabled={isRunning}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.runButtonGradient}
          >
            <Feather 
              name={isRunning ? "loader" : "play"} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.runButtonText}>
              {isRunning ? 'テスト実行中...' : 'テスト開始'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {results.map((result, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.resultItem,
              { borderLeftColor: getStatusColor(result.status) }
            ]}
            onPress={() => showDetails(result)}
            disabled={!result.details}
          >
            <View style={styles.resultHeader}>
              <Feather 
                name={getStatusIcon(result.status) as any} 
                size={20} 
                color={getStatusColor(result.status)} 
              />
              <Text style={styles.resultTitle}>{result.test}</Text>
            </View>
            <Text 
              style={[
                styles.resultMessage,
                { color: getStatusColor(result.status) }
              ]}
            >
              {result.message}
            </Text>
            {result.details && (
              <Text style={styles.detailsHint}>タップで詳細表示</Text>
            )}
          </TouchableOpacity>
        ))}

        {results.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>テスト結果サマリー</Text>
            <Text style={styles.summaryText}>
              成功: {results.filter(r => r.status === 'success').length} / {results.length}
            </Text>
            <Text style={styles.summaryText}>
              失敗: {results.filter(r => r.status === 'error').length} / {results.length}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 16,
    lineHeight: 20,
  },
  runButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  runButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  resultMessage: {
    fontSize: 14,
    marginLeft: 28,
    marginBottom: 4,
  },
  detailsHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 28,
    fontStyle: 'italic',
  },
  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
});