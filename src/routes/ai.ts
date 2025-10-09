/**
 * タップカルテ - AI変換APIルート
 * 
 * Gemini APIを使用した医療記録変換の処理
 */

import { Hono } from 'hono'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CloudflareBindings, ConversionRequest, ConversionResponse, ApiResponse } from '../types'
import { AI_CONFIG, getEnvironmentVariables, validateEnvironmentVariables } from '../config'
import { logger, measurePerformance, sanitizeText, getCurrentTimestamp } from '../utils'

// 医療用語辞書のインポート
import { medicalTerms } from '../medical-dictionary'

// ========================================
// 🤖 AI変換APIルート
// ========================================

const ai = new Hono<{ Bindings: CloudflareBindings }>()

/**
 * テキスト変換エンドポイント
 * POST /api/ai/convert
 */
ai.post('/convert', async (c) => {
  const requestId = c.get('requestId') || 'unknown'
  
  try {
    // 環境変数の検証（デモ用に一時的にバイパス）
    const envValidation = validateEnvironmentVariables(c.env)
    if (!envValidation.isValid) {
      // デモレスポンスを返す（開発環境用）
      logger.info('Environment validation failed, returning demo response', {
        requestId,
        issues: envValidation.issues
      })
      
      // リクエストボディの取得（デモ用）
      let requestBody
      try {
        requestBody = await c.req.json()
      } catch (error) {
        return c.json<ApiResponse<ConversionResponse>>({
          success: false,
          error: '無効なJSONデータです'
        }, 400)
      }

      const { text } = requestBody
      
      // デモレスポンスを生成
      const demoResponse = generateDemoResponse(text || '入力テキストなし')
      
      return c.json<ApiResponse<ConversionResponse>>({
        success: true,
        data: {
          success: true,
          result: demoResponse,
          responseTime: 1200 // 1.2秒のシミュレート
        }
      })
    }

    // リクエストボディの取得
    let requestBody
    try {
      requestBody = await c.req.json()
    } catch (error) {
      logger.warn('Invalid JSON in request body', { requestId })
      return c.json<ApiResponse<ConversionResponse>>({
        success: false,
        error: '無効なJSONデータです'
      }, 400)
    }

    // リクエストデータの検証・抽出
    const conversionRequest = extractConversionRequest(requestBody)
    if (!conversionRequest.success) {
      logger.warn('Invalid conversion request', {
        requestId,
        error: conversionRequest.error
      })
      
      return c.json<ApiResponse<ConversionResponse>>({
        success: false,
        error: conversionRequest.error
      }, 400)
    }

    const { text, options } = conversionRequest.data!

    logger.info('Conversion request received', {
      requestId,
      textLength: text.length,
      options,
      timestamp: getCurrentTimestamp()
    })

    // AI変換処理の実行
    const conversionResult = await measurePerformance(async () => {
      return await performAIConversion(text, options, envValidation.variables.GEMINI_API_KEY)
    })

    if (!conversionResult.result.success) {
      logger.error('AI conversion failed', {
        requestId,
        error: conversionResult.result.error,
        duration: conversionResult.duration
      })
      
      return c.json<ApiResponse<ConversionResponse>>({
        success: false,
        error: conversionResult.result.error || 'AI変換中にエラーが発生しました'
      }, 500)
    }

    // 成功ログ
    logger.info('Conversion completed successfully', {
      requestId,
      inputLength: text.length,
      outputLength: conversionResult.result.result?.length || 0,
      duration: conversionResult.duration
    })

    // データベース保存（オプション）
    try {
      await saveConversionRecord(c.env?.DB, {
        text,
        result: conversionResult.result.result!,
        options,
        responseTime: conversionResult.duration,
        requestId
      })
    } catch (dbError) {
      // DB保存失敗はレスポンスに影響しない
      logger.warn('Database save failed', { requestId, dbError })
    }

    return c.json<ApiResponse<ConversionResponse>>({
      success: true,
      data: {
        success: true,
        result: conversionResult.result.result,
        responseTime: conversionResult.duration
      }
    })

  } catch (error) {
    const errorInstance = error as Error
    logger.error('Conversion endpoint error', {
      requestId,
      error: errorInstance.message,
      stack: errorInstance.stack
    })

    return c.json<ApiResponse<ConversionResponse>>({
      success: false,
      error: '予期しないエラーが発生しました'
    }, 500)
  }
})

