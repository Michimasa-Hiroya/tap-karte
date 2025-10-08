/**
 * タップカルテ - リファクタリング版統合フロントエンド
 * 
 * クリーンアーキテクチャに基づく統合JavaScript
 */

// ========================================
// 🔐 認証サービス（AuthService）
// ========================================

/**
 * 認証サービスクラス
 */
class AuthService {
  constructor() {
    /** @type {Object|null} 現在のユーザー */
    this.currentUser = null
    
    /** @type {string|null} 認証トークン */
    this.authToken = null
    
    /** @type {Array<Function>} 認証状態変更リスナー */
    this.authListeners = []
    
    /** @type {Object} 設定 */
    this.config = {
      apiBaseUrl: '/api',
      tokenStorageKey: 'demo_auth_token',
      userStorageKey: 'demo_user_data',
      sessionCheckInterval: 5 * 60 * 1000, // 5分
      autoRefreshInterval: 30 * 60 * 1000  // 30分
    }
    
    /** @type {number|null} セッション監視タイマー */
    this.sessionTimer = null
    
    /** @type {number|null} 自動更新タイマー */
    this.refreshTimer = null
    
    console.log('[AuthService] Initialized')
  }

  // ========================================
  // 🚀 認証処理
  // ========================================

  /**
   * デモログイン処理
   * @returns {Promise<boolean>} ログイン成功フラグ
   */
  async login() {
    try {
      console.log('[AuthService] Starting demo login...')
      
      const response = await fetch(`${this.config.apiBaseUrl}/auth/demo-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`ログインに失敗しました: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.user && data.token) {
        // 認証情報を保存
        this.currentUser = data.user
        this.authToken = data.token
        
        // ローカルストレージに保存
        localStorage.setItem(this.config.tokenStorageKey, data.token)
        localStorage.setItem(this.config.userStorageKey, JSON.stringify(data.user))
        
        // セッション監視を開始
        this.startSessionMonitoring()
        
        // リスナーに通知
        this.notifyAuthListeners(true)
        
        console.log('[AuthService] Login successful:', data.user.name)
        return true
      } else {
        throw new Error(data.message || 'ログインレスポンスが無効です')
      }
    } catch (error) {
      console.error('[AuthService] Login error:', error)
      throw error
    }
  }

  /**
   * ログアウト処理
   */
  async logout() {
    try {
      console.log('[AuthService] Starting logout...')
      
      // セッション監視を停止
      this.stopSessionMonitoring()
      
      // ローカルストレージをクリア
      localStorage.removeItem(this.config.tokenStorageKey)
      localStorage.removeItem(this.config.userStorageKey)
      
      // 状態をリセット
      this.currentUser = null
      this.authToken = null
      
      // リスナーに通知
      this.notifyAuthListeners(false)
      
      console.log('[AuthService] Logout completed')
    } catch (error) {
      console.error('[AuthService] Logout error:', error)
    }
  }

  // ========================================
  // 🔍 セッション管理
  // ========================================

  /**
   * セッション監視を開始
   */
  startSessionMonitoring() {
    console.log('[AuthService] Starting session monitoring')
    
    // 既存のタイマーをクリア
    this.stopSessionMonitoring()
    
    // 定期セッションチェック
    this.sessionTimer = setInterval(() => {
      this.validateSession()
    }, this.config.sessionCheckInterval)
    
    // 自動トークン更新
    this.refreshTimer = setInterval(() => {
      this.refreshToken()
    }, this.config.autoRefreshInterval)
  }

