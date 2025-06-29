import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { fileUploadService, UploadedFile, UploadProgress } from '../services/fileUploadService';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 画像のアップロード
  const uploadImage = useCallback(async (roomId: string): Promise<UploadedFile | null> => {
    if (isUploading) return null;

    setIsUploading(true);
    setError(null);
    setUploadProgress(null);

    try {
      const result = await fileUploadService.pickAndUploadImage(
        roomId,
        (progress) => setUploadProgress(progress)
      );

      if (result) {
        setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
      }

      return result;
    } catch (error: any) {
      setError(error.message || 'アップロードに失敗しました');
      Alert.alert('エラー', error.message || 'アップロードに失敗しました');
      return null;
    } finally {
      setIsUploading(false);
      // プログレスを少し表示してからクリア
      setTimeout(() => setUploadProgress(null), 1000);
    }
  }, [isUploading]);

  // カメラで写真を撮影してアップロード
  const takePhoto = useCallback(async (roomId: string): Promise<UploadedFile | null> => {
    if (isUploading) return null;

    setIsUploading(true);
    setError(null);
    setUploadProgress(null);

    try {
      const result = await fileUploadService.takePhotoAndUpload(
        roomId,
        (progress) => setUploadProgress(progress)
      );

      if (result) {
        setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
      }

      return result;
    } catch (error: any) {
      setError(error.message || 'アップロードに失敗しました');
      Alert.alert('エラー', error.message || 'アップロードに失敗しました');
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 1000);
    }
  }, [isUploading]);

  // ドキュメントのアップロード
  const uploadDocument = useCallback(async (roomId: string): Promise<UploadedFile | null> => {
    if (isUploading) return null;

    setIsUploading(true);
    setError(null);
    setUploadProgress(null);

    try {
      const result = await fileUploadService.pickAndUploadDocument(
        roomId,
        (progress) => setUploadProgress(progress)
      );

      if (result) {
        setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
      }

      return result;
    } catch (error: any) {
      setError(error.message || 'アップロードに失敗しました');
      Alert.alert('エラー', error.message || 'アップロードに失敗しました');
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 1000);
    }
  }, [isUploading]);

  // ファイルの削除
  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const success = await fileUploadService.deleteFile(filePath);
      if (!success) {
        Alert.alert('エラー', 'ファイルの削除に失敗しました');
      }
      return success;
    } catch (error: any) {
      setError(error.message || 'ファイルの削除に失敗しました');
      Alert.alert('エラー', error.message || 'ファイルの削除に失敗しました');
      return false;
    }
  }, []);

  // アップロード選択肢の表示
  const showUploadOptions = useCallback((roomId: string) => {
    Alert.alert(
      'ファイルを送信',
      'どの方法でファイルを送信しますか？',
      [
        {
          text: 'カメラで撮影',
          onPress: () => takePhoto(roomId),
        },
        {
          text: 'ギャラリーから選択',
          onPress: () => uploadImage(roomId),
        },
        {
          text: 'ドキュメントを選択',
          onPress: () => uploadDocument(roomId),
        },
        {
          text: 'キャンセル',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }, [takePhoto, uploadImage, uploadDocument]);

  // エラーのクリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUploading,
    uploadProgress,
    error,
    uploadImage,
    takePhoto,
    uploadDocument,
    deleteFile,
    showUploadOptions,
    clearError,
  };
};