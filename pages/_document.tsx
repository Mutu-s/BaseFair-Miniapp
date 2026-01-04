import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://basefair.vercel.app'
  
  return (
    <Html lang="en">
      <Head>
        {/* Farcaster Frame Meta Tags */}
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:frame:image" content={`${appUrl}/images/og-image.png`} />
        <meta name="fc:frame:button:1" content="Play Now 🎮" />
        <meta name="fc:frame:button:1:action" content="launch_frame" />
        <meta name="fc:frame:button:1:target" content={appUrl} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="BaseFair - Verifiably Fair Gaming" />
        <meta property="og:description" content="Play verifiably fair games on Base. Provable randomness powered by VRF." />
        <meta property="og:image" content={`${appUrl}/images/og-image.png`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={appUrl} />
        
        {/* Twitter/X Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BaseFair - Verifiably Fair Gaming" />
        <meta name="twitter:description" content="Play verifiably fair games on Base. Provable randomness powered by VRF." />
        <meta name="twitter:image" content={`${appUrl}/images/og-image.png`} />
        
        {/* Mobile / PWA Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0052FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BaseFair" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/base-logo.png" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

