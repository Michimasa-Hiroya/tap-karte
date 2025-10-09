/**
 * タップカルテ - ユーティリティ関数集
 * 
 * アプリケーション全体で使用する共通関数
 */

import type { LogLevel, LogEntry, NotificationType } from '../types'

// ========================================
// 🔐 セキュリティ関連ユーティリティ
// ========================================

/**
 * パスワードを安全にハッシュ化
 * @param password プレーンテキストパスワード
 * @returns ハッシュ化されたパスワード
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    // ソルト付きハッシュ化でセキュリティ強化
    const salt = 'tap_karte_salt_2024' // アプリ固有のソルト
    const saltedPassword = password + salt
    
    const encoder = new TextEncoder()
    const data = encoder.encode(saltedPassword)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return hashHex
  } catch (error) {
    logger.error('Password hashing failed', { error })
    // フォールバック: 単純ハッシュ（開発環境用）
    return btoa(password).replace(/[^a-zA-Z0-9]/g, '')
  }
}

/**
 * パスワードを安全に比較
 * @param providedPassword 提供されたパスワード
 * @param storedHash 保存されたハッシュ
 * @returns 一致するかどうか
 */
export const verifyPassword = async (providedPassword: string, storedHash: string): Promise<boolean> => {
  try {
    const providedHash = await hashPassword(providedPassword)
    return providedHash === storedHash
  } catch (error) {
    logger.error('Password verification failed', { error })
    return false
  }
}

/**
 * 個人情報パターンをチェック
 * @param text チェック対象のテキスト
 * @param patterns 検出パターンの配列
 * @returns 検出結果
 */
export const detectPersonalInfo = (
  text: string, 
  patterns: RegExp[]
): boolean => {
  return patterns.some(pattern => pattern.test(text))
}

/**
 * テキストをサニタイズ
 * @param text 入力テキスト
 * @returns サニタイズされたテキスト
 */
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '') // HTML タグ除去
    .replace(/javascript:/gi, '') // JavaScript URL除去
    .substring(0, 50000) // 最大長制限
}

/**
 * 安全なJSONパース
 * @param jsonString JSON文字列
 * @param fallback パース失敗時のデフォルト値
 * @returns パース結果
 */
export const safeJsonParse = <T>(
  jsonString: string, 
  fallback: T
): T => {
  try {
    return JSON.parse(jsonString)
  } catch {
    return fallback
  }
}

// ========================================
// ⏱️ 時間・日付関連ユーティリティ
// ========================================

/**
 * 現在のタイムスタンプを取得
 * @param format フォーマット形式
 * @returns フォーマットされた時刻文字列
 */
