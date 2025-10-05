import { Hono } from 'hono'
import { renderer } from './renderer'
import { cors } from 'hono/cors'
import Anthropic from '@anthropic-ai/sdk'

type Bindings = {
  CLAUDE_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API calls
app.use('/api/*', cors())

app.use(renderer)

// Claude API conversion endpoint
app.post('/api/convert', async (c) => {
  try {
    const { text, style, docType, format } = await c.req.json()
    
    if (!text || !text.trim()) {
      return c.json({ success: false, error: '入力テキストが空です' }, 400)
    }
    
    const apiKey = c.env?.CLAUDE_API_KEY
    if (!apiKey) {
      return c.json({ success: false, error: 'Claude APIキーが設定されていません' }, 500)
    }
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })
    
    const prompt = `あなたは、20年の臨床経験を持つ、極めて優秀な訪問看護師であり、かつ専門知識を有する訪問セラピスト（理学療法士・作業療法士・言語聴覚士）です。特に、在宅における複合的な健康課題を持つ利用者への全人的なアプローチを得意とし、多職種連携の要としてチーム医療を推進する立場にあります。

あなたの重要な任務は、入力された日常会話的な文章やメモを、他職種が利用者の状態を正確に把握し、質の高いケアを継続するための重要な公式文書（訪問看護記録書や報告書）として通用するレベルの文章に整形することです。単なる書き換えではなく、あなたの専門的視点から情報を整理し、誤字脱字や不自然な日本語を修正し、利用者の状態、実施したケア、その反応を論理的に記述してください。

以下の要件に従って、与えられた【入力テキスト】を、訪問看護の正式な記録として通用するレベルの文章に整形してください。

# 要件
・誤字脱字や不自然な日本語は、自然で正確な医療・看護の専門用語を用いて修正してください。
・文体は「${style}」で統一してください。
・ドキュメントの種別は「${docType}」として、それにふさわしい言葉遣いや詳細度で記述してください。
・フォーマットは「${format}」で出力してください。
${format === 'SOAP形式' ? '  - 「SOAP形式」の場合、S・O・A・Pの各項目に情報を適切に分類し、必ず項目ごとに改行して見出し（S: , O: , A: , P: ）を付けてください。情報が不足している項目は「特記事項なし」と記載してください。' : ''}

# 入力テキスト
${text}

# 出力
`
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
    
    const convertedText = message.content[0]?.type === 'text' ? message.content[0].text : '変換に失敗しました'
    
    return c.json({
      success: true,
      convertedText: convertedText,
      options: { style, docType, format }
    })
    
  } catch (error) {
    console.error('Claude API error:', error)
    return c.json({ 
      success: false, 
      error: 'AI変換サービスでエラーが発生しました。しばらく時間をおいて再度お試しください。' 
    }, 500)
  }
})

app.get('/', (c) => {
  return c.render(
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <i className="fas fa-stethoscope text-blue-600 mr-3"></i>
            看護記録アシスタント
          </h1>
          <p className="text-gray-600 mt-2">口頭メモや殴り書きを、整った看護記録・報告書に変換</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Options Bar */}
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Style Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">文体</label>
                <div className="flex space-x-2">
                  <button id="style-polite" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                    ですます体
                  </button>
                  <button id="style-plain" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors">
                    だ・である体
                  </button>
                </div>
              </div>

              {/* Document Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">ドキュメント種別</label>
                <div className="flex space-x-2">
                  <button id="doc-record" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                    記録
                  </button>
                  <button id="doc-report" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors">
                    報告書
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">フォーマット</label>
                <div className="flex space-x-2">
                  <button id="format-text" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                    文章形式
                  </button>
                  <button id="format-soap" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors">
                    SOAP形式
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Input/Output Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Input Area */}
            <div className="p-6 border-r border-gray-200">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">入力</label>
                <textarea 
                  id="input-text"
                  className="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="口頭メモや殴り書きのテキストをここに入力してください..."
                ></textarea>
              </div>
              <div className="flex justify-between items-center">
                <button id="voice-input" className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                  <i id="mic-icon" className="fas fa-microphone"></i>
                  <span id="voice-status">音声入力開始</span>
                </button>
                <button id="clear-input" className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                  クリア
                </button>
              </div>
            </div>

            {/* Output Area */}
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">出力</label>
                <div 
                  id="output-text"
                  className="w-full h-80 p-4 bg-gray-50 border border-gray-300 rounded-lg overflow-y-auto whitespace-pre-wrap"
                >
                  <div className="text-gray-400 italic">整形された文章がここに表示されます...</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button id="convert-btn" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    変換
                  </button>
                  <div id="loading" className="hidden flex items-center space-x-2 text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>処理中...</span>
                  </div>
                </div>
                <button id="copy-btn" className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  <i className="fas fa-copy"></i>
                  <span>コピー</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使い方</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>左側の入力エリアに口頭メモや殴り書きのテキストを入力してください</li>
            <li>音声入力を使用する場合は「音声入力開始」ボタンをクリックしてください</li>
            <li>文体、ドキュメント種別、フォーマットを選択してください</li>
            <li>「変換」ボタンをクリックして整形された文章を取得してください</li>
            <li>右側の出力エリアに整形された文章が表示されます</li>
            <li>「コピー」ボタンで結果をクリップボードにコピーできます</li>
          </ol>
        </div>
      </main>

      <script src="/static/app.js"></script>
    </div>
  )
})

export default app
