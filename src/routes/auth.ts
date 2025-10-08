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
 * デモログイン認証エンドポイント
 * POST /api/auth/demo-login
 */
auth.post('/demo-login', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    logger.info('Demo authentication requested', {
      requestId,
      userAgent: c.req.header('User-Agent')?.substring(0, 100),
      timestamp: getCurrentTimestamp()
    })

    // デモユーザー情報を生成
    const demoUser: User = generateDemoUser()
    
    // デモ認証トークンを生成
    const authToken = generateDemoAuthToken(demoUser)
    
    logger.info('Demo authentication successful', {
      requestId,
      userId: demoUser.id,
      userName: demoUser.name
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
    logger.error('Demo authentication failed', {
      requestId,
      error: errorInstance.message
    })

    return c.json<ApiResponse<AuthResponse>>({
      success: false,
      error: 'デモ認証に失敗しました'
    }, 500)
  }
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