export const getCurrentTimestamp = (
  format: 'iso' | 'unix' | 'readable' = 'iso'
): string => {
  const now = new Date()
  
  switch (format) {
    case 'unix':
      return Math.floor(now.getTime() / 1000).toString()
    case 'readable':
      return now.toLocaleString('ja-JP', { 
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    case 'iso':
    default:
      return now.toISOString()
  }
}

/**
 * 処理時間を計測
 * @param operation 実行する処理
 * @returns 実行結果と処理時間
 */
export const measurePerformance = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const startTime = performance.now()
  const result = await operation()
  const endTime = performance.now()
  
  return {
    result,
    duration: Math.round(endTime - startTime)
  }
}

// ========================================
// 📝 ログ・デバッグ関連ユーティリティ
// ========================================

/**
 * 構造化ログ出力
 * @param level ログレベル
 * @param message メッセージ
 * @param metadata 追加情報
 */
export const logger = {
  debug: (message: string, metadata?: Record<string, any>) => 
    log('debug', message, metadata),
  
  info: (message: string, metadata?: Record<string, any>) => 
    log('info', message, metadata),
  
  warn: (message: string, metadata?: Record<string, any>) => 
    log('warn', message, metadata),
  
  error: (message: string, metadata?: Record<string, any>) => 
    log('error', message, metadata)
}

/**
 * 内部ログ関数
 */
const log = (level: LogLevel, message: string, metadata?: Record<string, any>) => {
  const entry: LogEntry = {
    level,
    message,
    timestamp: getCurrentTimestamp(),
    ...(metadata && { metadata })
  }
  
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`
  const formattedMessage = `${prefix} ${message}`
  
  switch (level) {
    case 'debug':
      console.debug(formattedMessage, metadata || '')
      break
    case 'info':
      console.info(formattedMessage, metadata || '')
      break
    case 'warn':
      console.warn(formattedMessage, metadata || '')
      break
    case 'error':
      console.error(formattedMessage, metadata || '')
      break
  }
}

// ========================================
// 🔤 文字列処理ユーティリティ
// ========================================

/**
 * 文字数をカウント（日本語対応）
 * @param text 対象テキスト
 * @returns 文字数
 */
export const countCharacters = (text: string): number => {
  return Array.from(text).length
}

/**
 * テキストを指定文字数で切り詰め
 * @param text 対象テキスト
 * @param maxLength 最大文字数
 * @param suffix 切り詰め時の接尾辞
 * @returns 切り詰められたテキスト
 */
export const truncateText = (
  text: string, 
  maxLength: number, 
  suffix = '...'
): string => {
  if (countCharacters(text) <= maxLength) {
    return text
  }
  
  const truncated = Array.from(text).slice(0, maxLength - suffix.length).join('')
  return truncated + suffix
}

/**
 * キャメルケースをケバブケースに変換
 * @param str キャメルケース文字列
 * @returns ケバブケース文字列
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
}

// ========================================
// 🎲 ランダム・ID生成ユーティリティ
// ========================================

/**
 * ランダムIDを生成
 * @param prefix プレフィックス
 * @param length ID長（デフォルト8文字）
 * @returns 生成されたID
 */
export const generateId = (prefix = '', length = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const randomChars = Array.from({ length }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')
  
  return prefix ? `${prefix}_${randomChars}` : randomChars
}

/**
 * UUIDv4を生成（簡易版）
 * @returns UUID文字列
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0
    const value = char === 'x' ? random : (random & 0x3 | 0x8)
    return value.toString(16)
  })
}

// ========================================
// 🔄 非同期処理ユーティリティ
// ========================================

/**
 * 指定時間待機
 * @param ms 待機時間（ミリ秒）
 * @returns Promise
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * リトライ付き非同期実行
 * @param operation 実行する処理
 * @param maxRetries 最大リトライ回数
 * @param delay リトライ間隔（ミリ秒）
 * @returns 実行結果
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, { 
        error: lastError.message 
      })
      
      await sleep(delay * Math.pow(2, attempt)) // 指数バックオフ
    }
  }
  
  throw lastError!
}

// ========================================
// 💾 ローカルストレージユーティリティ
// ========================================

/**
 * 安全なローカルストレージ操作
 */
export const storage = {
  /**
   * 値を保存
   * @param key キー
   * @param value 値
   */
  set: <T>(key: string, value: T): boolean => {
    try {
      const serializedValue = JSON.stringify(value)
      localStorage.setItem(key, serializedValue)
      return true
    } catch (error) {
      logger.error('Storage set failed', { key, error })
      return false
    }
  },
  
  /**
   * 値を取得
   * @param key キー
   * @param fallback デフォルト値
   * @returns 取得された値
   */
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : fallback
    } catch (error) {
      logger.error('Storage get failed', { key, error })
      return fallback
    }
  },
  
  /**
   * 値を削除
   * @param key キー
   */
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      logger.error('Storage remove failed', { key, error })
      return false
    }
  },
  
  /**
   * 全て削除
   */
  clear: (): boolean => {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      logger.error('Storage clear failed', { error })
      return false
    }
  }
}

// ========================================
// 📱 ブラウザ・デバイス判定ユーティリティ
// ========================================

/**
 * デバイス情報を取得
 * @returns デバイス情報オブジェクト
 */
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent
  
  return {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    isTablet: /iPad|Android(?=.*Mobile)|Silk/i.test(userAgent),
    isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(userAgent),
    isAndroid: /Android/i.test(userAgent),
    isWebView: /wv|WebView/i.test(userAgent),
    isInAppBrowser: /FBAV|FBAN|Instagram|Twitter|Line|WeChat/i.test(userAgent)
  }
}

/**
 * ブラウザがローカルストレージをサポートしているかチェック
 * @returns サポート状況
 */
export const isLocalStorageSupported = (): boolean => {
  try {
    const testKey = '__localStorage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

// ========================================
// 🔐 認証ユーティリティ
// ========================================

import type { User } from '../types'
import { SECURITY_CONFIG, ENVIRONMENT_INFO } from '../config'

/**
 * デモユーザーを生成
 * @returns デモユーザー情報
 */
export const generateDemoUser = (): User => {
  // ユーザー名を「ユーザー」で統一
  return {
    id: generateId(),
    name: 'ユーザー',
    email: 'demo.user@example.com',
    picture: 'https://page.gensparksite.com/v1/base64_upload/e0e0839ca795c5577a86e6b90d5285a3'
  }
}

/**
 * デモ認証トークンを生成
 * @param user ユーザー情報
 * @returns 認証トークン
 */
export const generateDemoAuthToken = (user: User): string => {
  // デモ用のシンプルなトークン生成 - JSON形式
  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24時間後に期限切れ
  }
  
  // JSONを直接エンコード（シンプル・確実）
  return 'demo_token_' + encodeURIComponent(JSON.stringify(payload))
}

/**
 * デモ認証トークンを検証
 * @param token 認証トークン
 * @returns ユーザー情報（無効な場合はnull）
 */
export const validateDemoAuthToken = (token: string): User | null => {
  try {
    if (!token.startsWith('demo_token_')) {
      return null
    }
    
    const payloadJson = token.substring(11) // 'demo_token_'を除去
    const payload = JSON.parse(decodeURIComponent(payloadJson))
    
    // 有効期限チェック
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      logger.warn('Demo token expired', { userId: payload.userId })
      return null
    }
    
    return {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    }
  } catch (error) {
    logger.error('Demo token validation failed', { 
      error: (error as Error).message,
      token: token.substring(0, 20) + '...'
    })
    return null
  }
}

// ========================================
// 🔐 セッションセキュリティ強化
// ========================================

/**
 * セッションフィンガープリンティング用データ生成
 * @param request リクエスト情報
 * @returns フィンガープリント用データ
 */
export const generateSessionFingerprint = async (request: {
  userAgent?: string
  acceptLanguage?: string
  ip?: string
  headers?: Record<string, string>
}): Promise<string> => {
  try {
    // フィンガープリント要素を収集
    const fingerprintData = {
      userAgent: request.userAgent?.substring(0, 100) || 'unknown',
      acceptLanguage: request.acceptLanguage || 'unknown',
      ip: request.ip || 'unknown',
      // セキュリティ: IPは最後の8桁のみハッシュ化対象に含める
      ipSuffix: request.ip ? request.ip.split('.').slice(-2).join('.') : 'unknown',
      timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 6)), // 6時間単位でローテーション
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    
    // JSON文字列化
    const dataString = JSON.stringify(fingerprintData)
    
    // WebCrypto APIでハッシュ化
    const encoder = new TextEncoder()
    const data = encoder.encode(dataString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    // Base64エンコード（URL安全な形式）
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    return `fp_${hashBase64.substring(0, 16)}`
  } catch (error) {
    logger.error('Session fingerprint generation failed', { error })
    // フォールバック: ランダムフィンガープリント
    return `fp_fallback_${generateId('', 16)}`
  }
}

/**
 * セッション検証用データを生成
 * @param userId ユーザーID
 * @param fingerprint セッションフィンガープリント
 * @returns セッション検証データ
 */
export const generateSessionValidation = async (
  userId: string,
  fingerprint: string
): Promise<string> => {
  try {
    const validationData = {
      userId,
      fingerprint,
      created: Math.floor(Date.now() / 1000),
      nonce: generateId('nonce', 8)
    }
    
    const dataString = JSON.stringify(validationData)
    const encoder = new TextEncoder()
    const data = encoder.encode(dataString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    return `sv_${hashBase64.substring(0, 20)}`
  } catch (error) {
    logger.error('Session validation generation failed', { error })
    return `sv_error_${generateId('', 12)}`
  }
}

/**
 * 強化されたデモ認証トークンを生成（フィンガープリント付き）
 * @param user ユーザー情報
 * @param fingerprint セッションフィンガープリント
 * @returns 認証トークン
 */
export const generateSecureAuthToken = async (
  user: User,
  fingerprint: string
): Promise<string> => {
  try {
    const sessionValidation = await generateSessionValidation(user.id, fingerprint)
    
    const payload = {
      userId: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      fingerprint,
      sessionValidation,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + SECURITY_CONFIG.jwtExpirationTime
    }
    
    // セキュリティ強化: ペイロードもハッシュ化
    const payloadString = JSON.stringify(payload)
    const encoder = new TextEncoder()
    const data = encoder.encode(payloadString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // 改ざん検証用のチェックサム
    const checksum = hashHex.substring(0, 8)
    
    return `secure_token_${encodeURIComponent(payloadString)}_cs_${checksum}`
  } catch (error) {
    logger.error('Secure token generation failed', { error })
    // フォールバック: 通常のトークン生成
    return generateDemoAuthToken(user)
  }
}

/**
 * 強化された認証トークンを検証（フィンガープリント付き）
 * @param token 認証トークン
 * @param currentFingerprint 現在のフィンガープリント
 * @returns ユーザー情報（無効な場合はnull）
 */
export const validateSecureAuthToken = async (
  token: string,
  currentFingerprint: string
): Promise<User | null> => {
  try {
    // 通常のデモトークンの場合は従来の検証
    if (token.startsWith('demo_token_')) {
      return validateDemoAuthToken(token)
    }
    
    if (!token.startsWith('secure_token_')) {
      logger.warn('Invalid token format', { tokenPrefix: token.substring(0, 10) })
      return null
    }
    
    // トークンを分解
    const tokenParts = token.split('_cs_')
    if (tokenParts.length !== 2) {
      logger.warn('Invalid secure token structure')
      return null
    }
    
    const payloadEncoded = tokenParts[0].substring(13) // 'secure_token_'を除去
    const providedChecksum = tokenParts[1]
    
    // チェックサム検証
    const payloadString = decodeURIComponent(payloadEncoded)
    const encoder = new TextEncoder()
    const data = encoder.encode(payloadString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const expectedChecksum = hashHex.substring(0, 8)
    
    if (providedChecksum !== expectedChecksum) {
      logger.warn('Token checksum validation failed', {
        provided: providedChecksum,
        expected: expectedChecksum
      })
      logSecurityEvent('Token Tampering Detected', 'high', {
        providedChecksum,
        expectedChecksum
      })
      return null
    }
    
    const payload = JSON.parse(payloadString)
    
    // 有効期限チェック
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      logger.warn('Secure token expired', { userId: payload.userId })
      return null
    }
    
    // フィンガープリント検証（セッションハイジャック対策）
    if (payload.fingerprint !== currentFingerprint) {
      logger.warn('Session fingerprint mismatch', {
        userId: payload.userId,
        storedFingerprint: payload.fingerprint?.substring(0, 8) + '...',
        currentFingerprint: currentFingerprint?.substring(0, 8) + '...'
      })
      logSecurityEvent('Session Hijacking Attempt', 'high', {
        userId: payload.userId,
        fingerprintMismatch: true
      })
      return null
    }
    
    return {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    }
  } catch (error) {
    logger.error('Secure token validation failed', {
      error: (error as Error).message,
      token: token.substring(0, 20) + '...'
    })
    return null
  }
}

// ========================================
// 🔐 セキュリティ監査・ログ機能
// ========================================

/**
 * APIキー使用状況をログ記録
 * @param keyType キーの種類
 * @param operation 操作種別
 * @param metadata 追加メタデータ
 */
export const logApiKeyUsage = (
  keyType: string, 
  operation: string, 
  metadata?: Record<string, any>
) => {
  if (SECURITY_CONFIG.audit.logApiUsage) {
    logger.info('API Key Usage', {
      keyType,
      operation,
      environment: ENVIRONMENT_INFO.current,
      timestamp: getCurrentTimestamp(),
      requestId: metadata?.requestId || 'unknown',
      ...metadata
    })
  }
}

/**
 * 認証イベントをログ記録
 * @param event イベント種別
 * @param userId ユーザーID
 * @param success 成功フラグ
 * @param metadata 追加メタデータ
 */
export const logAuthEvent = (
  event: string,
  userId?: string,
  success: boolean = true,
  metadata?: Record<string, any>
) => {
  if (SECURITY_CONFIG.audit.logAuthEvents) {
    const logLevel = success ? 'info' : 'warn'
    logger[logLevel]('Auth Event', {
      event,
      userId: userId || 'anonymous',
      success,
      environment: ENVIRONMENT_INFO.current,
      timestamp: getCurrentTimestamp(),
      ...metadata
    })
  }
}

/**
 * セキュリティイベントをログ記録
 * @param event イベント種別
 * @param severity 深刻度
 * @param metadata 追加メタデータ
 */
export const logSecurityEvent = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
) => {
  if (SECURITY_CONFIG.audit.logSecurityEvents) {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn'
    logger[logLevel]('Security Event', {
      event,
      severity,
      environment: ENVIRONMENT_INFO.current,
      timestamp: getCurrentTimestamp(),
      needsAttention: severity === 'critical' || severity === 'high',
      ...metadata
    })
  }
}



/**
 * 異常アクセス検知
 * @param request リクエスト情報
 * @returns 異常判定結果
 */
export const detectAnomalousAccess = (request: {
  ip?: string
  userAgent?: string
  path: string
  method: string
}): {
  isAnomalous: boolean
  reasons: string[]
  riskLevel: 'low' | 'medium' | 'high'
} => {
  const reasons: string[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  
  // SQLインジェクションパターン検知
  const sqlPatterns = /(union\s+select|drop\s+table|insert\s+into|delete\s+from)/i
  if (sqlPatterns.test(request.path)) {
    reasons.push('SQL injection pattern detected')
    riskLevel = 'high'
  }
  
  // XSS パターン検知
  const xssPatterns = /(<script|javascript:|onload=|onerror=)/i
  if (xssPatterns.test(request.path)) {
    reasons.push('XSS pattern detected')
    riskLevel = 'high'
  }
  
  // パストラバーサル検知
  if (request.path.includes('../') || request.path.includes('..\\')) {
    reasons.push('Path traversal attempt')
    riskLevel = 'medium'
  }
  
  // 異常なUser-Agent検知
  if (request.userAgent) {
    const suspiciousUAPatterns = /(bot|crawler|scanner|sqlmap|nikto|nmap)/i
    if (suspiciousUAPatterns.test(request.userAgent)) {
      reasons.push('Suspicious user agent')
      riskLevel = riskLevel === 'high' ? 'high' : 'medium'
    }
  }
  
  const isAnomalous = reasons.length > 0
  
  if (isAnomalous) {
    logSecurityEvent('Anomalous Access Detected', riskLevel, {
      path: request.path,
      method: request.method,
      ip: request.ip?.substring(0, 10) + '...', // IPの一部のみログ
      reasons,
      userAgent: request.userAgent?.substring(0, 50)
    })
  }
  
  return {
    isAnomalous,
    reasons,
    riskLevel
  }
}