  /**
   * セッション監視を停止
   */
  stopSessionMonitoring() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * セッション状態を検証
   */
  async validateSession() {
    if (!this.authToken) return false
    
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      })
      
      if (!response.ok) {
        console.log('[AuthService] Session validation failed, logging out')
        await this.logout()
        return false
      }
      
      return true
    } catch (error) {
      console.error('[AuthService] Session validation error:', error)
      return false
    }
  }

  /**
   * 認証トークンを更新
   */
  async refreshToken() {
    if (!this.authToken) return false
    
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.token) {
          this.authToken = data.token
          localStorage.setItem(this.config.tokenStorageKey, data.token)
          console.log('[AuthService] Token refreshed successfully')
        }
      }
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error)
    }
  }

  // ========================================
  // 📡 状態管理とリスナー
  // ========================================

  /**
   * 認証状態リスナーを追加
   * @param {Function} callback コールバック関数
   */
  addAuthListener(callback) {
    this.authListeners.push(callback)
  }

  /**
   * 認証状態リスナーを削除
   * @param {Function} callback コールバック関数
   */
  removeAuthListener(callback) {
    const index = this.authListeners.indexOf(callback)
    if (index > -1) {
      this.authListeners.splice(index, 1)
    }
  }

  /**
   * 認証状態リスナーに通知
   * @param {boolean} isAuthenticated 認証状態
   */
  notifyAuthListeners(isAuthenticated) {
    this.authListeners.forEach(callback => {
      try {
        callback(isAuthenticated, this.currentUser)
      } catch (error) {
        console.error('[AuthService] Listener callback error:', error)
      }
    })
  }

  // ========================================
  // ⚙️ ユーティリティ
  // ========================================

  /**
   * 認証済み状態かチェック
   * @returns {boolean} 認証状態
   */
  isAuthenticated() {
    return !!(this.currentUser && this.authToken)
  }

  /**
   * 現在のユーザー情報を取得
   * @returns {Object|null} ユーザー情報
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * 認証トークンを取得
   * @returns {string|null} 認証トークン
   */
  getAuthToken() {
    return this.authToken
  }

  /**
   * 保存された認証情報をロード
   */
  loadStoredAuth() {
    try {
      const storedToken = localStorage.getItem(this.config.tokenStorageKey)
      const storedUser = localStorage.getItem(this.config.userStorageKey)
      
      if (storedToken && storedUser) {
        this.authToken = storedToken
        this.currentUser = JSON.parse(storedUser)
        this.startSessionMonitoring()
        console.log('[AuthService] Stored auth loaded:', this.currentUser.name)
        return true
      }
    } catch (error) {
      console.error('[AuthService] Error loading stored auth:', error)
      // 破損したデータをクリア
      localStorage.removeItem(this.config.tokenStorageKey)
      localStorage.removeItem(this.config.userStorageKey)
    }
    return false
  }
}

// ========================================
// 🎨 認証UIコンポーネント（AuthComponent）
// ========================================

/**
 * 認証UIコンポーネントクラス
 */
class AuthComponent {
  constructor(authService) {
    /** @type {AuthService} 認証サービス */
    this.authService = authService
    
    /** @type {Object} DOM要素の参照 */
    this.elements = {}
    
    /** @type {boolean} 初期化済みフラグ */
    this.initialized = false
    
    console.log('[AuthComponent] Initialized')
  }

  // ========================================
  // 🚀 初期化
  // ========================================

  /**
   * コンポーネントを初期化
   */
  initialize() {
    if (this.initialized) {
      console.log('[AuthComponent] Already initialized')
      return
    }
    
    console.log('[AuthComponent] Initializing...')
    
    // DOM要素を取得
    this.cacheDOMElements()
    
    // イベントリスナーを設定
    this.setupEventListeners()
    
    // 認証状態リスナーを追加
    this.authService.addAuthListener((isAuthenticated, user) => {
      this.updateUI(isAuthenticated, user)
    })
    
    // 初期状態を表示
    this.updateUI(this.authService.isAuthenticated(), this.authService.getCurrentUser())
    
    this.initialized = true
    console.log('[AuthComponent] Initialization completed')
  }

