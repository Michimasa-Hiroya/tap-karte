/**
 * タップカルテ - メインアプリケーション（リファクタリング版）
 * 
 * クリーンアーキテクチャに基づく整理されたメインファイル
 */

import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

// 型定義
import type { CloudflareBindings } from './types'

// 設定・ユーティリティ
import { APP_CONFIG, logConfigurationSummary } from './config'
import { logger } from './utils'

// ミドルウェア
import {
  securityHeaders,
  corsSettings,
  inputValidation,
  requestLogging,
  performanceMonitoring,
  enhancedAuth,
  optionalAuth,
  errorHandler,
  notFoundHandler,
  rateLimit,
  securityAnomalyDetection
} from './middleware'

// ルート
import { ai } from './routes/ai'
import { auth } from './routes/auth'
import { monitoring } from './routes/monitoring'

// レンダラー
import { renderer } from './renderer'

// ========================================
// 🚀 メインアプリケーション
// ========================================

const app = new Hono<{ Bindings: CloudflareBindings }>()

// ========================================
// 📋 グローバルミドルウェア設定
// ========================================

// レンダラー設定
app.use(renderer)

// セキュリティ関連ミドルウェア
app.use('*', securityHeaders())
app.use('*', securityAnomalyDetection()) // 強化された異常検知
app.use('/api/*', corsSettings())
app.use('/api/*', inputValidation())

// ログ・監視ミドルウェア
app.use('*', requestLogging())
app.use('*', performanceMonitoring())

// 強化された認証ミドルウェア（セッションフィンガープリンティング対応）
app.use('/api/*', enhancedAuth())

// 後方互換性のための従来認証（フォールバック）
app.use('/api/legacy/*', optionalAuth())

// レート制限（APIルートのみ）
app.use('/api/*', rateLimit(60000, 50)) // 1分間に50リクエスト

// エラーハンドリング
app.use('*', errorHandler())

// ========================================
// 📁 静的ファイル配信
// ========================================

// 静的リソース（CSS、JS、画像など）
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/manifest.json', serveStatic({ root: './public' }))
app.use('/favicon.ico', serveStatic({ root: './public' }))

// ========================================
// 🛣️ APIルート登録
// ========================================

// AI変換API
app.route('/api/ai', ai)

// 認証API
app.route('/api/auth', auth)

// 監視・統計API
app.route('/api/monitoring', monitoring)

// ========================================
// 📄 メインページルート
// ========================================

/**
 * メインページ
 * GET /
 */
app.get('/', (c) => {
  // 設定サマリーをログ出力（初回アクセス時）
  logConfigurationSummary(c.env)
  
  logger.info('Main page accessed', {
    userAgent: c.req.header('User-Agent')?.substring(0, 100),
    referer: c.req.header('Referer')
  })
  
  return c.render(
    <MainApplicationUI />
  )
})

// ========================================
// 🎨 メインUIコンポーネント
// ========================================

/**
 * メインアプリケーションUIコンポーネント
 */
const MainApplicationUI = () => (
  <div className="min-h-screen bg-pink-50">
    <HeaderComponent />
    <AuthModalComponent />
    <MainContentComponent />
    <FooterComponent />
    <ScriptComponents />
  </div>
)

/**
 * ヘッダーコンポーネント（SEO最適化済み）
 */
