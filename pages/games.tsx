import GameDetails from '@/components/GameDetails'
import GameList from '@/components/GameList'
import GameStatusBadge from '@/components/GameStatusBadge'
import { getMyGames } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { GameStruct, RootState, GameStatus } from '@/utils/type.dt'
import { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GameListSkeleton } from '@/components/SkeletonLoader'
import Link from 'next/link'
import { createSlug } from '@/utils/helper'
import { useChainId } from 'wagmi'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'

const Page: NextPage = () => {
  const dispatch = useDispatch()
  const { setGames, setLoading } = globalActions
  const { games, loading } = useSelector((states: RootState) => states.globalStates)
  const [activeGames, setActiveGames] = useState<GameStruct[]>([])
  const [completedGames, setCompletedGames] = useState<GameStruct[]>([])
  const chainId = useChainId()

  const fetchGames = useCallback(async () => {
    dispatch(setLoading(true))
    try {
      // Use BASE_MAINNET_CHAIN_ID (8453) instead of hardcoded values
      const validChainId = chainId || BASE_MAINNET_CHAIN_ID
      const networkName = validChainId === BASE_MAINNET_CHAIN_ID ? 'MAINNET' : 'UNKNOWN'
      console.log(`[games.tsx] 🔍 Fetching my games for ${networkName} (chainId: ${validChainId})`)
      
      // Pass chainId to getMyGames to ensure correct network
      const gamesData: GameStruct[] = await getMyGames(undefined, validChainId)
      console.log(`[games.tsx] ✅ Found ${gamesData.length} games on ${networkName}`)
      
      if (gamesData.length === 0) {
        console.warn(`[games.tsx] ⚠️ No games found on ${networkName}. Possible reasons:`)
        console.warn('  1. No games have been created on this network')
        console.warn('  2. Wallet is not connected')
        console.warn('  3. Contract address is incorrect for this network')
        console.warn('  4. Games were created but not indexed yet')
        console.warn('  5. Event query range might be too small')
        
        // Provide debugging info
        console.warn('[games.tsx] 💡 Debugging tips:')
        console.warn('  - Check if games were created on the correct network')
        console.warn('  - Verify wallet is connected to Base Mainnet (chainId: 8453)')
        console.warn('  - Check browser console for detailed logs from getMyGames')
      } else {
        console.log(`[games.tsx] 📊 Games breakdown:`)
        const active = gamesData.filter(g => g.status === GameStatus.CREATED || g.status === GameStatus.IN_PROGRESS)
        const completed = gamesData.filter(g => g.status === GameStatus.COMPLETED || g.status === GameStatus.TIED)
        console.log(`  - Active: ${active.length}`)
        console.log(`  - Completed: ${completed.length}`)
      }
      
      dispatch(setGames(gamesData))
      
      // Separate active and completed games
      const active = gamesData.filter(
        game => game.status === GameStatus.CREATED || game.status === GameStatus.IN_PROGRESS
      )
      const completed = gamesData.filter(
        game => game.status === GameStatus.COMPLETED || game.status === GameStatus.TIED
      )
      
      console.log('[games.tsx] Active games:', active.length, 'Completed games:', completed.length)
      setActiveGames(active)
      setCompletedGames(completed)
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || ''
      console.error('[games.tsx] Error fetching games:', errorMsg)
      console.error('[games.tsx] Full error:', error)
      setActiveGames([])
      setCompletedGames([])
      dispatch(setGames([]))
    } finally {
      dispatch(setLoading(false))
    }
  }, [chainId, dispatch, setGames, setLoading])

  useEffect(() => {
    // Fetch games for Base Mainnet (chainId: 8453)
    const validChainId = chainId || BASE_MAINNET_CHAIN_ID
    if (validChainId === BASE_MAINNET_CHAIN_ID) {
      fetchGames()
    } else {
      console.warn('[games.tsx] Invalid chainId, skipping fetch:', chainId, '(Expected:', BASE_MAINNET_CHAIN_ID, ')')
      dispatch(setGames([]))
      dispatch(setLoading(false))
    }
  }, [fetchGames, dispatch, setGames, setLoading, chainId]) // Re-fetch when chainId changes

  // Listen for game creation events and refresh
  useEffect(() => {
    const handleGameCreated = (event?: CustomEvent) => {
      console.log('[games.tsx] Game created event detected, refreshing...', event?.detail)
      const validChainId = chainId || BASE_MAINNET_CHAIN_ID
      if (validChainId === BASE_MAINNET_CHAIN_ID) {
        // Wait a bit for the transaction to be indexed, then refresh
        setTimeout(() => {
          fetchGames()
        }, 3000)
      }
    }

    // Listen for custom event from CreateGame component
    window.addEventListener('gameCreated', handleGameCreated as EventListener)
    
    // Also listen for storage events (in case of cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gameCreated' && e.newValue) {
        try {
          const gameData = JSON.parse(e.newValue)
          console.log('[games.tsx] Storage event detected, refreshing...', gameData)
          const validChainId = chainId || BASE_MAINNET_CHAIN_ID
          if (validChainId === BASE_MAINNET_CHAIN_ID) {
            // Wait a bit for the transaction to be indexed, then refresh
            setTimeout(() => {
              fetchGames()
            }, 3000)
          }
        } catch (e) {
          console.warn('[games.tsx] Error parsing storage event:', e)
        }
        // Clear the storage event
        localStorage.removeItem('gameCreated')
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('gameCreated', handleGameCreated as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [fetchGames, chainId, dispatch, setGames, setLoading])

  return (
    <div>
      <Head>
        <title>MonFair | My Games</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="py-12 px-4">
        <div className="lg:w-2/3 w-full mx-auto">
          <h1 className="text-3xl font-bold text-primary-500 mb-8">My Games</h1>
          
          {loading ? (
            <GameListSkeleton />
          ) : (
            <>
              {/* Active Games Section */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-200">Active Games</h2>
                  <div className="text-sm text-gray-400">
                    {activeGames.length} {activeGames.length === 1 ? 'game' : 'games'}
                  </div>
                </div>
                
                {activeGames.length > 0 ? (
                  <GameList games={activeGames} />
                ) : (
                  <div className="card text-center py-12">
                    <p className="text-gray-400 text-lg mb-2">No active games</p>
                    <p className="text-gray-500 text-sm">Create a new game to get started!</p>
                  </div>
                )}
              </div>

              {/* Completed Games Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-200">Completed Games</h2>
                  <div className="text-sm text-gray-400">
                    {completedGames.length} {completedGames.length === 1 ? 'game' : 'games'}
                  </div>
                </div>
                
                {completedGames.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {completedGames.map((gameItem) => (
                      <div
                        key={gameItem.id}
                        className="card opacity-90 border-2 border-dark-700/50"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex-1">
                            <h4 className="text-2xl font-extrabold text-gray-100 mb-3 leading-tight">
                              {gameItem.name || `Game #${gameItem.id}`}
                            </h4>
                            <GameStatusBadge status={gameItem.status} />
                          </div>
                        </div>

                        <div className="space-y-4 mb-6">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary-500/10 to-primary-600/5 border border-primary-500/20">
                            <span className="text-gray-400 font-medium">💰 Stake:</span>
                            <span className="text-primary-400 font-extrabold text-lg">{gameItem.stake} ETH</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-success-500/10 to-success-600/5 border border-success-500/20">
                            <span className="text-gray-400 font-medium">🏆 Prize:</span>
                            <span className="text-success-400 font-extrabold text-lg">{gameItem.totalPrize} ETH</span>
                          </div>
                          {gameItem.winner && gameItem.winner !== '0x0000000000000000000000000000000000000000' && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20">
                              <span className="text-gray-400 font-medium">👑 Winner:</span>
                              <span className="text-yellow-400 font-bold text-sm">
                                {gameItem.winner.slice(0, 6)}...{gameItem.winner.slice(-4)}
                              </span>
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/results/${createSlug(gameItem.name || `Game #${gameItem.id}`, gameItem.id)}-${gameItem.id}`}
                          className="btn-primary text-center text-base py-3 block font-bold"
                        >
                          📊 View Results
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card text-center py-16">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-gray-300 text-xl mb-2 font-bold">No completed games yet</p>
                    <p className="text-gray-500 text-sm">Complete a game to see it here!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      <GameDetails />
    </div>
  )
}

export default Page
