import { GameStruct } from '@/utils/type.dt'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'

const STORAGE_KEY_PREFIX = 'monfair_games_'
const STORAGE_META_KEY = 'monfair_games_meta'

interface GameStorageMeta {
  lastSync: number
  chainId: number
  playerAddress: string
}

/**
 * Get storage key for a specific chain and player
 */
const getStorageKey = (chainId: number, playerAddress: string): string => {
  return `${STORAGE_KEY_PREFIX}${chainId}_${playerAddress.toLowerCase()}`
}

/**
 * Save a game to localStorage
 */
export const saveGameToStorage = (game: GameStruct, chainId: number, playerAddress: string): void => {
  try {
    if (typeof window === 'undefined') return
    
    const key = getStorageKey(chainId, playerAddress)
    const existingGames = getGamesFromStorage(chainId, playerAddress)
    
    // Check if game already exists
    const existingIndex = existingGames.findIndex(g => g.id === game.id)
    if (existingIndex >= 0) {
      // Update existing game
      existingGames[existingIndex] = game
    } else {
      // Add new game
      existingGames.push(game)
    }
    
    // Sort by ID (newest first)
    existingGames.sort((a, b) => b.id - a.id)
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(existingGames))
    
    // Update metadata
    const meta: GameStorageMeta = {
      lastSync: Date.now(),
      chainId,
      playerAddress: playerAddress.toLowerCase(),
    }
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta))
    
    console.log('[gameStorage] 💾 Saved game to localStorage:', game.id, 'Total games:', existingGames.length)
  } catch (error) {
    console.warn('[gameStorage] Failed to save game to localStorage:', error)
  }
}

/**
 * Get games from localStorage
 */
export const getGamesFromStorage = (chainId: number, playerAddress: string): GameStruct[] => {
  try {
    if (typeof window === 'undefined') return []
    
    const key = getStorageKey(chainId, playerAddress)
    const stored = localStorage.getItem(key)
    
    if (!stored) {
      return []
    }
    
    const games = JSON.parse(stored) as GameStruct[]
    console.log('[gameStorage] 📦 Retrieved', games.length, 'games from localStorage for chainId:', chainId)
    return games
  } catch (error) {
    console.warn('[gameStorage] Failed to get games from localStorage:', error)
    return []
  }
}

/**
 * Save multiple games to localStorage
 */
export const saveGamesToStorage = (games: GameStruct[], chainId: number, playerAddress: string): void => {
  try {
    if (typeof window === 'undefined') return
    
    const key = getStorageKey(chainId, playerAddress)
    const existingGames = getGamesFromStorage(chainId, playerAddress)
    
    // Merge games (update existing, add new)
    const gameMap = new Map<number, GameStruct>()
    
    // Add existing games
    existingGames.forEach(game => {
      gameMap.set(game.id, game)
    })
    
    // Update/add new games
    games.forEach(game => {
      gameMap.set(game.id, game)
    })
    
    const mergedGames = Array.from(gameMap.values())
    mergedGames.sort((a, b) => b.id - a.id)
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(mergedGames))
    
    // Update metadata
    const meta: GameStorageMeta = {
      lastSync: Date.now(),
      chainId,
      playerAddress: playerAddress.toLowerCase(),
    }
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta))
    
    console.log('[gameStorage] 💾 Saved', mergedGames.length, 'games to localStorage')
  } catch (error) {
    console.warn('[gameStorage] Failed to save games to localStorage:', error)
  }
}

/**
 * Clear games from localStorage
 */
export const clearGamesFromStorage = (chainId: number, playerAddress: string): void => {
  try {
    if (typeof window === 'undefined') return
    
    const key = getStorageKey(chainId, playerAddress)
    localStorage.removeItem(key)
    console.log('[gameStorage] 🗑️ Cleared games from localStorage')
  } catch (error) {
    console.warn('[gameStorage] Failed to clear games from localStorage:', error)
  }
}

/**
 * Get all stored games for all chains and players (for debugging)
 */
export const getAllStoredGames = (): { chainId: number; playerAddress: string; games: GameStruct[] }[] => {
  try {
    if (typeof window === 'undefined') return []
    
    const results: { chainId: number; playerAddress: string; games: GameStruct[] }[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX) && key !== STORAGE_META_KEY) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const games = JSON.parse(stored) as GameStruct[]
            // Extract chainId and playerAddress from key
            const parts = key.replace(STORAGE_KEY_PREFIX, '').split('_')
            if (parts.length >= 2) {
              const chainId = parseInt(parts[0])
              const playerAddress = parts.slice(1).join('_')
              results.push({ chainId, playerAddress, games })
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      }
    }
    
    return results
  } catch (error) {
    console.warn('[gameStorage] Failed to get all stored games:', error)
    return []
  }
}

/**
 * Clear ALL games from localStorage for all chains and players
 */
export const clearAllGamesFromStorage = (): void => {
  try {
    if (typeof window === 'undefined') return
    
    const keysToRemove: string[] = []
    
    // Find all game storage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith(STORAGE_KEY_PREFIX) || key === STORAGE_META_KEY || key === 'gameCreated')) {
        keysToRemove.push(key)
      }
    }
    
    // Remove all found keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    console.log('[gameStorage] 🗑️ Cleared all games from localStorage (', keysToRemove.length, 'keys removed)')
  } catch (error) {
    console.warn('[gameStorage] Failed to clear all games from localStorage:', error)
  }
}

