/**
 * タップカルテ - 監視・統計APIルート
 * 
 * アプリケーションの監視、統計、ヘルスチェック機能
 */

import { Hono } from 'hono'
import type { CloudflareBindings, UsageStats, ApiResponse } from '../types'
import { APP_CONFIG, AI_CONFIG, validateEnvironmentVariables } from '../config'
import { logger, getCurrentTimestamp } from '../utils'

// ========================================
// 📊 監視・統計APIルート
// ========================================

const monitoring = new Hono<{ Bindings: CloudflareBindings }>()

/**
 * ヘルスチェックエンドポイント
 * GET /api/monitoring/health
 */
monitoring.get('/health', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    // 環境変数の検証
    const envValidation = validateEnvironmentVariables(c.env)
    
    // データベース接続チェック
    let dbStatus = 'unavailable'
    try {
      if (c.env?.DB) {
        await c.env.DB.prepare('SELECT 1').first()
        dbStatus = 'connected'
      }
    } catch (dbError) {
      dbStatus = 'error'
      logger.warn('Database health check failed', { requestId, dbError })
    }
    
    // AI APIキーチェック
    const aiStatus = envValidation.variables.GEMINI_API_KEY !== 'test_gemini_key' 
      ? 'configured' 
      : 'test_mode'
    
    const healthStatus = {
      status: 'healthy',
      timestamp: getCurrentTimestamp(),
      version: APP_CONFIG.version,
      environment: APP_CONFIG.environment,
      services: {
        database: dbStatus,
        ai_service: aiStatus,
        environment_config: envValidation.isValid ? 'valid' : 'warning'
      },
      uptime: process.uptime ? Math.floor(process.uptime()) : 'unknown',
      ...(envValidation.issues.length > 0 && {
        warnings: envValidation.issues
      })
    }
    
    const statusCode = (dbStatus === 'error' || !envValidation.isValid) ? 503 : 200
    
    logger.info('Health check performed', {
      requestId,
      status: healthStatus.status,
      services: healthStatus.services
    })
    
    return c.json<ApiResponse>(
      {
        success: true,
        data: healthStatus
      },
      statusCode
    )
    
  } catch (error) {
    const errorInstance = error as Error
    logger.error('Health check failed', {
      requestId,
      error: errorInstance.message
    })
    
    return c.json<ApiResponse>(
      {
        success: false,
        error: 'ヘルスチェックに失敗しました',
        data: {
          status: 'unhealthy',
          timestamp: getCurrentTimestamp(),
          error: errorInstance.message
        }
      },
      503
    )
  }
})

/**
 * 使用統計エンドポイント
 * GET /api/monitoring/stats
 */
