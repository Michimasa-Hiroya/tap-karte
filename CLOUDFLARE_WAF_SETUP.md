# Cloudflare WAF セキュリティ設定ガイド

## 🛡️ 概要
CloudflareのWAF（Web Application Firewall）でOWASPルールを有効化し、SQL injection、XSS等の攻撃を自動ブロックします。

## ⚠️ 重要事項
- **有料機能**: WAFはCloudflare Pro プラン以上で利用可能（月額$20〜）
- **設定場所**: Cloudflare Dashboard > Security > WAF
- **対象ドメイン**: タップカルテのドメイン（例：tap-carte.pages.dev）

## 🚀 設定手順

### 1. Cloudflare Dashboardにログイン
```
https://dash.cloudflare.com/
```

### 2. ドメインを選択
- タップカルテプロジェクトのドメインを選択
- 例：`tap-carte.pages.dev` または独自ドメイン

### 3. Security > WAF に移動

### 4. Managed Rules の設定

#### 4.1 OWASP Core Rule Set を有効化
```
Rule Set: OWASP ModSecurity Core Rule Set
Action: Block
Sensitivity: Medium
```

#### 4.2 Cloudflare Managed Ruleset を有効化
```
Rule Set: Cloudflare Managed Ruleset  
Action: Block
Sensitivity: High
```

#### 4.3 Cloudflare OWASP を有効化
```
Rule Set: Cloudflare OWASP
Action: Block  
Paranoia Level: 1 (推奨) または 2 (厳格)
```

### 5. Rate Limiting の設定

#### 5.1 API Protection
```
Path: /api/*
Rate: 100 requests per minute per IP
Action: Block
Duration: 1 minute
```

#### 5.2 Login Protection  
```
Path: /api/auth/*
Rate: 10 requests per minute per IP
Action: Challenge
Duration: 5 minutes
```

### 6. Bot Fight Mode 有効化
```
Security > Bots > Bot Fight Mode: ON
Super Bot Fight Mode: ON (Pro+ plan)
```

### 7. Security Level 設定
```
Security > Settings > Security Level: High
Challenge Passage: 30 minutes
```

## 🔧 カスタムルール例

### SQL Injection 防御
```javascript
// Custom Rule 1: SQL Injection Protection
(http.request.uri.query contains "union select" or 
 http.request.uri.query contains "drop table" or
 http.request.uri.query contains "insert into" or
 http.request.body contains "union select")
```

### XSS 防御
```javascript
// Custom Rule 2: XSS Protection  
(http.request.uri.query contains "<script" or
 http.request.uri.query contains "javascript:" or
 http.request.body contains "<script" or
 http.request.body contains "onerror=")
```

### Path Traversal 防御
```javascript
// Custom Rule 3: Path Traversal Protection
(http.request.uri.path contains "../" or
 http.request.uri.path contains "..\\")
```

## 📊 推奨設定（タップカルテ用）

### Basic Protection（無料プラン）
```yaml
Security Level: High
Challenge Passage: 30 minutes
Bot Fight Mode: ON
DDoS Protection: Automatic
```

### Advanced Protection（Pro+ プラン）
```yaml
WAF Managed Rules:
  - OWASP ModSecurity Core Rule Set: Block, Medium
  - Cloudflare Managed Ruleset: Block, High
  - Cloudflare OWASP: Block, Paranoia Level 1

Rate Limiting:
  - API endpoints: 100/min per IP
  - Auth endpoints: 10/min per IP
  
Super Bot Fight Mode: ON
Advanced DDoS Protection: ON
```

## ⚡ クイック設定（推奨）

医療アプリ「タップカルテ」に最適な設定：

1. **Security Level**: `High`
2. **WAF Managed Rules**: `OWASP + Cloudflare Managed` 
3. **Rate Limiting**: `API: 100/min, Auth: 10/min`
4. **Bot Protection**: `Super Bot Fight Mode ON`
5. **Custom Rules**: SQL Injection + XSS防御

## 🔍 監視とログ

### Security Events の確認
```
Cloudflare Dashboard > Security > Events
```

### ログの活用
- 攻撃パターンの分析
- 誤検知（False Positive）の特定
- ルールチューニングの参考

## ⚠️ 注意点

### 誤検知対策
```javascript
// 正当なAPIリクエストを除外
(ip.src in {allowed_ips} or 
 http.user_agent contains "タップカルテ-Mobile-App")
```

### テスト環境除外
```javascript
// 開発・テスト環境は除外
(http.host contains "dev." or 
 http.host contains "test." or
 http.host contains "staging.")
```

## 💰 コスト考慮

- **Pro プラン**: $20/月（WAF基本機能）
- **Business プラン**: $200/月（高度なWAF機能）
- **Enterprise**: カスタム料金（フルカスタマイズ）

医療アプリには**Proプラン**以上を推奨します。

## 🚀 実装の優先度

1. **高**: OWASP Core Rule Set（基本的なWeb攻撃防御）
2. **高**: Rate Limiting（API濫用防止）  
3. **中**: Bot Fight Mode（ボット攻撃防止）
4. **中**: カスタムルール（アプリ特有の防御）
5. **低**: Advanced DDoS（大規模攻撃対策）

---

**📝 注意**: この設定により、タップカルテのセキュリティが大幅に向上し、OWASP Top 10の脆弱性に対する防御が強化されます。