  /**
   * DOM要素をキャッシュ
   */
  cacheDOMElements() {
    this.elements = {
      // 認証モーダル
      authModal: document.getElementById('authModal'),
      
      // ログインボタン
      loginBtn: document.getElementById('loginBtn'),
      demoLoginBtn: document.getElementById('demoLoginBtn'),
      
      // ユーザー情報
      userInfo: document.getElementById('userInfo'),
      userName: document.getElementById('userName'),
      userPicture: document.getElementById('userPicture'),
      logoutBtn: document.getElementById('logoutBtn'),
      
      // ヘッダーのユーザー情報
      headerUserInfo: document.getElementById('headerUserInfo'),
      headerUserName: document.getElementById('headerUserName'),
      headerUserPicture: document.getElementById('headerUserPicture'),
      
      // モーダル制御
      closeModalBtns: document.querySelectorAll('[data-close-modal]'),
      
      // エラー表示
      authError: document.getElementById('authError')
    }
    
    console.log('[AuthComponent] DOM elements cached')
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // ログインボタン
    if (this.elements.loginBtn) {
      this.elements.loginBtn.addEventListener('click', () => {
        this.showAuthModal()
      })
    }
    
    // デモログインボタン
    if (this.elements.demoLoginBtn) {
      this.elements.demoLoginBtn.addEventListener('click', async () => {
        await this.handleDemoLogin()
      })
    }
    
    // ログアウトボタン
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', async () => {
        await this.handleLogout()
      })
    }
    
    // モーダル閉じるボタン
    this.elements.closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideAuthModal()
      })
    })
    
    // モーダル背景クリックで閉じる
    if (this.elements.authModal) {
      this.elements.authModal.addEventListener('click', (e) => {
        if (e.target === this.elements.authModal) {
          this.hideAuthModal()
        }
      })
    }
    
    console.log('[AuthComponent] Event listeners setup completed')
  }

  // ========================================
  // 🎯 認証処理
  // ========================================

  /**
   * デモログイン処理
   */
  async handleDemoLogin() {
    try {
      console.log('[AuthComponent] Processing demo login...')
      
      // ローディング状態を表示
      this.setLoadingState(true)
      this.clearError()
      
      // 認証サービスでログイン実行
      await this.authService.login()
      
      // モーダルを閉じる
      this.hideAuthModal()
      
      console.log('[AuthComponent] Demo login completed successfully')
      
    } catch (error) {
      console.error('[AuthComponent] Demo login failed:', error)
      this.showError(`ログインに失敗しました: ${error.message}`)
    } finally {
      this.setLoadingState(false)
    }
  }

  /**
   * ログアウト処理
   */
  async handleLogout() {
    try {
      console.log('[AuthComponent] Processing logout...')
      
      // 確認ダイアログ
      if (!confirm('ログアウトしますか？')) {
        return
      }
      
      // 認証サービスでログアウト実行
      await this.authService.logout()
      
      console.log('[AuthComponent] Logout completed successfully')
      
    } catch (error) {
      console.error('[AuthComponent] Logout failed:', error)
      this.showError(`ログアウトに失敗しました: ${error.message}`)
    }
  }

  // ========================================
  // 🎨 UI更新
  // ========================================

  /**
   * UI状態を更新
   * @param {boolean} isAuthenticated 認証状態
   * @param {Object|null} user ユーザー情報
   */
  updateUI(isAuthenticated, user) {
    console.log('[AuthComponent] Updating UI:', { isAuthenticated, user: user?.name })
    
    if (isAuthenticated && user) {
      this.showAuthenticatedUI(user)
    } else {
      this.showUnauthenticatedUI()
    }
  }

  /**
   * 認証済みUI表示
   * @param {Object} user ユーザー情報
   */
  showAuthenticatedUI(user) {
    // ログインボタンを非表示
    if (this.elements.loginBtn) {
      this.elements.loginBtn.style.display = 'none'
    }
    
    // ユーザー情報を表示
    if (this.elements.userInfo) {
      this.elements.userInfo.style.display = 'flex'
    }
    
    // ユーザー名を設定
    if (this.elements.userName) {
      this.elements.userName.textContent = user.name
    }
    if (this.elements.headerUserName) {
      this.elements.headerUserName.textContent = user.name
    }
    
    // ユーザー画像を設定
    if (user.picture) {
      if (this.elements.userPicture) {
        this.elements.userPicture.src = user.picture
        this.elements.userPicture.style.display = 'block'
      }
      if (this.elements.headerUserPicture) {
        this.elements.headerUserPicture.src = user.picture
        this.elements.headerUserPicture.style.display = 'block'
      }
    }
    
    // ヘッダーのユーザー情報を表示
    if (this.elements.headerUserInfo) {
      this.elements.headerUserInfo.style.display = 'flex'
    }
  }

  /**
   * 未認証UI表示
   */
  showUnauthenticatedUI() {
    // ログインボタンを表示
    if (this.elements.loginBtn) {
      this.elements.loginBtn.style.display = 'inline-flex'
    }
    
    // ユーザー情報を非表示
    if (this.elements.userInfo) {
      this.elements.userInfo.style.display = 'none'
    }
    
    // ヘッダーのユーザー情報を非表示
    if (this.elements.headerUserInfo) {
      this.elements.headerUserInfo.style.display = 'none'
    }
  }

  // ========================================
  // 🪟 モーダル制御
  // ========================================

  /**
   * 認証モーダルを表示
   */
  showAuthModal() {
    if (this.elements.authModal) {
      this.elements.authModal.style.display = 'flex'
      this.clearError()
      console.log('[AuthComponent] Auth modal shown')
    }
  }

  /**
   * 認証モーダルを非表示
   */
  hideAuthModal() {
    if (this.elements.authModal) {
      this.elements.authModal.style.display = 'none'
      this.setLoadingState(false)
      this.clearError()
      console.log('[AuthComponent] Auth modal hidden')
    }
  }

  // ========================================
  // ⚠️ エラー処理とUIフィードバック
  // ========================================

  /**
   * エラーを表示
   * @param {string} message エラーメッセージ
   */
  showError(message) {
    if (this.elements.authError) {
      this.elements.authError.textContent = message
      this.elements.authError.style.display = 'block'
    }
    console.error('[AuthComponent] Error displayed:', message)
  }

  /**
   * エラーをクリア
   */
  clearError() {
    if (this.elements.authError) {
      this.elements.authError.style.display = 'none'
      this.elements.authError.textContent = ''
    }
  }

  /**
   * ローディング状態を設定
   * @param {boolean} loading ローディング状態
   */
  setLoadingState(loading) {
    if (this.elements.demoLoginBtn) {
      this.elements.demoLoginBtn.disabled = loading
      this.elements.demoLoginBtn.textContent = loading ? 'ログイン中...' : 'デモログイン'
    }
  }
}

