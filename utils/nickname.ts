// Nickname management utility
const NICKNAME_STORAGE_KEY = 'monfair_nicknames'

export interface NicknameData {
  [address: string]: string
}

export const getNickname = (address: string): string | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(NICKNAME_STORAGE_KEY)
    if (!stored) return null
    
    const nicknames: NicknameData = JSON.parse(stored)
    return nicknames[address.toLowerCase()] || null
  } catch (error) {
    console.error('Error reading nickname:', error)
    return null
  }
}

export const setNickname = (address: string, nickname: string): void => {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem(NICKNAME_STORAGE_KEY)
    const nicknames: NicknameData = stored ? JSON.parse(stored) : {}
    
    // Validate nickname (3-20 characters, alphanumeric and spaces)
    const trimmed = nickname.trim()
    if (trimmed.length < 3 || trimmed.length > 20) {
      throw new Error('Nickname must be between 3 and 20 characters')
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
      throw new Error('Nickname can only contain letters, numbers, and spaces')
    }
    
    nicknames[address.toLowerCase()] = trimmed
    localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify(nicknames))
  } catch (error) {
    console.error('Error saving nickname:', error)
    throw error
  }
}

export const getAllNicknames = (): NicknameData => {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(NICKNAME_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error reading nicknames:', error)
    return {}
  }
}









