import React, { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { getChatMessages, addChatMessage, ChatMessage } from '@/services/chat'
import { getNickname, formatAddress } from '@/services/nickname'
import { FaPaperPlane, FaTimes, FaComments } from 'react-icons/fa'

const Chat: React.FC = () => {
  const { address, isConnected } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load initial messages
    setMessages(getChatMessages())

    // Listen for new messages
    const handleNewMessage = (event: CustomEvent) => {
      setMessages(getChatMessages())
    }

    const handleClearMessages = () => {
      setMessages([])
    }

    window.addEventListener('chatMessageAdded', handleNewMessage as EventListener)
    window.addEventListener('chatMessagesCleared', handleClearMessages)

    return () => {
      window.removeEventListener('chatMessageAdded', handleNewMessage as EventListener)
      window.removeEventListener('chatMessagesCleared', handleClearMessages)
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSendMessage = async () => {
    if (!address || !isConnected || !inputMessage.trim() || isSending) {
      return
    }

    setIsSending(true)
    try {
      const nickname = getNickname(address) || formatAddress(address)
      addChatMessage(address, nickname, inputMessage.trim())
      setInputMessage('')
    } catch (error: any) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 p-3 rounded-xl shadow-xl transition-all duration-300 ${
          isOpen
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
            : 'bg-gradient-to-r from-dark-800 to-dark-900 border-2 border-primary-500/30 hover:border-primary-500/50'
        } text-white hover:scale-105 hover:shadow-primary-500/30`}
        title="Player Chat"
      >
        <FaComments size={20} />
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] md:h-[550px] z-50 flex flex-col bg-gradient-to-br from-dark-900/98 via-dark-800/95 to-dark-900/98 border border-dark-700/60 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 p-4 flex items-center justify-between border-b border-dark-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-xl border border-primary-500/30">
                <FaComments size={18} className="text-primary-400" />
              </div>
              <div>
                <h3 className="text-gray-100 font-bold text-base tracking-tight">Player Chat</h3>
                <p className="text-gray-400 text-xs font-medium">Share your wins & strategies</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-dark-700/50 rounded-lg transition-all text-gray-400 hover:text-gray-200 hover:scale-110"
            >
              <FaTimes size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎮</div>
                <p className="text-gray-200 text-base font-bold mb-2">No messages yet</p>
                <p className="text-gray-400 text-sm">Start chatting with other players!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = address && msg.address.toLowerCase() === address.toLowerCase()
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`flex flex-col gap-1.5 ${isOwnMessage ? 'items-end' : 'items-start'} flex-1`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold ${isOwnMessage ? 'text-primary-400' : 'text-gray-400'}`}>
                          {msg.nickname}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                          isOwnMessage
                            ? 'bg-gradient-to-r from-primary-500/90 to-primary-600/90 text-white'
                            : 'bg-dark-800/80 text-gray-100 border border-dark-700/50'
                        }`}
                      >
                        <p className="text-sm break-words leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {isConnected ? (
            <div className="p-4 bg-dark-800/50 border-t border-dark-700/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Say something..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1 input text-sm bg-dark-900/80 border-dark-700/50 focus:border-primary-500/50 text-gray-100 placeholder-gray-500"
                  maxLength={200}
                  disabled={isSending}
                  autoComplete="off"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                >
                  <FaPaperPlane size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-dark-800/50 border-t border-dark-700/50 text-center">
              <p className="text-gray-400 text-sm font-medium">Connect wallet to chat</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default Chat

