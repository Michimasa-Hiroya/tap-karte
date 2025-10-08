# 📱 モバイル Google OAuth 設定ガイド

## 🔓 WebView制限解除手順

### ステップ1: Google Cloud Console OAuth設定

1. **Google Cloud Console** にアクセス
   - [Google Cloud Console](https://console.cloud.google.com/)
   - プロジェクト選択

2. **OAuth 2.0 クライアント設定**
   - 「APIとサービス」→「認証情報」
   - OAuth 2.0 クライアントIDを編集

3. **アプリケーションの種類を変更**
   ```
   現在: ウェブアプリケーション
   ↓
   推奨: iOS/Android アプリケーション
   ```

4. **制限を緩和**
   - 「制限」セクションで設定
   - 「なし」または「HTTPリファラー制限なし」を選択

### ステップ2: 新しいモバイル専用 Client ID作成

#### 方法A: モバイル専用クライアント
```bash
# 新しいOAuth 2.0 クライアント作成
アプリケーションの種類: Android
パッケージ名: com.tapkarte.webapp
SHA-1証明書フィンガープリント: (後述)
```

#### 方法B: ウェブアプリでの制限緩和
```bash
承認済み JavaScript 生成元:
- https://tap-carte.pages.dev
- https://*.tap-carte.pages.dev  # ワイルドカード対応
- https://*.pages.dev             # 全Cloudflare Pages許可

リダイレクトURI:
- https://tap-carte.pages.dev/auth/callback
- https://tap-carte.pages.dev/
- intent://callback              # モバイルアプリ対応
```

### ステップ3: OAuth スコープ調整

```bash
必須スコープ:
- openid
- email
- profile

追加推奨スコープ:
- https://www.googleapis.com/auth/userinfo.email
- https://www.googleapis.com/auth/userinfo.profile
```