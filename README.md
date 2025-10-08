# タップカルテ - 思ったことを、そのままカルテに

## プロジェクト概要
- **名前**: タップカルテ
- **キャッチフレーズ**: 思ったことを、そのままカルテに
- **目的**: 看護・介護記録業務効率化を支援するWebアプリケーション
- **機能**: 口頭メモや簡単なメモを、整った看護記録・報告書に変換
- **AIエンジン**: 🚀 **Gemini 2.5 Flash** (2025-10-07 移行完了)

## URL
- **🌐 本番環境**: https://6399bd3e.tap-carte.pages.dev ✅ **Gemini API動作確認済み**
- **🐙 GitHub**: https://github.com/Michimasa-Hiroya/tap-karte
- **🚀 開発環境**: ローカル開発サーバー対応
- **📱 モバイル対応**: レスポンシブデザイン完全対応

## 現在実装済み機能

### ✅ 完了した機能
1. **🤖 AI変換エンジン** 
   - **Gemini 2.5 Flash API**: 高品質な日本語医療記録生成
   - **コスト効率**: 1回0.32円 (Claude比+18%で品質大幅向上)
   - **応答時間**: 6-10秒 (高品質推論)
   - **医療専門用語辞書**: 200語の看護・リハビリ専門用語統合

2. **📝 フォーマット対応**
   - **ドキュメント種別**: 記録 / 報告書
   - **フォーマット**: 文章形式 / SOAP形式
   - **文体選択**: ですます体 / だ・である体 (初期選択: だ・である体)
   - **出力文字数制限**: 100～1000文字（スライダー調整）

3. **🛡️ セキュリティ機能**
   - **個人情報検出**: パターンマッチングによる自動警告
   - **JWT認証**: セキュアなユーザー認証
   - **bcrypt暗号化**: パスワード安全管理
   - **CORS対策**: クロスオリジン攻撃防御

4. **👤 ユーザー管理**
   - **Google OAuth専用認証**: 🎯 **2025-10-08 メール認証廃止・Google専用化完了**
   - **段階的本格運営**: デモ認証→実Google OAuth自動切り替え
   - **ピンクテーマ化**: 🎨 ログインボタンをピンクテーマに統一
   - **セッション管理**: JWT + 自動ログイン維持

5. **🎨 UI/UX**
   - **直感的操作**: 2分割レイアウト（入力/出力エリア）
   - **淡いピンクテーマ**: 医療現場に適した優しいデザイン
   - **レスポンシブ対応**: PC・タブレット・スマートフォン最適化
   - **リアルタイム文字数表示**: 入力・出力文字数カウント

## API エンドポイント

### メイン機能
- **GET `/`** - メインUI表示
- **POST `/api/convert`** - Gemini AI テキスト変換
  - `text`: 入力テキスト
  - `style`: "ですます体" / "だ・である体"
  - `docType`: "記録" / "報告書"  
  - `format`: "文章形式" / "SOAP形式"
  - `charLimit`: 100-1000文字

### 認証関連 (Google OAuth専用)
- **POST `/api/auth/google`** - Google OAuth認証 (メイン)
- **GET `/api/auth/google-config`** - Google Client ID設定取得
- **GET `/api/auth/me`** - 現在のユーザー情報取得
- **POST `/api/auth/logout`** - ログアウト

## データアーキテクチャ
- **AIエンジン**: Google Gemini 2.5 Flash API
- **データベース**: Cloudflare D1 SQLite (ユーザー・履歴管理)
- **ストレージ**: Cloudflare KV (セッション管理)
- **認証**: JWT + bcrypt暗号化
- **デプロイ**: Cloudflare Pages + Workers

## 品質・性能比較

