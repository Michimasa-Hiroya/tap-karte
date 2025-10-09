/**
 * タップカルテ - 最適化版統合フロントエンド
 * 
 * 機能完全維持・コード品質向上・メンテナンス性向上
 */

// ========================================
// 🔧 定数・設定
// ========================================

/** アプリケーション設定 */
const APP_CONSTANTS = {
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
    HISTORY_KEY: 'conversionHistory'
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
const CSS_CLASSES = {
  BUTTON: {
    BASE: 'px-4 py-2 rounded-md text-sm font-medium transition-colors',
    SELECTED: 'bg-pink-600 text-white hover:bg-pink-700',
    UNSELECTED: 'bg-pink-100 text-pink-700 hover:bg-pink-200'
  }
}

// ========================================
// 🛠️ ユーティリティ関数
// ========================================

/** DOM要素取得のヘルパー */
const DOM = {
  /**
   * 要素を安全に取得
   * @param {string} id - 要素ID
   * @returns {HTMLElement|null}
   */
  get(id) {
    return document.getElementById(id)
  },

  /**
   * 要素の表示/非表示を切り替え
   * @param {string} id - 要素ID
   * @param {boolean} visible - 表示フラグ
   */
  toggle(id, visible) {
    const element = this.get(id)
    if (element) {
      element.style.display = visible ? 'block' : 'none'
    }
  },

  /**
   * 要素のクラス操作
   * @param {string} id - 要素ID
   * @param {string} className - クラス名
   * @param {boolean} add - 追加フラグ（falseで削除）
   */
  toggleClass(id, className, add = true) {
    const element = this.get(id)
    if (element) {
      element.classList.toggle(className, add)
    }
  }
}

/** 日付ユーティリティ */
const DateUtils = {
  /**
   * 日本時間で今日の日付を取得
   * @returns {string} YYYY-MM-DD形式
   */
  getTodayJST() {
    const today = new Date()
    const jstOffset = 9 * 60 * 60 * 1000 // JST = UTC+9
    const jstDate = new Date(today.getTime() + jstOffset)
    
    return jstDate.getUTCFullYear() + '-' + 
           String(jstDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
           String(jstDate.getUTCDate()).padStart(2, '0')
  }
}

/** ローカルストレージヘルパー */
const StorageHelper = {
  /**
   * データを安全に取得
   * @param {string} key - キー
   * @param {any} defaultValue - デフォルト値
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`[StorageHelper] Get error for key ${key}:`, error)
      return defaultValue
    }
  },

  /**
   * データを安全に保存
   * @param {string} key - キー
   * @param {any} value - 値
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`[StorageHelper] Set error for key ${key}:`, error)
    }
  },

  /**
   * データを削除
   * @param {string} key - キー
   */
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`[StorageHelper] Remove error for key ${key}:`, error)
    }
  }
}

// ========================================
// 📊 使用回数管理システム（UsageManager）
// ========================================

class UsageManager {
  constructor() {
    this.storageKey = APP_CONSTANTS.STORAGE.USAGE_KEY
    this.usageData = this.loadUsageData()
    console.log('[UsageManager] Initialized')
  }

  /**
   * 使用データを読み込み
   * @returns {Object} 使用データ
   */
  loadUsageData() {
    const defaultData = {
      lastUsageDate: null,
      usageCount: 0,
      deviceId: this.generateDeviceId()
    }
    return StorageHelper.get(this.storageKey, defaultData)
  }

  /**
   * 使用データを保存
   */
  saveUsageData() {
    StorageHelper.set(this.storageKey, this.usageData)
  }

  /**
   * デバイスIDを生成（既存実装維持）
   */
  generateDeviceId() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    return Math.abs(hash).toString(36)
  }

  /**
   * 今日の日付を取得（日本時間）
   */
  getTodayDate() {
    return DateUtils.getTodayJST()
  }

  /**
   * ゲストユーザーが生成可能かチェック
   * @returns {boolean}
   */
  canGuestGenerate() {
    const today = this.getTodayDate()
    return this.usageData.lastUsageDate !== today
  }

  /**
   * ゲストユーザーの使用を記録
   */
  recordGuestUsage() {
    const today = this.getTodayDate()
    this.usageData.lastUsageDate = today
    this.usageData.usageCount += 1
    this.saveUsageData()
    
    console.log('[UsageManager] Guest usage recorded:', {
      date: today,
      totalCount: this.usageData.usageCount
    })
  }

  /**
   * 使用統計を取得
   * @returns {Object}
   */
  getUsageStats() {
    return {
      ...this.usageData,
      canGuestGenerate: this.canGuestGenerate(),
      todayDate: this.getTodayDate()
    }
  }

  /**
   * 使用データをリセット
   */
  resetUsageData() {
    this.usageData = {
      lastUsageDate: null,
      usageCount: 0,
      deviceId: this.generateDeviceId()
    }
    this.saveUsageData()
    console.log('[UsageManager] Usage data reset')
  }
}

