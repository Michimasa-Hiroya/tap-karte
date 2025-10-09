/**
 * タップカルテ - 認証APIルート
 * 
 * シンプルなデモ認証システム
 */

import { Hono } from 'hono'
import type { CloudflareBindings, AuthResponse, User, ApiResponse } from '../types'
import { SECURITY_CONFIG, getEnvironmentVariables } from '../config'
import { logger, getCurrentTimestamp, generateId, generateDemoUser, generateDemoAuthToken, validateDemoAuthToken } from '../utils'

// ========================================
// 🔑 認証APIルート
// ========================================

const auth = new Hono<{ Bindings: CloudflareBindings }>()

/**
 * パスワード認証ログインエンドポイント
 * POST /api/auth/login
 */
auth.post('/login', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    // リクエストボディから認証情報を取得
    const body = await c.req.json()
    const { password } = body

    logger.info('Password authentication requested', {
      requestId,
      userAgent: c.req.header('User-Agent')?.substring(0, 100),
      timestamp: getCurrentTimestamp(),
      hasPassword: !!password
    })

    // パスワードの検証
    if (!password) {
      logger.warn('Login attempt without password', { requestId })
      
      return c.json<ApiResponse<AuthResponse>>({
        success: false,
        error: 'パスワードが入力されていません'
      }, 400)
    }

    // 固定パスワード「656110」との照合
    const DEMO_PASSWORD = '656110'
    if (password !== DEMO_PASSWORD) {
      logger.warn('Login attempt with invalid password', {
        requestId,
        passwordLength: password.length,
        timestamp: getCurrentTimestamp()
      })
      
      // セキュリティ上、パスワード間違いの詳細は記録するが、レスポンスは一般的なメッセージ
      return c.json<ApiResponse<AuthResponse>>({
        success: false,
        error: 'パスワードが正しくありません'
      }, 401)
    }

    // パスワード認証成功 - デモユーザー情報を生成
    const demoUser: User = generateDemoUser()
    
    // 認証トークンを生成
    const authToken = generateDemoAuthToken(demoUser)
    
    logger.info('Password authentication successful', {
      requestId,
      userId: demoUser.id,
      userName: demoUser.name,
      timestamp: getCurrentTimestamp()
    })

    return c.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        success: true,
        user: demoUser,
        token: authToken
      }
    })

  } catch (error) {
    const errorInstance = error as Error
    logger.error('Password authentication failed', {
      requestId,
      error: errorInstance.message,
      timestamp: getCurrentTimestamp()
    })

    return c.json<ApiResponse<AuthResponse>>({
      success: false,
      error: 'ログイン処理に失敗しました'
    }, 500)
  }
})

/**
 * 旧デモログインエンドポイント（後方互換性のため）
 * POST /api/auth/demo-login
 */
auth.post('/demo-login', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  logger.info('Legacy demo login endpoint accessed', {
    requestId,
    timestamp: getCurrentTimestamp()
  })

  // 新しいログインエンドポイントへリダイレクト案内
  return c.json<ApiResponse<AuthResponse>>({
    success: false,
    error: 'パスワード入力が必要です。ログインボタンからパスワードを入力してください。'
  }, 400)
})

/**
 * 現在のユーザー情報取得
 * GET /api/auth/me
 */
auth.get('/me', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    const authToken = c.get('authToken')
    
    if (!authToken) {
      return c.json<ApiResponse<AuthResponse>>({
        success: false,
        error: '認証が必要です'
      }, 401)
    }

    // デモトークンの検証
    const user = validateDemoAuthToken(authToken)
    
    if (!user) {
      logger.warn('Invalid auth token provided', { requestId })
      
      return c.json<ApiResponse<AuthResponse>>({
        success: false,
        error: '無効な認証トークンです'
      }, 401)
    }

    logger.debug('User info retrieved', {
      requestId,
      userId: user.id,
      userName: user.name
    })

    return c.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        success: true,
        user
      }
    })

  } catch (error) {
    const errorInstance = error as Error
    logger.error('User info retrieval failed', {
      requestId,
      error: errorInstance.message
    })

    return c.json<ApiResponse<AuthResponse>>({
      success: false,
      error: 'ユーザー情報の取得に失敗しました'
    }, 500)
  }
})

/**
 * ログアウト
 * POST /api/auth/logout
 */
auth.post('/logout', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    const authToken = c.get('authToken')
    
    if (authToken) {
      const user = validateDemoAuthToken(authToken)
      
      logger.info('User logged out', {
        requestId,
        userId: user?.id || 'unknown',
        userName: user?.name || 'unknown'
      })
    }

    return c.json<ApiResponse>({
      success: true,
      data: {
        message: 'ログアウトしました'
      }
    })

  } catch (error) {
    const errorInstance = error as Error
    logger.error('Logout failed', {
      requestId,
      error: errorInstance.message
    })

    return c.json<ApiResponse>({
      success: false,
      error: 'ログアウト処理に失敗しました'
    }, 500)
  }
})

/**
 * セッション延長
 * POST /api/auth/refresh
 */
auth.post('/refresh', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    const authToken = c.get('authToken')
    
    if (!authToken) {
      return c.json<ApiResponse<AuthResponse>>({
        success: false,
        error: '認証が必要です'
      }, 401)
    }

    // 現在のトークンを検証
    const user = validateDemoAuthToken(authToken)
    
    if (!user) {
      return c.json<ApiResponse<AuthResponse>>({
        success: false,
        error: '無効な認証トークンです'
      }, 401)
    }

    // 新しいトークンを生成
    const newAuthToken = generateDemoAuthToken(user)
    
    logger.info('Session refreshed', {
      requestId,
      userId: user.id,
      userName: user.name
    })

    return c.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        success: true,
        user,
        token: newAuthToken
      }
    })

  } catch (error) {
    const errorInstance = error as Error
    logger.error('Session refresh failed', {
      requestId,
      error: errorInstance.message
    })

    return c.json<ApiResponse<AuthResponse>>({
      success: false,
      error: 'セッション延長に失敗しました'
    }, 500)
  }
})

/**
 * Google認証設定取得（後方互換性のため）
 * GET /api/auth/google-config
 */
auth.get('/google-config', async (c) => {
  const envVars = getEnvironmentVariables(c.env)
  
  return c.json({
    success: true,
    clientId: envVars.GOOGLE_CLIENT_ID,
    note: 'このエンドポイントは後方互換性のために提供されています。現在はデモ認証のみをサポートしています。'
  })
})

// ========================================
// 🔧 ヘルパー関数
// ========================================

// 認証関数はutils/index.tsからインポートされています:
// - generateDemoUser()
// - generateDemoAuthToken()  
// - validateDemoAuthToken()

export { auth }