// ========================================
// 🎯 アプリケーション管理（AppService）
// ========================================

/**
 * アプリケーション管理サービス
 */
class AppService {
  constructor() {
    /** @type {AuthService} 認証サービス */
    this.authService = new AuthService()
    
    /** @type {AuthComponent} 認証UIコンポーネント */
    this.authComponent = new AuthComponent(this.authService)
    
    /** @type {Object} アプリケーション状態 */
    this.state = {
      initialized: false,
      conversionHistory: [],
      currentConversion: null,
      isProcessing: false
    }
    
    console.log('[AppService] Initialized')
  }

  // ========================================
  // 🚀 初期化
  // ========================================

  /**
   * アプリケーションを初期化
   */
  async initialize() {
    try {
      console.log('[AppService] Starting application initialization...')
      
      // 認証UIコンポーネントを初期化
      this.authComponent.initialize()
      
      // 保存された認証情報をロード
      this.authService.loadStoredAuth()
      
      // 変換フォームを初期化
      this.initializeConversionForm()
      
      // 履歴を初期化
      this.initializeHistory()
      
      this.state.initialized = true
      console.log('[AppService] Application initialization completed')
      
    } catch (error) {
      console.error('[AppService] Initialization error:', error)
      throw error
    }
  }

  /**
   * 変換フォームを初期化
   */
  initializeConversionForm() {
    const form = document.getElementById('conversionForm')
    const textInput = document.getElementById('textInput')
    const convertBtn = document.getElementById('convertBtn')
    
    if (form && textInput && convertBtn) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        await this.handleConversion()
      })
      
      // リアルタイム文字数カウント
      textInput.addEventListener('input', () => {
        this.updateCharacterCount()
      })
      
      console.log('[AppService] Conversion form initialized')
    }
  }

  /**
   * 履歴を初期化
   */
  initializeHistory() {
    try {
      // ローカルストレージから履歴を読み込み
      const storedHistory = localStorage.getItem('conversionHistory')
      if (storedHistory) {
        this.state.conversionHistory = JSON.parse(storedHistory)
        this.displayConversionHistory()
      }
      
      console.log('[AppService] History initialized:', this.state.conversionHistory.length, 'items')
    } catch (error) {
      console.error('[AppService] History initialization error:', error)
      this.state.conversionHistory = []
    }
  }

  // ========================================
  // 🔄 AI変換処理
  // ========================================

  /**
   * AI変換を実行
   */
  async handleConversion() {
    if (this.state.isProcessing) {
      console.log('[AppService] Conversion already in progress')
      return
    }
    
    try {
      const textInput = document.getElementById('textInput')
      const text = textInput?.value?.trim()
      
      if (!text) {
        alert('変換するテキストを入力してください。')
        return
      }
      
      console.log('[AppService] Starting AI conversion...', { textLength: text.length })
      
      // 処理開始
      this.setConversionLoadingState(true)
      
      // API呼び出し
      const response = await fetch('/api/ai/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authService.getAuthToken() && {
            'Authorization': `Bearer ${this.authService.getAuthToken()}`
          })
        },
        body: JSON.stringify({
          text: text,
          options: {
            format: 'medical_record',
            style: 'professional',
            include_suggestions: true
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`変換に失敗しました: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // 変換結果を表示
        this.displayConversionResult(result)
        
        // 履歴に追加
        this.addToHistory({
          id: Date.now(),
          originalText: text,
          convertedText: result.converted_text,
          suggestions: result.suggestions,
          timestamp: new Date().toISOString(),
          user: this.authService.getCurrentUser()
        })
        
        // フォームをクリア
        textInput.value = ''
        this.updateCharacterCount()
        
        console.log('[AppService] AI conversion completed successfully')
      } else {
        throw new Error(result.message || '変換処理でエラーが発生しました')
      }
      
    } catch (error) {
      console.error('[AppService] Conversion error:', error)
      this.showConversionError(error.message)
    } finally {
      this.setConversionLoadingState(false)
    }
  }

  // ========================================
  // 🎨 UI更新とフィードバック
  // ========================================

  /**
   * 変換結果を表示
   * @param {Object} result 変換結果
   */
  displayConversionResult(result) {
    const resultContainer = document.getElementById('conversionResult')
    if (!resultContainer) return
    
    const resultHtml = `
      <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-semibold text-gray-800">変換結果</h3>
          <button onclick="app.copyResult('${result.converted_text}')" 
                  class="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">
            <i class="fas fa-copy mr-1"></i>コピー
          </button>
        </div>
        
        <div class="mb-4">
          <textarea class="w-full p-3 border rounded-lg bg-gray-50" 
                    rows="6" readonly>${result.converted_text}</textarea>
        </div>
        
        ${result.suggestions && result.suggestions.length > 0 ? `
          <div class="mt-4">
            <h4 class="text-md font-medium text-gray-700 mb-2">提案・改善点</h4>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
              ${result.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="mt-4 text-xs text-gray-500">
          変換時刻: ${new Date().toLocaleString('ja-JP')}
        </div>
      </div>
    `
    
    resultContainer.innerHTML = resultHtml
    resultContainer.style.display = 'block'
    
    // 結果までスクロール
    resultContainer.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * 変換履歴を表示
   */
  displayConversionHistory() {
    const historyContainer = document.getElementById('conversionHistory')
    if (!historyContainer || this.state.conversionHistory.length === 0) return
    
    const historyHtml = this.state.conversionHistory
      .slice(-5) // 最新5件のみ表示
      .reverse()
      .map(item => `
        <div class="bg-gray-50 rounded-lg p-4 border">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs text-gray-500">${new Date(item.timestamp).toLocaleString('ja-JP')}</span>
            <button onclick="app.loadHistoryItem(${item.id})" 
                    class="text-xs text-blue-600 hover:text-blue-800">再読み込み</button>
          </div>
          <div class="text-sm text-gray-600 mb-2 line-clamp-2">${item.originalText}</div>
          <div class="text-sm text-gray-800 line-clamp-3">${item.convertedText}</div>
        </div>
      `).join('')
    
    historyContainer.innerHTML = historyHtml
  }

  /**
   * 文字数カウントを更新
   */
  updateCharacterCount() {
    const textInput = document.getElementById('textInput')
    const charCount = document.getElementById('charCount')
    
    if (textInput && charCount) {
      const length = textInput.value.length
      charCount.textContent = `${length}/1000文字`
      
      // 文字数制限の視覚的フィードバック
      if (length > 1000) {
        charCount.classList.add('text-red-500')
        charCount.classList.remove('text-gray-500')
      } else {
        charCount.classList.add('text-gray-500')
        charCount.classList.remove('text-red-500')
      }
    }
  }

  /**
   * 変換エラーを表示
   * @param {string} message エラーメッセージ
   */
  showConversionError(message) {
    const resultContainer = document.getElementById('conversionResult')
    if (!resultContainer) return
    
    resultContainer.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <i class="fas fa-exclamation-triangle text-red-500 mr-2 mt-1"></i>
          <div>
            <h3 class="text-red-800 font-medium">変換エラー</h3>
            <p class="text-red-700 mt-1">${message}</p>
          </div>
        </div>
      </div>
    `
    resultContainer.style.display = 'block'
  }

  /**
   * 変換処理のローディング状態を設定
   * @param {boolean} loading ローディング状態
   */
  setConversionLoadingState(loading) {
    const convertBtn = document.getElementById('convertBtn')
    const textInput = document.getElementById('textInput')
    
    if (convertBtn) {
      convertBtn.disabled = loading
      convertBtn.innerHTML = loading 
        ? '<i class="fas fa-spinner fa-spin mr-2"></i>変換中...' 
        : '<i class="fas fa-magic mr-2"></i>カルテに変換'
    }
    
    if (textInput) {
      textInput.disabled = loading
    }
    
    this.state.isProcessing = loading
  }

  // ========================================
  // 📂 履歴管理
  // ========================================

  /**
   * 履歴にアイテムを追加
   * @param {Object} item 履歴アイテム
   */
  addToHistory(item) {
    this.state.conversionHistory.push(item)
    
    // 最新50件のみ保持
    if (this.state.conversionHistory.length > 50) {
      this.state.conversionHistory = this.state.conversionHistory.slice(-50)
    }
    
    // ローカルストレージに保存
    try {
      localStorage.setItem('conversionHistory', JSON.stringify(this.state.conversionHistory))
    } catch (error) {
      console.error('[AppService] History save error:', error)
    }
    
    // 履歴表示を更新
    this.displayConversionHistory()
  }

  /**
   * 履歴アイテムを読み込み
   * @param {number} itemId アイテムID
   */
  loadHistoryItem(itemId) {
    const item = this.state.conversionHistory.find(h => h.id === itemId)
    if (!item) return
    
    const textInput = document.getElementById('textInput')
    if (textInput) {
      textInput.value = item.originalText
      this.updateCharacterCount()
      textInput.focus()
    }
    
    console.log('[AppService] History item loaded:', itemId)
  }

  // ========================================
  // 🛠️ ユーティリティ
  // ========================================

  /**
   * テキストをクリップボードにコピー
   * @param {string} text コピーするテキスト
   */
  async copyResult(text) {
    try {
      await navigator.clipboard.writeText(text)
      
      // 成功フィードバック
      const notification = document.createElement('div')
      notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      notification.textContent = 'クリップボードにコピーしました'
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.remove()
      }, 2000)
      
      console.log('[AppService] Text copied to clipboard')
    } catch (error) {
      console.error('[AppService] Copy error:', error)
      alert('コピーに失敗しました')
    }
  }

  /**
   * アプリケーション統計を取得
   * @returns {Object} 統計情報
   */
  getAppStats() {
    return {
      totalConversions: this.state.conversionHistory.length,
      isAuthenticated: this.authService.isAuthenticated(),
      currentUser: this.authService.getCurrentUser(),
      initialized: this.state.initialized
    }
  }
}

// ========================================
// 🌍 グローバル初期化
// ========================================

// グローバルアプリケーションインスタンス
let app

/**
 * アプリケーション初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 タップカルテ - リファクタリング版 起動中...')
    
    // アプリケーションサービスを作成
    app = new AppService()
    
    // グローバルに露出（デバッグ用）
    window.app = app
    
    // アプリケーションを初期化
    await app.initialize()
    
    console.log('✅ タップカルテ - リファクタリング版 起動完了')
    
  } catch (error) {
    console.error('❌ アプリケーション初期化エラー:', error)
    
    // エラー表示
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-red-50">
        <div class="text-center p-8">
          <i class="fas fa-exclamation-triangle text-red-500 text-6xl mb-4"></i>
          <h1 class="text-2xl font-bold text-red-800 mb-2">アプリケーションエラー</h1>
          <p class="text-red-600 mb-4">アプリケーションの初期化に失敗しました。</p>
          <p class="text-sm text-red-500">${error.message}</p>
          <button onclick="location.reload()" 
                  class="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">
            再読み込み
          </button>
        </div>
      </div>
    `
  }
})

console.log('📋 タップカルテ - リファクタリング版JavaScript読み込み完了')