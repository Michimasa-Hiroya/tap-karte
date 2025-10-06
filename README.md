# AI カルテ - 思ったことを、そのままカルテに

## プロジェクト概要
- **名前**: AI カルテ
- **キャッチフレーズ**: 思ったことを、そのままカルテに
- **目的**: 看護・介護記録業務効率化を支援するWebアプリケーション
- **機能**: 口頭メモや簡単なメモを、整った看護記録・報告書に変換
- **デザイン**: 淡いピンクを基調とした優しく親しみやすいUI、かわいい看護師鳥キャラクター

## 現在実装済み機能

### ✅ 完了した機能
1. **直感的UI**
   - 2分割レイアウト（入力エリア/出力エリア）
   - 淡いピンクを基調とした優しいカラーテーマ
   - レスポンシブ対応、モダンなデザイン
   - Tailwind CSS + Font Awesome アイコン使用

2. **オプション選択機能**
   - **ドキュメント種別**: 記録 / 報告書
   - **フォーマット**: 文章形式 / SOAP形式
   - **文体選択**: ですます体 / だ・である体
   - **出力文字数制限**: 100～1000文字（スライダー調整）

3. **フォーマット制約機能**
   - 報告書選択時は自動的に文章形式に固定
   - SOAP形式は記録でのみ使用可能
   - 視覚的フィードバック（無効化時は半透明表示）

4. **Claude API連携**
   - Anthropic Claude 3.5 Sonnet API使用
   - 20年経験の訪問看護師としてのプロンプト
   - **医療専門用語辞書統合**: 200語の看護・リハビリ専門用語対応
   - **創作防止強化**: 入力情報のみ基づく出力
   - **ストリームライン報告書**: 簡潔で要点を絞った報告書形式
   - 誤字脱字自動修正、「患者」を「利用者」に統一
   - 選択オプションに応じた文体・形式変換

5. **SOAP形式出力**
   - S (Subjective): 主観的情報
   - O (Objective): 客観的データ  
   - A (Assessment): 評価・アセスメント
   - P (Plan): 看護計画・目標
   - 情報不足項目は「特記事項なし」と記載

6. **文章形式出力品質**
   - 箇条書きや見出しを使用しない自然な文章
   - 連続的で読みやすい段落構成
   - 入力内容に見合った適切な出力長

7. **ユーザビリティ機能**
   - ワンクリックコピー機能
   - **確認ダイアログ付きクリア機能**
   - リアルタイム処理状況表示
   - 入力文字数制限なし
   - エラーハンドリング

## 機能別エンドポイント

### API エンドポイント
- **GET `/`** - メインUI表示
- **POST `/api/convert`** - テキスト変換API
  - パラメータ:
    - `text`: 入力テキスト（文字数制限なし）
    - `style`: 文体（"ですます体" / "だ・である体"）
    - `docType`: 種別（"記録" / "報告書"）
    - `format`: 形式（"文章形式" / "SOAP形式"）
    - `charLimit`: 出力文字数制限（100-1000）

### フロントエンド機能
- **テキスト入力**: 制限なしのテキスト入力エリア
- **リアルタイム変換**: 入力後「変換」ボタンで即座にAI処理
- **コピー機能**: 出力エリアの結果をクリップボードに保存
- **オプション制御**: ドキュメント種別に応じたフォーマット制約

## データアーキテクチャ
- **データモデル**: REST API による単発リクエスト/レスポンス
- **ストレージサービス**: 状態はフロントエンドで管理（セッションレス）
- **データフロー**: 入力→オプション選択→Claude API→整形出力

## ユーザーガイド

### 基本的な使用手順
1. 入力エリアに口頭メモや簡単なメモを入力
2. ドキュメント種別・フォーマット・文体を選択
3. 出力文字数制限をスライダーで調整（100-1000文字）
4. 「変換」ボタンをクリック
5. 出力エリアに整形された文章が表示される
6. 「コピー」ボタンで結果をクリップボードに保存

### フォーマット選択について
- **記録**: 文章形式・SOAP形式から選択可能
- **報告書**: 自動的に文章形式に固定（SOAP形式は無効化）
- **文章形式**: 自然な文章として連続的に記述
- **SOAP形式**: 医療記録の標準構造化方式

