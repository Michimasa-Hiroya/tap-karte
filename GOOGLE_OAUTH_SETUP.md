# 🚀 タップカルテ Google OAuth設定ガイド
## 段階的本格運営への移行手順

### ステップ1: Google Cloud Console設定

#### 1. Google Cloud Consoleアクセス
- [Google Cloud Console](https://console.cloud.google.com/) にアクセス
- 新しいプロジェクトを作成または既存プロジェクトを選択

#### 2. Google+ API有効化
1. 「API とサービス」→「ライブラリ」
2. 「Google People API」を検索
3. 有効化をクリック

#### 3. OAuth 2.0認証情報作成
1. 「API とサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth 2.0 クライアント ID」
3. アプリケーションの種類：「ウェブアプリケーション」
4. 名前：`tap-carte-production`

#### 4. 承認済みリダイレクトURI設定
```
承認済み JavaScript生成元:
https://tap-carte.pages.dev
https://main.tap-carte.pages.dev

承認済みリダイレクト URI:
https://tap-carte.pages.dev
https://tap-carte.pages.dev/
https://main.tap-carte.pages.dev
https://main.tap-carte.pages.dev/
```

### ステップ2: Cloudflare環境変数設定

#### コマンド実行方法
```bash
# 実際のGoogle Client IDを設定
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name tap-carte
# → Google Cloud Consoleで取得したClient IDを入力

# JWT秘密鍵を設定（32文字以上のランダム文字列）
npx wrangler pages secret put JWT_SECRET --project-name tap-carte
# → 強力なランダム文字列を入力（例：OpenSSLで生成）
```

#### 手動設定方法
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → `tap-carte`
2. Settings → Environment variables → Production
3. 以下を追加：
   - `GOOGLE_CLIENT_ID`: Google Cloud Consoleで取得したClient ID
   - `JWT_SECRET`: 32文字以上のランダム文字列

### ステップ3: 本番デプロイ

```bash
# プロジェクトビルド
npm run build

# Cloudflare Pagesにデプロイ
npx wrangler pages deploy dist --project-name tap-carte
```

### ステップ4: 動作確認

#### テスト手順
1. **環境変数確認**
   ```bash
   # Google Client IDが本番用かテスト
   curl https://tap-carte.pages.dev/api/auth/google-config
   ```

2. **Google認証テスト**
   - ブラウザで https://tap-carte.pages.dev にアクセス
   - 「ログイン」ボタンをクリック
   - 「Googleでログイン」をクリック
   - 実際のGoogle認証ポップアップが表示されることを確認

#### トラブルシューティング

**よくあるエラーと対処法：**

1. **`redirect_uri_mismatch`**
   - Google Cloud ConsoleのリダイレクトURIを確認
   - 完全一致（末尾のスラッシュも含む）が必要

2. **`origin_mismatch`**
   - 承認済みJavaScript生成元を確認
   - HTTPSでのアクセスを確認

3. **Environment variables not found**
   - Cloudflare Dashboardで環境変数が設定されているか確認
   - デプロイ後に少し時間がかかる場合があります

### ステップ5: セキュリティ確認

✅ **セキュリティチェックリスト：**
- [ ] HTTPS通信が正常に動作
- [ ] CSP（Content Security Policy）ヘッダーが設定済み
- [ ] JWT秘密鍵が適切に設定済み
- [ ] Google Client IDが本番用に設定済み
- [ ] 個人情報の検出・ブロック機能が動作

### 現在の状態

🟢 **完了済み:**
- Google OAuth認証システムの実装
- デモ認証とリアル認証の自動切り替え
- ピンク色テーマのUI実装
- セキュリティヘッダーの強化

🟡 **設定待ち:**
- Google Cloud Console OAuth設定
- Cloudflare環境変数の設定
- 本番環境でのテスト

### 📞 サポート

設定でご不明な点がございましたら、以下までお問い合わせください：

📧 kushiro.ai.lab@gmail.com
👤 タップカルテ 担当 廣谷