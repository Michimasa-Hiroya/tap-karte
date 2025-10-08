/**
 * タップカルテ - 統一設定管理
 * 
 * アプリケーション全体の設定を一元管理
 */

import type { CloudflareBindings } from '../types'

// ========================================
// 🌍 環境設定
// ========================================

/** 環境種別 */
export type Environment = 'development' | 'staging' | 'production'

/** 現在の環境を取得 */
export const getCurrentEnvironment = (): Environment => {
  // Cloudflare Pagesの環境判定
  if (typeof globalThis !== 'undefined' && 'CF_PAGES' in globalThis) {
    // プレビュー環境 vs 本番環境の判定
    const branch = (globalThis as any).CF_PAGES_BRANCH
    if (branch && branch !== 'main') {
      return 'staging'
    }
    return 'production'
  }
  
  // 開発環境判定
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return 'development'
  }
  
  return 'production'
}

/** 環境情報 */
export const ENVIRONMENT_INFO = {
  current: getCurrentEnvironment(),
  isDevelopment: getCurrentEnvironment() === 'development',
  isStaging: getCurrentEnvironment() === 'staging', 
  isProduction: getCurrentEnvironment() === 'production'
}

// ========================================
// ⚙️ アプリケーション設定
// ========================================

/** アプリケーション基本設定 */
export const APP_CONFIG = {
  /** アプリケーション名 */
  name: 'タップカルテ',
  
  /** キャッチフレーズ */
  tagline: '思ったことを、そのままカルテに',
  
  /** バージョン */
  version: '1.0.0',
  
  /** 説明 */
  description: '思ったことやメモを、整った看護記録・報告書に変換するAIアシスタント',
  
  /** 作者情報 */
  author: {
    name: 'タップカルテ 担当 廣谷',
    email: 'kushiro.ai.lab@gmail.com'
  },
  
  /** 現在の環境 */
  environment: getCurrentEnvironment(),
  
  /** 開発環境フラグ */
  isDevelopment: getCurrentEnvironment() === 'development'
} as const

// ========================================
// 🔗 API設定
// ========================================

/** API設定 */
export const API_CONFIG = {
  /** APIベースパス */
  basePath: '/api',
  
  /** タイムアウト設定（ミリ秒） */
  timeout: 30000,
  
  /** リトライ回数 */
  retryCount: 3,
  
  /** レート制限 */
  rateLimit: {
    /** ウィンドウ時間（ミリ秒） */
    windowMs: 60000,
    /** 最大リクエスト数 */
    maxRequests: 100
  }
} as const

// ========================================
// 🤖 AI設定
// ========================================

/** AI関連設定 */
export const AI_CONFIG = {
  /** 使用するモデル */
  model: 'gemini-2.5-flash',
  
  /** デフォルト文字数制限 */
  defaultCharLimit: 500,
  
  /** 最大文字数制限 */
  maxCharLimit: 1000,
  
  /** 最小文字数制限 */
  minCharLimit: 100,
  
  /** 入力最大文字数 */
  maxInputLength: 50000,
  
  /** タイムアウト（ミリ秒） */
  timeout: 30000
} as const

// ========================================
// 🔐 セキュリティ設定
// ========================================

/** セキュリティ設定 */
export const SECURITY_CONFIG = {
  /** JWT有効期限（秒） - 環境別 */
  jwtExpirationTime: ENVIRONMENT_INFO.isDevelopment ? 1 * 60 * 60 : 24 * 60 * 60, // 開発:1時間、本番:24時間
  
  /** セッション延長間隔（ミリ秒） */
  sessionRefreshInterval: 30 * 60 * 1000, // 30分
  
  /** セッション監視間隔（ミリ秒） */
  sessionCheckInterval: 5 * 60 * 1000, // 5分
  
  /** レート制限 - 環境別 */
  rateLimit: {
    api: ENVIRONMENT_INFO.isDevelopment ? 10 : 100, // 開発:10/min、本番:100/min
    auth: ENVIRONMENT_INFO.isDevelopment ? 3 : 10,  // 開発:3/min、本番:10/min
    windowMs: 60 * 1000 // 1分間
  },
  
  /** API使用制限 - 環境別 */
  apiLimits: {
    maxRequestsPerHour: ENVIRONMENT_INFO.isDevelopment ? 100 : 1000,
    maxTokensPerDay: ENVIRONMENT_INFO.isDevelopment ? 10000 : 100000,
    maxConcurrentRequests: ENVIRONMENT_INFO.isDevelopment ? 2 : 10
  },
  
  /** 個人情報検出パターン（医療特化） */
  personalInfoPatterns: [
    /\d{4}-\d{4}-\d{4}-\d{4}/, // クレジットカード番号
    /\d{3}-\d{4}-\d{4}/, // 電話番号
    /〒\d{3}-\d{4}/, // 郵便番号
    /患者.*?[田中佐藤鈴木高橋田邉渡辺伊藤山本中村小林加藤吉田山田松本井上木村林斎藤清水山崎阿部森池田橋本山口石川小川中島前田藤田岡田長谷川村上近藤石井齊藤坂本遠藤青木櫻井武田山下野口松井千葉岩田豊田原田中野小野田村竹内和田中山石田上田森田原小島酒井宮崎梅田太田藤井中川村井千原松尾北村]/, // 患者名（一般的な姓）
    /\d{4}年\d{1,2}月\d{1,2}日.*?生/, // 生年月日
    /保険証.*?\d{8}/, // 保険証番号
  ],
  
  /** CSPヘッダー - 環境別 */
  cspHeader: ENVIRONMENT_INFO.isDevelopment 
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: *;"
    : "default-src 'self' https:; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' https: data:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';",
  
  /** 監査ログ設定 */
  audit: {
    enabled: ENVIRONMENT_INFO.isProduction,
    logApiUsage: true,
    logAuthEvents: true,
    logSecurityEvents: true,
    retentionDays: ENVIRONMENT_INFO.isProduction ? 90 : 7
  }
} as const

