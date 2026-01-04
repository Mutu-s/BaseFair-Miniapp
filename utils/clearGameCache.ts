/**
 * Utility to clear all game cache from localStorage
 * This clears cached game data but does NOT delete games from blockchain (they are immutable)
 */

export function clearAllGameCache() {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.warn('localStorage not available')
    return { removed: 0, keys: [] }
  }

  const removedKeys: string[] = []
  
  // List of known localStorage keys that contain game data
  const knownKeys = [
    'flipMatch_games_cache',
    'flipMatch_myGames_cache',
    'flipMatch_activeGames_cache',
    'gameCreated',
    'flipMatch_games',
    'flipMatch_myGames',
    'flipMatch_activeGames',
  ]

  // Remove known keys
  knownKeys.forEach(key => {
    try {
      if (window.localStorage.getItem(key)) {
        window.localStorage.removeItem(key)
        removedKeys.push(key)
        console.log(`✅ Removed: ${key}`)
      }
    } catch (e) {
      console.warn(`⚠️  Could not remove ${key}:`, e)
    }
  })

  // Remove all keys that start with game-related prefixes
  try {
    const allKeys = Object.keys(window.localStorage)
    const gameKeys = allKeys.filter(key => {
      const lowerKey = key.toLowerCase()
      return (
        (lowerKey.startsWith('flipmatch_') || 
         lowerKey.startsWith('game_') ||
         lowerKey.includes('game') ||
         lowerKey.includes('cache')) &&
        !knownKeys.includes(key)
      )
    })
    
    gameKeys.forEach(key => {
      try {
        window.localStorage.removeItem(key)
        removedKeys.push(key)
        console.log(`✅ Removed: ${key}`)
      } catch (e) {
        console.warn(`⚠️  Could not remove ${key}:`, e)
      }
    })
  } catch (e) {
    console.warn('⚠️  Could not scan all localStorage keys:', e)
  }

  console.log(`✨ Cleared ${removedKeys.length} cache entries`)
  return { removed: removedKeys.length, keys: removedKeys }
}

/**
 * Clear game cache for specific chainId and address
 */
export function clearGameCacheForAddress(chainId: number, address: string) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { removed: 0, keys: [] }
  }

  const removedKeys: string[] = []
  const addressLower = address.toLowerCase()
  
  try {
    const allKeys = Object.keys(window.localStorage)
    const keysToRemove = allKeys.filter(key => {
      const lowerKey = key.toLowerCase()
      return (
        lowerKey.includes(addressLower) ||
        lowerKey.includes(chainId.toString())
      ) && (
        lowerKey.includes('game') ||
        lowerKey.includes('flipmatch') ||
        lowerKey.includes('cache')
      )
    })
    
    keysToRemove.forEach(key => {
      try {
        window.localStorage.removeItem(key)
        removedKeys.push(key)
        console.log(`✅ Removed: ${key}`)
      } catch (e) {
        console.warn(`⚠️  Could not remove ${key}:`, e)
      }
    })
  } catch (e) {
    console.warn('⚠️  Could not scan localStorage keys:', e)
  }

  return { removed: removedKeys.length, keys: removedKeys }
}


