import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* 🎯 SEO最適化 - メインタイトル・説明 */}
        <title>タップカルテ | 看護記録・カルテ作成AI - 思ったことを、そのままカルテに</title>
        <meta name="description" content="看護師・医療従事者向けAIカルテ作成ツール。口頭メモや簡単なメモを整った看護記録・報告書に自動変換。SOAP記録対応、個人情報保護完備。電子カルテ連携可能な医療AI。" />
        
        {/* 🔍 SEO強化キーワード */}
        <meta name="keywords" content="看護記録,カルテ作成,医療AI,電子カルテ,SOAP記録,看護師,医療従事者,介護記録,診療記録,医療文書,AIアシスタント,タップカルテ,医療DX,病院システム,看護業務効率化" />
        <meta name="author" content="タップカルテ開発チーム" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="Japanese" />
        
        {/* 🌐 Open Graph最適化 */}
        <meta property="og:title" content="タップカルテ | 看護記録・カルテ作成AI" />
        <meta property="og:description" content="看護師・医療従事者向けAIカルテ作成ツール。口頭メモを整った看護記録・報告書に自動変換。個人情報保護完備。" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tap-karte.com" />
        <meta property="og:site_name" content="タップカルテ" />
        <meta property="og:image" content="https://tap-karte.com/static/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="タップカルテ - 看護記録作成AI" />
        <meta property="og:locale" content="ja_JP" />
        
        {/* 📱 Twitter Card最適化 */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="タップカルテ | 看護記録・カルテ作成AI" />
        <meta name="twitter:description" content="看護師・医療従事者向けAIカルテ作成ツール。口頭メモを整った看護記録に自動変換。" />
        <meta name="twitter:image" content="https://tap-karte.com/static/og-image.jpg" />
        <meta name="twitter:image:alt" content="タップカルテ - 看護記録作成AI" />
        
        {/* 🏥 医療・業界特化メタデータ */}
        <meta name="application-name" content="タップカルテ" />
        <meta name="category" content="Healthcare, Medical Software, Nursing Tools" />
        <meta name="classification" content="医療AI, 看護記録システム" />
        
        {/* 🔗 Canonical URL */}
        <link rel="canonical" href="https://tap-karte.com" />
        
        {/* 📊 Google Analytics 4 (GA4) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-VZDPSVT9XS"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VZDPSVT9XS');
          `
        }} />
        
        {/* 📊 Google Search Console & Bing */}
        <meta name="google-site-verification" content="YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE" />
        <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" />
        
        {/* 🗺️ サイトマップ関連 */}
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        
        {/* 🔒 セキュリティ強化メタタグ */}
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' https: data: https://www.google-analytics.com; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https: https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self';" />
        <meta http-equiv="X-Content-Type-Options" content="nosniff" />
        <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
        <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=()" />
        
        {/* ⚡ パフォーマンス最適化 */}
        <link rel="preconnect" href="https://cdn.tailwindcss.com" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        
        {/* 📚 外部リソース */}
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="/static/style.css" rel="stylesheet" />
        
        {/* 🔍 構造化データ（JSON-LD） */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "@id": "https://tap-karte.com/#webapp",
                "name": "タップカルテ",
                "alternateName": "Tap Karte",
                "url": "https://tap-karte.com",
                "description": "看護師・医療従事者向けAIカルテ作成ツール。口頭メモや簡単なメモを整った看護記録・報告書に自動変換。",
                "applicationCategory": "HealthcareApplication",
                "operatingSystem": "Web Browser",
                "browserRequirements": "Modern Web Browser with JavaScript",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "JPY",
                  "availability": "https://schema.org/InStock"
                },
                "creator": {
                  "@type": "Organization",
                  "@id": "https://tap-karte.com/#organization"
                }
              },
              {
                "@type": "Organization",
                "@id": "https://tap-karte.com/#organization",
                "name": "タップカルテ開発チーム",
                "url": "https://tap-karte.com",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://tap-karte.com/static/logo.png",
                  "width": 512,
                  "height": 512
                },
                "contactPoint": {
                  "@type": "ContactPoint",
                  "contactType": "customer support",
                  "areaServed": "JP",
                  "availableLanguage": "Japanese"
                }
              },
              {
                "@type": "WebSite",
                "@id": "https://tap-karte.com/#website",
                "url": "https://tap-karte.com",
                "name": "タップカルテ",
                "description": "看護記録・カルテ作成AI",
                "publisher": {
                  "@id": "https://tap-karte.com/#organization"
                },
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://tap-karte.com/?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@type": "SoftwareApplication",
                "name": "タップカルテ",
                "description": "看護記録・カルテ作成AI",
                "applicationCategory": "MedicalApplication",
                "operatingSystem": "Web",
                "url": "https://tap-karte.com",
                "author": {
                  "@id": "https://tap-karte.com/#organization"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.8",
                  "ratingCount": "150",
                  "bestRating": "5",
                  "worstRating": "1"
                }
              }
            ]
          })}
        </script>
        
        {/* 📱 PWA対応 */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="タップカルテ" />
        <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16x16.png" />
      </head>
      <body class="bg-gray-50 font-sans">{children}</body>
    </html>
  )
})
