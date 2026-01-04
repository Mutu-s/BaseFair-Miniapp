import CreateGame from '@/components/CreateGame'
import GameList from '@/components/GameList'
import { globalActions } from '@/store/globalSlices'
import { NextPage } from 'next'
import Head from 'next/head'
import { useDispatch } from 'react-redux'
import Link from 'next/link'
import { useChainId, useAccount } from 'wagmi'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'
import { getActiveGames, getMyGames } from '@/services/blockchain'
import { GameStruct, GameStatus, GameType } from '@/utils/type.dt'
import { useEffect, useState } from 'react'
import { GameListSkeleton } from '@/components/SkeletonLoader'
import ShareButton from '@/components/ShareButton'
import { 
  FaTrophy, 
  FaFire, 
  FaCrown, 
  FaUsers, 
  FaCoins, 
  FaGamepad,
  FaCalendarAlt,
  FaGift,
  FaChartLine,
  FaStar,
  FaMedal,
  FaShieldAlt,
  FaRocket,
  FaClock,
  FaLock,
  FaUnlock,
  FaShareAlt,
  FaUserFriends,
  FaAward,
  FaBolt
} from 'react-icons/fa'

const FlipMatchPage: NextPage = () => {
  const dispatch = useDispatch()
  const { setCreateModal } = globalActions
  const chainId = useChainId()
  const { address, isConnected } = useAccount()
  const [activeGames, setActiveGames] = useState<GameStruct[]>([])
  const [completedGames, setCompletedGames] = useState<GameStruct[]>([])
  const [myGames, setMyGames] = useState<GameStruct[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [stats, setStats] = useState({
    totalGames: 0,
    activePlayers: 0,
    totalPrize: 0,
    season: 1
  })

  const handleCreateGame = () => {
    dispatch(setCreateModal('scale-100'))
  }

  // Get current network name
  const getNetworkName = () => {
    if (chainId === BASE_MAINNET_CHAIN_ID) {
      return 'Base'
    }
    return 'Unknown Network'
  }

  // Fetch active multi-player games and stats
  useEffect(() => {
    const fetchData = async () => {
      if (chainId !== BASE_MAINNET_CHAIN_ID) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('[flip-match.tsx] Fetching data for chainId:', chainId)
        
        // Fetch all active games
        const allGamesData = await getActiveGames(chainId)
        
        // Filter only multi-player games
        const multiPlayerGames = allGamesData.filter(game => {
          return game.gameType === GameType.PLAYER_VS_PLAYER
        })
        
        // Separate active and completed/expired games
        const now = Math.floor(Date.now() / 1000)
        const active: GameStruct[] = []
        const completed: GameStruct[] = []
        
        multiPlayerGames.forEach(game => {
          // Check if game is expired (endTime > 0 and endTime < now)
          const isExpired = game.endTime > 0 && game.endTime < now
          
          // Check if game is completed or expired
          const isCompleted = game.status === GameStatus.COMPLETED || 
                              game.status === GameStatus.TIED || 
                              game.status === GameStatus.CANCELLED ||
                              isExpired
          
          if (isCompleted) {
            completed.push(game)
          } else {
            // Only show truly active games (CREATED, WAITING_VRF, IN_PROGRESS)
            if (game.status === GameStatus.CREATED || 
                game.status === GameStatus.WAITING_VRF || 
                game.status === GameStatus.IN_PROGRESS) {
              active.push(game)
            }
          }
        })
        
        // Calculate stats only from active games
        const totalPrize = active.reduce((sum, game) => sum + game.totalPrize, 0)
        const uniquePlayers = new Set<string>()
        active.forEach(game => {
          uniquePlayers.add(game.creator.toLowerCase())
        })
        
        setActiveGames(active)
        setCompletedGames(completed)
        setStats({
          totalGames: multiPlayerGames.length,
          activePlayers: uniquePlayers.size,
          totalPrize: totalPrize,
          season: 1 // TODO: Get from contract
        })
        
        // Fetch user's games if connected
        if (isConnected && address) {
          try {
            const myGamesData = await getMyGames(address, chainId)
            const myActive = myGamesData.filter(
              game => (game.status === GameStatus.CREATED || game.status === GameStatus.IN_PROGRESS || game.status === GameStatus.WAITING_VRF) &&
                      game.gameType === GameType.PLAYER_VS_PLAYER
            )
            setMyGames(myActive)
          } catch (error) {
            console.error('[flip-match.tsx] Error fetching my games:', error)
          }
        }
      } catch (error) {
        console.error('[flip-match.tsx] Error fetching data:', error)
        setActiveGames([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [chainId, address, isConnected])

  return (
    <div>
      <Head>
        <title>MonFair | Flip & Match - Mission X Arcade</title>
        <meta
          name="description"
          content="Flip & Match - Verifiably fair arcade gaming on Monad. Play free, compete in seasons, and win prizes!"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="py-8 px-4">
        <div className="lg:w-5/6 w-full mx-auto">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-300 bg-clip-text text-transparent font-brand tracking-tight">
                    Flip & Match
                  </h1>
                  <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-500/20 to-secondary-500/20 border border-primary-500/30 text-xs font-bold text-primary-300 flex items-center gap-2">
                    <FaRocket size={12} />
                    MISSION X
                  </span>
                </div>
                <p className="text-gray-300 text-lg md:text-xl font-semibold tracking-wide mb-3">
                  Verifiably fair arcade gaming on Monad
                </p>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl">
                  Play free, compete in seasons, and win prizes! Powered by Pyth VRF for provable fairness. 
                  Commit-Reveal mechanism ensures fair PVP matches. Single transaction submission for seamless UX.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="px-6 py-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20 shadow-lg">
                  <div className="text-xs text-gray-400 font-medium mb-1">Network</div>
                  <div className={`text-lg font-bold text-[#0052FF]`}>
                    {getNetworkName()}
                  </div>
                </div>
                <div className="px-6 py-4 rounded-xl bg-gradient-to-br from-secondary-500/10 to-secondary-600/5 border border-secondary-500/20 shadow-lg">
                  <div className="text-xs text-gray-400 font-medium mb-1">Season</div>
                  <div className="text-lg font-bold text-secondary-400">
                    #{stats.season}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-5 bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20 hover:border-primary-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-primary-500/20 rounded-xl">
                  <FaGamepad className="text-primary-400" size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-medium">Active Games</div>
                  <div className="text-2xl font-extrabold text-primary-300">{stats.totalGames}</div>
                </div>
              </div>
            </div>
            
            <div className="card p-5 bg-gradient-to-br from-secondary-500/10 to-secondary-600/5 border-secondary-500/20 hover:border-secondary-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-secondary-500/20 rounded-xl">
                  <FaUsers className="text-secondary-400" size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-medium">Players</div>
                  <div className="text-2xl font-extrabold text-secondary-300">{stats.activePlayers}</div>
                </div>
              </div>
            </div>
            
            <div className="card p-5 bg-gradient-to-br from-success-500/10 to-success-600/5 border-success-500/20 hover:border-success-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-success-500/20 rounded-xl">
                  <FaCoins className="text-success-400" size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-medium">Total Prize</div>
                  <div className="text-2xl font-extrabold text-success-300">{stats.totalPrize.toFixed(2)} ETH</div>
                </div>
              </div>
            </div>
            
            <div className="card p-5 bg-gradient-to-br from-warning-500/10 to-warning-600/5 border-warning-500/20 hover:border-warning-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-warning-500/20 rounded-xl">
                  <FaTrophy className="text-warning-400" size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-medium">Season</div>
                  <div className="text-2xl font-extrabold text-warning-300">#{stats.season}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <button
              onClick={handleCreateGame}
              className="card p-6 bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20 hover:border-primary-500/40 hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-primary-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <FaGamepad className="text-primary-400" size={24} />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-lg font-bold text-primary-300">Create Game</h3>
                  <p className="text-xs text-gray-400">Start new match</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">Single or Multi-player</div>
            </button>

            <Link
              href="/games"
              className="card p-6 bg-gradient-to-br from-secondary-500/10 to-secondary-600/5 border-secondary-500/20 hover:border-secondary-500/40 hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-secondary-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <FaChartLine className="text-secondary-400" size={24} />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-lg font-bold text-secondary-300">My Games</h3>
                  <p className="text-xs text-gray-400">View history</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">{myGames.length} active</div>
            </Link>

            <Link
              href="/leaderboard"
              className="card p-6 bg-gradient-to-br from-warning-500/10 to-warning-600/5 border-warning-500/20 hover:border-warning-500/40 hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-warning-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <FaCrown className="text-warning-400" size={24} />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-lg font-bold text-warning-300">Leaderboard</h3>
                  <p className="text-xs text-gray-400">Top players</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">Season rankings</div>
            </Link>

            <button
              onClick={handleCreateGame}
              className="card p-6 bg-gradient-to-br from-success-500/10 to-success-600/5 border-success-500/20 hover:border-success-500/40 hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-success-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <FaFire className="text-success-400" size={24} />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-lg font-bold text-success-300">Daily Challenge</h3>
                  <p className="text-xs text-gray-400">Play free</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">VRF-powered</div>
            </button>
          </div>

          {/* My Active Games Section */}
          {isConnected && myGames.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/20 rounded-lg">
                    <FaStar className="text-primary-400" size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-100">My Active Games</h2>
                    <p className="text-gray-400 text-sm mt-1">Games you created or joined</p>
                  </div>
                </div>
                <Link
                  href="/games"
                  className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-2"
                >
                  View All
                  <FaChartLine size={12} />
                </Link>
              </div>
              <GameList games={myGames} showTitle={false} />
            </div>
          )}

          {/* Active Multi-Player Games Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary-500/20 rounded-lg">
                  <FaUsers className="text-secondary-400" size={20} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent tracking-tight">
                    Active Multi-Player Games
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">Join available games and compete for prizes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-5 py-3 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20 shadow-lg">
                  <div className="text-2xl font-extrabold text-primary-400">
                    {activeGames.length}
                  </div>
                  <div className="text-xs text-gray-400 font-medium">
                    {activeGames.length === 1 ? 'game' : 'games'}
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <GameListSkeleton />
            ) : activeGames.length > 0 ? (
              <GameList games={activeGames} showTitle={false} />
            ) : (
              <div className="card text-center py-16 bg-gradient-to-br from-dark-900/50 to-dark-800/50 border-2 border-dashed border-dark-700">
                <div className="text-6xl mb-4">🎮</div>
                <h3 className="text-xl font-bold text-gray-200 mb-2">No active games yet</h3>
                <p className="text-gray-400 text-sm mb-6">Be the first to create a multi-player game!</p>
                <button
                  onClick={handleCreateGame}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <FaGamepad size={16} />
                  Create First Game
                </button>
              </div>
            )}
          </div>

          {/* Mission X Features Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 mb-8">
            <div className="card p-6 bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-500/20 rounded-xl">
                  <FaShieldAlt className="text-primary-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-primary-300">Verifiable Fairness</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                All randomness is powered by Pyth VRF. Verify every outcome on-chain with full transparency and provable fairness.
              </p>
            </div>
            
            <div className="card p-6 bg-gradient-to-br from-secondary-500/10 to-secondary-600/5 border-secondary-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-secondary-500/20 rounded-xl">
                  <FaGift className="text-secondary-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-secondary-300">Free to Play</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Play for free and compete on leaderboards. Optional wagers available for competitive matches with prize pools.
              </p>
            </div>
            
            <div className="card p-6 bg-gradient-to-br from-success-500/10 to-success-600/5 border-success-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-success-500/20 rounded-xl">
                  <FaBolt className="text-success-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-success-300">Commit-Reveal</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Fair PVP matches with commit-reveal mechanism. Single transaction submission for seamless user experience.
              </p>
            </div>
            
            <div className="card p-6 bg-gradient-to-br from-warning-500/10 to-warning-600/5 border-warning-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-warning-500/20 rounded-xl">
                  <FaCalendarAlt className="text-warning-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-warning-300">Season System</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Compete in seasons, climb the leaderboard, and win prizes. New challenges every week with VRF-powered events.
              </p>
            </div>
          </div>

          {/* Referral & Sharing Section */}
          {isConnected && (
            <div className="card p-6 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border-2 border-primary-500/20 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary-500/20 rounded-lg">
                      <FaUserFriends className="text-primary-400" size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-100">Invite Friends & Earn</h3>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Share your games with friends using referral links. Track your invites and grow the community!
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ShareButton 
                    gameId={0} 
                    showFullMenu={true}
                    className=""
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateGame />
    </div>
  )
}

export default FlipMatchPage