// ========================================
// 🔐 認証サービス（AuthService）
// ========================================

class AuthService {
  constructor() {
    this.currentUser = null
    this.authToken = null
    this.authListeners = []
    this.sessionTimer = null
    this.refreshTimer = null
    
    console.log('[AuthService] Initialized')
  }

  /**
   * パスワード認証ログイン（機能維持）
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  async login(password) {
    try {
      console.log('[AuthService] Starting password login...')
      
      if (!password) {
        throw new Error('パスワードが入力されていません')
      }
      
      const response = await fetch(APP_CONSTANTS.API.ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `ログインに失敗しました: ${response.status}`)
      }
      
      if (data.success && data.data?.user && data.data?.token) {
        this.currentUser = data.data.user
        this.authToken = data.data.token
        
        StorageHelper.set(APP_CONSTANTS.STORAGE.TOKEN_KEY, data.data.token)
        StorageHelper.set(APP_CONSTANTS.STORAGE.USER_KEY, data.data.user)
        
        this.startSessionMonitoring()
        this.notifyAuthListeners(true)
        
        console.log('[AuthService] Login successful:', data.data.user.name)
        return true
      } else {
        throw new Error(data.error || 'ログインレスポンスが無効です')
      }
    } catch (error) {
      console.error('[AuthService] Login error:', error)
      throw error
    }
  }

  /**
   * ログアウト処理（機能維持）
   */
  async logout() {
    try {
      console.log('[AuthService] Starting logout...')
      
      this.stopSessionMonitoring()
      
      StorageHelper.remove(APP_CONSTANTS.STORAGE.TOKEN_KEY)
      StorageHelper.remove(APP_CONSTANTS.STORAGE.USER_KEY)
      
      this.currentUser = null
      this.authToken = null
      
      this.notifyAuthListeners(false)
      console.log('[AuthService] Logout completed')
    } catch (error) {
      console.error('[AuthService] Logout error:', error)
    }
  }

  /**
   * セッション監視開始（機能維持）
   */
  startSessionMonitoring() {
    this.stopSessionMonitoring()
    
    this.sessionTimer = setInterval(() => {
      this.validateSession()
    }, APP_CONSTANTS.TIMERS.SESSION_CHECK)
    
    this.refreshTimer = setInterval(() => {
      this.refreshToken()
    }, APP_CONSTANTS.TIMERS.AUTO_REFRESH)
  }

