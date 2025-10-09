/**
 * タップカルテ - 使用量管理モジュール
 * 機能: 使用回数制限、デバイスフィンガープリンティング、利用状況管理
 */

import { StorageHelper } from './dom-utils.js'
import { APP_CONSTANTS } from './config.js'

/**
 * 使用回数管理システム（モジュール化版）
 */
export class UsageManager {
  constructor() {
    this.storageKey = APP_CONSTANTS.STORAGE.USAGE_KEY
    this.usageData = this.loadUsageData()
    console.log('[UsageManager] Initialized')
  }

  /**
   * 使用データを読み込み（強化フィンガープリント対応）
   * @returns {Object} 使用データ
   */
  loadUsageData() {
    const deviceId = this.generateDeviceId()
    console.log('[UsageManager] Enhanced device fingerprint:', deviceId.substring(0, 16) + '... (length: ' + deviceId.length + ')')
    
    // デバッグ: フィンガープリント詳細（開発時のみ表示）
    if (window.location.hostname.includes('e2b.dev') || window.location.hostname === 'localhost') {
      console.log('[UsageManager] Fingerprint components available:')
      console.log('- Canvas fingerprint: ✓')
      console.log('- WebGL fingerprint: ✓')
      console.log('- Font detection: ✓')
      console.log('- Hardware info: ✓')
      console.log('- Environment info: ✓')
    }
    
    const today = new Date().toDateString()
    const stored = StorageHelper.get(this.storageKey, {})
    
    // デバイス別の使用データを管理
    if (!stored[deviceId]) {
      stored[deviceId] = {}
    }
    
    // 日付別の使用データを管理
    if (!stored[deviceId][today]) {
      stored[deviceId][today] = {
        count: 0,
        lastUsed: null,
        deviceInfo: {
          userAgent: navigator.userAgent.substring(0, 50),
          platform: navigator.platform,
          language: navigator.language
        }
      }
    }
    
    return stored
  }

  /**
   * 強化デバイスフィンガープリント生成
   * @returns {string} デバイスID
   */
  generateDeviceId() {
    try {
      // Canvas フィンガープリント
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('TapKarte Canvas Fingerprint', 2, 2)
      const canvasFingerprint = canvas.toDataURL().slice(-50)

      // WebGL フィンガープリント
      const webglCanvas = document.createElement('canvas')
      const gl = webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl')
      let webglFingerprint = 'no-webgl'
      if (gl) {
        const renderer = gl.getParameter(gl.RENDERER)
        const vendor = gl.getParameter(gl.VENDOR)
        webglFingerprint = (renderer + vendor).slice(-30)
      }

      // フォント検出
      const fontList = ['Arial', 'Times', 'Courier', 'Helvetica', 'Georgia', 'Verdana']
      const fontFingerprint = fontList.map(font => {
        const span = document.createElement('span')
        span.style.fontFamily = font
        span.textContent = 'test'
        document.body.appendChild(span)
        const width = span.offsetWidth
        document.body.removeChild(span)
        return width
      }).join(',').slice(-20)

      // ハードウェア情報
      const hardwareFingerprint = [
        screen.width,
        screen.height,
        screen.colorDepth,
        navigator.hardwareConcurrency || 0,
        navigator.deviceMemory || 0
      ].join('x')

      // 環境情報
      const envFingerprint = [
        navigator.language,
        navigator.platform.slice(-10),
        new Date().getTimezoneOffset(),
        navigator.cookieEnabled ? '1' : '0'
      ].join('_')

      // 全ての指紋を結合してハッシュ化
      const combinedFingerprint = [
        canvasFingerprint,
        webglFingerprint,
        fontFingerprint,
        hardwareFingerprint,
        envFingerprint
      ].join('|')

      // 簡易ハッシュ関数
      let hash = 0
      for (let i = 0; i < combinedFingerprint.length; i++) {
        const char = combinedFingerprint.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 32bit 整数に変換
      }

      return Math.abs(hash).toString(36)
    } catch (error) {
      console.warn('[UsageManager] Fingerprint generation error:', error)
      // フォールバック: 基本的な情報のみ使用
      const fallback = [
        navigator.userAgent.slice(-20),
        screen.width,
        screen.height,
        Date.now()
      ].join('_')
      
      let hash = 0
      for (let i = 0; i < fallback.length; i++) {
        hash = ((hash << 5) - hash) + fallback.charCodeAt(i)
        hash = hash & hash
      }
      
      return Math.abs(hash).toString(36)
    }
  }

  /**
   * 使用可能回数をチェック
   * @param {boolean} isAuthenticated 認証状態
   * @returns {Object} チェック結果
   */
  checkUsageLimit(isAuthenticated = false) {
    // 認証ユーザーは無制限
    if (isAuthenticated) {
      return {
        canGenerate: true,
        remainingCount: -1, // 無制限
        isLimitReached: false,
        message: '認証済みユーザーは無制限でご利用いただけます'
      }
    }

    const deviceId = this.generateDeviceId()
    const today = new Date().toDateString()
    const todayUsage = this.usageData[deviceId]?.[today] || { count: 0 }

    const DAILY_LIMIT = 1
    const remainingCount = Math.max(0, DAILY_LIMIT - todayUsage.count)
    const isLimitReached = todayUsage.count >= DAILY_LIMIT

    return {
      canGenerate: !isLimitReached,
      remainingCount,
      isLimitReached,
      message: isLimitReached 
        ? '本日の利用回数を超えました。ログインすると無制限でご利用いただけます。'
        : `残り ${remainingCount} 回ご利用いただけます（本日分）`
    }
  }

  /**
   * 使用回数を増加
   * @param {boolean} isAuthenticated 認証状態
   */
  incrementUsage(isAuthenticated = false) {
    // 認証ユーザーは使用回数を記録しない
    if (isAuthenticated) {
      console.log('[UsageManager] Authenticated user: usage not tracked')
      return
    }

    const deviceId = this.generateDeviceId()
    const today = new Date().toDateString()

    if (!this.usageData[deviceId]) {
      this.usageData[deviceId] = {}
    }

    if (!this.usageData[deviceId][today]) {
      this.usageData[deviceId][today] = { count: 0, lastUsed: null }
    }

    this.usageData[deviceId][today].count++
    this.usageData[deviceId][today].lastUsed = new Date().toISOString()

    // ストレージに保存
    StorageHelper.set(this.storageKey, this.usageData)

    console.log('[UsageManager] Usage incremented:', {
      deviceId: deviceId.substring(0, 8) + '...',
      today,
      count: this.usageData[deviceId][today].count
    })
  }

  /**
   * 使用データをリセット（開発・テスト用）
   */
  resetUsageData() {
    StorageHelper.remove(this.storageKey)
    this.usageData = this.loadUsageData()
    console.log('[UsageManager] Usage data reset')
  }
}