/**
 * タップカルテ - セキュリティモジュール
 * 機能: セッションフィンガープリンティング、セキュリティ監視
 */

import { StorageHelper } from './dom-utils.js'
import { APP_CONSTANTS } from './config.js'

/**
 * セッションセキュリティマネージャー
 */
export class SessionSecurity {
  constructor() {
    this.sessionFingerprint = null
    this.securityCheckTimer = null
    this.init()
  }

  /**
   * セッションフィンガープリンティング初期化
   */
  init() {
    try {
      // 簡単なクライアントサイドフィンガープリント生成
      const components = {
        userAgent: navigator.userAgent.substring(0, 100),
        language: navigator.language || 'unknown',
        platform: navigator.platform || 'unknown',
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || 'unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 6)) // 6時間単位でローテーション
      }
      
      // JSON文字列化して簡易ハッシュ化
      const dataString = JSON.stringify(components)
      let hash = 0
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 32bit整数に変換
      }
      
      this.sessionFingerprint = `fp_${Math.abs(hash).toString(36).substring(0, 16)}`
      
      // セッションフィンガープリントをストレージに保存
      StorageHelper.set(APP_CONSTANTS.STORAGE.SESSION_KEY, this.sessionFingerprint)
      
      console.log('[SessionSecurity] Fingerprint initialized:', this.sessionFingerprint.substring(0, 8) + '...')
    } catch (error) {
      console.warn('[SessionSecurity] Fingerprint generation failed:', error)
      this.sessionFingerprint = `fp_fallback_${Date.now().toString(36)}`
    }
  }

  /**
   * セキュリティ監視開始
   */
  startMonitoring() {
    if (this.securityCheckTimer) {
      clearInterval(this.securityCheckTimer)
    }
    
    this.securityCheckTimer = setInterval(() => {
      this.performSecurityCheck()
    }, APP_CONSTANTS.TIMERS.SESSION_CHECK) // 5分ごと
    
    console.log('[SessionSecurity] Monitoring started')
  }

  /**
   * セキュリティチェック実行
   */
  performSecurityCheck() {
    try {
      // 現在のフィンガープリントと保存されたものを比較
      const storedFingerprint = StorageHelper.get(APP_CONSTANTS.STORAGE.SESSION_KEY, null)
      
      if (storedFingerprint !== this.sessionFingerprint) {
        console.warn('[SessionSecurity] Fingerprint mismatch detected')
        console.warn('- Stored:', storedFingerprint?.substring(0, 8) + '...')
        console.warn('- Current:', this.sessionFingerprint?.substring(0, 8) + '...')
        
        // セッションハイジャックの可能性 - 脅威ハンドラーを呼び出し
        this.handleSecurityThreat('Session fingerprint mismatch')
      }
    } catch (error) {
      console.error('[SessionSecurity] Security check failed:', error)
    }
  }

  /**
   * セキュリティ脅威ハンドラー
   * @param {string} reason 脅威の理由
   */
  handleSecurityThreat(reason) {
    console.error('[SessionSecurity] Threat detected:', reason)
    
    // ユーザーに警告表示（NotificationHelperが利用可能な場合）
    if (window.NotificationHelper) {
      NotificationHelper.show(`セキュリティ上の理由でログアウトしました。再度ログインしてください。`, 'error')
    }
    
    // 脅威発生時の処理をカスタムイベントとして発火
    window.dispatchEvent(new CustomEvent('security-threat', { 
      detail: { reason } 
    }))
  }

  /**
   * セキュリティ監視停止
   */
  stopMonitoring() {
    if (this.securityCheckTimer) {
      clearInterval(this.securityCheckTimer)
      this.securityCheckTimer = null
      console.log('[SessionSecurity] Monitoring stopped')
    }
  }
}