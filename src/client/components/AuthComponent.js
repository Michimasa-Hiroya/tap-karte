/**
 * タップカルテ - 認証UIコンポーネント
 * 
 * 再利用可能な認証UI管理クラス
 */

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
  async initialize() {
    if (this.initialized) return
    
    try {
      console.log('[AuthComponent] Starting initialization...')
      
      // DOM要素を取得
      this.initializeElements()
      
      // イベントリスナーを設定
      this.attachEventListeners()
      
      // 認証状態変更リスナーを追加
      this.authService.addAuthListener((isAuthenticated, user) => {
        this.updateUI(isAuthenticated, user)
      })
      
      // 初期UI状態を設定
      this.updateUI(this.authService.isAuthenticated(), this.authService.getCurrentUser())
      
      this.initialized = true
      console.log('[AuthComponent] Initialization completed')
      
    } catch (error) {
      console.error('[AuthComponent] Initialization failed:', error)
    }
  }

  /**
   * DOM要素を取得・初期化
   */
  initializeElements() {
    // ヘッダー要素
    this.elements.userStatus = document.getElementById('user-status')
    this.elements.authButtons = document.getElementById('auth-buttons')
    this.elements.loginBtn = document.getElementById('login-btn')
    this.elements.logoutBtn = document.getElementById('logout-btn')
    this.elements.userAvatar = document.getElementById('user-avatar')
    this.elements.userName = document.getElementById('user-name')
    
    // モーダル要素
    this.elements.authModal = document.getElementById('auth-modal')
    this.elements.closeModalBtn = document.getElementById('close-modal')
    this.elements.demoLoginBtn = document.getElementById('demo-login-btn')
    
    console.log('[AuthComponent] DOM elements initialized', {
      foundElements: Object.keys(this.elements).filter(key => this.elements[key])
    })
  }

  /**
   * イベントリスナーを設定
   */
  attachEventListeners() {
    // ログインボタン
    if (this.elements.loginBtn) {
      this.elements.loginBtn.addEventListener('click', () => {
        this.showAuthModal()
      })
    }
    
    // ログアウトボタン
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', () => {
        this.handleLogout()
      })
    }
    
    // モーダル閉じるボタン
    if (this.elements.closeModalBtn) {
      this.elements.closeModalBtn.addEventListener('click', () => {
        this.hideAuthModal()
      })
    }
    
    // モーダル背景クリック
    if (this.elements.authModal) {
      this.elements.authModal.addEventListener('click', (e) => {
        if (e.target === this.elements.authModal) {
          this.hideAuthModal()
        }
      })
    }
    
    // デモログインボタン
    if (this.elements.demoLoginBtn) {
      this.elements.demoLoginBtn.addEventListener('click', () => {
        this.handleDemoLogin()
      })
    }
    
    console.log('[AuthComponent] Event listeners attached')
  }

  // ========================================
  // 🎨 UI管理
  // ========================================

  /**
   * 認証状態に応じてUIを更新
   * @param {boolean} isAuthenticated 認証状態
   * @param {Object|null} user ユーザー情報
   */
  updateUI(isAuthenticated, user) {
    console.log('[AuthComponent] Updating UI', { isAuthenticated, user: user?.name })
    
    if (isAuthenticated && user) {
      this.showAuthenticatedUI(user)
    } else {
      this.showUnauthenticatedUI()
    }
  }

  /**
   * 認証済みUIを表示
   * @param {Object} user ユーザー情報
   */
  showAuthenticatedUI(user) {
    // ユーザー状態エリアを表示
    if (this.elements.userStatus && this.elements.authButtons) {
      this.elements.userStatus.classList.remove('hidden')
      this.elements.authButtons.classList.add('hidden')
    }
    
    // ユーザー名を設定
    if (this.elements.userName) {
      this.elements.userName.textContent = user.name || user.email || 'ユーザー'
    }
    
    // アバター画像を設定
    if (this.elements.userAvatar) {
      if (user.picture) {
        this.elements.userAvatar.src = user.picture
      } else {
        // デフォルトアバター生成
        const name = encodeURIComponent(user.name || user.email || 'User')
        this.elements.userAvatar.src = 
          `https://ui-avatars.com/api/?name=${name}&background=f472b6&color=fff&size=32`
      }
      this.elements.userAvatar.alt = `${user.name}のプロフィール画像`
    }
    
    // 認証成功の視覚効果
    this.showAuthenticationIndicator()
    
    // モーダルを閉じる
    this.hideAuthModal()
    
    console.log('[AuthComponent] Authenticated UI displayed', { userName: user.name })
  }

  /**
   * 未認証UIを表示
   */
  showUnauthenticatedUI() {
    // 認証ボタンエリアを表示
    if (this.elements.userStatus && this.elements.authButtons) {
      this.elements.userStatus.classList.add('hidden')
      this.elements.authButtons.classList.remove('hidden')
    }
    
    console.log('[AuthComponent] Unauthenticated UI displayed')
  }

  /**
   * 認証モーダルを表示
   */
  showAuthModal() {
    if (this.elements.authModal) {
      this.elements.authModal.classList.remove('hidden')
      console.log('[AuthComponent] Auth modal shown')
    }
  }

  /**
   * 認証モーダルを非表示
   */
  hideAuthModal() {
    if (this.elements.authModal) {
      this.elements.authModal.classList.add('hidden')
      console.log('[AuthComponent] Auth modal hidden')
    }
  }

  /**
   * 認証成功インジケーターを表示
   */
  showAuthenticationIndicator() {
    if (this.elements.userStatus) {
      // 短時間の視覚効果
      this.elements.userStatus.style.backgroundColor = '#dcfce7' // 薄緑
      this.elements.userStatus.style.transition = 'background-color 0.3s ease'
      
      setTimeout(() => {
        if (this.elements.userStatus) {
          this.elements.userStatus.style.backgroundColor = ''
        }
      }, 2000)
    }
  }

  // ========================================
  // 🔐 認証処理
  // ========================================

  /**
   * デモログイン処理
   */
  async handleDemoLogin() {
    try {
      console.log('[AuthComponent] Demo login requested')
      
      // ボタンを無効化
      if (this.elements.demoLoginBtn) {
        this.elements.demoLoginBtn.disabled = true
        this.elements.demoLoginBtn.textContent = 'ログイン中...'
      }
      
      // 認証サービスでログイン実行
      const result = await this.authService.login()
      
      if (result.success) {
        console.log('[AuthComponent] Demo login successful')
        this.showNotification('🎉 デモログインが完了しました！タップカルテをお試しください。', 'success')
      } else {
        console.warn('[AuthComponent] Demo login failed:', result.error)
        this.showNotification(`ログインに失敗しました: ${result.error}`, 'error')
      }
      
    } catch (error) {
      console.error('[AuthComponent] Demo login error:', error)
      this.showNotification('ログイン処理中にエラーが発生しました', 'error')
      
    } finally {
      // ボタンを有効化
      if (this.elements.demoLoginBtn) {
        this.elements.demoLoginBtn.disabled = false
        this.elements.demoLoginBtn.innerHTML = 
          '<i class="fas fa-play-circle text-xl"></i><span>デモログインで開始</span>'
      }
    }
  }

  /**
   * ログアウト処理
   */
  async handleLogout() {
    try {
      console.log('[AuthComponent] Logout requested')
      
      // 確認ダイアログ（オプション）
      if (!confirm('ログアウトしますか？')) {
        return
      }
      
      // 認証サービスでログアウト実行
      const result = await this.authService.logout()
      
      if (result.success) {
        console.log('[AuthComponent] Logout successful')
        this.showNotification('✅ ログアウトが完了しました', 'success')
      } else {
        console.warn('[AuthComponent] Logout failed:', result.error)
        this.showNotification(`ログアウトに失敗しました: ${result.error}`, 'error')
      }
      
    } catch (error) {
      console.error('[AuthComponent] Logout error:', error)
      this.showNotification('ログアウト処理中にエラーが発生しました', 'error')
    }
  }

  // ========================================
  // 📢 通知・メッセージ
  // ========================================

  /**
   * 通知メッセージを表示
   * @param {string} message メッセージ
   * @param {string} type 種別 ('success', 'error', 'warning', 'info')
   * @param {number} duration 表示時間（ミリ秒）
   */
  showNotification(message, type = 'info', duration = 3000) {
    // 通知要素を作成
    const notification = document.createElement('div')
    
    // スタイルクラスを設定
    const typeColors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    }
    
    notification.className = `
      fixed top-4 right-4 ${typeColors[type] || typeColors.info} text-white 
      px-4 py-2 rounded-md shadow-lg z-50 max-w-sm animate-fade-in
    `
    
    notification.textContent = message
    
    // DOMに追加
    document.body.appendChild(notification)
    
    // 一定時間後に削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0'
        notification.style.transition = 'opacity 0.3s ease'
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 300)
      }
    }, duration)
    
    console.log(`[AuthComponent] Notification shown: ${type} - ${message}`)
  }

  // ========================================
  // 🧹 クリーンアップ
  // ========================================

  /**
   * コンポーネントを破棄
   */
  destroy() {
    console.log('[AuthComponent] Destroying component...')
    
    // 認証サービスのリスナーを削除
    if (this.authService) {
      // 注意: AuthServiceにremoveAuthListener実装が必要
      // this.authService.removeAuthListener(this.updateUI.bind(this))
    }
    
    // イベントリスナーを削除（必要に応じて実装）
    // 現在はページリロード時に自動的にクリーンアップされる
    
    this.elements = {}
    this.initialized = false
  }
}

// エクスポート
window.AuthComponent = AuthComponent