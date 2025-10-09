/**
 * タップカルテ - ミドルウェアシステム
 * 
 * 統一されたミドルウェア関数を提供
 */

import { Context, Next } from 'hono'
import type { CloudflareBindings, ApiError, LogEntry } from '../types'
import { SECURITY_CONFIG, DEBUG_CONFIG } from '../config'
import { logger, getCurrentTimestamp, detectPersonalInfo, logSecurityEvent, detectAnomalousAccess, logApiKeyUsage, generateSessionFingerprint, validateSecureAuthToken } from '../utils'

// ========================================
// 🔐 セキュリティミドルウェア
// ========================================

/**
 * セキュリティヘッダー設定ミドルウェア
 */
export const securityHeaders = () => {
  return async (c: Context, next: Next) => {
    // セキュリティヘッダーを設定
    c.header('Content-Security-Policy', SECURITY_CONFIG.cspHeader)
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
    
    await next()
  }
}

/**
 * CORS設定ミドルウェア
 */
export const corsSettings = () => {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin')
    
    // 許可するオリジンのパターン
    const allowedOrigins = [
      /^https:\/\/.*\.tap-carte\.pages\.dev$/,
      /^https:\/\/tap-karte\.com$/,
      /^https:\/\/www\.tap-karte\.com$/,
      /^http:\/\/localhost:\d+$/ // 開発環境
    ]
    
    if (origin && allowedOrigins.some(pattern => pattern.test(origin))) {
      c.header('Access-Control-Allow-Origin', origin)
    }
    
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    c.header('Access-Control-Max-Age', '86400')
    
    // プリフライトリクエストの処理
    if (c.req.method === 'OPTIONS') {
      return c.text('OK', 200)
    }
    
    await next()
  }
}

/**
 * 入力検証ミドルウェア
 */
export const inputValidation = () => {
  return async (c: Context, next: Next) => {
    // POSTリクエストの入力検証
    const contentType = c.req.header('Content-Type') || ''
    if (c.req.method === 'POST' && contentType.includes('application/json')) {
      try {
        const body = await c.req.json()
        
        // テキスト入力の検証
        if (body.text && typeof body.text === 'string') {
          // 個人情報検出
          if (detectPersonalInfo(body.text, SECURITY_CONFIG.personalInfoPatterns)) {
            return c.json({
              success: false,
              error: '個人情報らしきデータが検出されました。個人情報は入力しないでください。'
            }, 400)
          }
          
          // 文字数制限
          if (body.text.length > 50000) {
            return c.json({
              success: false,
              error: '入力テキストが長すぎます（50,000文字以内）'
            }, 400)
          }
        }
        
        // リクエストボディを再設定
        c.set('validatedBody', body)
        
      } catch (error) {
        return c.json({
          success: false,
          error: '無効なJSONデータです'
        }, 400)
      }
    }
    
    await next()
  }
}

// ========================================
// 📊 ログ・監視ミドルウェア
// ========================================

/**
 * リクエストログミドルウェア
 */
export const requestLogging = () => {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // リクエスト開始ログ
    if (DEBUG_CONFIG.enableApiLogging) {
      logger.info('Request started', {
        requestId,
        method: c.req.method,
        path: c.req.path,
        userAgent: c.req.header('User-Agent')?.substring(0, 100),
        timestamp: getCurrentTimestamp()
      })
    }
    
    // リクエストIDをコンテキストに設定
    c.set('requestId', requestId)
    
    try {
      await next()
    } finally {
      const duration = Date.now() - startTime
      
      // レスポンス完了ログ
      if (DEBUG_CONFIG.enableApiLogging) {
        logger.info('Request completed', {
          requestId,
          status: c.res.status,
          duration,
          timestamp: getCurrentTimestamp()
        })
      }
    }
  }
}

/**
 * パフォーマンス監視ミドルウェア
 */
export const performanceMonitoring = () => {
  return async (c: Context, next: Next) => {
    if (!DEBUG_CONFIG.enablePerformanceMonitoring) {
      await next()
      return
    }
    
    const startTime = performance.now()
    
    await next()
    
    const duration = performance.now() - startTime
    const requestId = c.get('requestId')
    
    // パフォーマンス警告（2秒以上）
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        requestId,
        path: c.req.path,
        duration: Math.round(duration),
        threshold: 2000
      })
    }
    
    // パフォーマンスメトリクスをヘッダーに追加
    c.header('X-Response-Time', `${Math.round(duration)}ms`)
  }
}