### 重要な注意点
- **個人情報は絶対に入力しないでください**（氏名、住所、生年月日等）
- 入力情報のみ基づいて出力、創作や推測は行いません
- 入力が少ない場合は、出力も短くなります

## URL
- **プロダクション**: https://1739bac7.tap-carte.pages.dev （最新デプロイ）
- **メインサイト**: https://tap-carte.pages.dev
- **開発サーバー**: http://localhost:3000 （ローカル開発用）
- **GitHub**: （設定予定）

## デプロイメント
- **プラットフォーム**: Cloudflare Pages
- **ステータス**: ✅ プロダクション稼働中（ストリームライン報告書対応）
- **プロジェクト名**: tap-carte
- **技術スタック**: Hono + TypeScript + Tailwind CSS + Claude 3.5 Sonnet API + Cloudflare D1
- **最終デプロイ**: 2025-10-06（ストリームライン報告書機能追加）

## 開発・運用情報

### 必要な環境変数
```bash
CLAUDE_API_KEY=your_claude_api_key_here
```

### ローカル開発
```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# 開発サーバー起動（PM2使用）
pm2 start ecosystem.config.cjs

# テスト
curl http://localhost:3000

# APIテスト例
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{"text":"患者さんの血圧が高め", "style":"ですます体", "docType":"記録", "format":"SOAP形式", "charLimit": 500}'
```

### 本番デプロイ（Cloudflare Pages）

#### 手動デプロイ手順
1. **プロジェクトバックアップをダウンロード**:
   - https://page.gensparksite.com/project_backups/nursing-assistant-ready-to-deploy.tar.gz

2. **Cloudflare Pages Dashboard設定**:
   - Cloudflare Dashboard → Pages → Create application
   - Upload assets を選択して dist/ フォルダをアップロード
   - または GitHub連携でリポジトリからデプロイ

3. **環境変数設定**:
   - Settings → Environment variables
   - `CLAUDE_API_KEY` を設定

#### CLI デプロイ（要・適切なAPIトークン）
```bash
# 注意: 提供されたAPIトークンは権限不足のため、
# 以下のコマンドは現在実行できません

# 1. APIトークンの権限要件
# - Cloudflare Pages:Edit
# - Zone:Zone Settings:Read  
# - Zone:Zone:Read
# - User:User Details:Read

# 2. 正しい権限のトークンで実行
export CLOUDFLARE_API_TOKEN=your_full_permission_token
npm run build
npx wrangler pages deploy dist --project-name nursing-assistant

# 3. 環境変数設定
npx wrangler pages secret put CLAUDE_API_KEY --project-name nursing-assistant
```

## 特記事項

### ✅ 実装済み改善
- 音声入力機能を削除（シンプルな操作に特化）
- 入力文字数制限を撤廃（長文入力対応）
- 出力文字数制限を明確化（100-1000文字）
- AI創作防止を強化（入力情報のみ基づく出力）
- フォーマット制約機能（報告書はSOAP無効）
- クリア機能に確認ダイアログ追加
- 使いやすさ重視のUI改善

### 🔄 技術仕様
- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+), Tailwind CSS
- **バックエンド**: Hono (Web Framework)
- **API**: Anthropic Claude Haiku API  
- **デプロイ**: Cloudflare Workers/Pages
- **ブラウザ要件**: モダンブラウザ（Chrome, Firefox, Safari, Edge）

## 実装済み高度機能
- [x] **ユーザー認証システム**: メール+パスワード、Google OAuth対応
- [x] **個別履歴管理**: ユーザー別記録保存・閲覧機能（Cloudflare D1）
- [x] **医療用語辞書**: 200語の専門用語統合
- [x] **ブランディング**: AI カルテ「思ったことを、そのままカルテに」
- [x] **ストリームライン報告書**: 簡潔な要点整理型報告書
- [x] **JWT認証**: セキュアなセッション管理
- [x] **レスポンシブ対応**: モバイル・デスクトップ最適化

## 今後の拡張予定  
- [ ] GitHub リポジトリ設定・コード管理
- [ ] テンプレート機能
- [ ] 印刷最適化
- [ ] パフォーマンス改善
- [ ] 多言語対応