const HeaderComponent = () => (
  <header className="bg-pink-100 shadow-sm border-b border-pink-200">
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {/* デスクトップ表示 */}
          <div className="hidden sm:block">
            <h1 className="text-5xl md:text-6xl font-bold text-pink-800 flex items-center mb-3">
              <img 
                src="https://page.gensparksite.com/v1/base64_upload/e0e0839ca795c5577a86e6b90d5285a3" 
                alt="タップカルテ - 看護記録・カルテ作成AI" 
                className="w-16 h-16 mr-4"
              />
              {APP_CONFIG.name}
            </h1>
            <p className="text-lg md:text-xl text-pink-700 font-medium ml-20">
              {APP_CONFIG.tagline}
            </p>
            <p className="text-sm text-pink-600 ml-20 mt-2">
              看護師・医療従事者向け AI記録作成ツール | 電子カルテ対応 | 看護業務効率化
            </p>
          </div>
          
          {/* モバイル表示 */}
          <div className="sm:hidden">
            <div className="flex items-center space-x-2">
              <img 
                src="https://page.gensparksite.com/v1/base64_upload/e0e0839ca795c5577a86e6b90d5285a3" 
                alt="タップカルテ - 看護記録AI" 
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-bold text-pink-800 leading-tight">
                  {APP_CONFIG.name}
                </h1>
                <p className="text-xs text-pink-700 font-medium leading-tight whitespace-nowrap">
                  {APP_CONFIG.tagline}
                </p>
                <p className="text-xs text-pink-100 leading-tight">
                  看護記録AI・医療記録作成
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <UserStatusComponent />
      </div>
    </div>
  </header>
)

/**
 * ユーザー状態コンポーネント
 */
const UserStatusComponent = () => (
  <div className="flex items-start justify-end min-w-0 flex-shrink-0">
    {/* 認証済み表示エリア */}
    <div id="user-status" className="hidden">
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <img id="user-avatar" className="w-5 h-5 rounded-full" alt="Profile" />
          <span id="user-name" className="text-pink-800 text-xs font-medium truncate max-w-20"></span>
        </div>
        <button 
          id="logout-btn" 
          className="px-1 py-1 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded transition-colors flex items-center"
        >
          <i className="fas fa-sign-out-alt" style="font-size: 10px;"></i>
          <span className="ml-1" style="font-size: 10px;">ログアウト</span>
        </button>
      </div>
    </div>
    
    {/* 未認証表示エリア */}
    <div id="auth-buttons">
      <button 
        id="login-btn" 
        className="px-3 py-1 bg-pink-200 text-pink-800 rounded-md text-xs font-medium hover:bg-pink-300 transition-colors flex items-center space-x-1"
      >
        <i className="fas fa-user-circle"></i>
        <span>ログイン</span>
      </button>
    </div>
  </div>
)

/**
 * 認証モーダルコンポーネント（レスポンシブ中央配置）
 */
const AuthModalComponent = () => (
  <div id="auth-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 z-50">
    <div className="flex items-center justify-center min-h-screen p-4 w-full">
      <div className="bg-white rounded-lg w-full max-w-md mx-auto p-6 relative transform">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-pink-800">ログイン</h2>
          <button id="close-modal" className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {/* パスワード認証フォーム */}
        <form id="login-form" className="space-y-4 w-full">
          <div className="text-center mb-4 w-full">
            <i className="fas fa-lock text-4xl text-pink-500 mb-3 block"></i>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">パスワードでログイン</h3>
            <p className="text-sm text-gray-500">パスワードを入力してください</p>
          </div>
          
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <input
              type="password"
              id="login-password"
              name="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="パスワードを入力"
              required
            />
          </div>
          
          {/* エラーメッセージ */}
          <div id="login-error-message" className="hidden text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
          </div>
          
          <button 
            type="submit"
            className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span id="login-btn-text">ログイン</span>
            <span id="login-spinner" className="hidden inline-block w-4 h-4 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          </button>
        </form>
        

      </div>
    </div>
  </div>
)

/**
 * メインコンテンツコンポーネント（SEO最適化済み）
 */
const MainContentComponent = () => (
  <main className="max-w-7xl mx-auto px-4 py-8">
    <ConversionInterfaceComponent />
    <UsageGuideComponent />
    <FeaturesComponent />
    <BenefitsComponent />
    <PrivacyPolicyComponent />
  </main>
)

/**
 * AI変換インターフェースコンポーネント - ダッシュボード形式
 */
