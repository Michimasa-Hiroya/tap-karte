import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>タップカルテ - 思ったことを、そのままカルテに</title>
        
        {/* 🔒 セキュリティ強化メタタグ */}
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';" />
        <meta http-equiv="X-Content-Type-Options" content="nosniff" />
        <meta http-equiv="X-Frame-Options" content="DENY" />
        <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
        <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=()" />
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
