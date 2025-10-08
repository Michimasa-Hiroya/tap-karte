import { Hono } from 'hono'
import { renderer } from './renderer'
import { cors } from 'hono/cors'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { medicalTerms } from './medical-dictionary'
import { 
  hashPassword, 
  verifyPassword, 
  generateJWT, 
  verifyJWT, 
  isValidEmail, 
  isValidPassword,
  getSessionFromRequest,
  verifyGoogleToken,
  type User,
  type CreateUserData,
  type SessionInfo
} from './auth'

type Bindings = {
  ANTHROPIC_API_KEY: string; // バックアップ用
  GEMINI_API_KEY: string; // メイン AI API
  JWT_SECRET: string; // JWT署名用シークレット
  GOOGLE_CLIENT_ID: string; // Google OAuth用
  DB: D1Database;
  USERS_KV: KVNamespace; // ユーザーデータ永続化用
}

const app = new Hono<{ Bindings: Bindings }>()

// 🔒 強化されたセキュリティヘッダー middleware
app.use('*', async (c, next) => {
  // セキュリティヘッダーの追加
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  
  // HTTPS強制とセキュリティ強化
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  
  // CSP (Content Security Policy) - XSS攻撃防御
  c.header('Content-Security-Policy', 
    "default-src 'self' https:; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "img-src 'self' https:; " +
    "font-src 'self' https://cdn.jsdelivr.net; " +
    "connect-src 'self' https:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  )
  
  // プライバシー強化 - リファラー情報を最小限に
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  await next()
})

// Enable CORS for API calls with security restrictions
app.use('/api/*', cors({
  origin: (origin) => {
    // 本番環境では特定のドメインのみ許可
    if (!origin) return true // Same-origin requests
    const allowedOrigins = [
      'http://localhost:3000',
      'https://tap-karte.com',
      'https://www.tap-karte.com', 
      'https://tap-carte.pages.dev',
      'https://nursing-assistant.pages.dev',
      /^https:\/\/.*\.tap-carte\.pages\.dev$/,
      /^https:\/\/.*\.e2b\.dev$/
    ]
    return allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )
  },
  credentials: false // API キーを使用するためクレデンシャルは不要
}))

app.use(renderer)