// ========================================
// 🎨 UI設定
// ========================================

/** UI設定 */
export const UI_CONFIG = {
  /** デフォルト選択値 */
  defaults: {
    docType: '記録' as const,
    format: '文章形式' as const,
    style: 'だ・である体' as const,
    charLimit: AI_CONFIG.defaultCharLimit
  },
  
  /** 通知設定 */
  notification: {
    /** デフォルト表示時間（ミリ秒） */
    defaultDuration: 3000,
    /** 成功メッセージ表示時間 */
    successDuration: 2000,
    /** エラーメッセージ表示時間 */
    errorDuration: 5000
  },
  
  /** アニメーション設定 */
  animation: {
    /** デフォルト遷移時間（ミリ秒） */
    transitionDuration: 300,
    /** フェード時間（ミリ秒） */
    fadeDuration: 200
  }
} as const

// ========================================
// 🔧 開発・デバッグ設定
// ========================================

/** デバッグ設定 */
export const DEBUG_CONFIG = {
  /** ログレベル */
  logLevel: APP_CONFIG.isDevelopment ? 'debug' : 'info',
  
  /** パフォーマンス計測 */
  enablePerformanceMonitoring: true,
  
  /** 詳細エラーログ */
  enableDetailedErrorLogging: APP_CONFIG.isDevelopment,
  
  /** API呼び出しログ */
  enableApiLogging: APP_CONFIG.isDevelopment
} as const

// ========================================
// 🌐 環境変数取得ヘルパー
// ========================================

/**
 * 環境変数を安全に取得
 * @param env Cloudflare環境変数
 * @returns 必要な環境変数オブジェクト
 */
export const getEnvironmentVariables = (env?: CloudflareBindings) => ({
  GEMINI_API_KEY: env?.GEMINI_API_KEY || 'test_gemini_key',
  JWT_SECRET: env?.JWT_SECRET || 'default-secret-key',
  GOOGLE_CLIENT_ID: env?.GOOGLE_CLIENT_ID || 'test_google_client_id'
})

/**
 * 必要な環境変数が設定されているかチェック
 * @param env Cloudflare環境変数
 * @returns バリデーション結果
 */
export const validateEnvironmentVariables = (env?: CloudflareBindings) => {
  const vars = getEnvironmentVariables(env)
  
  const issues: string[] = []
  
  // 本番環境での必須チェック
  if (!APP_CONFIG.isDevelopment) {
    if (!vars.GEMINI_API_KEY || vars.GEMINI_API_KEY === 'test_gemini_key') {
      issues.push('GEMINI_API_KEY is not configured for production')
    }
    
    if (!vars.JWT_SECRET || vars.JWT_SECRET === 'default-secret-key') {
      issues.push('JWT_SECRET is not configured for production')
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    variables: vars
  }
}

// ========================================
// 📊 設定サマリー出力
// ========================================

/**
 * 現在の設定をログ出力
 * @param env Cloudflare環境変数
 */
export const logConfigurationSummary = (env?: CloudflareBindings) => {
  const validation = validateEnvironmentVariables(env)
  
  console.log('🔧 タップカルテ設定サマリー')
  console.log('═'.repeat(40))
  console.log(`📱 アプリ: ${APP_CONFIG.name} v${APP_CONFIG.version}`)
  console.log(`🌍 環境: ${APP_CONFIG.environment}`)
  console.log(`🤖 AIモデル: ${AI_CONFIG.model}`)
  console.log(`⚙️ 設定状態: ${validation.isValid ? '✅ 正常' : '⚠️ 要確認'}`)
  
  if (!validation.isValid) {
    console.warn('🚨 設定の問題:')
    validation.issues.forEach(issue => console.warn(`  - ${issue}`))
  }
  
  console.log('═'.repeat(40))
}