// ========================================
// 🔑 認証関連ミドルウェア
// ========================================

/**
 * 強化されたJWT認証ミドルウェア（セッションフィンガープリンティング対応）
 */
export const enhancedAuth = () => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      try {
        // セッションフィンガープリンティング生成
        const fingerprint = await generateSessionFingerprint({
          userAgent: c.req.header('User-Agent'),
          acceptLanguage: c.req.header('Accept-Language'),
          ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')
        })
        
        // 強化されたトークン検証
        const user = await validateSecureAuthToken(token, fingerprint)
        
        if (user) {
          c.set('authToken', token)
          c.set('authenticatedUser', user)
          c.set('sessionFingerprint', fingerprint)
          
          logger.debug('Enhanced auth successful', {
            userId: user.id,
            fingerprint: fingerprint.substring(0, 8) + '...',
            tokenType: token.startsWith('secure_token_') ? 'secure' : 'demo'
          })
        } else {
          // 認証失敗をログに記録
          logger.warn('Enhanced auth validation failed', {
            tokenPrefix: token.substring(0, 10),
            fingerprint: fingerprint.substring(0, 8) + '...'
          })
        }
      } catch (error) {
        logger.warn('Enhanced auth error', { error: (error as Error).message })
      }
    }
    
    await next()
  }
}

/**
 * JWT認証ミドルウェア（オプション・後方互換性）
 */
export const optionalAuth = () => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      try {
        // 実際のJWT検証ロジックはauth.tsに委譲
        // ここでは基本的な形式チェックのみ
        if (token && token.split('.').length === 3) {
          c.set('authToken', token)
          logger.debug('Auth token provided', { tokenLength: token.length })
        }
      } catch (error) {
        // 認証失敗してもリクエストは継続（オプション認証）
        logger.warn('Auth token validation failed', { error })
      }
    }
    
    await next()
  }
}

// ========================================
// 🚨 エラーハンドリングミドルウェア
// ========================================

/**
 * グローバルエラーハンドラー
 */
export const errorHandler = () => {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      const requestId = c.get('requestId')
      const errorInstance = error as Error
      
      // エラーログ出力
      logger.error('Unhandled error occurred', {
        requestId,
        path: c.req.path,
        method: c.req.method,
        error: errorInstance.message,
        stack: DEBUG_CONFIG.enableDetailedErrorLogging ? errorInstance.stack : undefined
      })
      
      // エラーレスポンス
      const apiError: ApiError = {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました',
        ...(DEBUG_CONFIG.enableDetailedErrorLogging && {
          details: errorInstance.message
        })
      }
      
      return c.json({
        success: false,
        error: apiError.message,
        ...(DEBUG_CONFIG.enableDetailedErrorLogging && {
          details: apiError.details,
          requestId
        })
      }, 500)
    }
  }
}

/**
 * 404エラーハンドラー
 */
export const notFoundHandler = () => {
  return async (c: Context) => {
    const requestId = c.get('requestId')
    
    logger.warn('Route not found', {
      requestId,
      path: c.req.path,
      method: c.req.method
    })
    
    return c.json({
      success: false,
      error: 'リクエストされたリソースが見つかりません',
      path: c.req.path,
      ...(DEBUG_CONFIG.enableDetailedErrorLogging && { requestId })
    }, 404)
  }
}

// ========================================
// ⚡ レート制限ミドルウェア
// ========================================

/**
 * シンプルなメモリベースレート制限
 * 注意: プロダクションでは外部ストレージ（Redis等）推奨
 */
export const rateLimit = (
  windowMs = 60000, // 1分
  maxRequests = 100   // 最大リクエスト数
) => {
  const requests = new Map<string, { count: number; windowStart: number }>()
  
  return async (c: Context, next: Next) => {
    const clientIp = c.req.header('CF-Connecting-IP') || 
                    c.req.header('X-Forwarded-For') || 
                    'unknown'
    
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    
    const clientData = requests.get(clientIp)
    
    if (!clientData || clientData.windowStart < windowStart) {
      // 新しいウィンドウ
      requests.set(clientIp, { count: 1, windowStart })
    } else {
      // 既存ウィンドウ内
      clientData.count++
      
      if (clientData.count > maxRequests) {
        logger.warn('Rate limit exceeded', {
          clientIp,
          count: clientData.count,
          limit: maxRequests,
          windowMs
        })
        
        return c.json({
          success: false,
          error: 'リクエスト数が制限を超えました。しばらく待ってからお試しください。',
          retryAfter: Math.ceil((windowStart + windowMs - now) / 1000)
        }, 429)
      }
    }
    
    // 古いエントリをクリーンアップ（メモリリーク防止）
    if (Math.random() < 0.01) { // 1%の確率で実行
      const cutoff = now - windowMs * 2
      for (const [ip, data] of requests.entries()) {
        if (data.windowStart < cutoff) {
          requests.delete(ip)
        }
      }
    }
    
    await next()
  }
}