// ========================================
// 🔧 ヘルパー関数
// ========================================

/**
 * リクエストデータからConversionRequestを抽出・検証
 */
function extractConversionRequest(body: any): {
  success: boolean
  data?: ConversionRequest
  error?: string
} {
  // 新しいAPIフォーマット { text, options } をサポート
  const { text, options, style, docType, format, charLimit } = body

  // 必須フィールドの検証
  if (!text || typeof text !== 'string') {
    return {
      success: false,
      error: '入力テキストが必要です'
    }
  }

  // 新しい形式 { text, options } の場合
  if (options && typeof options === 'object') {
    const { format: optFormat, style: optStyle, include_suggestions } = options
    
    return {
      success: true,
      data: {
        text: sanitizeText(text),
        options: {
          format: optFormat || 'medical_record',
          style: optStyle || 'professional',
          include_suggestions: include_suggestions !== false,
          // 従来フォーマットへのマッピング
          docType: optFormat === 'report' ? '報告書' : '記録',
          charLimit: AI_CONFIG.defaultCharLimit
        }
      }
    }
  }

  // 従来の形式をサポート（後方互換性）
  if (!style || !docType || !format) {
    return {
      success: false,
      error: '変換オプションが不完全です'
    }
  }

  // 値の検証
  const validStyles = ['ですます体', 'だ・である体']
  const validDocTypes = ['記録', '報告書']
  const validFormats = ['文章形式', 'SOAP形式']

  if (!validStyles.includes(style)) {
    return {
      success: false,
      error: '無効な文体が指定されています'
    }
  }

  if (!validDocTypes.includes(docType)) {
    return {
      success: false,
      error: '無効なドキュメント種別が指定されています'
    }
  }

  if (!validFormats.includes(format)) {
    return {
      success: false,
      error: '無効なフォーマットが指定されています'
    }
  }

  // 文字数制限の検証
  const limitValue = Math.min(parseInt(charLimit) || AI_CONFIG.defaultCharLimit, AI_CONFIG.maxCharLimit)

  return {
    success: true,
    data: {
      text: sanitizeText(text),
      options: {
        style,
        docType,
        format,
        charLimit: limitValue
      }
    }
  }
}

/**
 * Gemini APIを使用したAI変換処理
 */
async function performAIConversion(
  text: string,
  options: ConversionRequest['options'],
  apiKey: string
): Promise<ConversionResponse> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: AI_CONFIG.model })

    // 医療用語辞書をプロンプト用文字列に変換
    const medicalTermsContext = Object.entries(medicalTerms)
      .map(([term, meaning]) => `・${term}: ${meaning}`)
      .join('\n')

    // プロンプトの構築
    const prompt = buildConversionPrompt(text, options, medicalTermsContext)
    
    logger.debug('AI conversion prompt generated', {
      textLength: text.length,
      promptLength: prompt.length,
      options
    })

    // Gemini API呼び出し
    const result = await model.generateContent(prompt)
    const response = await result.response
    const convertedText = response.text()

    if (!convertedText || convertedText.trim() === '') {
      return {
        success: false,
        error: 'AI変換結果が空です'
      }
    }

    // 不要な英文やフォーマット文字列を除去
    const cleanedText = convertedText
      .trim()
      .replace(/^medical_record\s*/i, '') // 先頭のmedical_record削除
      .replace(/\/medical_record\s*$/i, '') // 末尾の/medical_record削除
      .replace(/medical_record/gi, '') // その他のmedical_record削除
      .trim()

    return {
      success: true,
      result: cleanedText
    }

  } catch (error) {
    const errorInstance = error as Error
    logger.error('Gemini API error', {
      error: errorInstance.message,
      apiKey: apiKey ? `***${apiKey.slice(-4)}` : 'not_provided'
    })

    // エラーメッセージの分類
    if (errorInstance.message.includes('API key')) {
      return {
        success: false,
        error: 'AI APIキーの設定に問題があります'
      }
    } else if (errorInstance.message.includes('quota') || errorInstance.message.includes('limit')) {
      return {
        success: false,
        error: 'AI APIの利用制限に達しました。しばらく待ってからお試しください'
      }
    } else {
      return {
        success: false,
        error: 'AI変換サービスに接続できませんでした'
      }
    }
  }
}

