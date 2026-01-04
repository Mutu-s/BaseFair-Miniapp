// Nickname service - stores nicknames in localStorage
// In production, this could be moved to a smart contract or backend

export interface NicknameData {
  address: string
  nickname: string
  createdAt: number
}

const NICKNAME_STORAGE_KEY = 'flipmatch_nicknames'

// Get all nicknames from localStorage
export const getAllNicknames = (): Map<string, string> => {
  if (typeof window === 'undefined') return new Map()
  
  try {
    const stored = localStorage.getItem(NICKNAME_STORAGE_KEY)
    if (!stored) return new Map()
    
    const nicknames: NicknameData[] = JSON.parse(stored)
    const nicknameMap = new Map<string, string>()
    
    nicknames.forEach((data) => {
      nicknameMap.set(data.address.toLowerCase(), data.nickname)
    })
    
    return nicknameMap
  } catch (error) {
    console.error('Error loading nicknames:', error)
    return new Map()
  }
}

// Get nickname for a specific address
export const getNickname = (address: string): string | null => {
  if (!address) return null
  
  const nicknames = getAllNicknames()
  return nicknames.get(address.toLowerCase()) || null
}

// Set nickname for an address
export const setNickname = (address: string, nickname: string): void => {
  if (!address || !nickname || nickname.trim().length === 0) {
    throw new Error('Address and nickname are required')
  }
  
  if (nickname.length > 20) {
    throw new Error('Nickname must be 20 characters or less')
  }
  
  // Validate nickname (alphanumeric, spaces, and common special chars)
  const nicknameRegex = /^[a-zA-Z0-9\s_\-\.]+$/
  if (!nicknameRegex.test(nickname)) {
    throw new Error('Nickname can only contain letters, numbers, spaces, and _ - . characters')
  }
  
  try {
    const stored = localStorage.getItem(NICKNAME_STORAGE_KEY)
    let nicknames: NicknameData[] = stored ? JSON.parse(stored) : []
    
    // Remove existing nickname for this address
    nicknames = nicknames.filter((n) => n.address.toLowerCase() !== address.toLowerCase())
    
    // Add new nickname
    nicknames.push({
      address: address.toLowerCase(),
      nickname: nickname.trim(),
      createdAt: Date.now(),
    })
    
    localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify(nicknames))
    
    // Dispatch event for other components to update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nicknameUpdated', { 
        detail: { address: address.toLowerCase(), nickname: nickname.trim() } 
      }))
    }
  } catch (error) {
    console.error('Error saving nickname:', error)
    throw new Error('Failed to save nickname')
  }
}

// Check if address has a nickname
export const hasNickname = (address: string): boolean => {
  return getNickname(address) !== null
}

// Format address display (nickname or shortened address)
export const formatAddress = (address: string, showFull: boolean = false): string => {
  if (!address) return ''
  
  const nickname = getNickname(address)
  if (nickname) {
    return nickname
  }
  
  if (showFull) {
    return address
  }
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}








