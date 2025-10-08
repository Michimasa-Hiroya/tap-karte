/**
 * タップカルテ - 認証サービス（フロントエンド）
 * 
 * クリーンで再利用可能な認証管理クラス
 */

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
    this.sessionCheckTimer = null
    
    /** @type {number|null} 自動更新タイマー */
    this.autoRefreshTimer = null
    
    console.log('[AuthService] Initialized')
  }

  // ========================================
  // 🚀 初期化・設定
  // ========================================

  /**
   * 認証サービスを開始
   */
  async initialize() {
    try {
      console.log('[AuthService] Starting initialization...')
      
      // 保存された認証状態を復元
      await this.restoreAuthState()
      
      // セッション監視を開始
      this.startSessionManagement()
      
      console.log('[AuthService] Initialization completed', {
        isAuthenticated: this.isAuthenticated(),
        userName: this.currentUser?.name
      })
      
    } catch (error) {
      console.error('[AuthService] Initialization failed:', error)
    }
  }

  /**
   * 認証サービスを停止
   */
  destroy() {
    console.log('[AuthService] Destroying service...')
    
    this.stopSessionManagement()
    this.authListeners = []
    this.currentUser = null
    this.authToken = null
  }

  // ========================================
  // 🔐 認証操作
  // ========================================

  /**
   * デモログイン実行
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
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
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const { user, token } = result.data
        
        // 認証情報を保存
        await this.setAuthState(user, token)
        
        console.log('[AuthService] Demo login successful', {
          userId: user.id,
          userName: user.name
        })
        
        return { success: true, user }
        
      } else {
        console.warn('[AuthService] Demo login failed:', result.error)
        return { success: false, error: result.error || 'ログインに失敗しました' }
      }
      
    } catch (error) {
      console.error('[AuthService] Demo login error:', error)
      return { success: false, error: 'ログイン処理中にエラーが発生しました' }
    }
  }

  /**
   * ログアウト実行
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async logout() {
    try {
      console.log('[AuthService] Starting logout...')
      
      // サーバーにログアウト通知（エラーでも継続）
      try {
        if (this.authToken) {
          await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authToken}`
            }
          })
        }
      } catch (apiError) {
        console.warn('[AuthService] Logout API call failed:', apiError)
      }
      
      // ローカル認証状態をクリア
      await this.clearAuthState()
      
      console.log('[AuthService] Logout completed')
      
      return { success: true }
      
    } catch (error) {
      console.error('[AuthService] Logout error:', error)
      
      // エラーでも強制的にローカル状態をクリア
      await this.clearAuthState()
      
      return { success: false, error: 'ログアウト処理中にエラーが発生しました' }
    }
  }

  // ========================================
  // 🔄 セッション管理
  // ========================================

  /**
   * セッション監視を開始
   */
  startSessionManagement() {
    // 既存のタイマーをクリア
    this.stopSessionManagement()
    
    // セッション状態チェック（5分毎）
    this.sessionCheckTimer = setInterval(() => {
      if (this.isAuthenticated()) {
        this.checkAuthStatus()
      }
    }, this.config.sessionCheckInterval)
    
    // 自動セッション延長（30分毎）
    this.autoRefreshTimer = setInterval(() => {
      if (this.isAuthenticated()) {
        this.refreshSession()
      }
    }, this.config.autoRefreshInterval)
    
    console.log('[AuthService] Session management started')
  }

  /**
   * セッション監視を停止
   */
  stopSessionManagement() {
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer)
      this.sessionCheckTimer = null
    }
    
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer)
      this.autoRefreshTimer = null
    }
    
    console.log('[AuthService] Session management stopped')
  }

  /**
   * 認証状態をチェック
   */
  async checkAuthStatus() {
    if (!this.authToken) return
    
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      })
      
      if (!response.ok) {
        console.warn('[AuthService] Auth status check failed, clearing state')
        await this.clearAuthState()
      }
      
    } catch (error) {
      console.warn('[AuthService] Auth status check error:', error)
    }
  }

  /**
   * セッションを延長
   */
  async refreshSession() {
    if (!this.authToken) return
    
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      })
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const { user, token } = result.data
        
        // 新しいトークンで更新
        await this.setAuthState(user, token)
        
        console.log('[AuthService] Session refreshed successfully')
      }
      
    } catch (error) {
      console.warn('[AuthService] Session refresh failed:', error)
    }
  }

  // ========================================
  // 💾 状態管理
  // ========================================

  /**
   * 認証状態を設定
   * @param {Object} user ユーザー情報
   * @param {string} token 認証トークン
   */
  async setAuthState(user, token) {
    this.currentUser = user
    this.authToken = token
    
    // ローカルストレージに保存
    this.saveToStorage(this.config.tokenStorageKey, token)
    this.saveToStorage(this.config.userStorageKey, user)
    
    // リスナーに通知
    this.notifyAuthChange(true, user)
  }

  /**
   * 認証状態をクリア
   */
  async clearAuthState() {
    const wasAuthenticated = this.isAuthenticated()
    const previousUser = this.currentUser
    
    this.currentUser = null
    this.authToken = null
    
    // ローカルストレージをクリア
    this.removeFromStorage(this.config.tokenStorageKey)
    this.removeFromStorage(this.config.userStorageKey)
    
    // セッション監視を停止
    this.stopSessionManagement()
    
    // リスナーに通知
    if (wasAuthenticated) {
      this.notifyAuthChange(false, null)
    }
  }

  /**
   * 保存された認証状態を復元
   */
  async restoreAuthState() {
    try {
      const token = this.loadFromStorage(this.config.tokenStorageKey)
      const user = this.loadFromStorage(this.config.userStorageKey)
      
      if (token && user) {
        this.currentUser = user
        this.authToken = token
        
        console.log('[AuthService] Auth state restored', {
          userId: user.id,
          userName: user.name
        })
        
        // リスナーに通知
        this.notifyAuthChange(true, user)
      }
      
    } catch (error) {
      console.warn('[AuthService] Failed to restore auth state:', error)
      await this.clearAuthState()
    }
  }

  // ========================================
  // 📡 イベント・リスナー
  // ========================================

  /**
   * 認証状態変更リスナーを追加
   * @param {Function} listener リスナー関数 (isAuthenticated, user) => void
   */
  addAuthListener(listener) {
    this.authListeners.push(listener)
  }

  /**
   * 認証状態変更リスナーを削除
   * @param {Function} listener 削除するリスナー関数
   */
  removeAuthListener(listener) {
    const index = this.authListeners.indexOf(listener)
    if (index > -1) {
      this.authListeners.splice(index, 1)
    }
  }

  /**
   * 認証状態変更をリスナーに通知
   * @param {boolean} isAuthenticated 認証状態
   * @param {Object|null} user ユーザー情報
   */
  notifyAuthChange(isAuthenticated, user) {
    this.authListeners.forEach(listener => {
      try {
        listener(isAuthenticated, user)
      } catch (error) {
        console.error('[AuthService] Listener error:', error)
      }
    })
  }

  // ========================================
  // 🔍 状態取得
  // ========================================

  /**
   * 認証状態を確認
   * @returns {boolean} 認証済みかどうか
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

  // ========================================
  // 🛠️ ユーティリティ
  // ========================================

  /**
   * ローカルストレージに保存
   * @param {string} key キー
   * @param {*} value 値
   */
  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('[AuthService] Storage save failed:', error)
    }
  }

  /**
   * ローカルストレージから読み込み
   * @param {string} key キー
   * @returns {*} 値
   */
  loadFromStorage(key) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.warn('[AuthService] Storage load failed:', error)
      return null
    }
  }

  /**
   * ローカルストレージから削除
   * @param {string} key キー
   */
  removeFromStorage(key) {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('[AuthService] Storage remove failed:', error)
    }
  }
}

// グローバルインスタンス
let authServiceInstance = null

/**
 * AuthServiceのシングルトンインスタンスを取得
 * @returns {AuthService} AuthServiceインスタンス
 */
function getAuthService() {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService()
  }
  return authServiceInstance
}

// エクスポート
window.AuthService = AuthService
window.getAuthService = getAuthService