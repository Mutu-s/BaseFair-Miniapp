/**
 * Script to clear all game cache from localStorage
 * This will remove cached game data but NOT delete games from blockchain
 */

console.log('🧹 Clearing game cache from localStorage...\n')

// List of localStorage keys that might contain game data
const keysToRemove = [
  'flipMatch_games_cache',
  'flipMatch_myGames_cache',
  'flipMatch_activeGames_cache',
  'gameCreated',
  'flipMatch_games',
  'flipMatch_myGames',
  'flipMatch_activeGames',
]

let removedCount = 0

// Remove each key
keysToRemove.forEach(key => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (window.localStorage.getItem(key)) {
        window.localStorage.removeItem(key)
        console.log(`✅ Removed: ${key}`)
        removedCount++
      } else {
        console.log(`⏭️  Not found: ${key}`)
      }
    }
  } catch (e) {
    console.warn(`⚠️  Could not remove ${key}:`, e.message)
  }
})

// Also remove all keys that start with 'flipMatch_' or 'game_'
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const allKeys = Object.keys(window.localStorage)
    const gameKeys = allKeys.filter(key => 
      key.startsWith('flipMatch_') || 
      key.startsWith('game_') ||
      key.includes('Game') ||
      key.includes('game')
    )
    
    gameKeys.forEach(key => {
      if (!keysToRemove.includes(key)) {
        window.localStorage.removeItem(key)
        console.log(`✅ Removed: ${key}`)
        removedCount++
      }
    })
  } catch (e) {
    console.warn('⚠️  Could not scan all localStorage keys:', e.message)
  }
}

console.log(`\n✨ Done! Removed ${removedCount} cache entries.`)
console.log('📝 Note: Games on blockchain are NOT deleted (they are immutable).')
console.log('   This only clears the frontend cache.')


