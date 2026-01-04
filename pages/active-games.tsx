import GameList from '@/components/GameList'
import { getActiveGames, getMyGames } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { GameStruct, RootState, GameStatus, GameType } from '@/utils/type.dt'
import { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GameListSkeleton } from '@/components/SkeletonLoader'
import { useWebSocket } from '@/services/websocket'
import { useChainId, useAccount } from 'wagmi'
import Link from 'next/link'
import { BASE_MAINNET_CHAIN_ID, BASE_TESTNET_CHAIN_ID } from '@/utils/network'

const ActiveGamesPage: NextPage = () => {
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
        console.log('[active-games.tsx] Fetching active multi-player games for chainId:', chainId)
        
        // Fetch all active games
        const allGamesData = await getActiveGames(chainId)
        // Filter only multi-player games (exclude AI vs Player games)
        const multiPlayerGames = allGamesData.filter(game => game.gameType === GameType.PLAYER_VS_PLAYER)
        console.log('[active-games.tsx] Found', allGamesData.length, 'active games (', multiPlayerGames.length, 'multi-player)')
        setAllActiveGames(multiPlayerGames)
        
        // If user is connected, also fetch their active games
        if (isConnected && address) {
          try {
            console.log('[active-games.tsx] Fetching my active games for address:', address)
            const myGamesData = await getMyGames(address, chainId)
            // Filter only active multi-player games (CREATED or IN_PROGRESS, and PLAYER_VS_PLAYER)
            const myActive = myGamesData.filter(
              game => (game.status === GameStatus.CREATED || game.status === GameStatus.IN_PROGRESS) &&
                      game.gameType === GameType.PLAYER_VS_PLAYER
            )
            console.log('[active-games.tsx] Found', myActive.length, 'my active multi-player games')
            setMyActiveGames(myActive)
            
            // Show user's active games first, then other active games
            // Remove duplicates (user's games should appear in both lists)
            const otherGames = multiPlayerGames.filter(game => 
              !myActive.some(myGame => myGame.id === game.id)
            )
            const combinedGames = [...myActive, ...otherGames]
            console.log('[active-games.tsx] Combined multi-player games:', combinedGames.length, '(my games:', myActive.length, '+ other games:', otherGames.length, ')')
            dispatch(setGames(combinedGames))
          } catch (error) {
            console.error('[active-games.tsx] Error fetching my games:', error)
            // If my games fetch fails, just show all active multi-player games
            dispatch(setGames(multiPlayerGames))
          }
        } else {
          // User not connected, show all active multi-player games
          dispatch(setGames(multiPlayerGames))
        }
      } catch (error) {
        console.error('[active-games.tsx] Error fetching games:', error)
        dispatch(setGames([]))
        setAllActiveGames([])
        setMyActiveGames([])
      } finally {
        dispatch(setLoading(false))
      }
    }

    // Only fetch if chainId is valid (143 for mainnet, 10143 for testnet)
    if (chainId === 143 || chainId === 10143) {
      fetchGames()
    } else {
      console.warn('[active-games.tsx] Invalid chainId, skipping fetch:', chainId)
      dispatch(setGames([]))
      dispatch(setLoading(false))
    }
  }, [dispatch, setGames, setLoading, chainId, isConnected, address]) // Re-fetch when chainId or connection changes

  // WebSocket for real-time updates
  useWebSocket((event) => {
    if (event.type === 'GAME_CREATED' || event.type === 'GAME_UPDATED') {
      // Refresh games list with current chainId
      if (chainId === 143 || chainId === 10143) {
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
            console.error('[active-games.tsx] Error refreshing games:', error)
          }
        }
        refreshGames()
      }
    }
  })

  // Get current network name
  const getNetworkName = () => {
    if (chainId === BASE_TESTNET_CHAIN_ID) {
      return 'Testnet'
    } else if (chainId === BASE_MAINNET_CHAIN_ID) {
      return 'Mainnet'
    }
    return 'Unknown Network'
  }

  return (
    <div>
      <Head>
        <title>MonFair | Active Games</title>
        <meta
          name="description"
          content="Active Multi-Player Games on MonFair - Join or create a new game"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="py-12 px-4">
        <div className="lg:w-2/3 w-full mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-300 bg-clip-text text-transparent font-brand mb-2 tracking-tight">
                  Active Games
                </h1>
                <p className="text-gray-300 text-sm md:text-base font-medium tracking-wide">Multi-Player Games - Join or create a new game</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20">
                <div className="text-xs text-gray-400 font-medium mb-1">Network</div>
                <div className={`text-sm font-bold ${chainId === BASE_TESTNET_CHAIN_ID ? 'text-yellow-400' : 'text-primary-400'}`}>
                  {getNetworkName()}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link
              href="/flip-match"
              className="btn-primary text-sm md:text-base px-6 py-3 text-center font-bold flex items-center justify-center gap-2"
            >
              🎮 Create Game
            </Link>
            <Link
              href="/games"
              className="btn-outline text-sm md:text-base px-6 py-3 text-center font-bold flex items-center justify-center gap-2"
            >
              📊 My Games
            </Link>
          </div>

          {/* Games List */}
          {loading ? (
            <GameListSkeleton />
          ) : games.length > 0 ? (
            <>
              {/* Show info banner if user has active games */}
              {isConnected && myActiveGames.length > 0 && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20">
                  <p className="text-sm text-gray-300 font-medium text-center">
                    💡 Your {myActiveGames.length} active {myActiveGames.length === 1 ? 'game' : 'games'} {myActiveGames.length > 0 && games.length > myActiveGames.length ? 'are shown first' : ''}
                  </p>
                </div>
              )}
              <GameList games={games} />
            </>
          ) : (
            <div className="card text-center py-16">
              <div className="text-5xl md:text-6xl mb-3">🎮</div>
              <p className="text-gray-300 text-base md:text-lg mb-2 font-semibold">No active multi-player games yet</p>
              <p className="text-gray-500 text-xs md:text-sm mb-4">Be the first to create a multi-player game!</p>
              <Link
                href="/flip-match"
                className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
              >
                🎮 Create Game
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActiveGamesPage







