/**
 * タップカルテ - UI管理モジュール
 * 機能: DOM要素管理、UI状態管理、イベントハンドリング
 */

import { DOM, StorageHelper } from './dom-utils.js'
import { CSS_CLASSES } from './config.js'

/**
 * UI管理クラス（モジュール化版）
 */
export class UIManager {
  constructor() {
    this.elements = {}
    this.isInitialized = false
    this.init()
  }

  /**
   * 初期化
   */
  init() {
    this.cacheElements()
    this.isInitialized = true
    console.log('[UIManager] Initialized')
  }

  /**
   * DOM要素をキャッシュ（Safari対応強化）
   */
  cacheElements() {
    // Safari特別処理: DOM要素の待機
    if (DOM.isSafari() || DOM.isWebKit()) {
      console.log('[UIManager] Safari detected, waiting for DOM elements...')
      setTimeout(() => {
        this.performElementCaching()
      }, 100)
    } else {
      this.performElementCaching()
    }
  }

  /**
   * 実際の要素キャッシュ処理
   */
  performElementCaching() {
    this.elements = {
      // 認証関連要素
      auth: {
        loginBtn: DOM.get('login-btn'),
        logoutBtn: DOM.get('logout-btn'),
        userStatus: DOM.get('user-status'),
        authButtons: DOM.get('auth-buttons'),
        userName: DOM.get('user-name'),
        userAvatar: DOM.get('user-avatar'),
        modal: DOM.get('auth-modal'),
        loginForm: DOM.get('login-form'),
        loginPassword: DOM.get('login-password'),
        closeModal: DOM.get('close-modal'),
        errorMessage: DOM.get('login-error-message'),
        loginBtnText: DOM.get('login-btn-text'),
        loginSpinner: DOM.get('login-spinner')
      },

      // 変換関連要素
      conversion: {
        inputText: DOM.get('input-text'),
        outputText: DOM.get('output-text'),
        generateBtn: DOM.get('generate-btn'),
        copyBtn: DOM.get('copy-btn'),
        clearInput: DOM.get('clear-input'),
        clearOutput: DOM.get('clear-output'),
        loading: DOM.get('loading'),
        inputCount: DOM.get('input-count'),
        outputCount: DOM.get('output-count')
      },

      // オプション関連要素
      options: {
        docRecord: DOM.get('doc-record'),
        docReport: DOM.get('doc-report'),
        formatText: DOM.get('format-text'),
        formatSoap: DOM.get('format-soap'),
        stylePlain: DOM.get('style-plain'),
        stylePolite: DOM.get('style-polite'),
        charLimitSlider: DOM.get('char-limit-slider'),
        charLimitDisplay: DOM.get('char-limit-display')
      },

      // その他の要素
      other: {
        usageLimitMessage: DOM.get('usage-limit-message'),
        authRequiredMessage: DOM.get('auth-required-message'),
        conversionHistory: DOM.get('conversionHistory')
      }
    }

    console.log('[UIManager] DOM elements cached')
  }

  /**
   * 認証UI状態を更新
   * @param {boolean} isAuthenticated 認証状態
   * @param {Object} user ユーザー情報
   */
  updateAuthUI(isAuthenticated, user) {
    console.log('[UIManager] Updating auth UI:', { isAuthenticated, user })

    const { auth } = this.elements

    if (isAuthenticated && user) {
      // ログイン状態の表示
      if (auth.userStatus) auth.userStatus.classList.remove('hidden')
      if (auth.authButtons) auth.authButtons.classList.add('hidden')

      if (auth.userName) auth.userName.textContent = user.name || 'ユーザー'
      if (auth.userAvatar && user.picture) {
        auth.userAvatar.src = user.picture
        auth.userAvatar.alt = user.name || 'Profile'
      }
    } else {
      // ログアウト状態の表示
      if (auth.userStatus) auth.userStatus.classList.add('hidden')
      if (auth.authButtons) auth.authButtons.classList.remove('hidden')
    }
  }

  /**
   * 認証モーダル表示切り替え
   * @param {boolean} show 表示するかどうか
   */
  toggleAuthModal(show) {
    const { modal } = this.elements.auth

    if (modal) {
      if (show) {
        modal.classList.remove('hidden')
        // パスワードフィールドにフォーカス
        setTimeout(() => {
          if (this.elements.auth.loginPassword) {
            this.elements.auth.loginPassword.focus()
          }
        }, 100)
      } else {
        modal.classList.add('hidden')
        this.clearAuthError()
        // パスワードフィールドクリア（セキュリティ強化）
        if (this.elements.auth.loginPassword) {
          this.elements.auth.loginPassword.value = ''
        }
      }
    }
  }

  /**
   * 認証エラー表示
   * @param {string} message エラーメッセージ
   */
  showAuthError(message) {
    const { errorMessage } = this.elements.auth
    if (errorMessage) {
      errorMessage.textContent = message
      errorMessage.classList.remove('hidden')
    }
  }

