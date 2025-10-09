/**
 * タップカルテ - DOM操作ユーティリティモジュール
 * 機能: Safari対応のDOM要素取得、ブラウザ判定、要素操作
 */

/** DOM要素取得のヘルパー */
export const DOM = {
  /**
   * 要素を安全に取得（Safari対応の堅牢版）
   * @param {string} id - 要素ID
   * @param {number} retryCount - リトライ回数
   * @returns {HTMLElement|null}
   */
  get(id, retryCount = 0) {
    const element = document.getElementById(id)
    if (element) {
      return element
    }
    
    // Safari用のフォールバック：要素が見つからない場合は少し待って再試行
    if (retryCount < 3 && (this.isSafari() || this.isWebKit())) {
      console.log(`[DOM] Element '${id}' not found on Safari, retrying... (${retryCount + 1}/3)`)
      setTimeout(() => {
        return this.get(id, retryCount + 1)
      }, 100)
    }
    
    return null
  },

  /**
   * 要素を待機して取得（Safari対応）
   * @param {string} id - 要素ID
   * @param {number} maxWait - 最大待機時間（ms）
   * @returns {Promise<HTMLElement|null>}
   */
  async waitForElement(id, maxWait = 5000) {
    return new Promise((resolve) => {
      const element = document.getElementById(id)
      if (element) {
        resolve(element)
        return
      }

      let attempts = 0
      const maxAttempts = maxWait / 100

      const checkElement = () => {
        const el = document.getElementById(id)
        if (el || attempts >= maxAttempts) {
          resolve(el)
        } else {
          attempts++
          setTimeout(checkElement, 100)
        }
      }

      checkElement()
    })
  },

  /**
   * Safari判定
   * @returns {boolean}
   */
  isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  },

  /**
   * WebKit判定
   * @returns {boolean}
   */
  isWebKit() {
    return /webkit/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)
  }
}

/** ローカルストレージヘルパー */
export const StorageHelper = {
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