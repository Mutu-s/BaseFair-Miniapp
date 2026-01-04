// Chat service - handles real-time messaging
// Uses localStorage for persistence and custom events for real-time updates

export interface ChatMessage {
  id: string
  address: string
  nickname: string
  message: string
  timestamp: number
}

const CHAT_STORAGE_KEY = 'flipmatch_chat_messages'
const MAX_MESSAGES = 100 // Keep last 100 messages

// Get all chat messages
export const getChatMessages = (): ChatMessage[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!stored) return []
    
    const messages: ChatMessage[] = JSON.parse(stored)
    // Sort by timestamp (oldest first)
    return messages.sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error('Error loading chat messages:', error)
    return []
  }
}

// Add a new chat message
export const addChatMessage = (address: string, nickname: string, message: string): ChatMessage => {
  if (!address || !message || message.trim().length === 0) {
    throw new Error('Address and message are required')
  }
  
  if (message.length > 500) {
    throw new Error('Message must be 500 characters or less')
  }
  
  const newMessage: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    address: address.toLowerCase(),
    nickname: nickname || formatAddress(address),
    message: message.trim(),
    timestamp: Date.now(),
  }
  
  try {
    const messages = getChatMessages()
    messages.push(newMessage)
    
    // Keep only last MAX_MESSAGES messages
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES)
    }
    
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    
    // Dispatch event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chatMessageAdded', { detail: newMessage }))
    }
    
    return newMessage
  } catch (error) {
    console.error('Error saving chat message:', error)
    throw new Error('Failed to save message')
  }
}

// Clear all chat messages
export const clearChatMessages = (): void => {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chatMessagesCleared'))
    }
  } catch (error) {
    console.error('Error clearing chat messages:', error)
  }
}

// Format address for display (helper function)
const formatAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}








