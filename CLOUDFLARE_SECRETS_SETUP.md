# Cloudflare Workers Secrets セキュリティ設定

## 🔐 現在の設定状況

### ✅ Production環境（本番）
```bash
npx wrangler pages secret list --project-name tap-carte
```

**設定済みSecrets**:
- `GEMINI_API_KEY`: ✅ Encrypted
- `JWT_SECRET`: ✅ Encrypted  
- `GOOGLE_CLIENT_ID`: ✅ Encrypted
- `ANTHROPIC_API_KEY`: ✅ Encrypted

### ⚠️ Preview環境（開発）
```bash
npx wrangler pages secret list --project-name tap-carte --env preview
```

**Status**: 未設定（セキュリティリスク）

## 🚀 セキュリティ強化手順

### 1. Preview環境のSecretsを設定

#### 1.1 開発用Gemini API Key
```bash
# 開発用APIキー設定（低い制限値）
npx wrangler pages secret put GEMINI_API_KEY --project-name tap-carte --env preview
# 入力: 開発専用のGemini APIキー（本番と分離）
```

#### 1.2 開発用JWT Secret  
```bash
# 開発専用のJWT Secret生成・設定
npx wrangler pages secret put JWT_SECRET --project-name tap-carte --env preview
# 入力: openssl rand -hex 32 で生成した開発専用シークレット
```

### 2. ローカル開発環境の安全化

#### 2.1 .dev.vars の暗号化
```bash
# .dev.vars を .env.local に変更
mv .dev.vars .env.local

# .gitignore に追加（既存）
echo ".env.local" >> .gitignore
```

#### 2.2 環境別設定
```typescript
// src/config/index.ts で環境判定
const isDevelopment = process.env.NODE_ENV === 'development'
const isPreview = process.env.CF_PAGES_BRANCH !== 'main'

export const ENVIRONMENT = {
  isDevelopment,
  isPreview,
  isProduction: !isDevelopment && !isPreview
}
```

### 3. APIキーの権限最小化

#### 3.1 Gemini API Key制限設定
```yaml
Production Key:
  - Rate Limit: 60 requests/minute
  - Monthly Quota: 1,000,000 tokens
  - IP Restriction: Cloudflare IPs only

Development Key:
  - Rate Limit: 10 requests/minute  
  - Monthly Quota: 100,000 tokens
  - IP Restriction: Development IPs
```

#### 3.2 JWT Secret ローテーション
```bash
# 月次でJWT Secretを更新
openssl rand -hex 32

# 本番環境更新
npx wrangler pages secret put JWT_SECRET --project-name tap-carte

# 開発環境更新  
npx wrangler pages secret put JWT_SECRET --project-name tap-carte --env preview
```

### 4. 監査とロギング

#### 4.1 Secrets使用状況監視
```typescript
// src/utils/index.ts
export const logApiKeyUsage = (keyType: string, operation: string) => {
  if (ENVIRONMENT.isProduction) {
    logger.info('API Key Usage', {
      keyType: keyType,
      operation: operation,
      timestamp: new Date().toISOString(),
      environment: 'production'
    })
  }
}
```

#### 4.2 異常検知アラート
```typescript
// src/middleware/index.ts
export const apiKeyAnomalyDetection = () => {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    await next()
    const duration = Date.now() - startTime
    
    // 異常に長い処理時間を検知
    if (duration > 30000) { // 30秒超過
      logger.warn('Potential API key issue detected', {
        duration,
        endpoint: c.req.path,
        timestamp: new Date().toISOString()
      })
    }
  }
}
```

## 🔒 セキュリティベストプラクティス

### 1. 環境分離原則
```yaml
Production:
  - 本番データベース
  - 高制限APIキー
  - 本番ドメイン

Preview/Development:
  - テストデータベース
  - 低制限APIキー  
  - 開発ドメイン
```

### 2. Secrets更新スケジュール
```yaml
定期更新:
  - JWT_SECRET: 月次
  - GEMINI_API_KEY: 四半期
  - GOOGLE_CLIENT_ID: 年次（必要時）

緊急更新トリガー:
  - セキュリティインシデント
  - 権限侵害の疑い
  - 異常な使用量検知
```

### 3. アクセス制御
```typescript
// 開発環境でのAPI制限
export const developmentRateLimit = () => {
  if (ENVIRONMENT.isDevelopment) {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15分
      max: 100 // 最大100リクエスト
    })
  }
}
```

## 📊 監視ダッシュボード

### Cloudflare Analytics活用
```yaml
監視項目:
  - API呼び出し回数
  - エラー率
  - レスポンス時間
  - 地理的分散

アラート設定:
  - エラー率 > 5%
  - レスポンス時間 > 10秒
  - 異常な地域からのアクセス
```

## 🚨 インシデント対応

### APIキー漏洩時の対応
```bash
# 1. 即座にキーを無効化
npx wrangler pages secret delete COMPROMISED_KEY_NAME --project-name tap-carte

# 2. 新しいキーを生成・設定
npx wrangler pages secret put NEW_KEY_NAME --project-name tap-carte

# 3. アプリケーションを再デプロイ
npm run build && npx wrangler pages deploy dist --project-name tap-carte

# 4. ログ分析でアクセス状況を確認
```

## ✅ セキュリティチェックリスト

### 設定完了確認
- [ ] Production SecretsがすべてEncrypted
- [ ] Preview環境にも適切なSecrets設定  
- [ ] .dev.vars/.env.localが.gitignoreに追加
- [ ] APIキーの権限が最小化設定
- [ ] ログ監視システムが動作
- [ ] 定期更新スケジュールが設定

### 継続的なセキュリティ維持
- [ ] 月次でJWT Secret更新
- [ ] 四半期でAPI Key更新
- [ ] 週次でログ監査
- [ ] Cloudflare Analytics監視

---

**🎯 目標**: APIキーの完全な安全化により、医療アプリ「タップカルテ」のセキュリティレベルを医療機関標準まで向上させる。