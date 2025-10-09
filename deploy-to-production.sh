#!/bin/bash

# ==================================================
# タップカルテ 本番デプロイスクリプト
# ==================================================
# 使用方法: ./deploy-to-production.sh [コミットメッセージ]
#
# 実行内容:
# 1. Cloudflare API認証確認
# 2. プロジェクトビルド
# 3. Cloudflare Pagesデプロイ
# 4. GitHub プッシュ
# 5. 動作確認
# ==================================================

set -e  # エラー時に停止

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# プロジェクト設定
PROJECT_NAME="tap-carte"
PRODUCTION_URL="https://tap-karte.com"

# 引数確認
COMMIT_MESSAGE="${1:-Update application changes}"

log_info "🚀 タップカルテ本番デプロイを開始します"
log_info "プロジェクト: ${PROJECT_NAME}"
log_info "コミットメッセージ: ${COMMIT_MESSAGE}"

# Step 1: Cloudflare認証確認
log_info "📡 Step 1: Cloudflare認証確認"
if npx wrangler whoami > /dev/null 2>&1; then
    log_success "Cloudflare認証 OK"
else
    log_error "Cloudflare認証に失敗しました"
    log_info "setup_cloudflare_api_keyを実行してください"
    exit 1
fi

# Step 2: プロジェクトビルド
log_info "🔨 Step 2: プロジェクトビルド"
if npm run build; then
    log_success "ビルド完了"
else
    log_error "ビルドに失敗しました"
    exit 1
fi

# Step 3: 変更をコミット（必要な場合）
log_info "📝 Step 3: Git変更確認・コミット"
if [[ -n $(git status --porcelain) ]]; then
    log_info "変更を検出しました。コミットを実行します..."
    git add .
    git commit -m "${COMMIT_MESSAGE}"
    log_success "コミット完了"
else
    log_info "変更なし。コミットをスキップします。"
fi

# Step 4: Cloudflare Pagesデプロイ
log_info "🌐 Step 4: Cloudflare Pagesデプロイ"
DEPLOY_OUTPUT=$(npx wrangler pages deploy dist --project-name ${PROJECT_NAME} 2>&1)
if echo "$DEPLOY_OUTPUT" | grep -q "Deployment complete"; then
    log_success "Cloudflare Pagesデプロイ完了"
    
    # デプロイURLを抽出
    DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o "https://[a-zA-Z0-9]*.${PROJECT_NAME}.pages.dev" | head -1)
    if [[ -n "$DEPLOY_URL" ]]; then
        log_info "デプロイURL: ${DEPLOY_URL}"
    fi
else
    log_error "Cloudflare Pagesデプロイに失敗しました"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Step 5: GitHub プッシュ（オプショナル）
log_info "📤 Step 5: GitHubプッシュ"
if git push origin main 2>/dev/null; then
    log_success "GitHubプッシュ完了"
else
    log_warning "GitHubプッシュに失敗しました（セキュリティ制限の可能性）"
    log_info "手動でのプッシュが必要な場合があります"
fi

# Step 6: 動作確認
log_info "✅ Step 6: 本番環境動作確認"
if curl -s -o /dev/null -w "%{http_code}" ${PRODUCTION_URL} | grep -q "200"; then
    log_success "本番環境正常動作確認完了"
else
    log_warning "本番環境の応答に問題があります"
fi

# 完了サマリー
echo ""
log_success "🎉 デプロイ完了サマリー"
echo "======================================"
echo "📱 本番URL: ${PRODUCTION_URL}"
echo "🔗 デプロイURL: ${DEPLOY_URL:-'N/A'}"
echo "📝 コミット: ${COMMIT_MESSAGE}"
echo "⏰ 完了時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""
log_info "デプロイが正常に完了しました！"
log_info "ブラウザで ${PRODUCTION_URL} を確認してください。"