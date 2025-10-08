/**
 * タップカルテ - 型定義ファイル
 * 
 * アプリケーション全体で使用する型定義を集約
 */

// ========================================
// 🏥 医療記録関連の型定義
// ========================================

/** ドキュメント種別 */
export type DocumentType = '記録' | '報告書'

/** フォーマット種別 */
export type FormatType = '文章形式' | 'SOAP形式'

/** 文体種別 */
export type StyleType = 'ですます体' | 'だ・である体'

/** 変換オプション */
export interface ConversionOptions {
  /** ドキュメント種別 */
  docType: DocumentType
  /** フォーマット種別 */
  format: FormatType
  /** 文体種別 */
  style: StyleType
  /** 文字数制限 */
  charLimit: number
}

/** 変換リクエスト */
export interface ConversionRequest {
  /** 入力テキスト */
  text: string
  /** 変換オプション */
  options: ConversionOptions
}

/** 変換レスポンス */
export interface ConversionResponse {
  /** 成功フラグ */
  success: boolean
  /** 変換結果テキスト */
  result?: string
  /** エラーメッセージ */
  error?: string
  /** レスポンス時間（ミリ秒） */
  responseTime?: number
}

// ========================================
// 👤 ユーザー認証関連の型定義
// ========================================

/** ユーザー情報 */
export interface User {
  /** ユーザーID */
  id: string
  /** 表示名 */
  name: string
  /** メールアドレス */
  email: string
  /** プロフィール画像URL */
  picture?: string
}

/** 認証状態 */
export interface AuthState {
  /** 認証済みフラグ */
  isAuthenticated: boolean
  /** ユーザー情報 */
  user: User | null
  /** 認証トークン */
  token: string | null
}

/** 認証レスポンス */
export interface AuthResponse {
  /** 成功フラグ */
  success: boolean
  /** ユーザー情報 */
  user?: User
  /** 認証トークン */
  token?: string
  /** エラーメッセージ */
  error?: string
}

// ========================================
// 🛠️ API関連の型定義
// ========================================

/** 基本APIレスポンス */
export interface ApiResponse<T = any> {
  /** 成功フラグ */
  success: boolean
  /** レスポンスデータ */
  data?: T
  /** エラーメッセージ */
  error?: string
  /** タイムスタンプ */
  timestamp?: string
}

/** APIエラー */
export interface ApiError {
  /** エラーコード */
  code: string
  /** エラーメッセージ */
  message: string
  /** 詳細情報 */
  details?: string
}

// ========================================
// 🌐 環境・設定関連の型定義
// ========================================

/** 環境変数の型定義 */
export interface EnvironmentVariables {
  /** Gemini APIキー */
  GEMINI_API_KEY?: string
  /** JWT秘密鍵 */
  JWT_SECRET?: string
  /** Google Client ID */
  GOOGLE_CLIENT_ID?: string
}

/** Cloudflare Bindings */
export interface CloudflareBindings extends EnvironmentVariables {
  /** D1データベース */
  DB?: D1Database
  /** KVストレージ */
  KV?: KVNamespace
  /** R2ストレージ */
  R2?: R2Bucket
}

// ========================================
// 📊 統計・ログ関連の型定義
// ========================================

/** 使用統計 */
export interface UsageStats {
  /** 総リクエスト数 */
  totalRequests: number
  /** 平均レスポンス時間 */
  averageResponseTime: number
  /** エラー率 */
  errorRate: number
  /** 最終更新日時 */
  lastUpdated: string
}

/** ログレベル */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** ログエントリ */
export interface LogEntry {
  /** ログレベル */
  level: LogLevel
  /** ログメッセージ */
  message: string
  /** タイムスタンプ */
  timestamp: string
  /** メタデータ */
  metadata?: Record<string, any>
}

// ========================================
// 🎨 UI/UX関連の型定義
// ========================================

/** 通知の種類 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/** 通知データ */
export interface Notification {
  /** 通知ID */
  id: string
  /** 通知種別 */
  type: NotificationType
  /** メッセージ */
  message: string
  /** 表示期間（ミリ秒） */
  duration?: number
}

/** UIコンポーネントのプロパティ */
export interface ComponentProps {
  /** CSS クラス名 */
  className?: string
  /** 子要素 */
  children?: any
  /** 無効化フラグ */
  disabled?: boolean
}

// ========================================
// 🔧 ユーティリティ型
// ========================================

/** 部分的に必須にする型 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** 読み取り専用の深い型 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/** 関数の戻り値型を取得 */
export type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never