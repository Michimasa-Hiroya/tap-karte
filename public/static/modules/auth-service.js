/**
 * タップカルテ - 認証サービスモジュール
 * 機能: セッション管理、認証状態監視、セキュリティ強化認証
 */

import { StorageHelper } from './dom-utils.js'
import { SessionSecurity } from './security.js'
import { APP_CONSTANTS } from './config.js'

/**
 * 認証サービスクラス（モジュール化版）
 */
export class AuthService {
  constructor() {
    this.currentUser = null
    this.authToken = null
    this.authListeners = []
    this.sessionTimer = null
    this.refreshTimer = null
    
    // セキュリティ機能初期化
    this.sessionSecurity = new SessionSecurity()
    
    console.log('[AuthService] Initialized with enhanced security')
  }

  /**
   * パスワード認証ログイン（セキュリティ強化版）
   * @param {string} password
   * @returns {Promise<boolean>}
   */
  async login(password) {
    try {
      console.log('[AuthService] Starting secure login...')
      
      if (!password) {
        throw new Error('パスワードが入力されていません')
      }
      
      // パスワードセキュリティ強化: リクエスト送信後にメモリから消去
      const requestBody = JSON.stringify({ password })
      
      const response = await fetch(APP_CONSTANTS.API.ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      })
      
      // パスワードをメモリから完全消去（セキュリティ強化）
      password = null
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `ログインに失敗しました: ${response.status}`)
      }
      
      if (data.success && data.data?.user && data.data?.token) {
        this.currentUser = data.data.user
        this.authToken = data.data.token
        
        StorageHelper.set(APP_CONSTANTS.STORAGE.TOKEN_KEY, data.data.token)
        StorageHelper.set(APP_CONSTANTS.STORAGE.USER_KEY, data.data.user)
        
        // セキュリティ監視開始
        this.startSessionMonitoring()
        this.sessionSecurity.startMonitoring()
        this.notifyAuthListeners(true)
        
        console.log('[AuthService] Secure login successful:', data.data.user.name)
        return true
      } else {
        throw new Error(data.error || 'ログインレスポンスが無効です')
      }
    } catch (error) {
      // エラー時もパスワードをメモリから消去
      password = null
      console.error('[AuthService] Login error:', error)
      throw error
    } finally {
      // 終了時に必ずパスワードをメモリから消去
      password = null
    }
  }

  /**
   * ログアウト処理
   */
  async logout() {
    try {
      console.log('[AuthService] Starting logout...')
      
      this.stopSessionMonitoring()
      this.sessionSecurity.stopMonitoring()
      
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
   * セッション監視開始
   */
  startSessionMonitoring() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
    }
    
    this.sessionTimer = setInterval(() => {
      this.checkSessionValidity()
    }, APP_CONSTANTS.TIMERS.SESSION_CHECK)
    
    console.log('[AuthService] Session monitoring started')
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
    
    console.log('[AuthService] Session monitoring stopped')
  }

  /**
   * セッション有効性チェック
   */
  checkSessionValidity() {
    const token = StorageHelper.get(APP_CONSTANTS.STORAGE.TOKEN_KEY)
    const user = StorageHelper.get(APP_CONSTANTS.STORAGE.USER_KEY)
    
    if (!token || !user) {
      console.warn('[AuthService] Session expired or invalid')
      this.logout()
    }
  }

  /**
   * 認証リスナーを追加
   * @param {Function} callback
   */
  addAuthListener(callback) {
    this.authListeners.push(callback)
  }

  /**
   * 認証リスナーに通知
   * @param {boolean} isAuthenticated
   */
  notifyAuthListeners(isAuthenticated) {
    this.authListeners.forEach(callback => {
      try {
        callback(isAuthenticated, this.currentUser)
      } catch (error) {
        console.error('[AuthService] Listener error:', error)
      }
    })
  }

  /**
   * 現在の認証状態を取得
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentUser && !!this.authToken
  }

  /**
   * 現在のユーザーを取得
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser
  }
}