  /**
   * セッション監視停止
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
   * セッション検証（機能維持）
   */
  async validateSession() {
    if (!this.authToken) return false
    
    try {
      const response = await fetch(APP_CONSTANTS.API.ENDPOINTS.VALIDATE, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
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
   * トークン更新（機能維持）
   */
  async refreshToken() {
    if (!this.authToken) return false
    
    try {
      const response = await fetch('/api/auth/refresh', {
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
          StorageHelper.set(APP_CONSTANTS.STORAGE.TOKEN_KEY, data.token)
          console.log('[AuthService] Token refreshed successfully')
        }
      }
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error)
    }
  }

  // ユーティリティメソッド
  isAuthenticated() { return !!(this.currentUser && this.authToken) }
  getCurrentUser() { return this.currentUser }
  getAuthToken() { return this.authToken }

  addAuthListener(callback) { this.authListeners.push(callback) }
  removeAuthListener(callback) {
    const index = this.authListeners.indexOf(callback)
    if (index > -1) this.authListeners.splice(index, 1)
  }

  notifyAuthListeners(isAuthenticated) {
    this.authListeners.forEach(callback => {
      try {
        callback(isAuthenticated, this.currentUser)
      } catch (error) {
        console.error('[AuthService] Listener callback error:', error)
      }
    })
  }

  /**
   * 保存された認証情報をロード（機能維持）
   */
  loadStoredAuth() {
    try {
      const storedToken = StorageHelper.get(APP_CONSTANTS.STORAGE.TOKEN_KEY)
      const storedUser = StorageHelper.get(APP_CONSTANTS.STORAGE.USER_KEY)
      
      if (storedToken && storedUser) {
        this.authToken = storedToken
        this.currentUser = storedUser
        this.startSessionMonitoring()
        console.log('[AuthService] Stored auth loaded:', this.currentUser.name)
        return true
      }
    } catch (error) {
      console.error('[AuthService] Error loading stored auth:', error)
      StorageHelper.remove(APP_CONSTANTS.STORAGE.TOKEN_KEY)
      StorageHelper.remove(APP_CONSTANTS.STORAGE.USER_KEY)
    }
    return false
  }
}

// ========================================
// 🎨 UI管理システム（UIManager）
// ========================================

class UIManager {
  constructor() {
    this.elements = {}
    this.initialized = false
    console.log('[UIManager] Initialized')
  }

  /**
   * DOM要素をキャッシュ
   */
  cacheDOMElements() {
    // 認証関連要素
    this.elements.auth = {
      modal: DOM.get('auth-modal'),
      loginBtn: DOM.get('login-btn'),
      loginForm: DOM.get('login-form'),
      loginPassword: DOM.get('login-password'),
      userStatus: DOM.get('user-status'),
      authButtons: DOM.get('auth-buttons'),
      userName: DOM.get('user-name'),
      userAvatar: DOM.get('user-avatar'),
      logoutBtn: DOM.get('logout-btn'),
      closeModal: DOM.get('close-modal'),
      loginError: DOM.get('login-error-message')
    }

    // 変換関連要素
    this.elements.conversion = {
      inputText: DOM.get('input-text'),
      outputText: DOM.get('output-text'),
      generateBtn: DOM.get('generate-btn'),
      clearBtn: DOM.get('clear-input'),
      copyBtn: DOM.get('copy-btn'),
      inputCount: DOM.get('input-count'),
      outputCount: DOM.get('output-count'),
      charLimitSlider: DOM.get('char-limit-slider'),
      charLimitDisplay: DOM.get('char-limit-display'),
      authMessage: DOM.get('auth-required-message'),
      usageMessage: DOM.get('usage-limit-message')
    }

    // オプション関連要素  
    this.elements.options = {}
    APP_CONSTANTS.BUTTONS.DOCUMENT.forEach(id => {
      this.elements.options[id] = DOM.get(id)
    })
    APP_CONSTANTS.BUTTONS.FORMAT.forEach(id => {
      this.elements.options[id] = DOM.get(id)
    })
    APP_CONSTANTS.BUTTONS.STYLE.forEach(id => {
      this.elements.options[id] = DOM.get(id)
    })

    console.log('[UIManager] DOM elements cached')
  }

  /**
   * 認証状態に応じたUI更新（機能維持）
   */
  updateAuthUI(isAuthenticated, user) {
    console.log('[UIManager] Updating auth UI:', { isAuthenticated, user: user?.name })
    
    if (isAuthenticated && user) {
      DOM.toggle('auth-buttons', false)
      DOM.toggle('user-status', true)
      
      if (this.elements.auth.userName) {
        this.elements.auth.userName.textContent = user.name
      }
      if (user.picture && this.elements.auth.userAvatar) {
        this.elements.auth.userAvatar.src = user.picture
        this.elements.auth.userAvatar.style.display = 'block'
      }
    } else {
      DOM.toggle('auth-buttons', true)
      DOM.toggle('user-status', false)
    }
  }

  /**
   * 認証モーダル表示/非表示（機能維持）
   */
  toggleAuthModal(show = true) {
    if (this.elements.auth.modal) {
      this.elements.auth.modal.style.display = show ? 'flex' : 'none'
      if (!show) {
        this.clearAuthError()
        this.setAuthLoadingState(false)
      }
    }
  }

  /**
   * 認証エラー表示
   */
  showAuthError(message) {
    if (this.elements.auth.loginError) {
      this.elements.auth.loginError.textContent = message
      this.elements.auth.loginError.style.display = 'block'
    }
  }

  /**
   * 認証エラークリア
   */
  clearAuthError() {
    if (this.elements.auth.loginError) {
      this.elements.auth.loginError.style.display = 'none'
      this.elements.auth.loginError.textContent = ''
    }
  }

  /**
   * 認証ローディング状態（機能維持）
   */
  setAuthLoadingState(loading) {
    if (this.elements.auth.loginPassword) {
      this.elements.auth.loginPassword.disabled = loading
    }
    
    const loginSubmitBtn = document.querySelector('#login-form button[type="submit"]')
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = loading
    }
    
    const loginBtnText = DOM.get('login-btn-text')
    const loginSpinner = DOM.get('login-spinner')
    
    if (loginBtnText && loginSpinner) {
      if (loading) {
        loginBtnText.style.display = 'none'
        loginSpinner.style.display = 'inline-block'
      } else {
        loginBtnText.style.display = 'inline'
        loginSpinner.style.display = 'none'
      }
    }
  }
}

// ========================================
// 🎯 メインアプリケーションサービス（AppService）
// ========================================

class AppService {
  constructor() {
    /** @type {AuthService} 認証サービス */
    this.authService = new AuthService()
    
    /** @type {UIManager} UIマネージャー */
    this.uiManager = new UIManager()
    
    /** @type {UsageManager} 使用回数管理 */
    this.usageManager = new UsageManager()
    
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
  // 🚀 アプリケーション初期化
  // ========================================

  /**
   * アプリケーション初期化
   */
  async initialize() {
    try {
      console.log('[AppService] Starting application initialization...')
      
      // DOM要素キャッシュ
      this.uiManager.cacheDOMElements()
      
      // 保存された認証情報をロード
      this.authService.loadStoredAuth()
      
      // 認証状態監視設定
      this.authService.addAuthListener((isAuthenticated, user) => {
        this.uiManager.updateAuthUI(isAuthenticated, user)
        this.updateUsageLimits(isAuthenticated)
      })
      
      // 使用制限システム初期化（認証UIより先に）
      this.initializeUsageControl()
      
      // 各種UI要素初期化
      this.initializeAuthUI()
      this.initializeConversionForm() 
      this.initializeOtherElements()
      this.initializeHistory()
      
      // 初期状態表示
      this.uiManager.updateAuthUI(
        this.authService.isAuthenticated(), 
        this.authService.getCurrentUser()
      )
      
      this.state.initialized = true
      console.log('[AppService] Application initialization completed')
      
    } catch (error) {
      console.error('[AppService] Initialization error:', error)
      throw error
    }
  }

  /**
   * 認証UI初期化
   */
  initializeAuthUI() {
    // ログインボタン
    const loginBtn = this.uiManager.elements.auth?.loginBtn
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.uiManager.toggleAuthModal(true)
      })
    }
    
