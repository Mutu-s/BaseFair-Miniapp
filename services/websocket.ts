import { useEffect } from 'react'
import { GameStruct, GameStatus } from '@/utils/type.dt'

export type WebSocketEvent = 
  | { type: 'GAME_CREATED'; data: GameStruct }
  | { type: 'GAME_UPDATED'; data: GameStruct }
  | { type: 'PLAYER_JOINED'; data: { gameId: number; player: string } }
  | { type: 'GAME_STARTED'; data: { gameId: number } }
  | { type: 'VRF_FULFILLED'; data: { gameId: number } }
  | { type: 'PLAYER_COMPLETED'; data: { gameId: number; player: string; flipCount: number } }
  | { type: 'GAME_COMPLETED'; data: { gameId: number; winner: string } }

type WebSocketCallback = (event: WebSocketEvent) => void

class WebSocketService {
  ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private callbacks: Set<WebSocketCallback> = new Set()
  private isConnecting = false

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      // For now, using polling as fallback since we don't have a WebSocket server
      // In production, replace with actual WebSocket URL
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.monfair.xyz/ws'
      
      // Fallback to polling if WebSocket is not available
      if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_WS_URL) {
        this.startPolling()
        return
      }

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnecting = false
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.isConnecting = false
      this.startPolling()
    }
  }

  private startPolling() {
    // Polling fallback for real-time updates
    if (typeof window === 'undefined') return

    const pollInterval = setInterval(async () => {
      try {
        // Poll for game updates
        // This would call your API to check for updates
        // For now, we'll just keep the connection alive
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 5000) // Poll every 5 seconds

    // Store interval ID for cleanup
    if (typeof window !== 'undefined') {
      (window as any).__monfair_polling = pollInterval
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling')
      this.startPolling()
      return
    }

    this.reconnectAttempts++
    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  subscribe(callback: WebSocketCallback) {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  private notifyCallbacks(event: WebSocketEvent) {
    this.callbacks.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in WebSocket callback:', error)
      }
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    if (typeof window !== 'undefined' && (window as any).__monfair_polling) {
      clearInterval((window as any).__monfair_polling)
    }
    
    this.callbacks.clear()
  }

  send(event: WebSocketEvent) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    }
  }
}

export const wsService = new WebSocketService()

// Hook for React components
export const useWebSocket = (callback?: WebSocketCallback) => {
  if (typeof window === 'undefined') {
    return { connected: false, send: () => {} }
  }

  useEffect(() => {
    wsService.connect()
    
    if (callback) {
      const unsubscribe = wsService.subscribe(callback)
      return () => {
        unsubscribe()
      }
    }
  }, [callback])

  useEffect(() => {
    return () => {
      // Don't disconnect on unmount, keep connection alive
    }
  }, [])

  return {
    connected: typeof window !== 'undefined' && wsService.ws?.readyState === WebSocket.OPEN,
    send: (event: WebSocketEvent) => wsService.send(event),
  }
}

