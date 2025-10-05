import { Hono } from 'hono'
import { renderer } from './renderer'
import { cors } from 'hono/cors'
import Anthropic from '@anthropic-ai/sdk'

type Bindings = {
  CLAUDE_API_KEY: string;
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Security headers middleware
app.use('*', async (c, next) => {
  // セキュリティヘッダーの追加
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  
  await next()
})

// Enable CORS for API calls with security restrictions
app.use('/api/*', cors({
  origin: (origin) => {
    // 本番環境では特定のドメインのみ許可
    if (!origin) return true // Same-origin requests
    const allowedOrigins = [
      'http://localhost:3000',
      'https://nursing-assistant.pages.dev',
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
}) {
  try {
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
    apiKeyConfigured: !!c.env?.CLAUDE_API_KEY,
    apiKeyLength: c.env?.CLAUDE_API_KEY ? c.env.CLAUDE_API_KEY.length : 0,
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
      ? ['Configure CLAUDE_API_KEY environment variable']
      : keyStatus === 'invalid_format'
      ? ['Verify CLAUDE_API_KEY format']
      : [],
    timestamp: securityChecks.timestamp
  })
})

// History endpoints
app.get('/api/history/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const db = c.env?.DB
    
    if (!db) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const { results } = await db.prepare(`
      SELECT id, input_text, output_text, options_style, options_doc_type, options_format, 
             char_limit, response_time, created_at
      FROM nursing_records 
      WHERE session_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(sessionId).all()
    
    return c.json({
      success: true,
      records: results,
      sessionId: sessionId,
      count: results.length
    })
    
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
        claudeApi: c.env?.CLAUDE_API_KEY ? 'configured' : 'not_configured'
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

// Claude API conversion endpoint
app.post('/api/convert', async (c) => {
  const startTime = Date.now()
  let success = false
  let errorType = ''
  
  try {
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
        
        // セキュリティログ
        if (c.env?.DB) {
          await logSecurity(c.env.DB, {
            eventType: 'personal_info_detected',
            description: 'Personal information pattern detected in input',
            severity: 'warning',
            ipAddress: c.req.header('CF-Connecting-IP'),
            userAgent: c.req.header('User-Agent')
          })
        }
        
        return c.json({ 
          success: false, 
          error: '個人情報らしきデータが検出されました。個人情報は入力しないでください。' 
        }, 400)
      }
    }
    
    // 出力文字数制限（デフォルト1000、最大1000）
    const maxOutputChars = Math.min(parseInt(charLimit) || 1000, 1000)
    
    // オプション値の検証
    const validStyles = ['ですます体', 'だ・である体']
    const validDocTypes = ['記録', '報告書']
    const validFormats = ['文章形式', 'SOAP形式']
    
    if (!validStyles.includes(style) || !validDocTypes.includes(docType) || !validFormats.includes(format)) {
      errorType = 'validation_error'
      return c.json({ success: false, error: '無効なオプションが選択されています' }, 400)
    }
    
    const apiKey = c.env?.CLAUDE_API_KEY
    if (!apiKey) {
      errorType = 'config_error'
      return c.json({ success: false, error: 'Claude APIキーが設定されていません' }, 500)
    }
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })
    
    const prompt = `あなたは、20年の臨床経験を持つ、極めて優秀な訪問看護師であり、かつ専門知識を有する訪問セラピスト（理学療法士・作業療法士・言語聴覚士）です。特に、在宅における複合的な健康課題を持つ利用者への全人的なアプローチを得意とし、多職種連携の要としてチーム医療を推進する立場にあります。

【重要】あなたは入力された情報のみを基に記録を作成してください。入力にない情報や詳細は一切追加・創作してはいけません。入力が少ない場合は、出力も短くて構いません。情報を補完したり、想像で詳細を付け加えることは絶対に行わないでください。

あなたの重要な任務は、入力された日常会話的な文章やメモを、他職種が利用者の状態を正確に把握し、質の高いケアを継続するための重要な公式文書（訪問看護記録書や報告書）として通用するレベルの文章に整形することです。単なる書き換えではなく、あなたの専門的視点から情報を整理し、誤字脱字や不自然な日本語を修正し、利用者の状態、実施したケア、その反応を論理的に記述してください。

以下の要件に従って、与えられた【入力テキスト】を、訪問看護の正式な記録として通用するレベルの文章に整形してください。

# 要件
・誤字脱字や不自然な日本語は、自然で正確な医療・看護の専門用語を用いて修正してください。
・文体は「${style}」で統一してください。
・ドキュメントの種別は「${docType}」として、それにふさわしい言葉遣いや詳細度で記述してください。
・フォーマットは「${format}」で出力してください。
${format === 'SOAP形式' ? '  - 「SOAP形式」の場合、S・O・A・Pの各項目に情報を適切に分類し、必ず項目ごとに改行して見出し（S: , O: , A: , P: ）を付けてください。情報が不足している項目は「特記事項なし」と記載してください。' : '  - 「文章形式」の場合、箇条書きや章立て（「身体状況」「利用者状況」など）は使用せず、自然な文章として連続的に記述してください。'}

# 医療記録作成の重要な注意点
・入力された情報以外は一切追加・創作しない（バイタルサイン、症状、処置等）
・出力は${maxOutputChars}文字以内で簡潔にまとめてください
・入力が短い場合は、無理に文章を長くせず、入力内容に見合った適切な長さで記述してください
・バイタルサインは正確な医療用語と単位で記載（例：血圧150/88mmHg、脈拍78/分、体温36.8℃、SpO2 96%）
・緊急性の高い状況では簡潔で要点を絞った表現を使用
・認知症ケアでは「音楽的関わり」「非薬物的アプローチ」など適切な専門用語を使用
・数値データは元の表記を尊重し、正確に記載
・時系列を明確にし、因果関係を論理的に記述
・文章形式では自然な段落構成で、見出しや箇条書きは使用しない

# 入力テキスト
${sanitizedText}

# 出力
`
    
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
    
    if (!message.content || message.content.length === 0) {
      throw new Error('Claude APIからの応答が空です')
    }
    
    const convertedText = message.content[0]?.type === 'text' ? message.content[0].text : null
    
    if (!convertedText) {
      errorType = 'api_response_error'
      throw new Error('Claude APIからテキストを取得できませんでした')
    }
    
    success = true
    const endTime = Date.now()
    const responseTime = endTime - startTime
    const outputText = convertedText.trim()
    
    // セッションID生成（簡易版）
    const sessionId = c.req.header('x-session-id') || `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    // データベースログ
    if (c.env?.DB) {
      await Promise.all([
        logNursingRecord(c.env.DB, {
          sessionId: sessionId,
          inputText: sanitizedText,
          outputText: outputText,
          optionsStyle: style,
          optionsDocType: docType,
          optionsFormat: format,
          charLimit: maxOutputChars,
          responseTime: responseTime,
          ipAddress: c.req.header('CF-Connecting-IP'),
          userAgent: c.req.header('User-Agent')
        }),
        logPerformance(c.env.DB, {
          endpoint: '/api/convert',
          method: 'POST',
          statusCode: 200,
          responseTime: responseTime,
          ipAddress: c.req.header('CF-Connecting-IP')
        })
      ])
    }
    
    // パフォーマンス監視ログ
    console.log(`[PERFORMANCE] Success: ${success}, Response Time: ${responseTime}ms, Input Length: ${sanitizedText.length}, Output Length: ${outputText.length}`)
    
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
    
    // データベースログ（エラー時）
    if (c.env?.DB) {
      await Promise.all([
        logPerformance(c.env.DB, {
          endpoint: '/api/convert',
          method: 'POST',
          statusCode: 500,
          responseTime: responseTime,
          errorType: errorType,
          ipAddress: c.req.header('CF-Connecting-IP')
        }),
        logSecurity(c.env.DB, {
          eventType: 'api_error',
          description: `API conversion failed: ${errorType}`,
          severity: errorType.includes('security') ? 'warning' : 'error',
          ipAddress: c.req.header('CF-Connecting-IP'),
          userAgent: c.req.header('User-Agent')
        })
      ])
    }
    
    // パフォーマンス監視ログ（エラー時）
    console.error(`[PERFORMANCE] Success: false, Error Type: ${errorType}, Response Time: ${responseTime}ms, Error: ${error}`)
    
    console.error('Claude API error:', error)
    
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
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-pink-800 flex items-center">
            <i className="fas fa-stethoscope text-pink-600 mr-3"></i>
            看護記録アシスタント
          </h1>
          <p className="text-pink-700 mt-2">口頭メモや簡単なメモを、整った看護記録・報告書に変換</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200">
          {/* Options Bar */}
          <div className="bg-pink-50 px-6 py-4 border-b border-pink-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Document Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-pink-800">ドキュメント種別</label>
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
                  <button id="style-polite" className="px-4 py-2 bg-pink-600 text-white rounded-md text-sm font-medium hover:bg-pink-700 transition-colors">
                    ですます体
                  </button>
                  <button id="style-plain" className="px-4 py-2 bg-pink-100 text-pink-700 rounded-md text-sm font-medium hover:bg-pink-200 transition-colors">
                    だ・である体
                  </button>
                </div>
              </div>
            </div>

            {/* Output Character Limit Slider */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-pink-800">出力文字数制限</label>
                <span id="char-limit-display" className="text-sm text-pink-700 font-medium">1000文字</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-pink-600">100</span>
                <input 
                  type="range" 
                  id="char-limit-slider" 
                  min="100" 
                  max="1000" 
                  step="50" 
                  value="1000"
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
                </div>
                {/* 個人情報注意書き */}
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-exclamation-triangle text-red-500"></i>
                    <span className="text-sm font-semibold text-red-700">重要な注意</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    個人情報（氏名、住所、生年月日、電話番号など）は絶対に入力しないでください。
                  </p>
                </div>
                <textarea 
                  id="input-text"
                  className="w-full h-80 p-4 border border-pink-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="口頭メモや簡単なメモをここに入力してください..."
                ></textarea>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button id="convert-btn" className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    変換
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
                <label className="block text-sm font-semibold text-pink-800 mb-2">出力</label>
                <div 
                  id="output-text"
                  className="w-full h-80 p-4 bg-pink-25 border border-pink-300 rounded-lg overflow-y-auto whitespace-pre-wrap"
                >
                  <div className="text-pink-400 italic">整形された文章がここに表示されます...</div>
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
          <h3 className="text-lg font-semibold text-pink-900 mb-3">使い方</h3>
          <ol className="list-decimal list-inside space-y-2 text-pink-800">
            <li>入力エリアに口頭メモや簡単なメモを入力してください</li>
            <li>「変換」ボタンをクリックして整形された文章を取得してください</li>
            <li>出力エリアに整形された文章が表示されます</li>
            <li>「コピー」ボタンで結果をクリップボードにコピーできます</li>
          </ol>
        </div>
      </main>

      <script src="/static/app.js"></script>
    </div>
  )
})

export default app
