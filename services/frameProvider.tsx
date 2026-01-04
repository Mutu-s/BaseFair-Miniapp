'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import sdk, { type Context } from '@farcaster/frame-sdk'

interface FrameContextType {
  context: Context.FrameContext | null
  isSDKLoaded: boolean
  isInFrame: boolean
  user: Context.FrameContext['user'] | null
  openUrl: (url: string) => void
  close: () => void
  ready: () => void
}

const FrameContext = createContext<FrameContextType>({
  context: null,
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
  const [context, setContext] = useState<Context.FrameContext | null>(null)
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [isInFrame, setIsInFrame] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        // Check if we're in a Farcaster frame
        const frameContext = await sdk.context
        
        if (frameContext) {
          setContext(frameContext)
          setIsInFrame(true)
          
          // Signal that we're ready to be shown
          sdk.actions.ready()
        }
      } catch (error) {
        // Not in a frame, that's okay
        console.log('Not running in Farcaster frame')
      } finally {
        setIsSDKLoaded(true)
      }
    }

    load()
  }, [])

  const openUrl = useCallback((url: string) => {
    if (isInFrame) {
      sdk.actions.openUrl(url)
    } else {
      window.open(url, '_blank')
    }
  }, [isInFrame])

  const close = useCallback(() => {
    if (isInFrame) {
      sdk.actions.close()
    }
  }, [isInFrame])

  const ready = useCallback(() => {
    if (isInFrame) {
      sdk.actions.ready()
    }
  }, [isInFrame])

  return (
    <FrameContext.Provider
      value={{
        context,
        isSDKLoaded,
        isInFrame,
        user: context?.user || null,
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