/**
 * 変換用プロンプトの構築
 */
function buildConversionPrompt(
  text: string,
  options: ConversionRequest['options'],
  medicalTermsContext: string
): string {
  const { style, docType, format, charLimit } = options

  return `あなたは経験豊富な看護師です。以下の口頭メモや簡潔なメモを、適切な${docType}として整理してください。

【重要な指示】
1. 入力内容のみに基づいて記録を作成し、勝手な情報は追加しない
2. ${style}で統一する
3. ${format}で出力する
4. 出力は${charLimit}文字以内に収める
5. 以下の医療用語辞書を参考にして、適切な専門用語を使用する

【医療用語辞書】
${medicalTermsContext}

【${format}について】
${format === 'SOAP形式' 
  ? `- S (Subjective): 主観的情報・患者の訴え
- O (Objective): 客観的情報・観察事実
- A (Assessment): アセスメント・評価
- P (Plan): 計画・今後の対応`
  : '- 時系列に沿った自然な文章形式で記述'
}

【入力メモ】
${text}

【${docType}（${format}・${style}・${charLimit}文字以内）】`
}

/**
 * データベースに変換記録を保存
 */
async function saveConversionRecord(
  db: D1Database | undefined,
  record: {
    text: string
    result: string
    options: ConversionRequest['options']
    responseTime: number
    requestId: string
  }
): Promise<void> {
  if (!db) {
    throw new Error('Database not available')
  }

  await db.prepare(`
    INSERT INTO nursing_records (
      input_text, output_text, options_style, options_doc_type, 
      options_format, char_limit, response_time, created_at, request_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.text,
    record.result,
    record.options.style,
    record.options.docType,
    record.options.format,
    record.options.charLimit,
    record.responseTime,
    getCurrentTimestamp(),
    record.requestId
  ).run()
}

/**
 * デモレスポンス生成（開発環境用）
 */
function generateDemoResponse(inputText: string): string {
  const currentTime = new Date().toLocaleString('ja-JP')
  
  // 入力テキストの長さに基づいてレスポンスを調整
  if (inputText.length < 10) {
    return `【看護記録】
本日 ${currentTime}
患者より「${inputText}」との訴えあり。
バイタルサインに著変なく、経過観察とする。
引き続き患者の状態を注意深く観察していく。

※これはデモ機能です。実際のAI変換には環境設定が必要です。`
  }
  
  return `【看護記録】
日時: ${currentTime}

【主訴・症状】
${inputText.substring(0, 100)}${inputText.length > 100 ? '...' : ''}

【観察・評価】
・患者の訴えを聴取し、症状について詳細に確認した
・バイタルサインの測定を実施、安定範囲内を確認
・表情や動作から痛みや不快感の程度を評価

【実施したケア】
・症状緩和に向けた看護介入を実施
・患者への説明と心理的サポートを提供
・安全で快適な環境整備を行った

【今後の計画】
・継続的な症状観察を実施
・必要に応じて医師への報告を検討
・患者の状態変化に応じたケア計画の見直し

看護師: ログインユーザー

※これはデモ機能です。実際のAI変換機能を利用するには、管理者による環境設定が必要です。`
}

export { ai }