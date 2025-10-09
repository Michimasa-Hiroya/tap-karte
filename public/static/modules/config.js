/**
 * タップカルテ - 設定管理モジュール
 * 機能: アプリケーション定数とCSSクラス定義
 */

/** アプリケーション設定 */
export const APP_CONSTANTS = {
  API: {
    BASE_URL: '/api',
    ENDPOINTS: {
      LOGIN: '/api/auth/login',
      CONVERT: '/api/ai/convert',
      VALIDATE: '/api/auth/validate'
    },
    TIMEOUT: 30000
  },
  
  STORAGE: {
    TOKEN_KEY: 'demo_auth_token',
    USER_KEY: 'demo_user_data',
    USAGE_KEY: 'tap_karte_usage_data',
    HISTORY_KEY: 'conversionHistory',
    SESSION_KEY: 'session_fingerprint'
  },
  
  TIMERS: {
    SESSION_CHECK: 5 * 60 * 1000, // 5分
    AUTO_REFRESH: 30 * 60 * 1000, // 30分
    NOTIFICATION_DURATION: 2000   // 2秒
  },
  
  BUTTONS: {
    DOCUMENT: ['doc-record', 'doc-report'],
    FORMAT: ['format-text', 'format-soap'],
    STYLE: ['style-plain', 'style-polite']
  },
  
  DEFAULT_OPTIONS: {
    DOC_TYPE: '記録',
    FORMAT: '文章形式', 
    STYLE: 'だ・である体',
    CHAR_LIMIT: 500
  }
}

/** CSS クラス定義 */
export const CSS_CLASSES = {
  BUTTON: {
    BASE: 'px-4 py-2 rounded-md text-sm font-medium transition-colors',
    SELECTED: 'bg-pink-600 text-white hover:bg-pink-700',
    UNSELECTED: 'bg-pink-100 text-pink-700 hover:bg-pink-200'
  }
}