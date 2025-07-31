import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2249045312213801"
          crossOrigin="anonymous"
        />
        
        {/* 기본 메타 태그들 */}
        <meta name="description" content="ADHD 친화적 AI 할일 관리 도구 - Multitasker. AI가 큰 작업을 작은 단위로 나누어 멀티태스킹을 도와드립니다." />
        <meta name="keywords" content="ADHD, 할일관리, AI, 멀티태스킹, 생산성, 작업관리, 집중력" />
        <meta name="author" content="Multitasker" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        
        {/* 파비콘 */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Open Graph for Social Media */}
        <meta property="og:title" content="Multitasker - ADHD 친화적 할일 관리" />
        <meta property="og:description" content="AI가 큰 작업을 작은 단위로 나누어 관리를 도와드립니다" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://multi-tasker.com" />
        <meta property="og:site_name" content="Multitasker" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Multitasker - ADHD 친화적 할일 관리" />
        <meta name="twitter:description" content="AI가 큰 작업을 작은 단위로 나누어 관리를 도와드립니다" />
        
        {/* AdSense 최적화 */}
        <meta name="google-adsense-account" content="ca-pub-2249045312213801" />
        <meta name="google-site-verification" content="" />
        
        {/* 추가 SEO */}
        <link rel="canonical" href="https://multi-tasker.com" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}