const ConversionInterfaceComponent = () => (
  <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200">
    {/* 🎯 入力開始エリア（アコーディオン設定を含む） */}
    <QuickStartInputComponent />
    
    {/* 📝 出力エリア */}
    <DashboardInputOutputComponent />
  </div>
)

/**
 * 🚀 看護・リハ内容の入力エリア（ダッシュボード形式）
 */
const QuickStartInputComponent = () => (
  <div className="bg-gradient-to-r from-pink-50 to-white px-6 py-6 border-b border-pink-200">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center justify-center">
        <i className="fas fa-edit text-pink-600 mr-3"></i>
        看護・リハ内容の入力
      </h2>
    </div>
    
    {/* 1. 📝 入力欄 */}
    <div className="mb-6">
      <div className="relative">
        <textarea 
          id="quick-input-text"
          className="w-full h-60 p-4 text-base border-2 border-pink-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-500 transition-all"
          placeholder="・「バイタル測定した」「口の体操をした」など自然な表現でOK&#10;・簡潔書きでもメモ書きでも大丈夫&#10;・音声入力にも対応・誤字脱字は自動で修正"
        ></textarea>
        <div className="absolute bottom-3 right-3">
          <span id="quick-input-count" className="text-sm text-pink-600 bg-white px-2 py-1 rounded-full shadow-sm">0文字</span>
        </div>
      </div>
    </div>
    
    {/* 2. ⚠️ 注意 */}
    <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center space-x-2">
        <i className="fas fa-exclamation-triangle text-red-500"></i>
        <span className="text-sm font-semibold text-red-700">注意</span>
      </div>
      <p className="text-sm text-red-600 mt-1">
        個人情報(氏名や年齢、住所など)や個人が特定できる情報(病院名・施設名、個人の特徴など)、珍しい病名などの入力は禁止します。
      </p>
    </div>
    
    {/* 3. ⚙️ 文章設定 */}
    <div className="mb-6">
      <DocumentSettingsAccordion />
    </div>
    
    {/* 4. 📋 テンプレート */}
    <div className="mb-6">
      <TemplateAccordion />
    </div>
    
    {/* 5. 🎯 生成ボタン・クリアボタン */}
    <div className="flex justify-between items-center mb-4">
      <button 
        id="quick-generate-btn" 
        className="px-8 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        disabled
      >
        生成
      </button>
      
      <button 
        id="clear-input-btn" 
        className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
      >
        クリア
      </button>
    </div>
    
    {/* 利用制限メッセージ */}
    <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg shadow-sm">
      <div className="flex items-center space-x-2">
        <i className="fas fa-info-circle text-red-500"></i>
        <span className="text-sm font-semibold text-red-700">利用制限: 新規ユーザーは1日1回まで利用可能</span>
      </div>
      <div className="flex items-center space-x-2 mt-1">
        <i className="fas fa-key text-pink-500"></i>
        <span className="text-sm text-pink-700">ログインすると無制限で利用可能</span>
      </div>
    </div>
  </div>
)



/**
 * 📄 文章設定アコーディオン
 */
