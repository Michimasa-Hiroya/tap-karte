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
 * ヘッダーコンポーネント
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
                alt="タップカルテ" 
                className="w-16 h-16 mr-4"
              />
              {APP_CONFIG.name}
            </h1>
            <p className="text-lg md:text-xl text-pink-700 font-medium ml-20">
              {APP_CONFIG.tagline}
            </p>
          </div>
          
          {/* モバイル表示 */}
          <div className="sm:hidden">
            <div className="flex items-center space-x-2">
              <img 
                src="https://page.gensparksite.com/v1/base64_upload/e0e0839ca795c5577a86e6b90d5285a3" 
                alt="タップカルテ" 
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-bold text-pink-800 leading-tight">
                  {APP_CONFIG.name}
                </h1>
                <p className="text-xs text-pink-700 font-medium leading-tight whitespace-nowrap">
                  {APP_CONFIG.tagline}
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
 * メインコンテンツコンポーネント
 */
const MainContentComponent = () => (
  <main className="max-w-7xl mx-auto px-4 py-8">
    <ConversionInterfaceComponent />
    <UsageGuideComponent />
    <PrivacyPolicyComponent />
  </main>
)

/**
 * AI変換インターフェースコンポーネント
 */
const ConversionInterfaceComponent = () => (
  <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-pink-200">
    <OptionsBarComponent />
    <InputOutputAreaComponent />
  </div>
)

/**
 * オプション設定バーコンポーネント
 */
const OptionsBarComponent = () => (
  <div className="bg-pink-50 px-6 py-4 border-b border-pink-200">
    <div className="mb-4">
      <p className="text-sm text-pink-800 font-semibold">
        作成したい書式に合わせて選択してください
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <OptionGroupComponent 
        title="ドキュメント"
        options={[
          { id: "doc-record", label: "記録", active: true },
          { id: "doc-report", label: "報告書", active: false }
        ]}
      />
      
      <OptionGroupComponent 
        title="フォーマット"
        options={[
          { id: "format-text", label: "文章形式", active: true },
          { id: "format-soap", label: "SOAP形式", active: false }
        ]}
      />
      
      <OptionGroupComponent 
        title="文体"
        options={[
          { id: "style-plain", label: "だ・である体", active: true },
          { id: "style-polite", label: "ですます体", active: false }
        ]}
      />
    </div>
    
    <CharacterLimitSliderComponent />
  </div>
)

/**
 * オプショングループコンポーネント
 */
const OptionGroupComponent = ({ title, options }: { title: string; options: Array<{id: string; label: string; active: boolean}> }) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-pink-800">{title}</label>
    <div className="flex space-x-2">
      {options.map(option => (
        <button 
          key={option.id}
          id={option.id} 
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            option.active 
              ? 'bg-pink-600 text-white hover:bg-pink-700'
              : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
)

/**
 * 文字数制限スライダーコンポーネント
 */
const CharacterLimitSliderComponent = () => (
  <div className="mt-4">
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-semibold text-pink-800">出力文字数制限</label>
      <span id="char-limit-display" className="text-sm text-pink-700 font-medium">500文字</span>
    </div>
    <div className="flex items-center space-x-4">
      <span className="text-xs text-pink-600">100</span>
      <input 
        type="range" 
        id="char-limit-slider" 
        min="100" 
        max="1000" 
        step="50" 
        value="500"
        className="flex-1 h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer slider-pink"
      />
      <span className="text-xs text-pink-600">1000</span>
    </div>
  </div>
)

/**
 * 入力・出力エリアコンポーネント
 */
const InputOutputAreaComponent = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2">
    <InputAreaComponent />
    <OutputAreaComponent />
  </div>
)

/**
 * 入力エリアコンポーネント
 */
const InputAreaComponent = () => (
  <div className="p-6 border-r border-pink-200">
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-semibold text-pink-800">入力</label>
        <span id="input-count" className="text-sm text-pink-600">0文字</span>
      </div>
      
      <SecurityWarningComponent />
      
      <textarea 
        id="input-text"
        className="w-full h-80 p-4 border border-pink-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        placeholder="・思いついたことを、そのまま入力してタップするだけ&#10;・箇条書きでもOK&#10;・テキスト入力や音声入力でもOK&#10;・誤字脱字があっても大丈夫"
      ></textarea>
    </div>
    
    {/* 使用制限・認証メッセージ（入力欄と生成ボタンの間に配置） */}
    
    {/* 使用制限メッセージ - Safari対応版 */}
    <div id="usage-limit-message" className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg shadow-sm" style={{display: 'none'}}>
      {/* 動的に内容が更新されます */}
    </div>
    
    <div className="flex justify-between items-center">
      <button 
        id="generate-btn" 
        disabled
        className="px-6 py-2 bg-pink-600 text-white rounded-lg transition-colors opacity-50 cursor-not-allowed disabled:opacity-50 disabled:cursor-not-allowed"
      >
        生成
      </button>
      <button 
        id="clear-input" 
        className="px-4 py-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-colors"
      >
        クリア
      </button>
    </div>
  </div>
)

/**
 * セキュリティ警告コンポーネント
 */
const SecurityWarningComponent = () => (
  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
    <div className="flex items-center space-x-2">
      <i className="fas fa-exclamation-triangle text-red-500"></i>
      <span className="text-sm font-semibold text-red-700">注意</span>
    </div>
    <div className="text-sm text-red-600 mt-1">
      <p>個人情報(氏名や住所など)や個人が特定できる情報、珍しい病名などの入力は禁止します。</p>
    </div>
  </div>
)

/**
 * 出力エリアコンポーネント
 */
const OutputAreaComponent = () => (
  <div className="p-6">
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-semibold text-pink-800">出力</label>
        <span id="output-count" className="text-sm text-pink-600">0文字</span>
      </div>
      <div 
        id="output-text"
        className="w-full h-80 p-4 bg-pink-25 border border-pink-300 rounded-lg overflow-y-auto whitespace-pre-wrap"
      >
        <div className="text-pink-400 italic">生成された文章がここに表示されます...</div>
      </div>
    </div>
    
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <button 
          id="copy-btn" 
          className="flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled
        >
          <i className="fas fa-copy"></i>
          <span>コピー</span>
        </button>
        <div id="loading" className="hidden flex items-center space-x-2 text-pink-600 ml-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
          <span>処理中...</span>
        </div>
      </div>
      <button 
        id="clear-output" 
        className="px-4 py-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-colors"
      >
        クリア
      </button>
    </div>
  </div>
)

/**
 * 使用ガイドコンポーネント
 */
const UsageGuideComponent = () => (
  <div className="mt-8 bg-pink-50 rounded-lg p-6 border border-pink-200">
    <h3 className="text-lg font-semibold text-pink-900 mb-3">タップカルテの使い方</h3>
    <ol className="list-decimal list-inside space-y-2 text-pink-800">
      <li>思ったことやメモを入力エリアにそのまま入力</li>
      <li>生成ボタンをタップして、整った看護記録や報告書が自動生成</li>
      <li>「コピー」ボタンで電子カルテにそのまま貼り付け可能</li>
    </ol>
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
    <script type="module" src="/static/app-modular.js"></script>
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