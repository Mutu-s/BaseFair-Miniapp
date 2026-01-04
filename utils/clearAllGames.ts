/**
 * Utility function to clear all games from localStorage and Redux store
 * This will remove all cached games, active games, and completed games
 */
import { clearAllGamesFromStorage } from './gameStorage'
import { store } from '@/store'
import { globalActions } from '@/store/globalSlices'

export const clearAllGames = () => {
  try {
    // Clear all games from localStorage
    clearAllGamesFromStorage()
    
    // Clear games from Redux store
    store.dispatch(globalActions.setGames([]))
    
    // Clear loading state
    store.dispatch(globalActions.setLoading(false))
    
    console.log('✅ All games cleared from localStorage and Redux store')
    
    // Reload the page to refresh the UI
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  } catch (error) {
    console.error('❌ Error clearing games:', error)
  }
}

// Make it available in browser console for easy access
if (typeof window !== 'undefined') {
  (window as any).clearAllGames = clearAllGames
  console.log('💡 You can clear all games by running: clearAllGames() in the console')
  
  // Check if we should auto-clear (one-time execution)
  const shouldClear = sessionStorage.getItem('clearAllGamesOnce')
  if (!shouldClear) {
    // Clear all games once
    clearAllGames()
    // Mark as cleared to prevent re-execution
    sessionStorage.setItem('clearAllGamesOnce', 'true')
  }
}

