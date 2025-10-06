import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>タップカルテ - 思ったことを、そのままカルテに</title>
        <meta name="description" content="思ったことやメモを、整った看護記録・報告書に変換するAIアシスタント。思ったことを、そのままカルテに。" />
        <meta name="keywords" content="タップカルテ,看護記録,カルテ,AI,アシスタント,看護師,医療,記録作成" />
        <meta property="og:title" content="タップカルテ - 思ったことを、そのままカルテに" />
        <meta property="og:description" content="思ったことやメモを、整った看護記録・報告書に変換するAIアシスタント" />
        <meta property="og:type" content="website" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body class="bg-gray-50 font-sans">{children}</body>
    </html>
  )
})