  /**
   * 認証エラークリア
   */
  clearAuthError() {
    const { errorMessage } = this.elements.auth
    if (errorMessage) {
      errorMessage.classList.add('hidden')
      errorMessage.textContent = ''
    }
  }

  /**
   * 認証ローディング状態設定
   * @param {boolean} loading ローディング状態
   */
  setAuthLoadingState(loading) {
    const { loginBtnText, loginSpinner } = this.elements.auth
    const loginForm = this.elements.auth.loginForm

    if (loading) {
      if (loginBtnText) loginBtnText.classList.add('hidden')
      if (loginSpinner) loginSpinner.classList.remove('hidden')
      if (loginForm) {
        const submitBtn = loginForm.querySelector('button[type="submit"]')
        if (submitBtn) submitBtn.disabled = true
      }
    } else {
      if (loginBtnText) loginBtnText.classList.remove('hidden')
      if (loginSpinner) loginSpinner.classList.add('hidden')
      if (loginForm) {
        const submitBtn = loginForm.querySelector('button[type="submit"]')
        if (submitBtn) submitBtn.disabled = false
      }
    }
  }

  /**
   * ボタン選択状態を更新
   * @param {string[]} buttonIds ボタンIDリスト
   * @param {string} selectedId 選択されたボタンID
   */
  updateButtonSelection(buttonIds, selectedId) {
    buttonIds.forEach(id => {
      const btn = DOM.get(id)
      if (btn) {
        if (id === selectedId) {
          btn.className = `${CSS_CLASSES.BUTTON.BASE} ${CSS_CLASSES.BUTTON.SELECTED}`
        } else {
          btn.className = `${CSS_CLASSES.BUTTON.BASE} ${CSS_CLASSES.BUTTON.UNSELECTED}`
        }
      }
    })
  }

  /**
   * 文字数制限表示を更新
   * @param {number} limit 文字数制限
   */
  updateCharLimitDisplay(limit) {
    const { charLimitDisplay } = this.elements.options
    if (charLimitDisplay) {
      charLimitDisplay.textContent = `${limit}文字`
    }
  }

  /**
   * 生成ボタン状態を更新
   * @param {boolean} canGenerate 生成可能かどうか
   * @param {boolean} hasInput 入力があるかどうか
   */
  updateGenerateButton(canGenerate, hasInput) {
    const { generateBtn } = this.elements.conversion

    if (generateBtn) {
      const shouldEnable = canGenerate && hasInput
      generateBtn.disabled = !shouldEnable

      if (shouldEnable) {
        generateBtn.className = generateBtn.className.replace(/opacity-50|cursor-not-allowed/g, '').trim()
      } else {
        if (!generateBtn.className.includes('opacity-50')) {
          generateBtn.className += ' opacity-50 cursor-not-allowed'
        }
      }
    }
  }

  /**
   * 使用制限メッセージを表示
   * @param {string} message メッセージ
   * @param {boolean} isLimitReached 制限に達したかどうか
   */
  showUsageLimitMessage(message, isLimitReached = false) {
    const { usageLimitMessage } = this.elements.other

    if (usageLimitMessage) {
      // Safari用の特別処理
      if (DOM.isSafari() || DOM.isWebKit()) {
        usageLimitMessage.classList.remove('hidden')
        usageLimitMessage.style.display = "block"
        usageLimitMessage.style.visibility = "visible"
      } else {
        usageLimitMessage.style.display = "block"
      }

      if (isLimitReached) {
        usageLimitMessage.innerHTML = `
          <div class="flex items-center justify-center space-x-3 mb-3">
            <div class="flex items-center space-x-2">
              <i class="fas fa-clock text-red-600 text-lg"></i>
              <span class="text-base font-bold text-red-700">本日の利用回数を超えました</span>
            </div>
          </div>
          <div class="text-center">
            <p class="text-xs text-red-600">
              <i class="fas fa-info-circle mr-1"></i>
              <strong>利用制限:</strong> 新規ユーザーは1日1回まで利用可能 
              <i class="fas fa-key mx-1"></i>
              ログインすると<strong>無制限で利用可能</strong>
            </p>
          </div>
        `
      } else {
        usageLimitMessage.innerHTML = `
          <div class="text-center">
            <p class="text-xs text-pink-600">
              <i class="fas fa-info-circle mr-1"></i>
              <strong>利用制限:</strong> 新規ユーザーは1日1回まで利用可能 
              <i class="fas fa-key mx-1"></i>
              ログインすると<strong>無制限で利用可能</strong>
            </p>
          </div>
        `
      }
    }
  }

  /**
   * 使用制限メッセージを非表示
   */
  hideUsageLimitMessage() {
    const { usageLimitMessage } = this.elements.other

    if (usageLimitMessage) {
      usageLimitMessage.style.display = "none"
      usageLimitMessage.classList.add('hidden')
    }
  }
}