'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

// Dynamic import to handle SSR
let sdk: any = null

interface FrameUser {
  fid?: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface FrameContextType {
  isSDKLoaded: boolean
  isInFrame: boolean
  user: FrameUser | null
  openUrl: (url: string) => void
  close: () => void
  ready: () => void
}

const FrameContext = createContext<FrameContextType>({
  isSDKLoaded: false,
  isInFrame: false,
  user: null,
  openUrl: () => {},
  close: () => {},
  ready: () => {},
})

export function useFrame() {
  return useContext(FrameContext)
}

interface FrameProviderProps {
  children: ReactNode
}

export function FrameProvider({ children }: FrameProviderProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [isInFrame, setIsInFrame] = useState(false)
  const [user, setUser] = useState<FrameUser | null>(null)

  useEffect(() => {
    const load = async () => {
      // Only run in browser
      if (typeof window === 'undefined') {
        setIsSDKLoaded(true)
        return
      }

      try {
        // Dynamic import for client-side only
        const frameSdk = await import('@farcaster/frame-sdk')
        sdk = frameSdk.default || frameSdk

        // Check if we're in a Farcaster frame by trying to get context
        if (sdk && sdk.context) {
          const context = await sdk.context
          
          if (context && context.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            })
            setIsInFrame(true)
            
            // Signal ready
            if (sdk.actions && sdk.actions.ready) {
              sdk.actions.ready()
            }
          }
        }
      } catch (error) {
        // Not in a frame or SDK not available
        console.log('Farcaster Frame SDK not available or not in frame')
      } finally {
        setIsSDKLoaded(true)
      }
    }

    load()
  }, [])

  const openUrl = useCallback((url: string) => {
    if (isInFrame && sdk?.actions?.openUrl) {
      sdk.actions.openUrl(url)
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank')
    }
  }, [isInFrame])

  const close = useCallback(() => {
    if (isInFrame && sdk?.actions?.close) {
      sdk.actions.close()
    }
  }, [isInFrame])

  const ready = useCallback(() => {
    if (isInFrame && sdk?.actions?.ready) {
      sdk.actions.ready()
    }
  }, [isInFrame])

  return (
    <FrameContext.Provider
      value={{
        isSDKLoaded,
        isInFrame,
        user,
        openUrl,
        close,
        ready,
      }}
    >
      {children}
    </FrameContext.Provider>
  )
}

export default FrameProvider
