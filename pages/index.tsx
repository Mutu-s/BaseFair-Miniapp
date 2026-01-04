import GameList from '@/components/GameList'
import Hero from '@/components/Hero'
import Leaderboard from '@/components/Leaderboard'
import Analytics from '@/components/Analytics'
import CreateGame from '@/components/CreateGame'
import { getActiveGames, getMyGames } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { GameStruct, RootState, GameStatus, GameType } from '@/utils/type.dt'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GameListSkeleton } from '@/components/SkeletonLoader'
import { useWebSocket } from '@/services/websocket'
import { useChainId, useAccount } from 'wagmi'

const Page: NextPage = () => {
  const dispatch = useDispatch()
  const { setGames, setLoading } = globalActions
  const { games, loading } = useSelector((states: RootState) => states.globalStates)
  const chainId = useChainId()
  const { address, isConnected } = useAccount()
  const [myActiveGames, setMyActiveGames] = useState<GameStruct[]>([])
  const [allActiveGames, setAllActiveGames] = useState<GameStruct[]>([])

  // Fetch games on mount and when network changes
  useEffect(() => {
    const fetchGames = async () => {
      dispatch(setLoading(true))
      try {
        console.log('[index.tsx] Fetching active games for chainId:', chainId)
        
        // Fetch all active games
        const allGamesData = await getActiveGames(chainId)
        console.log('[index.tsx] Raw active games:', allGamesData.length, allGamesData.map(g => ({ id: g.id, type: g.gameType, status: g.status, players: `${g.currentPlayers}/${g.maxPlayers}` })))
        
        // Filter only multi-player games (exclude AI vs Player games)
        const multiPlayerGames = allGamesData.filter(game => {
          const isPlayerVsPlayer = game.gameType === GameType.PLAYER_VS_PLAYER
          if (!isPlayerVsPlayer) {
            console.log('[index.tsx] Filtered out game', game.id, '- not PLAYER_VS_PLAYER, type:', game.gameType)
          }
          return isPlayerVsPlayer
        })
        console.log('[index.tsx] Found', allGamesData.length, 'active games (', multiPlayerGames.length, 'multi-player)')
        setAllActiveGames(multiPlayerGames)
        
        // If user is connected, also fetch their active games
        if (isConnected && address) {
          try {
            console.log('[index.tsx] Fetching my active games for address:', address)
            const myGamesData = await getMyGames(address, chainId)
            // Filter only active multi-player games (CREATED or IN_PROGRESS, and PLAYER_VS_PLAYER)
            const myActive = myGamesData.filter(
              game => (game.status === GameStatus.CREATED || game.status === GameStatus.IN_PROGRESS || game.status === GameStatus.WAITING_VRF) &&
                      game.gameType === GameType.PLAYER_VS_PLAYER
            )
            console.log('[index.tsx] Found', myActive.length, 'my active multi-player games')
            setMyActiveGames(myActive)
            
            // Show user's active games first, then other active games
            // Remove duplicates (user's games should appear in both lists)
            const otherGames = multiPlayerGames.filter(game => 
              !myActive.some(myGame => myGame.id === game.id)
            )
            const combinedGames = [...myActive, ...otherGames]
            console.log('[index.tsx] Combined multi-player games:', combinedGames.length, '(my games:', myActive.length, '+ other games:', otherGames.length, ')')
            dispatch(setGames(combinedGames))
          } catch (error) {
            console.error('[index.tsx] Error fetching my games:', error)
            // If my games fetch fails, just show all active multi-player games
            dispatch(setGames(multiPlayerGames))
          }
        } else {
          // User not connected, show all active multi-player games
          console.log('[index.tsx] User not connected, showing all multi-player games:', multiPlayerGames.length)
          dispatch(setGames(multiPlayerGames))
        }
      } catch (error) {
        console.error('[index.tsx] Error fetching games:', error)
        dispatch(setGames([]))
        setAllActiveGames([])
        setMyActiveGames([])
      } finally {
        dispatch(setLoading(false))
      }
    }

    // Only fetch if chainId is valid (8453 for Base mainnet)
    if (chainId === 8453) {
      fetchGames()
    } else {
      console.warn('[index.tsx] Invalid chainId, skipping fetch:', chainId)
      dispatch(setGames([]))
      dispatch(setLoading(false))
    }
  }, [dispatch, setGames, setLoading, chainId, isConnected, address]) // Re-fetch when chainId or connection changes

  // WebSocket for real-time updates
  useWebSocket((event) => {
    if (event.type === 'GAME_CREATED' || event.type === 'GAME_UPDATED') {
      // Refresh games list with current chainId
      if (chainId === 8453) {
        const refreshGames = async () => {
          try {
            const allGamesData = await getActiveGames(chainId)
            // Filter only multi-player games
            const multiPlayerGames = allGamesData.filter(game => game.gameType === GameType.PLAYER_VS_PLAYER)
            setAllActiveGames(multiPlayerGames)
            
            if (isConnected && address) {
              try {
                const myGamesData = await getMyGames(address, chainId)
                const myActive = myGamesData.filter(
                  game => (game.status === GameStatus.CREATED || game.status === GameStatus.IN_PROGRESS) &&
                          game.gameType === GameType.PLAYER_VS_PLAYER
                )
                setMyActiveGames(myActive)
                
                const combinedGames = [
                  ...myActive,
                  ...multiPlayerGames.filter(game => 
                    !myActive.some(myGame => myGame.id === game.id)
                  )
                ]
                dispatch(setGames(combinedGames))
              } catch (error) {
                dispatch(setGames(multiPlayerGames))
              }
            } else {
              dispatch(setGames(multiPlayerGames))
            }
          } catch (error) {
            console.error('[index.tsx] Error refreshing games:', error)
          }
        }
        refreshGames()
      }
    }
  })

  return (
    <div>
      <Head>
        <title>BaseFair - Verifiably Fair Gaming on Base</title>
        <meta
          name="description"
          content="BaseFair - Verifiably fair gaming platform on Base blockchain with VRF-powered provable randomness. Mini App for Farcaster."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Hero />

      <div className="lg:w-2/3 w-full mx-auto px-4 py-12 space-y-12">
        {/* Create Game and My Games Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Create Game Card */}
          <div className="card group hover:scale-[1.02] transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6">
                <div className="p-6 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl text-primary-500 border border-primary-500/20 shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow inline-block">
                  <span className="text-4xl">🎮</span>
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-100 mb-3 tracking-tight">Create Game</h3>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                Start a new game session. Choose between Single Player (vs AI) or Multi Player mode. Set your stake amount and game parameters.
              </p>
              <button
                onClick={() => dispatch(globalActions.setCreateModal('scale-100'))}
                className="btn-primary w-full font-bold"
              >
                Create New Game
              </button>
            </div>
          </div>

          {/* My Games Card */}
          <div className="card group hover:scale-[1.02] transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6">
                <div className="p-6 bg-gradient-to-br from-secondary-500/20 to-secondary-600/10 rounded-xl text-secondary-500 border border-secondary-500/20 shadow-lg shadow-secondary-500/20 group-hover:shadow-secondary-500/40 transition-shadow inline-block">
                  <span className="text-4xl">📊</span>
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-100 mb-3 tracking-tight">My Games</h3>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                View and manage all your games. Track active games and review completed matches. Check your game history and statistics.
              </p>
              <Link
                href="/games"
                className="btn-primary w-full font-bold text-center"
              >
                View My Games
              </Link>
            </div>
          </div>
        </div>

        {/* Active Games Section - Show below My Games card, only if there are active games */}
        {loading ? (
          <GameListSkeleton />
        ) : games.length > 0 ? (
          <div className="mb-12">
            <GameList games={games} showTitle={false} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Leaderboard />
          <Analytics />
        </div>
      </div>
      
      <CreateGame />
    </div>
  )
}

export default Page

// Removed getServerSideProps - games are now fetched client-side to support network switching
