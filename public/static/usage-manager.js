/**
 * 使用回数管理システム
 */

// ========================================
// 📊 使用回数管理（UsageManager）
// ========================================

/**
 * 使用回数管理クラス
 */
class UsageManager {
  constructor() {
    /** @type {string} ローカルストレージキー */
    this.storageKey = 'tap_karte_usage_data'
    
    /** @type {Object} 使用データ */
    this.usageData = this.loadUsageData()
    
    console.log('[UsageManager] Initialized')
  }

  /**
   * 使用データをローカルストレージから読み込み
   * @returns {Object} 使用データ
   */
  loadUsageData() {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('[UsageManager] Error loading usage data:', error)
    }
    
    // デフォルト値を返す
    return {
      lastUsageDate: null,
      usageCount: 0,
      deviceId: this.generateDeviceId()
    }
  }

  /**
   * 使用データをローカルストレージに保存
   */
  saveUsageData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.usageData))
    } catch (error) {
      console.error('[UsageManager] Error saving usage data:', error)
    }
  }

  /**
   * デバイス固有IDを生成
   * @returns {string} デバイスID
   */
  generateDeviceId() {
    // ブラウザのフィンガープリント要素を組み合わせ
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
    
    // 簡単なハッシュ化
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit整数に変換
    }
    
    return Math.abs(hash).toString(36)
  }

  /**
   * 今日の日付を取得（YYYY-MM-DD形式）
   * @returns {string} 今日の日付
   */
  getTodayDate() {
    const today = new Date()
    return today.getFullYear() + '-' + 
           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
           String(today.getDate()).padStart(2, '0')
  }

  /**
   * 新規ユーザー（非ログイン）が生成可能かチェック
   * @returns {boolean} 生成可能かどうか
   */
  canGuestGenerate() {
    const today = this.getTodayDate()
    
    // 今日初回の使用の場合
    if (this.usageData.lastUsageDate !== today) {
      return true
    }
    
    // 今日既に使用している場合は不可
    return false
  }

  /**
   * 新規ユーザー（非ログイン）の使用回数を記録
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
   * 使用制限をリセット（デバッグ用）
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

  /**
   * 使用統計を取得
   * @returns {Object} 使用統計
   */
  getUsageStats() {
    return {
      ...this.usageData,
      canGuestGenerate: this.canGuestGenerate(),
      todayDate: this.getTodayDate()
    }
  }
}
// UsageManagerをグローバルに公開
window.UsageManager = UsageManager
console.log('📊 UsageManager クラス読み込み完了')
