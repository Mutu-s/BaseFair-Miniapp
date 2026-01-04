import '@/styles/global.css'
import '@rainbow-me/rainbowkit/styles.css'
import { useEffect, useState } from 'react'
import { Providers } from '@/services/provider'
import { FrameProvider, useFrame } from '@/services/frameProvider'
import type { AppProps } from 'next/app'
import Header from '@/components/Header'
import { Provider } from 'react-redux'
import { store } from '@/store'
import Chat from '@/components/Chat'
import '@/utils/clearAllGames' // Import to make clearAllGames available in console

// Inner app component that can use frame context
function AppContent({ Component, pageProps }: AppProps) {
  const { isInFrame } = useFrame()
  
  return (
    <div className="bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 min-h-screen">
      {/* Hide header in frame mode for cleaner mini app experience */}
      {!isInFrame && <Header />}
      <Component {...pageProps} />
      {/* Hide chat in frame mode */}
      {!isInFrame && <Chat />}
    </div>
  )
}

export default function App({ Component, pageProps }: AppProps) {
  const [showChild, setShowChild] = useState<boolean>(false)

  useEffect(() => {
    setShowChild(true)
  }, [])

  if (!showChild || typeof window === 'undefined') {
    return null
  } else {
    return (
      <FrameProvider>
        <Providers pageProps={pageProps}>
          <Provider store={store}>
            <AppContent Component={Component} pageProps={pageProps} />
          </Provider>
        </Providers>
      </FrameProvider>
    )
  }
}
