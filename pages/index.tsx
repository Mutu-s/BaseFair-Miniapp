import { globalActions } from '@/store/globalSlices'
import { GameStruct, RootState, GameStatus, GameType } from '@/utils/type.dt'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CreateGame from '@/components/CreateGame'
import { useFrame } from '@/services/frameProvider'
import { useAccount, useChainId } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { getActiveGames, getMyGames } from '@/services/blockchain'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'

const Page: NextPage = () => {
  const dispatch = useDispatch()
  const { setGames, setLoading } = globalActions
  const { games, loading } = useSelector((states: RootState) => states.globalStates)
  const { isInFrame } = useFrame()
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const [myGamesCount, setMyGamesCount] = useState(0)
  const [activeGamesCount, setActiveGamesCount] = useState(0)

  // Fetch games
  useEffect(() => {
    const fetchGames = async () => {
      if (chainId !== BASE_MAINNET_CHAIN_ID) return
      
      dispatch(setLoading(true))
      try {
        const allGames = await getActiveGames(chainId)
        const pvpGames = allGames.filter(g => g.gameType === GameType.PLAYER_VS_PLAYER)
        setActiveGamesCount(pvpGames.length)
        dispatch(setGames(pvpGames))

        if (isConnected && address) {
          const myGames = await getMyGames(address, chainId)
          const myActive = myGames.filter(g => 
            g.status === GameStatus.CREATED || 
            g.status === GameStatus.IN_PROGRESS || 
            g.status === GameStatus.WAITING_VRF
          )
          setMyGamesCount(myActive.length)
        }
      } catch (error) {
        console.error('Error fetching games:', error)
      } finally {
        dispatch(setLoading(false))
      }
    }

    fetchGames()
  }, [chainId, isConnected, address, dispatch, setGames, setLoading])

  return (
    <div className={`min-h-screen ${isInFrame ? 'pb-4' : 'pb-24'}`}>
      <Head>
        <title>BaseFair - FlipMatch on Base</title>
        <meta name="description" content="Play FlipMatch - verifiably fair memory card game on Base blockchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/30 via-transparent to-purple-600/20" />
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-10" />
        
        <div className="relative px-4 pt-8 pb-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0052FF] to-[#3B82F6] shadow-2xl shadow-[#0052FF]/50 mb-4 animate-pulse">
              <span className="text-4xl">🎴</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">FlipMatch</h1>
            <p className="text-gray-400 text-sm">Memory Card Game on Base</p>
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">VRF Powered • Provably Fair</span>
            </div>
          </div>

          {/* Connect or Create */}
          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="px-10 py-4 bg-gradient-to-r from-[#0052FF] to-[#3B82F6] text-white font-bold text-lg rounded-2xl shadow-xl shadow-[#0052FF]/40 hover:shadow-2xl hover:shadow-[#0052FF]/60 transition-all duration-300 active:scale-95"
                  >
                    🔗 Connect to Play
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main CTA */}
              <button
                onClick={() => dispatch(globalActions.setCreateModal('scale-100'))}
                className="w-full py-5 bg-gradient-to-r from-[#0052FF] via-[#3B82F6] to-[#0052FF] text-white font-bold text-xl rounded-2xl shadow-xl shadow-[#0052FF]/40 hover:shadow-2xl hover:shadow-[#0052FF]/60 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 bg-[length:200%_100%] animate-gradient"
              >
                <span className="text-2xl">🎮</span>
                <span>New Game</span>
              </button>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  href="/games"
                  className="bg-dark-800/80 rounded-2xl p-4 border border-dark-700/50 hover:border-[#0052FF]/50 transition-all group"
                >
                  <div className="text-3xl font-black text-white group-hover:text-[#0052FF] transition-colors">
                    {myGamesCount}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">My Active Games</div>
                </Link>
                <Link 
                  href="/active-games"
                  className="bg-dark-800/80 rounded-2xl p-4 border border-dark-700/50 hover:border-[#0052FF]/50 transition-all group"
                >
                  <div className="text-3xl font-black text-white group-hover:text-[#0052FF] transition-colors">
                    {activeGamesCount}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Games to Join</div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Modes */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Game Modes</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (isConnected) dispatch(globalActions.setCreateModal('scale-100'))
            }}
            className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#0052FF] to-[#1E40AF] shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <span className="text-4xl mb-3 block">🤖</span>
            <h3 className="text-white font-bold text-lg">vs AI</h3>
            <p className="text-white/60 text-xs mt-1">Solo Challenge</p>
          </button>
          
          <button
            onClick={() => {
              if (isConnected) dispatch(globalActions.setCreateModal('scale-100'))
            }}
            className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <span className="text-4xl mb-3 block">👥</span>
            <h3 className="text-white font-bold text-lg">Multiplayer</h3>
            <p className="text-white/60 text-xs mt-1">Compete with others</p>
          </button>
        </div>
      </div>

      {/* How to Play */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">How to Play</h2>
        <div className="bg-dark-800/60 rounded-2xl p-4 border border-dark-700/50 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0052FF]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#0052FF]">1</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Create or Join a Game</p>
              <p className="text-gray-500 text-xs">Set your stake and wait for opponents</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0052FF]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#0052FF]">2</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Match the Cards</p>
              <p className="text-gray-500 text-xs">Flip cards to find matching pairs</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0052FF]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#0052FF]">3</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">Lowest Flips Wins</p>
              <p className="text-gray-500 text-xs">VRF ensures fair randomness</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Games Preview */}
      {activeGamesCount > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Join a Game</h2>
            <Link href="/active-games" className="text-xs text-[#0052FF] font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-2">
            {games.slice(0, 3).map((game) => (
              <Link
                key={game.id}
                href={`/gameplay/${game.id}`}
                className="flex items-center justify-between bg-dark-800/60 rounded-xl p-3 border border-dark-700/50 hover:border-[#0052FF]/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0052FF]/20 to-purple-500/20 flex items-center justify-center">
                    <span>🎴</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{game.name || `Game #${game.id}`}</p>
                    <p className="text-gray-500 text-xs">{game.currentPlayers}/{game.maxPlayers} players</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#0052FF] font-bold text-sm">{game.stake} ETH</p>
                  <p className="text-gray-500 text-xs">Stake</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Link */}
      <div className="px-4">
        <Link
          href="/leaderboard"
          className="flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-4 border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-white font-bold">Leaderboard</p>
              <p className="text-gray-400 text-xs">Top FlipMatch players</p>
            </div>
          </div>
          <span className="text-gray-400 text-xl">→</span>
        </Link>
      </div>

      <CreateGame />
    </div>
  )
}

export default Page