// ========================================
// 🛡️ 高度セキュリティミドルウェア
// ========================================

/**
 * セキュリティ異常検知ミドルウェア（強化版）
 */
export const securityAnomalyDetection = () => {
  return async (c: Context, next: Next) => {
    const clientIp = c.req.header('CF-Connecting-IP') || 
                    c.req.header('X-Forwarded-For') || 
                    'unknown'
    const userAgent = c.req.header('User-Agent') || ''
    const path = c.req.path
    const method = c.req.method
    
    // 強化された異常検知
    const anomalyResult = detectAnomalousAccess({
      ip: clientIp,
      userAgent,
      path,
      method
    })
    
    if (anomalyResult.isAnomalous) {
      logger.warn('Security anomaly detected', {
        clientIp: clientIp.substring(0, 10) + '...',
        path,
        method,
        riskLevel: anomalyResult.riskLevel,
        reasons: anomalyResult.reasons,
        userAgent: userAgent.substring(0, 50) + '...',
        timestamp: getCurrentTimestamp()
      })
      
      // 高リスクアクセスはブロック
      if (anomalyResult.riskLevel === 'high') {
        logSecurityEvent('High Risk Request Blocked', 'high', {
          clientIp: clientIp.substring(0, 10) + '...',
          path,
          method,
          reasons: anomalyResult.reasons
        })
        
        return c.json({
          success: false,
          error: 'セキュリティ上の理由によりアクセスが制限されました'
        }, 403)
      }
      
      // 中リスクアクセスは警告のみ
      if (anomalyResult.riskLevel === 'medium') {
        c.header('X-Security-Warning', 'Medium risk access detected')
      }
    }
    
    await next()
  }
}

/**
 * API使用量監視ミドルウェア（簡易版）
 */
export const apiUsageMonitoring = () => {
  return async (c: Context, next: Next) => {
    const clientIp = c.req.header('CF-Connecting-IP') || 
                    c.req.header('X-Forwarded-For') || 
                    'unknown'
    const path = c.req.path
    const startTime = Date.now()
    
    // API使用量をログに記録
    if (path.startsWith('/api/')) {
      logger.debug('API request', {
        endpoint: path,
        clientIp,
        method: c.req.method,
        timestamp: getCurrentTimestamp()
      })
    }
    
    await next()
    
    const duration = Date.now() - startTime
    
    // 異常に遅いレスポンスを検知
    if (duration > 5000) { // 5秒以上
      logger.warn('Slow API response detected', {
        path,
        duration,
        clientIp,
        threshold: 5000
      })
    }
  }
}

/**
 * 入力セキュリティ検証ミドルウェア（簡易版）
 */
export const inputSecurityValidation = () => {
  return async (c: Context, next: Next) => {
    const clientIp = c.req.header('CF-Connecting-IP') || 
                    c.req.header('X-Forwarded-For') || 
                    'unknown'
    
    // POSTリクエストの基本セキュリティ検証
    const contentType = c.req.header('Content-Type') || ''
    if (c.req.method === 'POST' && contentType.includes('application/json')) {
      try {
        const body = c.get('validatedBody') || await c.req.json()
        
        // 入力データの基本検証
        for (const [key, value] of Object.entries(body)) {
          if (typeof value === 'string') {
            // 悪意のあるコンテンツの基本検証
            const maliciousPatterns = [
              /<script/gi,
              /javascript:/gi,
              /onload|onerror|onclick/gi,
              /eval\s*\(/gi
            ]
            
            for (const pattern of maliciousPatterns) {
              if (pattern.test(value)) {
                logger.warn('Malicious content detected', {
                  field: key,
                  pattern: pattern.toString(),
                  clientIp
                })
                
                return c.json({
                  success: false,
                  error: '不正なスクリプトまたは危険なコンテンツが検出されました'
                }, 400)
              }
            }
          }
        }
        
      } catch (error) {
        logger.warn('Input validation error', {
          error: (error as Error).message,
          clientIp
        })
      }
    }
    
    await next()
  }
}