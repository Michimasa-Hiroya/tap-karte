/**
 * タップカルテ - モジュール化統合アプリケーション
 * 
 * 機能完全維持・コード最適化・保守性向上・パフォーマンス改善
 */

import { APP_CONSTANTS } from './modules/config.js'
import { DOM, StorageHelper } from './modules/dom-utils.js'
import { AuthService } from './modules/auth-service.js'
import { UsageManager } from './modules/usage-manager.js'
import { UIManager } from './modules/ui-manager.js'

console.log('📋 タップカルテ - モジュール化版JavaScript読み込み完了')

// ========================================
// 🚀 メインアプリケーションクラス
// ========================================

/**
 * メインアプリケーション（モジュール化・最適化版）
 */
class TapKarteApp {
  constructor() {
    this.state = {
      selectedOptions: {
        docType: APP_CONSTANTS.DEFAULT_OPTIONS.DOC_TYPE,
        format: APP_CONSTANTS.DEFAULT_OPTIONS.FORMAT,
        style: APP_CONSTANTS.DEFAULT_OPTIONS.STYLE,
        charLimit: APP_CONSTANTS.DEFAULT_OPTIONS.CHAR_LIMIT
      },
      conversionHistory: []
    }

    // サービス初期化
    this.authService = new AuthService()
    this.usageManager = new UsageManager()
    this.uiManager = new UIManager()

    console.log('[TapKarteApp] Initialized')
  }