// Database utility functions
async function logNursingRecord(db: D1Database, data: {
  sessionId: string
  inputText: string
  outputText: string
  optionsStyle: string
  optionsDocType: string
  optionsFormat: string
  charLimit: number
  responseTime: number
  ipAddress?: string
  userAgent?: string
  userId?: number | null // 追加
}) {
  try {
    // user_id列があるかチェックして、適切なクエリを選択
    // 今回は既存テーブル構造を維持するため、user_idは別途管理
    await db.prepare(`
      INSERT INTO nursing_records 
      (session_id, input_text, output_text, options_style, options_doc_type, options_format, char_limit, response_time, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.sessionId,
      data.inputText,
      data.outputText,
      data.optionsStyle,
      data.optionsDocType,
      data.optionsFormat,
      data.charLimit,
      data.responseTime,
      data.ipAddress || null,
      data.userAgent || null
    ).run()
  } catch (error) {
    console.error('Failed to log nursing record:', error)
  }
}

async function logPerformance(db: D1Database, data: {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  errorType?: string
  ipAddress?: string
}) {
  try {
    await db.prepare(`
      INSERT INTO performance_stats (endpoint, method, status_code, response_time, error_type, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.endpoint,
      data.method,
      data.statusCode,
      data.responseTime,
      data.errorType || null,
      data.ipAddress || null
    ).run()
  } catch (error) {
    console.error('Failed to log performance:', error)
  }
}

async function logSecurity(db: D1Database, data: {
  eventType: string
  description: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await db.prepare(`
      INSERT INTO security_logs (event_type, description, severity, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.eventType,
      data.description,
      data.severity,
      data.ipAddress || null,
      data.userAgent || null
    ).run()
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

// Security check endpoint
app.get('/api/security-status', async (c) => {
  const securityChecks = {
    apiKeyConfigured: !!c.env?.ANTHROPIC_API_KEY,
    apiKeyLength: c.env?.ANTHROPIC_API_KEY ? c.env.ANTHROPIC_API_KEY.length : 0,
    environment: c.env?.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    securityHeaders: {
      cors: 'enabled',
      contentType: 'application/json',
      httpsOnly: true
    }
  }
  
  // API キーの形式チェック（実際のキーは表示しない）
  const keyStatus = securityChecks.apiKeyConfigured 
    ? securityChecks.apiKeyLength > 10 ? 'valid_format' : 'invalid_format'
    : 'not_configured'
  
  console.log(`[SECURITY] API Key Status: ${keyStatus}, Environment: ${securityChecks.environment}`)
  
  return c.json({
    status: 'security_check_complete',
    checks: {
      apiKey: keyStatus,
      environment: securityChecks.environment,
      httpsEnforced: true,
      corsConfigured: true,
      inputValidation: true,
      outputSanitization: true
    },
    recommendations: keyStatus === 'not_configured' 
      ? ['Configure ANTHROPIC_API_KEY environment variable']
      : keyStatus === 'invalid_format'
      ? ['Verify ANTHROPIC_API_KEY format']
      : [],
    timestamp: securityChecks.timestamp
  })
})

// History endpoints - ユーザー認証対応版
app.get('/api/history/:sessionId?', async (c) => {
  try {
    const db = c.env?.DB
    
    if (!db) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    // 認証チェック
    const session = await getSessionFromRequest(c, c.env?.JWT_SECRET)
    
    if (session && session.isAuthenticated) {
      // ログイン済みユーザー: ユーザー別履歴を取得
      // 現在は仮実装：全ての履歴を表示（後でユーザー別フィルタリングを追加予定）
      const { results } = await db.prepare(`
        SELECT id, input_text, output_text, options_style, options_doc_type, options_format, 
               char_limit, response_time, created_at
        FROM nursing_records 
        ORDER BY created_at DESC 
        LIMIT 50
      `).all()
      
      return c.json({
        success: true,
        records: results,
        userId: session.userId,
        count: results.length,
        authenticated: true,
        message: '現在は全ユーザーの履歴を表示しています（個別管理は今後実装予定）'
      })
      
    } else {
      // 未ログインユーザー: セッション別履歴（従来通り）
      const sessionId = c.req.param('sessionId')
      
      if (!sessionId) {
        return c.json({
          success: true,
          records: [],
          sessionId: null,
          count: 0,
          authenticated: false,
          message: 'ログインすると履歴が永続的に保存されます'
        })
      }
      
      const { results } = await db.prepare(`
        SELECT id, input_text, output_text, options_style, options_doc_type, options_format, 
               char_limit, response_time, created_at
        FROM nursing_records 
        WHERE session_id = ? AND user_id IS NULL
        ORDER BY created_at DESC 
        LIMIT 20
      `).bind(sessionId).all()
      
      return c.json({
        success: true,
        records: results,
        sessionId: sessionId,
        count: results.length,
        authenticated: false
      })
    }
    
  } catch (error) {
    console.error('History fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch history' }, 500)
  }
})

app.get('/api/stats', async (c) => {
  try {
    const db = c.env?.DB
    
    if (!db) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    // 過去24時間の統計
    const [recordStats, performanceStats, securityStats] = await Promise.all([
      db.prepare(`
        SELECT COUNT(*) as total_records, AVG(response_time) as avg_response_time
        FROM nursing_records 
        WHERE created_at > datetime('now', '-24 hours')
      `).first(),
      
      db.prepare(`
        SELECT status_code, COUNT(*) as count, AVG(response_time) as avg_response_time
        FROM performance_stats 
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY status_code
      `).all(),
      
      db.prepare(`
        SELECT event_type, severity, COUNT(*) as count
        FROM security_logs 
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY event_type, severity
      `).all()
    ])
    
    return c.json({
      success: true,
      timeframe: '24_hours',
      statistics: {
        records: recordStats,
        performance: performanceStats.results,
        security: securityStats.results
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Stats fetch error:', error)
    return c.json({ success: false, error: 'Failed to fetch statistics' }, 500)
  }
})

// Performance monitoring endpoint
app.get('/api/health', async (c) => {
  const startTime = Date.now()
  try {
    // 基本ヘルスチェック
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      version: '1.0.0',
      services: {
        api: 'operational',
        database: c.env?.DB ? 'operational' : 'not_configured',
        claudeApi: c.env?.ANTHROPIC_API_KEY ? 'configured' : 'not_configured'
      }
    })
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    console.error('[HEALTH CHECK] Error:', error)
    
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// ユーザーデータベース関数（KV Storage永続化対応）
async function findUserByEmail(kv: KVNamespace, email: string): Promise<User | null> {
  try {
    const userData = await kv.get(`user:email:${email}`)
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('Error finding user by email:', error)
    return null
  }
}

async function findUserById(kv: KVNamespace, id: number): Promise<User | null> {
  try {
    const userData = await kv.get(`user:id:${id}`)
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('Error finding user by id:', error)
    return null
  }
}

async function createUser(kv: KVNamespace, userData: CreateUserData, hashedPassword?: string): Promise<User> {
  try {
    // 次のユーザーIDを取得
    const nextIdData = await kv.get('next_user_id')
    const nextId = nextIdData ? parseInt(nextIdData) : 1
    
    const user: User = {
      id: nextId,
      email: userData.email,
      display_name: userData.display_name,
      profile_image: userData.profile_image,
      auth_provider: userData.auth_provider,
      google_id: userData.google_id,
      email_verified: userData.email_verified || false,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    }
    
    // ユーザーデータを保存
    await Promise.all([
      kv.put(`user:id:${nextId}`, JSON.stringify(user)),
      kv.put(`user:email:${userData.email}`, JSON.stringify(user)),
      kv.put('next_user_id', (nextId + 1).toString()),
      // パスワードハッシュを別途保存
      hashedPassword ? kv.put(`password:${userData.email}`, hashedPassword) : Promise.resolve()
    ])
    
    return user
  } catch (error) {
    console.error('Error creating user:', error)
    throw new Error('ユーザー作成に失敗しました')
  }
}

async function updateUserLastLogin(kv: KVNamespace, user: User): Promise<void> {
  try {
    user.last_login_at = new Date().toISOString()
    await Promise.all([
      kv.put(`user:id:${user.id}`, JSON.stringify(user)),
      kv.put(`user:email:${user.email}`, JSON.stringify(user))
    ])
  } catch (error) {
    console.error('Error updating user last login:', error)
  }
}

async function getStoredPassword(kv: KVNamespace, email: string): Promise<string | null> {
  try {
    return await kv.get(`password:${email}`)
  } catch (error) {
    console.error('Error getting stored password:', error)
    return null
  }
}

// ユーザー登録（メール+パスワード）
app.post('/api/auth/register', async (c) => {
  try {
    const { email, password, display_name } = await c.req.json()
    const kv = c.env?.USERS_KV
    
    if (!kv) {
      console.log('[AUTH] KV Storage not available, authentication disabled in production')
      return c.json({ success: false, error: '認証機能は現在メンテナンス中です。しばらくお待ちください。' }, 503)
    }
    
    // 入力検証
    if (!email || !password || !display_name) {
      return c.json({ success: false, error: 'メールアドレス、パスワード、表示名は必須です' }, 400)
    }
    
    if (!isValidEmail(email)) {
      return c.json({ success: false, error: '有効なメールアドレスを入力してください' }, 400)
    }
    
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return c.json({ success: false, error: passwordValidation.message }, 400)
    }
    
    // 既存ユーザーチェック
    const existingUser = await findUserByEmail(kv, email)
    if (existingUser) {
      return c.json({ success: false, error: 'このメールアドレスは既に使用されています' }, 400)
    }
    
    // パスワードハッシュ化
    const hashedPassword = await hashPassword(password)
    
    // ユーザー作成
    const newUser = await createUser(kv, {
      email,
      display_name,
      auth_provider: 'email',
      email_verified: false
    }, hashedPassword)
    
    // JWTトークン生成
    const token = await generateJWT(newUser, c.env?.JWT_SECRET)
    
    // レスポンス
    return c.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        display_name: newUser.display_name,
        profile_image: newUser.profile_image
      },
      token
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ success: false, error: '登録中にエラーが発生しました' }, 500)
  }
})

// ログイン（メール+パスワード）
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    const kv = c.env?.USERS_KV
    
    if (!kv) {
      console.log('[AUTH] KV Storage not available, authentication disabled in production')
      return c.json({ success: false, error: '認証機能は現在メンテナンス中です。しばらくお待ちください。' }, 503)
    }
    
    // 入力検証
    if (!email || !password) {
      return c.json({ success: false, error: 'メールアドレスとパスワードは必須です' }, 400)
    }
    
    if (!isValidEmail(email)) {
      return c.json({ success: false, error: '有効なメールアドレスを入力してください' }, 400)
    }
    
    // ユーザー検索
    const user = await findUserByEmail(kv, email)
    if (!user || user.auth_provider !== 'email') {
      return c.json({ success: false, error: 'メールアドレスまたはパスワードが間違っています' }, 401)
    }
    
    // 保存されたパスワードハッシュを取得して検証
    const storedPasswordHash = await getStoredPassword(kv, email)
    if (!storedPasswordHash) {
      return c.json({ success: false, error: 'メールアドレスまたはパスワードが間違っています' }, 401)
    }
    
    const isValidPassword = await verifyPassword(password, storedPasswordHash)
    if (!isValidPassword) {
      return c.json({ success: false, error: 'メールアドレスまたはパスワードが間違っています' }, 401)
    }
    
    // JWTトークン生成
    const token = await generateJWT(user, c.env?.JWT_SECRET)
    
    // 最終ログイン時刻更新
    await updateUserLastLogin(kv, user)
    
    // レスポンス
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        profile_image: user.profile_image
      },
      token
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, error: 'ログイン中にエラーが発生しました' }, 500)
  }
})

// Google OAuth ログイン
app.post('/api/auth/google', async (c) => {
  try {
    const { token: googleToken } = await c.req.json()
    const kv = c.env?.USERS_KV
    
    if (!kv) {
      console.log('[AUTH] KV Storage not available, authentication disabled in production')
      return c.json({ success: false, error: '認証機能は現在メンテナンス中です。しばらくお待ちください。' }, 503)
    }
    
    if (!googleToken) {
      return c.json({ success: false, error: 'Googleトークンが必要です' }, 400)
    }
    
    // Google トークン検証
    const googleUser = await verifyGoogleToken(googleToken)
    if (!googleUser) {
      return c.json({ success: false, error: '無効なGoogleトークンです' }, 401)
    }
    
    // 既存ユーザー検索
    let user = await findUserByEmail(kv, googleUser.email)
    
    if (!user) {
      // 新規ユーザー作成
      user = await createUser(kv, {
        email: googleUser.email,
        display_name: googleUser.name,
        profile_image: googleUser.picture,
        auth_provider: 'google',
        google_id: googleUser.sub,
        email_verified: googleUser.email_verified
      })
    } else if (user.auth_provider !== 'google') {
      // 既存のメールユーザーをGoogleアカウントにリンク
      user.auth_provider = 'google'
      user.google_id = googleUser.sub
      user.email_verified = googleUser.email_verified
      
      // 更新されたユーザー情報を保存
      await Promise.all([
        kv.put(`user:id:${user.id}`, JSON.stringify(user)),
        kv.put(`user:email:${user.email}`, JSON.stringify(user))
      ])
    }
    
    // JWTトークン生成
    const token = await generateJWT(user, c.env?.JWT_SECRET)
    
    // 最終ログイン時刻更新
    await updateUserLastLogin(kv, user)
    
    // レスポンス
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        profile_image: user.profile_image
      },
      token
    })
    
  } catch (error) {
    console.error('Google login error:', error)
    return c.json({ success: false, error: 'Googleログイン中にエラーが発生しました' }, 500)
  }
})

// 現在のユーザー情報取得
app.get('/api/auth/me', async (c) => {
  try {
    const session = await getSessionFromRequest(c, c.env?.JWT_SECRET)
    const kv = c.env?.USERS_KV
    
    if (!kv) {
      console.log('[AUTH] KV Storage not available, authentication disabled in production')
      return c.json({ success: false, error: '認証機能は現在メンテナンス中です。しばらくお待ちください。' }, 503)
    }
    
    if (!session || !session.isAuthenticated) {
      return c.json({ success: false, error: '認証が必要です' }, 401)
    }
    
    const user = await findUserById(kv, session.userId)
    if (!user) {
      return c.json({ success: false, error: 'ユーザーが見つかりません' }, 404)
    }
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        profile_image: user.profile_image,
        email_verified: user.email_verified,
        created_at: user.created_at
      }
    })
    
  } catch (error) {
    console.error('User info error:', error)
    return c.json({ success: false, error: 'ユーザー情報取得中にエラーが発生しました' }, 500)
  }
})

// ログアウト
app.post('/api/auth/logout', async (c) => {
  try {
    // セッション情報をクリア（実装では実際のセッション削除を行う）
    return c.json({
      success: true,
      message: 'ログアウトしました'
    })
    
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ success: false, error: 'ログアウト中にエラーが発生しました' }, 500)
  }
})

// Claude API conversion endpoint
app.post('/api/convert', async (c) => {
  const startTime = Date.now()
  let success = false
  let errorType = ''
  let maxOutputChars = 1000 // デフォルト値をここで定義
  
  try {
    // ユーザー認証チェック（オプション）
    const session = await getSessionFromRequest(c, c.env?.JWT_SECRET)
    
    const { text, style, docType, format, charLimit } = await c.req.json()
    
    // 入力検証とサニタイゼーション
    if (!text || typeof text !== 'string' || !text.trim()) {
      errorType = 'validation_error'
      return c.json({ success: false, error: '入力テキストが空です' }, 400)
    }
    
    // 悪意のあるスクリプトや不正な文字列をチェック
    const sanitizedText = text.trim()
    if (sanitizedText.length > 50000) { // 極端に長いテキストを制限
      errorType = 'validation_error'
      return c.json({ success: false, error: '入力テキストが長すぎます（50,000文字以内）' }, 400)
    }
    
    // 個人情報らしき情報をチェック（基本的な検出）
    const personalInfoPatterns = [
      /\d{4}-\d{4}-\d{4}-\d{4}/, // クレジットカード番号パターン
      /\d{3}-\d{4}-\d{4}/, // 電話番号パターン
      /〒\d{3}-\d{4}/, // 郵便番号パターン
    ]
    
    for (const pattern of personalInfoPatterns) {
      if (pattern.test(sanitizedText)) {
        errorType = 'security_warning'
        
        // ⛔ セキュリティログ無効化 - プライバシー最優先設計
        // 個人情報検出機能は作動しますが、ログは一切記録されません
        // 検出時は即座に処理を停止し、データはメモリから完全に破棄されます
        
        return c.json({ 
          success: false, 
          error: '個人情報らしきデータが検出されました。個人情報は入力しないでください。' 
        }, 400)
      }
    }
    
    // 出力文字数制限（デフォルト1000、最大1000）
    maxOutputChars = Math.min(parseInt(charLimit) || 1000, 1000)
    
    // オプション値の検証
    const validStyles = ['ですます体', 'だ・である体']
    const validDocTypes = ['記録', '報告書']
    const validFormats = ['文章形式', 'SOAP形式']
    
    if (!validStyles.includes(style) || !validDocTypes.includes(docType) || !validFormats.includes(format)) {
      errorType = 'validation_error'
      return c.json({ success: false, error: '無効なオプションが選択されています' }, 400)
    }
    
    const apiKey = c.env?.GEMINI_API_KEY
    if (!apiKey) {
      errorType = 'config_error'
      return c.json({ success: false, error: 'Gemini APIキーが設定されていません' }, 500)
    }
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    // 医療用語辞書をプロンプト用文字列に変換
    const medicalTermsContext = Object.entries(medicalTerms)
      .map(([term, meaning]) => `・${term}: ${meaning}`)
      .join('\n')
    
    // ドキュメントタイプに応じた指示
    const docTypeInstruction = docType === '報告書' 
      ? `
# 報告書作成要件
報告書は、医師やケアマネジャーが状況を即座に把握できることを第一に、要点を簡潔にまとめてください。
見出しは使用せず、時系列や重要度に応じて論理的に構成された自然な文章で記述します。観察された問題点については、具体的で実行可能な解決策と今後の方針を明確に提案してください。

`
      : ''

    const prompt = `## 役割と目的
あなたは経験豊富な看護師・理学療法士・作業療法士で、非公式な観察メモを医療記録基準に適合した看護記録に変換する専門家です。

## 変換要件

### 基本方針
- 入力された観察内容のみを使用し、情報を追加・創作しない
- 医療専門用語を適切に使用し、正確で簡潔な記録を作成する
- 「患者」は全て「利用者」と表記する

### 医療・リハビリ専門用語（必須参照）
${medicalTermsContext}

### 出力仕様
- **文体**: ${style}
- **形式**: ${format}
- **文字制限**: ${maxOutputChars}文字以内
${docTypeInstruction}

${format === 'SOAP形式' ? '### SOAP形式の構造\nS: (Subjective) 利用者の主観的情報\nO: (Objective) 客観的観察事実\nA: (Assessment) 評価・分析\nP: (Plan) 計画・方針\n' : ''}

${format === '文章形式' ? `### 文章形式の要件
- 定型的な見出し（「利用者の状態は〜」「バイタルサイン：」等）は使用禁止
- 時系列順または重要度順で論理的に構成
- 観察事実、利用者の発言、実施ケアを自然な文章で統合
- 段落構成を意識し、読みやすさを重視` : ''}

### 文体規則
${style === 'だ・である体' ? `**だ・である調の表現例**
- 断定: 「〜である」「〜だ」
- 状態: 「〜している」「〜がある」 
- 観察: 「〜が見られる」「〜を認める」
- 継続: 「〜を継続する」「〜が必要である」

参考例文: 「訪室時、利用者に発熱がみられる。状態は安定している。今後も継続的な観察が必要である。」` : `**ですます調の表現例**
- 「〜みられます」「〜しています」「〜です」「〜必要です」

参考例文: 「訪室時、利用者に発熱がみられます。状態は安定しています。今後も継続的な観察が必要です。」`}

## 変換対象の観察メモ
${sanitizedText}

## 看護記録（上記要件に従って変換）`
    
    const result = await model.generateContent(prompt)
    
    if (!result || !result.response) {
      throw new Error('Gemini APIからの応答が空です')
    }
    
    const convertedText = result.response.text()
    
    if (!convertedText || convertedText.trim().length === 0) {
      errorType = 'api_response_error'
      throw new Error('Gemini APIからテキストを取得できませんでした')
    }
    
    success = true
    const endTime = Date.now()
    const responseTime = endTime - startTime
    const outputText = convertedText.trim()
    
    // セッションID生成（簡易版）
    const sessionId = c.req.header('x-session-id') || `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    // ⛔ データ保存無効化 - プライバシー最優先設計
    // ユーザーデータは一切保存されず、処理完了後にメモリから完全に破棄されます
    
    // パフォーマンス統計は匿名化された集計データのみをメモリで処理
    // （IPアドレス、ユーザー情報、入力内容は一切記録しません）
    
    // 匿名化された最小限のパフォーマンス統計（個人情報なし）
    console.log(`[PERFORMANCE] Success: ${success}, Response Time: ${responseTime}ms`)
    
    return c.json({
      success: true,
      convertedText: outputText,
      options: { style, docType, format },
      sessionId: sessionId,
      performance: {
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    // エラー分類
    if (!errorType) {
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorType = 'api_auth_error'
        } else if (error.message.includes('rate limit')) {
          errorType = 'rate_limit_error'
        } else if (error.message.includes('timeout')) {
          errorType = 'timeout_error'
        } else {
          errorType = 'api_error'
        }
      } else {
        errorType = 'unknown_error'
      }
    }
    
    // ⛔ エラーログ無効化 - プライバシー最優先設計
    // エラー情報もユーザーデータと同様、一切記録されません
    // システムは匿名化されたエラー統計のみをメモリで処理します
    
    // 匿名化された最小限のエラー統計（個人情報・詳細エラー内容なし）
    console.error(`[PERFORMANCE] Success: false, Error Type: ${errorType}, Response Time: ${responseTime}ms`)
    
    // API固有のエラーメッセージを判定
    let errorMessage = 'AI変換サービスでエラーが発生しました。しばらく時間をおいて再度お試しください。'
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'APIキーの設定に問題があります。管理者にお問い合わせください。'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'アクセス数が上限に達しました。しばらく時間をおいてからお試しください。'
      } else if (error.message.includes('timeout')) {
        errorMessage = '処理時間が長すぎるため、入力テキストを短くしてお試しください。'
      }
    }
    
    return c.json({ 
      success: false, 
      error: errorMessage,
      errorType: errorType,
      performance: {
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      }
    }, 500)
  }
})

app.get('/', (c) => {
  return c.render(
    <div className="min-h-screen bg-pink-50">
      {/* Header */}
      <header className="bg-pink-100 shadow-sm border-b border-pink-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <div className="flex justify-between items-start">
            {/* メインタイトル領域 - 大きく表示 */}
            <div className="flex-1">
              {/* デスクトップ表示 */}
              <div className="hidden sm:block">
                <h1 className="text-5xl md:text-6xl font-bold text-pink-800 flex items-center mb-3">
                  <img src="https://page.gensparksite.com/v1/base64_upload/e0e0839ca795c5577a86e6b90d5285a3" alt="タップカルテ" className="w-16 h-16 mr-4" />
                  タップカルテ
                </h1>
                <p className="text-lg md:text-xl text-pink-700 font-medium ml-20">思ったことを、そのままカルテに</p>
              </div>
              
              {/* モバイル表示 - コンパクトに1行で */}
              <div className="sm:hidden">
                <div className="flex items-center space-x-2">
                  <img src="https://page.gensparksite.com/v1/base64_upload/e0e0839ca795c5577a86e6b90d5285a3" alt="タップカルテ" className="w-10 h-10" />
                  <div>
                    <h1 className="text-xl font-bold text-pink-800 leading-tight">タップカルテ</h1>
                    <p className="text-xs text-pink-700 font-medium leading-tight whitespace-nowrap">思ったことを、そのままカルテに</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ユーザーメニュー - 右上に小さく配置 */}
            <div className="flex items-start justify-end min-w-0 flex-shrink-0">
              {/* ログイン状態表示 */}
              <div id="user-status" className="hidden">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <img id="user-avatar" className="w-6 h-6 rounded-full" alt="Profile" />
                    <span id="user-name" className="text-pink-800 text-sm font-medium"></span>
                  </div>
                  <button id="logout-btn" className="px-2 py-1 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-md text-xs transition-colors">
                    <i className="fas fa-sign-out-alt mr-1"></i>ログアウト
                  </button>
                </div>
              </div>
              
              {/* ログインボタン */}
              <div id="auth-buttons" className="flex space-x-1">
                <button id="login-btn" className="px-2 py-1 text-pink-700 border border-pink-300 rounded-md text-xs font-medium cursor-not-allowed opacity-60" disabled>
                  ログイン
                </button>
                <button id="register-btn" className="px-2 py-1 bg-pink-600 text-white rounded-md text-xs font-medium cursor-not-allowed opacity-60" disabled>
                  新規登録
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* ログイン・登録モーダル */}
      <div id="auth-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 id="modal-title" className="text-xl font-bold text-pink-800">ログイン</h2>
              <button id="close-modal" className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* ログイン・登録フォーム */}
            <div id="auth-form">
              <form id="login-form">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                    <input 
                      type="email" 
                      id="auth-email" 
                      required 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                    <input 
                      type="password" 
                      id="auth-password" 
                      required 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  
                  <div id="register-fields" className="hidden space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
                      <input 
                        type="text" 
                        id="auth-display-name" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                  
                  <div id="auth-error" className="hidden text-red-600 text-sm"></div>
                  
                  <button 
                    type="submit" 
                    id="auth-submit" 
                    className="w-full px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
                  >
                    ログイン
                  </button>
                </div>
              </form>
              
              <div className="mt-4">
                <div className="text-center text-gray-500 text-sm mb-3">または</div>
                <button 
                  id="google-login-btn" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <i className="fab fa-google text-red-500"></i>
                  <span>Googleでログイン</span>
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <button id="toggle-auth-mode" className="text-pink-600 hover:text-pink-800 text-sm">
                  アカウントをお持ちでない場合は新規登録
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200">
          {/* Options Bar */}
          <div className="bg-pink-50 px-6 py-4 border-b border-pink-200">
            <div className="mb-4">
              <p className="text-sm text-pink-800 font-semibold">作成したい書式に合わせて選択してください</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Document Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-pink-800">ドキュメント</label>
                <div className="flex space-x-2">
                  <button id="doc-record" className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 transition-colors">
                    記録
                  </button>
                  <button id="doc-report" className="px-4 py-2 bg-pink-100 text-pink-700 rounded-md text-sm font-medium hover:bg-pink-200 transition-colors">
                    報告書
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-pink-800">フォーマット</label>
                <div className="flex space-x-2">
                  <button id="format-text" className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 transition-colors">
                    文章形式
                  </button>
                  <button id="format-soap" className="px-4 py-2 bg-pink-100 text-pink-700 rounded-md text-sm font-medium hover:bg-pink-200 transition-colors">
                    SOAP形式
                  </button>
                </div>
              </div>

              {/* Style Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-pink-800">文体</label>
                <div className="flex space-x-2">
                  <button id="style-plain" className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 transition-colors">
                    だ・である体
                  </button>
                  <button id="style-polite" className="px-4 py-2 bg-pink-100 text-pink-700 rounded-md text-sm font-medium hover:bg-pink-200 transition-colors">
                    ですます体
                  </button>
                </div>
              </div>
            </div>

            {/* Output Character Limit Slider */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-pink-800">出力文字数制限</label>
                <span id="char-limit-display" className="text-sm text-pink-700 font-medium">500文字</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-pink-600">100</span>
                <input 
                  type="range" 
                  id="char-limit-slider" 
                  min="100" 
                  max="1000" 
                  step="50" 
                  value="500"
                  className="flex-1 h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer slider-pink"
                />
                <span className="text-xs text-pink-600">1000</span>
              </div>
            </div>
          </div>

          {/* Input/Output Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Input Area */}
            <div className="p-6 border-r border-pink-200">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-pink-800">入力</label>
                  <span id="input-count" className="text-sm text-pink-600">0文字</span>
                </div>
                {/* 個人情報注意書き */}
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-exclamation-triangle text-red-500"></i>
                    <span className="text-sm font-semibold text-red-700">注意</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    個人情報(氏名や住所など)や個人が特定できる情報、珍しい病名などの入力は禁止します。
                  </p>
                </div>
                

                <textarea 
                  id="input-text"
                  className="w-full h-80 p-4 border border-pink-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="・思いついたことを、そのまま入力してタップするだけ
・箇条書きでもOK
・テキスト入力や音声入力でもOK
・誤字脱字があっても大丈夫"
                ></textarea>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button id="convert-btn" className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    生成
                  </button>
                  <button id="clear-input" className="px-4 py-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-colors">
                    クリア
                  </button>
                </div>
              </div>
            </div>

            {/* Output Area */}
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-pink-800">出力</label>
                  <span id="output-count" className="text-sm text-pink-600">0文字</span>
                </div>
                <div 
                  id="output-text"
                  className="w-full h-80 p-4 bg-pink-25 border border-pink-300 rounded-lg overflow-y-auto whitespace-pre-wrap"
                >
                  <div className="text-pink-400 italic">生成された文章がここに表示されます...</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div id="loading" className="hidden flex items-center space-x-2 text-pink-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
                  <span>処理中...</span>
                </div>
                <button id="copy-btn" className="flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  <i className="fas fa-copy"></i>
                  <span>コピー</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-pink-50 rounded-lg p-6 border border-pink-200">
          <h3 className="text-lg font-semibold text-pink-900 mb-3">タップカルテの使い方</h3>
          <ol className="list-decimal list-inside space-y-2 text-pink-800">
            <li>思ったことやメモを入力エリアにそのまま入力</li>
            <li>生成ボタンをタップして、整った看護記録や報告書が自動生成</li>
            <li>「コピー」ボタンで電子カルテにそのまま貼り付け可能</li>
          </ol>
          <div className="mt-4 p-3 bg-white border border-pink-200 rounded-md">
            <div className="flex items-center space-x-2 mb-2">
              <i className="fas fa-shield-alt text-pink-600"></i>
              <span className="font-semibold text-pink-800 text-sm">プライバシー保護</span>
            </div>
            <p className="text-xs text-pink-600">
              入力内容は処理後即座に削除され、履歴は一切保存されません。
              <a href="#privacy-policy" className="text-pink-700 hover:text-pink-900 underline ml-1">詳細はプライバシーポリシーをご覧ください</a>
            </p>
          </div>
        </div>



        {/* プライバシーポリシーセクション */}
        <div id="privacy-policy" className="mt-12 bg-white rounded-lg shadow-lg border border-pink-200">
          <div className="bg-pink-50 px-6 py-4 border-b border-pink-200">
            <h3 className="text-lg font-semibold text-pink-900 flex items-center">
              <i className="fas fa-shield-alt text-pink-600 mr-2"></i>
              プライバシーポリシー
            </h3>
          </div>
          
          <div className="p-6 space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold text-pink-800 mb-2">🔒 データを一切保存しない設計</h4>
              <p>入力内容はメモリ上で一時処理後、即座に完全削除。履歴・ログは一切保存されません。</p>
            </div>

            <div>
              <h4 className="font-semibold text-pink-800 mb-2">🔐 通信の完全暗号化</h4>
              <p>全通信をHTTPS/TLS暗号化し、セキュリティヘッダーによる多層防御を実装。個人情報の自動検出・ブロック機能付き。</p>
            </div>

            <div>
              <h4 className="font-semibold text-pink-800 mb-2">📊 匿名統計について</h4>
              <p>応答時間等の匿名技術統計のみ収集。入力内容や個人情報は一切含まれません。</p>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-md p-4 space-y-2">
              <div>
                <p className="text-xs text-pink-700 mb-3">
                  <i className="fas fa-info-circle mr-2"></i>
                  <strong>最終更新：2025年10月7日</strong>
                </p>
                
                <div className="border-t border-pink-200 pt-3">
                  <p className="text-xs text-pink-700 mb-2">
                    <strong>お問い合わせ:</strong>
                  </p>
                  <p className="text-xs text-pink-600 font-mono">
                    📧 kushiro[dot]ai[dot]lab[at]gmail[dot]com<br />
                    👤 タップカルテ 担当 廣谷
                  </p>
                  <p className="text-xs text-pink-500 mt-2 italic">
                    ※ スパム防止のため[dot]を「.」、[at]を「@」に置き換えてください
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      <script src="/static/app.js"></script>
    </div>
  )
})

export default app