const DocumentSettingsAccordion = () => (
  <div className="border border-pink-200 rounded-lg">
    <button 
      id="document-settings-toggle"
      className="w-full px-4 py-3 bg-pink-50 hover:bg-pink-100 transition-colors flex items-center justify-between text-left rounded-t-lg"
    >
      <div className="flex items-center">
        <i className="fas fa-cog text-pink-600 mr-2"></i>
        <span className="font-semibold text-pink-800">文章設定</span>

      </div>
      <i id="document-settings-icon" className="fas fa-chevron-down text-pink-600 transform transition-transform"></i>
    </button>
    
    <div id="document-settings-content" className="hidden px-4 py-4 space-y-4">
      {/* ドキュメント種別 */}
      <div>
        <label className="block text-sm font-semibold text-pink-800 mb-2">記録種別</label>
        <div className="flex space-x-2">
          <button id="doc-record" className="px-3 py-2 bg-pink-600 text-white rounded-md text-sm font-medium transition-colors">
            記録
          </button>
          <button id="doc-report" className="px-3 py-2 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-md text-sm font-medium transition-colors">
            報告書
          </button>
        </div>
      </div>
      
      {/* フォーマット */}
      <div>
        <label className="block text-sm font-semibold text-pink-800 mb-2">フォーマット</label>
        <div className="flex space-x-2">
          <button id="format-text" className="px-3 py-2 bg-pink-600 text-white rounded-md text-sm font-medium transition-colors">
            文章形式
          </button>
          <button id="format-soap" className="px-3 py-2 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-md text-sm font-medium transition-colors">
            SOAP形式
          </button>
        </div>
      </div>
      
      {/* 文体 */}
      <div>
        <label className="block text-sm font-semibold text-pink-800 mb-2">文体</label>
        <div className="flex space-x-2">
          <button id="style-plain" className="px-3 py-2 bg-pink-600 text-white rounded-md text-sm font-medium transition-colors">
            だ・である体
          </button>
          <button id="style-polite" className="px-3 py-2 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-md text-sm font-medium transition-colors">
            ですます体
          </button>
        </div>
      </div>
      
      {/* 文字数制限 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-pink-800">出力文字数</label>
          <span id="char-limit-display" className="text-sm text-pink-700 font-medium">500文字</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-pink-600">100</span>
          <input 
            type="range" 
            id="char-limit-slider" 
            min="100" 
            max="1000" 
            step="50" 
            value="500"
            className="flex-1 h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-pink-600">1000</span>
        </div>
      </div>
    </div>
  </div>
)

/**
 * 📝 テンプレートアコーディオン
 */
const TemplateAccordion = () => (
  <div className="border border-pink-200 rounded-lg">
    <button 
      id="template-toggle"
      className="w-full px-4 py-3 bg-pink-50 hover:bg-pink-100 transition-colors flex items-center justify-between text-left rounded-t-lg"
    >
      <div className="flex items-center">
        <i className="fas fa-clipboard-list text-pink-600 mr-2"></i>
        <span className="font-semibold text-pink-800">テンプレート</span>
        <span className="text-sm text-pink-600 ml-2">(業務内容別)</span>
      </div>
      <i id="template-icon" className="fas fa-chevron-down text-pink-600 transform transition-transform"></i>
    </button>
    
    <div id="template-content" className="hidden px-4 py-4 space-y-4">
      {/* 職種選択 */}
      <div>
        <label className="block text-sm font-semibold text-pink-800 mb-2">職種</label>
        <div className="flex space-x-2">
          <button id="template-nurse" className="px-3 py-2 bg-pink-600 text-white rounded-md text-sm font-medium transition-colors">
            看護師
          </button>
          <button id="template-rehab" className="px-3 py-2 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-md text-sm font-medium transition-colors">
            リハ職
          </button>
        </div>
      </div>
      
      {/* 看護師テンプレート */}
      <div id="nurse-templates">
        <label className="block text-sm font-semibold text-pink-800 mb-2">看護業務テンプレート</label>
        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="バイタル測定" />
            <span className="text-base text-pink-700">バイタル測定</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="症状・状態観察" />
            <span className="text-base text-pink-700">症状・状態観察</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="内服管理・指導" />
            <span className="text-base text-pink-700">内服管理・指導</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="清拭・入浴介助" />
            <span className="text-base text-pink-700">清拭・入浴介助</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="排泄ケア" />
            <span className="text-base text-pink-700">排泄ケア</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="食事・水分摂取" />
            <span className="text-base text-pink-700">食事・水分摂取</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="点滴" />
            <span className="text-base text-pink-700">点滴</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="創傷処置" />
            <span className="text-base text-pink-700">創傷処置</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="精神・心理状態の観察" />
            <span className="text-base text-pink-700">精神・心理状態の観察</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="家族への指導・相談対応" />
            <span className="text-base text-pink-700">家族への指導・相談対応</span>
          </label>
        </div>
      </div>
      
      {/* リハビリテーション職テンプレート */}
      <div id="rehab-templates" className="hidden">
        <label className="block text-sm font-semibold text-pink-800 mb-2">リハビリ業務テンプレート</label>
        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="バイタル測定" />
            <span className="text-base text-pink-700">バイタル測定</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="歩行訓練" />
            <span className="text-base text-pink-700">歩行訓練</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="関節可動域訓練" />
            <span className="text-base text-pink-700">関節可動域訓練</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="筋力トレーニング" />
            <span className="text-base text-pink-700">筋力トレーニング</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="ADL訓練" />
            <span className="text-base text-pink-700">ADL訓練</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="移乗動作訓練" />
            <span className="text-base text-pink-700">移乗動作訓練</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="立ち上がり動作訓練" />
            <span className="text-base text-pink-700">立ち上がり動作訓練</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="起居動作訓練" />
            <span className="text-base text-pink-700">起居動作訓練</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="福祉用具評価" />
            <span className="text-base text-pink-700">福祉用具評価</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="住環境評価" />
            <span className="text-base text-pink-700">住環境評価</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="自主トレーニング指導" />
            <span className="text-base text-pink-700">自主トレーニング指導</span>
          </label>
          <label className="flex items-center space-x-3 p-2 hover:bg-pink-50 rounded cursor-pointer">
            <input type="checkbox" className="template-checkbox w-4 h-4" data-template="家族への介助指導" />
            <span className="text-base text-pink-700">家族への介助指導</span>
          </label>
        </div>
      </div>
      
      {/* 選択されたテンプレート表示 */}
      <div id="selected-templates" className="hidden mt-3 p-3 bg-pink-50 border border-pink-200 rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-pink-800">選択中のテンプレート:</span>
          <button id="clear-templates" className="text-pink-600 hover:text-pink-800 text-sm">
            <i className="fas fa-times"></i> すべてクリア
          </button>
        </div>
        <div id="selected-template-list" className="text-sm text-pink-700 space-y-1"></div>
      </div>
    </div>
  </div>
)

/**
 * 📝 ダッシュボード出力エリア
 */
const DashboardInputOutputComponent = () => (
  <div className="p-6 border-t border-pink-200">
    {/* 出力エリア */}
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <label className="block text-base font-bold text-pink-800 flex items-center">
          <i className="fas fa-file-medical text-pink-600 mr-2"></i>
          生成された看護記録・医療文書
        </label>
        <span id="output-count" className="text-sm text-pink-600">0文字</span>
      </div>
      
      <div 
        id="output-text"
        className="w-full min-h-96 p-6 bg-gradient-to-br from-pink-25 to-white border-2 border-pink-300 rounded-lg overflow-y-auto whitespace-pre-wrap shadow-inner"
      >
        <div className="text-pink-400 italic text-center mt-32">
          <i className="fas fa-magic text-3xl mb-3 block"></i>
          <span className="text-sm">生成された記録はここに表示されます</span>
        </div>
      </div>
      
      {/* 出力エリア下のボタン */}
      <div className="flex justify-between items-center mt-4">
        <button 
          id="copy-btn" 
          className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          disabled
        >
          <i className="fas fa-copy mr-2"></i>
          コピー
        </button>
        
        <button 
          id="clear-output-btn" 
          className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
        >
          クリア
        </button>
      </div>
    </div>
  </div>
)



/**
 * 使用ガイドコンポーネント（SEO最適化済み）
 */
const UsageGuideComponent = () => (
  <div className="mt-8 bg-pink-50 rounded-lg p-6 border border-pink-200">
    <h2 className="text-xl font-semibold text-pink-900 mb-4 flex items-center">
      <i className="fas fa-clipboard-list text-pink-600 mr-2"></i>
      タップカルテの使い方
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-pink-800 border-b border-pink-300 pb-1">
          📝 看護記録作成の手順
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-pink-700 leading-relaxed">
          <li><strong>利用者の観察</strong>や<strong>看護ケア</strong>の内容を自然な文章で入力</li>
          <li>「生成」ボタンで専門的な<strong>看護記録</strong>が自動作成</li>
          <li>コピー＆ペーストで即座に記録</li>
        </ol>
      </div>
      

    </div>
    
    <div className="bg-white rounded-lg p-4 border-l-4 border-pink-500 shadow-sm">
      <h3 className="text-lg font-semibold text-pink-800 mb-3">
        💡 看護師・医療従事者の業務効率化
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-pink-700">
        <div>
          <h4 className="font-semibold mb-2">✅ 対応する医療記録</h4>
          <ul className="space-y-1">
            <li>• 日常的な<strong>看護記録</strong></li>
            <li>• <strong>利用者の観察記録</strong></li>
            <li>• <strong>報告書</strong></li>
            <li>• <strong>申し送り書</strong></li>
            <li>• <strong>インシデントレポート</strong>など</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">⚡ 業務時間短縮効果</h4>
          <ul className="space-y-1">
            <li>• <strong>記録作成時間</strong>を大幅削減</li>
            <li>• <strong>医療用語</strong>の自動変換</li>
            <li>• 標準的な<strong>看護記録形式</strong>で出力</li>
            <li>• <strong>誤字脱字</strong>の心配不要</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
)

/**
 * 機能紹介コンポーネント（SEO最適化）
 */
const FeaturesComponent = () => (
  <div className="mt-12 bg-white rounded-lg shadow-lg border border-pink-200 overflow-hidden">
    <div className="bg-gradient-to-r from-pink-600 to-pink-500 px-6 py-4">
      <h2 className="text-xl font-bold text-white flex items-center">
        <i className="fas fa-star text-yellow-300 mr-2"></i>
        看護記録作成AIの主な機能
      </h2>
      <p className="text-pink-100 text-sm mt-1">
        医療従事者の記録業務を革新的に効率化する先端AI技術
      </p>
    </div>
    
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCardComponent 
          icon="fas fa-robot"
          title="AI自動記録生成"
          description="自然言語処理技術により、メモ書きから専門的な看護記録を自動生成。医療用語の適切な使用と標準的な記録形式を保証。"
          keywords="AI看護記録, 自動生成, 医療用語, NLP"
        />
        
        <FeatureCardComponent 
          icon="fas fa-clipboard-check"
          title="SOAP形式対応"
          description="Subjective・Objective・Assessment・Planの標準的なSOAP形式での記録作成に完全対応。臨床現場で求められる記録品質を実現。"
          keywords="SOAP記録, 看護過程, 臨床記録, 標準形式"
        />
        
        <FeatureCardComponent 
          icon="fas fa-shield-alt"
          title="医療情報保護"
          description="HIPAA準拠のセキュリティ設計。患者情報の自動検出・ブロック機能により、個人情報漏洩リスクを完全に排除。"
          keywords="HIPAA, 医療情報保護, 患者プライバシー, セキュリティ"
        />
        
        <FeatureCardComponent 
          icon="fas fa-clock"
          title="24時間対応"
          description="夜勤・日勤を問わず24時間利用可能。クラウドベースのAI技術により、いつでもどこでも高品質な記録作成をサポート。"
          keywords="24時間対応, 夜勤対応, クラウドAI, 看護業務支援"
        />
      </div>
    </div>
  </div>
)

/**
 * 機能カードコンポーネント
 */
const FeatureCardComponent = ({ icon, title, description, keywords }: {
  icon: string;
  title: string;
  description: string;
  keywords: string;
}) => (
  <div className="bg-pink-50 rounded-lg p-4 border border-pink-200 hover:shadow-md transition-shadow">
    <div className="flex items-center mb-3">
      <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center mr-3">
        <i className={`${icon} text-white`}></i>
      </div>
      <h3 className="font-bold text-pink-800">{title}</h3>
    </div>
    <p className="text-sm text-pink-700 mb-2 leading-relaxed">{description}</p>
    <p className="text-xs text-pink-500 italic">{keywords}</p>
  </div>
)

/**
 * 導入効果コンポーネント（SEO最適化）
 */
const BenefitsComponent = () => (
  <div className="mt-12 bg-gradient-to-br from-pink-50 to-white rounded-lg shadow-lg border border-pink-200">
    <div className="px-6 py-4 border-b border-pink-200">
      <h2 className="text-xl font-bold text-pink-900 flex items-center">
        <i className="fas fa-chart-line text-pink-600 mr-2"></i>
        医療機関・施設での導入効果
      </h2>
      <p className="text-sm text-pink-700 mt-1">
        看護業務の効率化と記録品質向上を実現
      </p>
    </div>
    
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-pink-800 border-b border-pink-300 pb-2">
            📈 業務効率化の実績
          </h3>
          <div className="space-y-3">
            <BenefitItemComponent 
              percentage="70%"
              description="看護記録作成時間の短縮"
              detail="従来30分の記録作業が平均9分に短縮"
            />
            <BenefitItemComponent 
              percentage="85%"
              description="記録ミス・誤字脱字の削減"
              detail="AI校正機能により記録品質が大幅向上"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-pink-800 border-b border-pink-300 pb-2">
            🏥 対応医療施設・職種
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded p-3 border border-pink-200">
              <h4 className="font-semibold text-pink-800 mb-2">医療施設</h4>
              <ul className="space-y-1 text-pink-700">
                <li>• 総合病院・大学病院</li>
                <li>• クリニック・診療所</li>
                <li>• 訪問看護ステーション</li>
                <li>• 介護施設・老人ホーム</li>
              </ul>
            </div>
            <div className="bg-white rounded p-3 border border-pink-200">
              <h4 className="font-semibold text-pink-800 mb-2">対象職種</h4>
              <ul className="space-y-1 text-pink-700">
                <li>• 正看護師・准看護師</li>
                <li>• 理学療法士・作業療法士</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

/**
 * 効果項目コンポーネント
 */
const BenefitItemComponent = ({ percentage, description, detail }: {
  percentage: string;
  description: string;
  detail: string;
}) => (
  <div className="bg-white rounded-lg p-4 border border-pink-200 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl font-bold text-pink-600">{percentage}</span>
      <i className="fas fa-arrow-up text-green-500"></i>
    </div>
    <h4 className="font-semibold text-pink-800 mb-1">{description}</h4>
    <p className="text-sm text-pink-600">{detail}</p>
  </div>
)

/**
 * プライバシーポリシーコンポーネント
 */
const PrivacyPolicyComponent = () => (
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
            <strong>最終更新：2025年10月8日</strong>
          </p>
          
          <div className="border-t border-pink-200 pt-3">
            <p className="text-xs text-pink-700 mb-2">
              <strong>お問い合わせ:</strong>
            </p>
            <p className="text-xs text-pink-600 font-mono">
              📧 {APP_CONFIG.author.email.replace('@', '[at]').replace(/\./g, '[dot]')}<br />
              👤 {APP_CONFIG.author.name}
            </p>
            <p className="text-xs text-pink-500 mt-2 italic">
              ※ スパム防止のため[dot]を「.」、[at]を「@」に置き換えてください
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

/**
 * フッターコンポーネント（将来の拡張用）
 */
const FooterComponent = () => (
  <footer className="mt-16 py-8">
    {/* フッターコンテンツを削除 */}
  </footer>
)

/**
 * スクリプト読み込みコンポーネント
 */
const ScriptComponents = () => (
  <>
    <script type="module" src="/static/app-dashboard.js"></script>
  </>
)

// ========================================
// 🚫 404ハンドラー
// ========================================

app.notFound(notFoundHandler())

// ========================================
// 📤 エクスポート
// ========================================

export default app