  /**
   * アプリケーション開始
   */
  async start() {
    console.log('[TapKarteApp] Starting application...')

    try {
      // セキュリティ脅威イベントリスナー
      window.addEventListener('security-threat', (event) => {
        console.warn('[TapKarteApp] Security threat detected:', event.detail.reason)
        this.authService.logout()
      })

      // 初期化処理
      this.setupEventListeners()
      this.initializeUsageControl()
      this.initializeOptions()
      this.setupAuthListeners()
      this.updateUI()

      console.log('[TapKarteApp] Application started successfully')
    } catch (error) {
      console.error('[TapKarteApp] Startup error:', error)
    }
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // 認証関連イベント
    const { auth } = this.uiManager.elements

    if (auth.loginBtn) {
      auth.loginBtn.addEventListener('click', () => {
        this.uiManager.toggleAuthModal(true)
      })
    }

    if (auth.loginForm) {
      auth.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await this.handleLogin()
      })
    }

    if (auth.logoutBtn) {
      auth.logoutBtn.addEventListener('click', async () => {
        await this.handleLogout()
      })
    }

    if (auth.closeModal) {
      auth.closeModal.addEventListener('click', () => {
        this.uiManager.toggleAuthModal(false)
      })
    }

    // 変換関連イベント
    const { conversion } = this.uiManager.elements

    if (conversion.generateBtn) {
      conversion.generateBtn.addEventListener('click', async () => {
        await this.handleConversion()
      })
    }

    if (conversion.inputText) {
      conversion.inputText.addEventListener('input', () => {
        this.updateCharacterCount()
        this.updateGenerateButtonState()
      })
    }

    if (conversion.copyBtn) {
      conversion.copyBtn.addEventListener('click', () => {
        this.handleCopy()
      })
    }

    if (conversion.clearInput) {
      conversion.clearInput.addEventListener('click', () => {
        this.handleClearInput()
      })
    }

    if (conversion.clearOutput) {
      conversion.clearOutput.addEventListener('click', () => {
        this.handleClearOutput()
      })
    }

    console.log('[TapKarteApp] Event listeners setup completed')
  }

  /**
   * 認証リスナーの設定
   */
  setupAuthListeners() {
    this.authService.addAuthListener((isAuthenticated, user) => {
      this.uiManager.updateAuthUI(isAuthenticated, user)
      this.updateUsageControl()
      this.updateGenerateButtonState()
    })
  }

  /**
   * ログイン処理
   */
  async handleLogin() {
    try {
      const password = this.uiManager.elements.auth.loginPassword?.value?.trim() || ''
      
      if (!password) {
        this.uiManager.showAuthError('パスワードを入力してください')
        return
      }

      this.uiManager.setAuthLoadingState(true)
      this.uiManager.clearAuthError()

      await this.authService.login(password)

      // パスワードフィールドクリア（セキュリティ強化）
      if (this.uiManager.elements.auth.loginPassword) {
        this.uiManager.elements.auth.loginPassword.value = ''
      }

      this.uiManager.toggleAuthModal(false)

      console.log('[TapKarteApp] Login successful')
    } catch (error) {
      console.error('[TapKarteApp] Login failed:', error)
      this.uiManager.showAuthError(`ログインに失敗しました: ${error.message}`)
      
      // エラー時もパスワードクリア
      if (this.uiManager.elements.auth.loginPassword) {
        this.uiManager.elements.auth.loginPassword.value = ''
      }
    } finally {
      this.uiManager.setAuthLoadingState(false)
    }
  }

  /**
   * ログアウト処理
   */
  async handleLogout() {
    try {
      if (!confirm('ログアウトしますか？')) {
        return
      }

      await this.authService.logout()
      console.log('[TapKarteApp] Logout successful')
    } catch (error) {
      console.error('[TapKarteApp] Logout error:', error)
    }
  }

  /**
   * AI変換処理
   */
  async handleConversion() {
    try {
      const inputText = this.uiManager.elements.conversion.inputText?.value?.trim() || ''
      
      if (!inputText) {
        alert('入力テキストを入力してください')
        return
      }

      // 使用制限チェック
      const usageCheck = this.usageManager.checkUsageLimit(this.authService.isAuthenticated())
      if (!usageCheck.canGenerate) {
        alert('本日の利用回数を超えました。ログインすると無制限で利用可能。')
        return
      }

      // ローディング状態
      const loadingEl = this.uiManager.elements.conversion.loading
      if (loadingEl) loadingEl.classList.remove('hidden')

      // AI変換リクエスト
      const response = await fetch(APP_CONSTANTS.API.ENDPOINTS.CONVERT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authService.authToken ? `Bearer ${this.authService.authToken}` : ''
        },
        body: JSON.stringify({
          text: inputText,
          docType: this.state.selectedOptions.docType,
          format: this.state.selectedOptions.format,
          style: this.state.selectedOptions.style,
          charLimit: this.state.selectedOptions.charLimit
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `変換に失敗しました: ${response.status}`)
      }

      if (data.success && data.data?.result) {
        // 結果表示
        const outputEl = this.uiManager.elements.conversion.outputText
        if (outputEl) {
          outputEl.textContent = data.data.result
        }

        // コピーボタン有効化
        const copyBtn = this.uiManager.elements.conversion.copyBtn
        if (copyBtn) {
          copyBtn.disabled = false
          copyBtn.classList.remove('opacity-50', 'cursor-not-allowed')
        }

        // 使用回数増加
        this.usageManager.incrementUsage(this.authService.isAuthenticated())
        this.updateUsageControl()

        // 文字数カウント更新
        this.updateCharacterCount()

        console.log('[TapKarteApp] Conversion successful')
      } else {
        throw new Error(data.error || '変換結果が無効です')
      }
    } catch (error) {
      console.error('[TapKarteApp] Conversion error:', error)
      alert(`変換に失敗しました: ${error.message}`)
    } finally {
      // ローディング状態解除
      const loadingEl = this.uiManager.elements.conversion.loading
      if (loadingEl) loadingEl.classList.add('hidden')
    }
  }

  /**
   * コピー処理
   */
  async handleCopy() {
    try {
      const outputEl = this.uiManager.elements.conversion.outputText
      const text = outputEl?.textContent || ''

      if (!text) {
        alert('コピーするテキストがありません')
        return
      }

      await navigator.clipboard.writeText(text)
      
      // 成功通知
      const copyBtn = this.uiManager.elements.conversion.copyBtn
      if (copyBtn) {
        const originalText = copyBtn.innerHTML
        copyBtn.innerHTML = '<i class="fas fa-check"></i><span>コピー完了</span>'
        copyBtn.disabled = true

        setTimeout(() => {
          copyBtn.innerHTML = originalText
          copyBtn.disabled = false
        }, 2000)
      }

      console.log('[TapKarteApp] Text copied to clipboard')
    } catch (error) {
      console.error('[TapKarteApp] Copy error:', error)
      alert('コピーに失敗しました')
    }
  }

  /**
   * 入力クリア処理
   */
  handleClearInput() {
    if (confirm('入力内容をクリアしますか？')) {
      const inputEl = this.uiManager.elements.conversion.inputText
      if (inputEl) {
        inputEl.value = ''
        this.updateCharacterCount()
        this.updateGenerateButtonState()
      }
    }
  }

  /**
   * 出力クリア処理
   */
  handleClearOutput() {
    if (confirm('出力内容をクリアしますか？')) {
      const outputEl = this.uiManager.elements.conversion.outputText
      const copyBtn = this.uiManager.elements.conversion.copyBtn
      
      if (outputEl) {
        outputEl.innerHTML = '<div class="text-pink-400 italic">生成された文章がここに表示されます...</div>'
      }
      
      if (copyBtn) {
        copyBtn.disabled = true
        copyBtn.classList.add('opacity-50', 'cursor-not-allowed')
      }
      
      this.updateCharacterCount()
    }
  }

  /**
   * オプション初期化
   */
  initializeOptions() {
    // 文字数制限スライダー
    const slider = this.uiManager.elements.options.charLimitSlider
    if (slider) {
      slider.addEventListener('input', (e) => {
        const limit = parseInt(e.target.value)
        this.state.selectedOptions.charLimit = limit
        this.uiManager.updateCharLimitDisplay(limit)
      })
    }

    // ボタン選択処理
    this.setupOptionButtons()
    
    // デフォルト選択状態を設定
    this.selectDefaultOptions()

    console.log('[TapKarteApp] Options initialized')
  }

  /**
   * オプションボタンの設定
   */
  setupOptionButtons() {
    const { options } = this.uiManager.elements

    // ドキュメント選択
    if (options.docRecord) {
      options.docRecord.addEventListener('click', () => {
        this.selectDocumentType('記録')
      })
    }
    
    if (options.docReport) {
      options.docReport.addEventListener('click', () => {
        this.selectDocumentType('報告書')
      })
    }

    // フォーマット選択
    if (options.formatText) {
      options.formatText.addEventListener('click', () => {
        this.selectFormat('文章形式')
      })
    }
    
    if (options.formatSoap) {
      options.formatSoap.addEventListener('click', () => {
        this.selectFormat('SOAP形式')
      })
    }

    // 文体選択
    if (options.stylePlain) {
      options.stylePlain.addEventListener('click', () => {
        this.selectStyle('だ・である体')
      })
    }
    
    if (options.stylePolite) {
      options.stylePolite.addEventListener('click', () => {
        this.selectStyle('ですます体')
      })
    }
  }

  /**
   * デフォルトオプション選択
   */
  selectDefaultOptions() {
    this.selectDocumentType(APP_CONSTANTS.DEFAULT_OPTIONS.DOC_TYPE)
    this.selectFormat(APP_CONSTANTS.DEFAULT_OPTIONS.FORMAT)
    this.selectStyle(APP_CONSTANTS.DEFAULT_OPTIONS.STYLE)
    this.uiManager.updateCharLimitDisplay(APP_CONSTANTS.DEFAULT_OPTIONS.CHAR_LIMIT)
  }

  /**
   * ドキュメント種別選択
   * @param {string} docType 
   */
  selectDocumentType(docType) {
    this.state.selectedOptions.docType = docType
    
    if (docType === '記録') {
      this.uiManager.updateButtonSelection(APP_CONSTANTS.BUTTONS.DOCUMENT, 'doc-record')
      // 記録選択時：SOAP有効化
      const soapBtn = DOM.get('format-soap')
      if (soapBtn) {
        soapBtn.disabled = false
        soapBtn.classList.remove('opacity-50', 'cursor-not-allowed')
      }
    } else {
      this.uiManager.updateButtonSelection(APP_CONSTANTS.BUTTONS.DOCUMENT, 'doc-report')
      // 報告書選択時：SOAP無効化
      const soapBtn = DOM.get('format-soap')
      if (soapBtn) {
        soapBtn.disabled = true
        soapBtn.classList.add('opacity-50', 'cursor-not-allowed')
        // SOAP選択中の場合は文章形式に切り替え
        if (this.state.selectedOptions.format === 'SOAP形式') {
          this.selectFormat('文章形式')
        }
      }
    }

    console.log('[TapKarteApp] Document type selected:', docType)
  }

  /**
   * フォーマット選択
   * @param {string} format 
   */
  selectFormat(format) {
    this.state.selectedOptions.format = format
    
    const selectedId = format === '文章形式' ? 'format-text' : 'format-soap'
    this.uiManager.updateButtonSelection(APP_CONSTANTS.BUTTONS.FORMAT, selectedId)
    
    console.log('[TapKarteApp] Format selected:', format)
  }

  /**
   * 文体選択
   * @param {string} style 
   */
  selectStyle(style) {
    this.state.selectedOptions.style = style
    
    const selectedId = style === 'だ・である体' ? 'style-plain' : 'style-polite'
    this.uiManager.updateButtonSelection(APP_CONSTANTS.BUTTONS.STYLE, selectedId)
    
    console.log('[TapKarteApp] Style selected:', style)
  }

  /**
   * 使用制限コントロール初期化・更新
   */
  initializeUsageControl() {
    this.updateUsageControl()
  }

  /**
   * 使用制限表示更新
   */
  updateUsageControl() {
    const isAuthenticated = this.authService.isAuthenticated()
    const usageCheck = this.usageManager.checkUsageLimit(isAuthenticated)

    if (isAuthenticated) {
      this.uiManager.hideUsageLimitMessage()
      const { authRequiredMessage } = this.uiManager.elements.other
      if (authRequiredMessage) {
        authRequiredMessage.style.display = 'none'
      }
    } else {
      if (usageCheck.canGenerate) {
        this.uiManager.showUsageLimitMessage(usageCheck.message, false)
      } else {
        this.uiManager.showUsageLimitMessage(usageCheck.message, true)
      }
    }

    this.updateGenerateButtonState()
    console.log('[TapKarteApp] Usage control updated')
  }

  /**
   * 生成ボタン状態更新
   */
  updateGenerateButtonState() {
    const isAuthenticated = this.authService.isAuthenticated()
    const usageCheck = this.usageManager.checkUsageLimit(isAuthenticated)
    const inputEl = this.uiManager.elements.conversion.inputText
    const hasInput = inputEl?.value?.trim().length > 0

    this.uiManager.updateGenerateButton(usageCheck.canGenerate, hasInput)
  }

  /**
   * 文字数カウント更新
   */
  updateCharacterCount() {
    const inputEl = this.uiManager.elements.conversion.inputText
    const outputEl = this.uiManager.elements.conversion.outputText
    const inputCountEl = this.uiManager.elements.conversion.inputCount
    const outputCountEl = this.uiManager.elements.conversion.outputCount

    if (inputEl && inputCountEl) {
      const inputLength = inputEl.value.length
      inputCountEl.textContent = `${inputLength}文字`
    }

    if (outputEl && outputCountEl) {
      const outputLength = outputEl.textContent?.length || 0
      outputCountEl.textContent = `${outputLength}文字`
    }
  }

  /**
   * UI状態更新
   */
  updateUI() {
    this.updateCharacterCount()
    this.updateGenerateButtonState()
    this.updateUsageControl()
  }
}

// ========================================
// 🚀 アプリケーション起動
// ========================================

console.log('🚀 タップカルテ - モジュール化版 起動中...')

// DOM読み込み完了後にアプリケーション開始
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp)
} else {
  startApp()
}

async function startApp() {
  try {
    const app = new TapKarteApp()
    await app.start()
    
    // グローバルアクセス用（デバッグ・開発用）
    window.TapKarteApp = app
    
    console.log('✅ タップカルテ - モジュール化版 起動完了')
  } catch (error) {
    console.error('❌ タップカルテ起動エラー:', error)
  }
}