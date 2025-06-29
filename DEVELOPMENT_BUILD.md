# 開発ビルド作成手順

Expo Goの制限を回避し、完全な機能（プッシュ通知など）を利用するための開発ビルド作成手順です。

## 🚫 Expo Goの制限事項

Expo Go（SDK 53以降）では以下の機能が制限されています：

- **プッシュ通知** - リモート通知機能が削除
- **ネイティブモジュール** - カスタムネイティブコードの実行
- **バックグラウンド処理** - 一部の制限

## 🛠️ 開発ビルド作成方法

### 前提条件

- **Expo CLI** - 最新版（`npm install -g @expo/cli`）
- **EAS CLI** - (`npm install -g eas-cli`)
- **Expo アカウント** - https://expo.dev でアカウント作成
- **物理デバイス** または **エミュレータ/シミュレータ**

### 1. EASプロジェクト初期化

```bash
# EAS CLIでログイン
eas login

# EASプロジェクト初期化
eas build:configure
```

### 2. eas.json 設定確認

`eas.json` ファイルが以下のように設定されていることを確認：

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### 3. app.json/app.config.js 設定

`app.json` にプラグイン設定を追加：

```json
{
  "expo": {
    "name": "intimate-chat",
    "slug": "intimate-chat",
    "version": "1.0.0",
    "plugins": [
      "expo-notifications",
      "expo-dev-client"
    ]
  }
}
```

### 4. 開発ビルド作成

#### Android 開発ビルド

```bash
# Android APK作成（内部配布用）
eas build --platform android --profile development

# ビルド完了後、APKをダウンロードしてインストール
```

#### iOS 開発ビルド

```bash
# iOS開発ビルド作成
eas build --platform ios --profile development

# Apple Developer アカウントが必要
# デバイスUDIDの登録が必要
```

### 5. 開発クライアントのインストール

#### Android
1. ビルド完了後のAPKをダウンロード
2. 物理デバイスにインストール
3. 開発者オプションで「不明なソースからのインストール」を許可

#### iOS
1. TestFlightまたは直接インストール
2. Apple Developer アカウントでデバイス登録
3. Provisioning Profile設定

### 6. 開発サーバーの起動

```bash
# 開発サーバー起動
npx expo start --dev-client

# または
npm start -- --dev-client
```

### 7. 開発クライアントでの接続

1. インストールした開発クライアントアプリを起動
2. QRコードをスキャンまたはURLを手動入力
3. アプリが開発サーバーに接続されます

## 🔧 トラブルシューティング

### よくある問題

#### 1. ビルドエラー

**問題**: `eas build` でエラーが発生

**解決策**:
```bash
# キャッシュクリア
npx expo install --fix
npm install

# 再度ビルド実行
eas build --platform android --profile development --clear-cache
```

#### 2. Apple Developer アカウント

**問題**: iOS開発ビルドでApple Developer アカウントが必要

**解決策**:
- 有料のApple Developer Program（年間$99）への登録
- または、Android開発ビルドを使用

#### 3. デバイス登録

**問題**: iOS デバイスがビルドに含まれていない

**解決策**:
```bash
# デバイス登録
eas device:create

# デバイス一覧確認
eas device:list
```

### 4. プッシュ通知の動作確認

開発ビルドでプッシュ通知が動作することを確認：

```typescript
// 通知テスト用コード
import * as Notifications from 'expo-notifications';

const testNotification = async () => {
  // 権限確認
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status === 'granted') {
    // テスト通知送信
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "テスト通知",
        body: "開発ビルドで通知が動作しています！",
      },
      trigger: null,
    });
  }
};
```

## 📱 推奨開発フロー

### 1. 初期開発 - Expo Go
- UI/UX開発
- 基本機能実装
- プロトタイピング

### 2. 機能テスト - 開発ビルド
- プッシュ通知テスト
- ネイティブ機能テスト
- パフォーマンステスト

### 3. 本番リリース - 本番ビルド
- App Store / Google Play Store
- 最終的な品質確認

## 💡 Tips

### 高速化
- **ローカルビルド**: `--local` フラグでローカルでビルド
- **キャッシュ活用**: 依存関係の変更がない場合はキャッシュを活用

### デバッグ
- **開発ツール**: React Native Debugger使用可能
- **ログ確認**: `npx expo logs` でリアルタイムログ確認

### チーム開発
- **内部配布**: ビルドを組織内で共有可能
- **Over-the-Air更新**: EAS Updateで即座にアップデート配信

## 📚 参考リンク

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Push Notifications in Development Builds](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)

---

## ⚡ クイックスタート

最速で開発ビルドを試したい場合：

```bash
# 1. EAS設定
eas build:configure

# 2. Android開発ビルド作成
eas build --platform android --profile development

# 3. APKインストール後、開発サーバー起動
npx expo start --dev-client
```

これで完全な機能を持つアプリケーションのテストが可能になります！