    // ログインフォーム
    const loginForm = this.uiManager.elements.auth?.loginForm  
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await this.handlePasswordLogin()
      })
    }
    
    // ログアウトボタン
    const logoutBtn = this.uiManager.elements.auth?.logoutBtn
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await this.handleLogout()
      })
    }
    
    // モーダル閉じる
    const closeModal = this.uiManager.elements.auth?.closeModal
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        this.uiManager.toggleAuthModal(false)
      })
    }
    
    // モーダル背景クリック
    const authModal = this.uiManager.elements.auth?.modal
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
          this.uiManager.toggleAuthModal(false)
        }
      })
    }
    
    // パスワード入力でエラークリア
    const loginPassword = this.uiManager.elements.auth?.loginPassword
    if (loginPassword) {
      loginPassword.addEventListener('input', () => {
        this.uiManager.clearAuthError()
      })
    }
    
    console.log('[AppService] Auth UI initialized')
  }

  /**
   * 変換フォーム初期化
   */
  initializeConversionForm() {
    const textInput = this.uiManager.elements.conversion?.inputText
    const generateBtn = this.uiManager.elements.conversion?.generateBtn
    
    if (textInput && generateBtn) {
      // 生成ボタンクリック
      generateBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        await this.handleConversion()
      })
      
      // リアルタイム文字数カウント
      textInput.addEventListener('input', () => {
        this.updateCharacterCount()
      })
      
      console.log('[AppService] Conversion form initialized')
    } else {
      console.error('[AppService] Required elements not found:', {
        textInput: !!textInput,
        generateBtn: !!generateBtn
      })
    }
  }

  /**
   * 履歴初期化
   */
  initializeHistory() {
    try {
      const storedHistory = StorageHelper.get(APP_CONSTANTS.STORAGE.HISTORY_KEY, [])
      this.state.conversionHistory = storedHistory
      this.displayConversionHistory()
      
      console.log('[AppService] History initialized:', this.state.conversionHistory.length, 'items')
    } catch (error) {
      console.error('[AppService] History initialization error:', error)
      this.state.conversionHistory = []
    }
  }

  // ========================================
  // 🔐 認証処理
  // ========================================

  /**
   * パスワードログイン処理（機能完全維持）
   */
  async handlePasswordLogin() {
    try {
      console.log('[AppService] Processing password login...')
      
      const password = this.uiManager.elements.auth?.loginPassword?.value?.trim() || ''
      
      if (!password) {
        this.uiManager.showAuthError('パスワードを入力してください')
        return
      }
      
      // ローディング状態表示
      this.uiManager.setAuthLoadingState(true)
      this.uiManager.clearAuthError()
      
      // 認証実行
      await this.authService.login(password)
      
      // モーダルを閉じる
      this.uiManager.toggleAuthModal(false)
      
      // フォームリセット
      if (this.uiManager.elements.auth?.loginForm) {
        this.uiManager.elements.auth.loginForm.reset()
      }
      
      console.log('[AppService] Password login completed successfully')
      
    } catch (error) {
      console.error('[AppService] Password login failed:', error)
      this.uiManager.showAuthError(`ログインに失敗しました: ${error.message}`)
    } finally {
      this.uiManager.setAuthLoadingState(false)
    }
  }

  /**
   * ログアウト処理（機能完全維持）
   */
  async handleLogout() {
    try {
      console.log('[AppService] Processing logout...')
      
      if (!confirm('ログアウトしますか？')) {
        return
      }
      
      await this.authService.logout()
      console.log('[AppService] Logout completed successfully')
      
    } catch (error) {
      console.error('[AppService] Logout failed:', error)
      this.uiManager.showAuthError(`ログアウトに失敗しました: ${error.message}`)
    }
  }

  // ========================================  
  // 🔄 AI変換処理（Geminiプロンプト完全維持）
  // ========================================

  /**
   * AI変換実行（全機能維持）
   */
  async handleConversion() {
    if (this.state.isProcessing) {
      console.log('[AppService] Conversion already in progress')
      return
    }
    
    try {
      const textInput = this.uiManager.elements.conversion?.inputText
      const text = textInput?.value?.trim()
      
      if (!text) {
        alert('変換するテキストを入力してください。')
        return
      }
      
      console.log('[AppService] Starting AI conversion...', { textLength: text.length })
      
      // 使用制限チェック
      if (!this.checkUsageLimits()) {
        return
      }
      
      // 処理開始
      this.setConversionLoadingState(true)
      
      // 文字制限取得
      const charLimitSlider = this.uiManager.elements.conversion?.charLimitSlider
      const charLimit = charLimitSlider ? parseInt(charLimitSlider.value) : APP_CONSTANTS.DEFAULT_OPTIONS.CHAR_LIMIT

      // 選択オプション取得（完全維持）
      const selectedOptions = this.getSelectedOptions()
      
      console.log('[AppService] Selected options:', selectedOptions)

      // API呼び出し（Geminiプロンプト維持）
      const response = await fetch(APP_CONSTANTS.API.ENDPOINTS.CONVERT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authService.getAuthToken() && {
            'Authorization': `Bearer ${this.authService.getAuthToken()}`
          })
        },
        body: JSON.stringify({
          text: text,
          style: selectedOptions.style,
          docType: selectedOptions.docType,
          format: selectedOptions.format,
          charLimit: charLimit
        })
      })
      
      if (!response.ok) {
        throw new Error(`変換に失敗しました: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const convertedText = result.data.result || ''
        const responseTime = result.data.responseTime || 0
        
        const conversionResult = {
          converted_text: convertedText,
          suggestions: [],
          response_time: responseTime
        }
        
        // 結果表示
        this.displayConversionResult(conversionResult)
        
        // ゲスト使用記録
        this.recordGuestUsage()
        
        // 履歴追加
        this.addToHistory({
          id: Date.now(),
          originalText: text,
          convertedText: convertedText,
          suggestions: [],
          timestamp: new Date().toISOString(),
          user: this.authService.getCurrentUser()
        })
        
        // フォームクリア
        textInput.value = ''
        this.updateCharacterCount()
        
        console.log('[AppService] AI conversion completed successfully')
      } else {
        throw new Error(result.error || 'AIサービスから正常な応答が得られませんでした')
      }
      
    } catch (error) {
      console.error('[AppService] Conversion error:', error)
      this.showConversionError(error.message)
    } finally {
      this.setConversionLoadingState(false)
    }
  }

  /**
   * 選択オプション取得（完全維持）
   */
  getSelectedOptions() {
    let docType = APP_CONSTANTS.DEFAULT_OPTIONS.DOC_TYPE
    let format = APP_CONSTANTS.DEFAULT_OPTIONS.FORMAT
    let style = APP_CONSTANTS.DEFAULT_OPTIONS.STYLE
    
    // ドキュメント種別確認
    const docReportBtn = DOM.get('doc-report')
    if (docReportBtn && docReportBtn.classList.contains('bg-pink-600')) {
      docType = '報告書'
    }
    
    // フォーマット確認（SOAP重要）
    const formatSoapBtn = DOM.get('format-soap')
    if (formatSoapBtn && formatSoapBtn.classList.contains('bg-pink-600')) {
      format = 'SOAP形式'
    }
    
    // 文体確認
    const stylePoliteBtn = DOM.get('style-polite')
    if (stylePoliteBtn && stylePoliteBtn.classList.contains('bg-pink-600')) {
      style = 'ですます体'
    }
    
    return { docType, format, style }
  }

  // ========================================
  // 🎨 UI更新とフィードバック
  // ========================================

  /**
   * 変換結果表示（機能維持）
   */
  displayConversionResult(result) {
    const outputText = this.uiManager.elements.conversion?.outputText
    const outputCount = this.uiManager.elements.conversion?.outputCount
    
    if (!outputText) {
      console.error('[AppService] Output text element not found')
      return
    }
    
    const convertedText = result.converted_text || '変換結果が空です'
    
    // 結果表示
    outputText.innerHTML = convertedText.replace(/\n/g, '<br>')
    
    // 文字数更新
    if (outputCount) {
      outputCount.textContent = `${convertedText.length}文字`
    }
    
    // コピーボタン有効化
    const copyBtn = this.uiManager.elements.conversion?.copyBtn
    if (copyBtn) {
      copyBtn.disabled = false
      copyBtn.onclick = () => this.copyResult(convertedText)
    }
    
    console.log('[AppService] Conversion result displayed:', convertedText.length, 'characters')
  }

  /**
   * 文字数カウント更新
   */
  updateCharacterCount() {
    const textInput = this.uiManager.elements.conversion?.inputText
    const charCount = this.uiManager.elements.conversion?.inputCount
    
    if (textInput && charCount) {
      const length = textInput.value.length
      charCount.textContent = `${length}文字`
      
      // 視覚的フィードバック
      if (length > 1000) {
        charCount.classList.add('text-red-500')
        charCount.classList.remove('text-pink-600')
      } else {
        charCount.classList.add('text-pink-600')
        charCount.classList.remove('text-red-500')
      }
    }
  }

  /**
   * 変換エラー表示
   */
  showConversionError(message) {
    const resultContainer = DOM.get('conversionResult')
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
   * 変換ローディング状態設定
   */
  setConversionLoadingState(loading) {
    const generateBtn = this.uiManager.elements.conversion?.generateBtn
    const textInput = this.uiManager.elements.conversion?.inputText
    
    if (generateBtn) {
      generateBtn.disabled = loading
      generateBtn.innerHTML = loading 
        ? '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...' 
        : '生成'
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
   * 履歴追加
   */
  addToHistory(item) {
    this.state.conversionHistory.push(item)
    
    // 最新50件保持
    if (this.state.conversionHistory.length > 50) {
      this.state.conversionHistory = this.state.conversionHistory.slice(-50)
    }
    
    // 保存
    StorageHelper.set(APP_CONSTANTS.STORAGE.HISTORY_KEY, this.state.conversionHistory)
    
    // 表示更新
    this.displayConversionHistory()
  }

  /**
   * 履歴表示
   */
  displayConversionHistory() {
    const historyContainer = DOM.get('conversionHistory')
    if (!historyContainer || this.state.conversionHistory.length === 0) return
    
    const historyHtml = this.state.conversionHistory
      .slice(-5)
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
   * 履歴アイテム読み込み
   */
  loadHistoryItem(itemId) {
    const item = this.state.conversionHistory.find(h => h.id === itemId)
    if (!item) return
    
    const textInput = this.uiManager.elements.conversion?.inputText
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
   * テキストコピー
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
      }, APP_CONSTANTS.TIMERS.NOTIFICATION_DURATION)
      
      console.log('[AppService] Text copied to clipboard')
    } catch (error) {
      console.error('[AppService] Copy error:', error)
      alert('コピーに失敗しました')
    }
  }

  /**
   * その他UI要素初期化
   */
  initializeOtherElements() {
    // クリアボタン
    const clearBtn = this.uiManager.elements.conversion?.clearBtn
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearInput()
      })
    }
    
    // 文字制限スライダー
    this.initializeCharacterLimitSlider()
    
    // オプションボタン
    this.initializeOptionButtons()
    
    console.log('[AppService] Other elements initialized')
  }

  /**
   * 文字制限スライダー初期化
   */
  initializeCharacterLimitSlider() {
    const slider = this.uiManager.elements.conversion?.charLimitSlider
    const display = this.uiManager.elements.conversion?.charLimitDisplay
    
    if (slider && display) {
      slider.addEventListener('input', (e) => {
        const value = e.target.value
        display.textContent = `${value}文字`
      })
      console.log('[AppService] Character limit slider initialized')
    }
  }

  /**
   * オプションボタン初期化（完全維持）
   */
  initializeOptionButtons() {
    // ボタングループ初期化
    this.initializeButtonGroup(APP_CONSTANTS.BUTTONS.DOCUMENT)
    this.initializeButtonGroup(APP_CONSTANTS.BUTTONS.FORMAT)
    this.initializeButtonGroup(APP_CONSTANTS.BUTTONS.STYLE)
    
    // デフォルト選択
    this.selectButton(APP_CONSTANTS.BUTTONS.DOCUMENT, 'doc-record')
    this.selectButton(APP_CONSTANTS.BUTTONS.FORMAT, 'format-text')
    this.selectButton(APP_CONSTANTS.BUTTONS.STYLE, 'style-plain')
    
    console.log('[AppService] Option buttons initialized with defaults')
  }

  /**
   * ボタングループ初期化
   */
  initializeButtonGroup(buttonIds) {
    buttonIds.forEach(buttonId => {
      const button = DOM.get(buttonId)
      if (button) {
        button.addEventListener('click', () => {
          this.selectButton(buttonIds, buttonId)
        })
      }
    })
  }

  /**
   * ボタン選択（完全維持）
   */
  selectButton(groupIds, selectedId) {
    groupIds.forEach(id => {
      const button = DOM.get(id)
      if (button) {
        if (id === selectedId) {
          // 選択状態
          button.className = `${CSS_CLASSES.BUTTON.BASE} ${CSS_CLASSES.BUTTON.SELECTED}`
        } else {
          // 非選択状態  
          button.className = `${CSS_CLASSES.BUTTON.BASE} ${CSS_CLASSES.BUTTON.UNSELECTED}`
        }
      }
    })
    
    console.log(`[AppService] Button selected: ${selectedId}`)
  }

  /**
   * 入力クリア
   */
  clearInput() {
    const textInput = this.uiManager.elements.conversion?.inputText
    if (textInput) {
      textInput.value = ''
      this.updateCharacterCount()
      textInput.focus()
    }
  }

  // ========================================
  // 📊 使用制限システム（完全維持）
  // ========================================
  
  /**
   * 使用制限システム初期化
   */
  initializeUsageControl() {
    // 認証状態変更時の制限更新
    this.authService.addAuthListener((isAuthenticated) => {
      this.updateUsageLimits(isAuthenticated)
    })
    
    // 初期状態設定
    this.updateUsageLimits(this.authService.isAuthenticated())
    
    console.log("[AppService] Usage control initialized")
  }
  
  /**
   * 使用制限状態更新（機能完全維持）
   */
  updateUsageLimits(isAuthenticated) {
    const generateBtn = this.uiManager.elements.conversion?.generateBtn
    const authMessage = this.uiManager.elements.conversion?.authMessage
    const usageMessage = this.uiManager.elements.conversion?.usageMessage
    
    if (isAuthenticated) {
      // ログインユーザー: 無制限
      if (generateBtn) {
        generateBtn.disabled = false
        generateBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-400")
        generateBtn.classList.add("hover:bg-pink-700", "bg-pink-600")
      }
      if (authMessage) authMessage.style.display = "none"
      if (usageMessage) usageMessage.style.display = "none"
      
      console.log("[AppService] Unlimited access enabled for authenticated user")
      
    } else {
      // 非ログインユーザー: 1日1回制限
      const canGenerate = this.usageManager.canGuestGenerate()
      
      if (generateBtn) {
        generateBtn.disabled = !canGenerate
        if (canGenerate) {
          generateBtn.classList.remove("opacity-50", "cursor-not-allowed", "bg-gray-400")
          generateBtn.classList.add("hover:bg-pink-700", "bg-pink-600")
        } else {
          generateBtn.classList.add("opacity-50", "cursor-not-allowed", "bg-gray-400")
          generateBtn.classList.remove("hover:bg-pink-700", "bg-pink-600")
        }
      }
      
      // ゲストは認証メッセージ非表示
      if (authMessage) authMessage.style.display = "none"
      
      if (usageMessage) {
        if (canGenerate) {
          usageMessage.style.display = "none"
        } else {
          usageMessage.style.display = "block"
          usageMessage.innerHTML = `<div class="flex items-center space-x-2"><i class="fas fa-clock text-red-600"></i><span class="text-sm font-semibold text-red-700">本日の利用回数を超えました</span></div><p class="text-sm text-red-600 mt-1">ゲストユーザーは1日1回まで無料でご利用いただけます。無制限利用にはログインが必要です。</p>`
        }
      }
      
      console.log("[AppService] Guest usage limits updated:", { canGenerate })
    }
  }
  
  /**
   * 使用制限チェック
   */
  checkUsageLimits() {
    const isAuthenticated = this.authService.isAuthenticated()
    
    if (isAuthenticated) {
      return true
    }
    
    const canGenerate = this.usageManager.canGuestGenerate()
    
    if (!canGenerate) {
      this.showUsageLimitError()
      return false
    }
    
    return true
  }
  
  /**
   * 使用制限エラー表示
   */
  showUsageLimitError() {
    const errorMessage = "本日の利用回数を超えました。ゲストユーザーは1日1回まで無料でご利用いただけます。無制限利用にはログインしてください。"
    alert(errorMessage)
  }
  
  /**
   * ゲスト利用記録
   */
  recordGuestUsage() {
    if (!this.authService.isAuthenticated()) {
      this.usageManager.recordGuestUsage()
      // 使用制限再更新
      this.updateUsageLimits(false)
    }
  }

  /**
   * アプリ統計取得
   */
  getAppStats() {
    return {
      totalConversions: this.state.conversionHistory.length,
      isAuthenticated: this.authService.isAuthenticated(),
      currentUser: this.authService.getCurrentUser(),
      initialized: this.state.initialized,
      usageStats: this.usageManager.getUsageStats()
    }
  }
}

// ========================================
// 🌍 グローバル初期化
// ========================================

/** @type {AppService} グローバルアプリケーションインスタンス */
let app

/**
 * アプリケーション初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 タップカルテ - 最適化版 起動中...')
    
    // アプリケーションサービス作成
    app = new AppService()
    
    // グローバルに公開（デバッグ用）
    window.app = app
    
    // アプリケーション初期化
    await app.initialize()
    
    console.log('✅ タップカルテ - 最適化版 起動完了')
    
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

// ========================================
// 📦 グローバル公開（後方互換性）
// ========================================

// クラスをグローバルに公開
window.UsageManager = UsageManager
window.AuthService = AuthService
window.UIManager = UIManager 
window.AppService = AppService

// 初期化完了ログ
console.log('📋 タップカルテ - 最適化版JavaScript読み込み完了')