### Gemini 2.5 Flash vs Claude 3 Haiku
| 項目 | Claude 3 Haiku | Gemini 2.5 Flash | 改善 |
|------|---------------|------------------|------|
| **1回コスト** | 0.27円 | 0.32円 | +18% |
| **文章品質** | 良好 | 優秀 | ⬆️ 大幅向上 |
| **SOAP論理性** | 基本 | 推論強化 | ⬆️ 大幅向上 |
| **専門用語精度** | 良好 | より正確 | ⬆️ 向上 |
| **応答時間** | 3-5秒 | 6-10秒 | やや遅い |

### 出力品質例
**入力**: 「利用者さん、今日は体調良さそう。血圧も安定してた。」
**出力**: 「利用者、本日全身状態良好であった。バイタルサインは安定しており、血圧も基準値内で推移した。」

## ユーザーガイド

### 基本的な使用手順
1. **📝 入力**: 思ったことやメモを自由に入力
2. **⚙️ 設定**: 文体・フォーマット・文字数を選択
3. **🚀 生成**: 「生成」ボタンをタップ
4. **📋 コピー**: 整った記録をクリップボードにコピー
5. **📄 活用**: 電子カルテに直接貼り付け

### 重要な注意点
- **🚫 個人情報厳禁**: 氏名・住所・生年月日等は入力禁止
- **✅ 事実ベース**: 入力情報のみ基づく出力、創作なし
- **📏 適切な長さ**: 入力に応じた適切な出力長に調整

## デプロイメント情報
- **プラットフォーム**: Cloudflare Pages
- **ステータス**: ✅ 本番稼働中
- **プロジェクト名**: tap-carte  
- **技術スタック**: Hono + TypeScript + Gemini 2.5 Flash + Cloudflare D1
- **最終更新**: 2025-10-08 (Google OAuth専用化・段階的本格運営対応完了)

## 技術仕様

### 環境変数
```bash
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id  # 🎯 本格運営必須
```

### 🚀 Google OAuth本格運営設定

#### ステップ1: Google Cloud Console設定
1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクト作成
2. Google People API有効化
3. OAuth 2.0クライアントID作成
4. 承認済みリダイレクトURI設定:
   ```
   https://tap-carte.pages.dev
   https://main.tap-carte.pages.dev
   ```

#### ステップ2: Cloudflare環境変数設定
```bash
# 実際のGoogle Client IDを設定
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name tap-carte

# JWT秘密鍵を設定
npx wrangler pages secret put JWT_SECRET --project-name tap-carte
```

📋 **詳細手順**: `GOOGLE_OAUTH_SETUP.md` を参照

### ローカル開発
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000
```

### 本番デプロイ
```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name tap-carte
npm run build
npx wrangler pages deploy dist --project-name tap-carte
```

## 実装完了アーキテクチャ
- ✅ **認証システム**: Google OAuth専用 (2025-10-08 完全移行完了)
- ✅ **段階的本格運営**: デモ認証↔実認証の自動切り替え機能
- ✅ **ピンクテーマUI**: 医療現場に適した優しい色調統一
- ✅ **データベース**: Cloudflare D1 SQLite
- ✅ **AIエンジン**: Gemini 2.5 Flash (最新)
- ✅ **セキュリティ**: 個人情報検出・JWT暗号化
- ✅ **本番デプロイ**: Cloudflare Pages稼働中

## 段階的本格運営への移行状況

### ✅ 完了済み (2025-10-08)
- Google OAuth認証システム実装
- デモ認証とリアル認証の自動切り替え
- ピンク色テーマのログインUI
- 環境変数による本番設定切り替え
- Google Cloud Console設定ガイド作成

### ⏳ 設定待ち (ユーザー操作必要)
- Google Cloud Console OAuth設定
- Cloudflare環境変数設定 (GOOGLE_CLIENT_ID)
- 本番環境での実Google OAuth動作テスト

## 今後の拡張候補
- [ ] 履歴機能UI実装 (バックエンド完成済み)
- [ ] 音声入力対応 (Web Speech API)
- [ ] テンプレート機能
- [ ] PDF/Word出力

---
**🏥 医療従事者の皆様の業務効率化をサポートします**