monitoring.get('/stats', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    const db = c.env?.DB
    
    if (!db) {
      return c.json<ApiResponse<UsageStats>>({
        success: false,
        error: 'データベースが利用できません'
      }, 503)
    }
    
    // 過去24時間の統計を取得
    const [recordStats, performanceStats] = await Promise.all([
      // レコード統計
      db.prepare(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT DATE(created_at)) as active_days,
          AVG(response_time) as avg_response_time,
          MIN(response_time) as min_response_time,
          MAX(response_time) as max_response_time
        FROM nursing_records 
        WHERE created_at > datetime('now', '-24 hours')
      `).first(),
      
      // パフォーマンス統計
      db.prepare(`
        SELECT 
          options_style,
          options_doc_type,
          options_format,
          COUNT(*) as usage_count,
          AVG(response_time) as avg_response_time
        FROM nursing_records 
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY options_style, options_doc_type, options_format
      `).all()
    ])
    
    // エラー率計算（この例では簡易的に0とする）
    const errorRate = 0.0
    
    const stats: UsageStats = {
      totalRequests: (recordStats?.total_records as number) || 0,
      averageResponseTime: Math.round((recordStats?.avg_response_time as number) || 0),
      errorRate: errorRate,
      lastUpdated: getCurrentTimestamp()
    }
    
    const detailedStats = {
      ...stats,
      period: '24_hours',
      performance: {
        minResponseTime: Math.round((recordStats?.min_response_time as number) || 0),
        maxResponseTime: Math.round((recordStats?.max_response_time as number) || 0),
        activeDays: (recordStats?.active_days as number) || 0
      },
      usage_patterns: performanceStats?.results || []
    }
    
    logger.info('Statistics retrieved', {
      requestId,
      totalRequests: stats.totalRequests,
      avgResponseTime: stats.averageResponseTime
    })
    
    return c.json<ApiResponse>({
      success: true,
      data: detailedStats
    })
    
  } catch (error) {
    const errorInstance = error as Error
    logger.error('Statistics retrieval failed', {
      requestId,
      error: errorInstance.message
    })
    
    return c.json<ApiResponse>({
      success: false,
      error: '統計情報の取得に失敗しました'
    }, 500)
  }
})

/**
 * システム情報エンドポイント
 * GET /api/monitoring/info
 */
monitoring.get('/info', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    const systemInfo = {
      application: {
        name: APP_CONFIG.name,
        version: APP_CONFIG.version,
        description: APP_CONFIG.description,
        environment: APP_CONFIG.environment
      },
      ai_service: {
        model: AI_CONFIG.model,
        default_char_limit: AI_CONFIG.defaultCharLimit,
        max_char_limit: AI_CONFIG.maxCharLimit,
        timeout: AI_CONFIG.timeout
      },
      features: {
        demo_authentication: true,
        ai_conversion: true,
        medical_dictionary: true,
        data_persistence: !!c.env?.DB,
        performance_monitoring: true
      },
      endpoints: {
        conversion: '/api/ai/convert',
        authentication: '/api/auth/demo-login',
        health_check: '/api/monitoring/health',
        statistics: '/api/monitoring/stats'
      },
      contact: {
        author: APP_CONFIG.author.name,
        email: APP_CONFIG.author.email
      },
      timestamp: getCurrentTimestamp()
    }
    
    logger.info('System info requested', { requestId })
    
    return c.json<ApiResponse>({
      success: true,
      data: systemInfo
    })
    
  } catch (error) {
    const errorInstance = error as Error
    logger.error('System info retrieval failed', {
      requestId,
      error: errorInstance.message
    })
    
    return c.json<ApiResponse>({
      success: false,
      error: 'システム情報の取得に失敗しました'
    }, 500)
  }
})

/**
 * セキュリティ情報エンドポイント
 * GET /api/monitoring/security
 */
monitoring.get('/security', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    // 環境変数の検証
    const envValidation = validateEnvironmentVariables(c.env)
    
    const securityInfo = {
      environment_validation: {
        is_valid: envValidation.isValid,
        issues_count: envValidation.issues.length,
        // セキュリティ上、詳細な問題は本番環境では非表示
        ...(APP_CONFIG.isDevelopment && {
          issues: envValidation.issues
        })
      },
      security_features: {
        input_validation: true,
        personal_info_detection: true,
        cors_protection: true,
        security_headers: true,
        rate_limiting: true,
        request_logging: true
      },
      compliance: {
        data_retention: 'temporary_processing_only',
        personal_info_policy: 'detection_and_blocking',
        encryption: 'https_tls',
        audit_logging: APP_CONFIG.isDevelopment ? 'enabled' : 'production_mode'
      },
      timestamp: getCurrentTimestamp()
    }
    
    logger.info('Security info requested', { requestId })
    
    return c.json<ApiResponse>({
      success: true,
      data: securityInfo
    })
    
  } catch (error) {
    const errorInstance = error as Error
    logger.error('Security info retrieval failed', {
      requestId,
      error: errorInstance.message
    })
    
    return c.json<ApiResponse>({
      success: false,
      error: 'セキュリティ情報の取得に失敗しました'
    }, 500)
  }
})

export { monitoring }