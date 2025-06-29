import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface UploadedFile {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class FileUploadService {
  private static instance: FileUploadService;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly ALLOWED_FILE_TYPES = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * 画像の選択とアップロード
   */
  async pickAndUploadImage(
    roomId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile | null> {
    try {
      // 権限の確認
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'ギャラリーへのアクセス権限が必要です');
        return null;
      }

      // 画像の選択
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      
      // ファイルサイズチェック
      if (asset.fileSize && asset.fileSize > this.MAX_FILE_SIZE) {
        Alert.alert('ファイルサイズエラー', 'ファイルサイズは10MB以下にしてください');
        return null;
      }

      // アップロード実行
      return await this.uploadFile(asset.uri, roomId, 'image', onProgress);
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('アップロードエラー', '画像のアップロードに失敗しました');
      return null;
    }
  }

  /**
   * カメラで写真を撮影してアップロード
   */
  async takePhotoAndUpload(
    roomId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile | null> {
    try {
      // 権限の確認
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'カメラへのアクセス権限が必要です');
        return null;
      }

      // 写真の撮影
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];

      // アップロード実行
      return await this.uploadFile(asset.uri, roomId, 'image', onProgress);
    } catch (error) {
      console.error('Camera upload failed:', error);
      Alert.alert('アップロードエラー', '写真のアップロードに失敗しました');
      return null;
    }
  }

  /**
   * ドキュメントの選択とアップロード
   */
  async pickAndUploadDocument(
    roomId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile | null> {
    try {
      // ドキュメントの選択
      const result = await DocumentPicker.getDocumentAsync({
        type: this.ALLOWED_FILE_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];

      // ファイルサイズチェック
      if (asset.size && asset.size > this.MAX_FILE_SIZE) {
        Alert.alert('ファイルサイズエラー', 'ファイルサイズは10MB以下にしてください');
        return null;
      }

      // ファイルタイプチェック
      if (asset.mimeType && !this.ALLOWED_FILE_TYPES.includes(asset.mimeType)) {
        Alert.alert('ファイル形式エラー', 'サポートされていないファイル形式です');
        return null;
      }

      // アップロード実行
      return await this.uploadFile(asset.uri, roomId, 'file', onProgress);
    } catch (error) {
      console.error('Document upload failed:', error);
      Alert.alert('アップロードエラー', 'ファイルのアップロードに失敗しました');
      return null;
    }
  }

  /**
   * ファイルのアップロード実行
   */
  private async uploadFile(
    uri: string,
    roomId: string,
    type: 'image' | 'file',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile | null> {
    try {
      // ファイル情報の取得
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // ファイル名の生成
      const fileName = this.generateFileName(uri, type);
      const filePath = `${roomId}/${type}s/${fileName}`;

      // ファイルの読み込み
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Base64からArrayBufferに変換
      const byteCharacters = atob(fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // プログレス追跡のためのチャンクアップロード
      const chunkSize = 256 * 1024; // 256KB chunks
      let uploadedBytes = 0;
      const totalBytes = byteArray.length;

      // Supabase Storageにアップロード
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, byteArray, {
          contentType: this.getMimeType(fileName),
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // アップロード完了時にプログレスを100%に設定
      if (onProgress) {
        onProgress({
          loaded: totalBytes,
          total: totalBytes,
          percentage: 100,
        });
      }

      // 公開URLの取得
      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
        name: fileName,
        size: totalBytes,
        type: this.getMimeType(fileName),
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * ファイル名の生成
   */
  private generateFileName(uri: string, type: 'image' | 'file'): string {
    const timestamp = Date.now();
    const extension = uri.split('.').pop() || 'unknown';
    return `${type}_${timestamp}.${extension}`;
  }

  /**
   * MIMEタイプの取得
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * ファイルの削除
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('chat-files')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('File deletion failed:', error);
      return false;
    }
  }

  /**
   * ファイル一覧の取得
   */
  async listFiles(roomId: string, type?: 'image' | 'file'): Promise<string[]> {
    try {
      const folder = type ? `${roomId}/${type}s` : roomId;
      const { data, error } = await supabase.storage
        .from('chat-files')
        .list(folder);

      if (error) throw error;
      return data?.map(file => file.name) || [];
    } catch (error) {
      console.error('File listing failed:', error);
      return [];
    }
  }

  /**
   * アップロード進捗のシミュレーション（実際のプログレス追跡の代替）
   */
  private simulateProgress(
    onProgress: (progress: UploadProgress) => void,
    duration: number = 2000
  ) {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      
      onProgress({
        loaded: progress,
        total: 100,
        percentage: Math.round(progress),
      });
    }, 100);
  }
}

// シングルトンインスタンスのエクスポート
export const fileUploadService = FileUploadService.getInstance();