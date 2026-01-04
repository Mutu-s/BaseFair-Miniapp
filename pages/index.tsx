import { globalActions } from '@/store/globalSlices'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useDispatch } from 'react-redux'
import CreateGame from '@/components/CreateGame'
import { useFrame } from '@/services/frameProvider'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const Page: NextPage = () => {
  const dispatch = useDispatch()
  const { isInFrame } = useFrame()
  const { isConnected } = useAccount()

  const quickActions = [
    {
      icon: '🎮',
      title: 'FlipMatch',
      description: 'Memory card game',
      href: '/flip-match',
      gradient: 'from-[#0052FF] to-[#0066FF]',
      shadowColor: 'shadow-[#0052FF]/30'
    },
    {
      icon: '🎰',
      title: 'Casino',
      description: 'Dice, Slots, Plinko',
      href: '/casino',
      gradient: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/30'
    },
    {
      icon: '💰',
      title: 'Jackpot',
      description: 'Big prizes',
      href: '/jackpot',
      gradient: 'from-yellow-500 to-orange-500',
      shadowColor: 'shadow-yellow-500/30'
    },
    {
      icon: '📊',
      title: 'My Games',
      description: 'History & stats',
      href: '/games',
      gradient: 'from-green-500 to-emerald-500',
      shadowColor: 'shadow-green-500/30'
    },
  ]

  const casinoGames = [
    { icon: '🎲', name: 'Dice', href: '/casino?game=dice' },
    { icon: '🪙', name: 'Coin Flip', href: '/casino?game=coinflip' },
    { icon: '📊', name: 'Plinko', href: '/casino?game=plinko' },
    { icon: '🎰', name: 'Slots', href: '/casino?game=slots' },
    { icon: '📈', name: 'Crash', href: '/casino?game=crash' },
  ]

  return (
    <div className={`min-h-screen ${isInFrame ? 'pb-4' : 'pb-24'}`}>
      <Head>
        <title>BaseFair - Fair Gaming on Base</title>
        <meta name="description" content="Verifiably fair gaming on Base blockchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section - Compact for Mini App */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/20 via-transparent to-purple-500/10" />
        
        <div className="relative px-4 pt-6 pb-8">
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0052FF] to-[#0066FF] shadow-xl shadow-[#0052FF]/40 mb-3">
              <span className="text-3xl">🎮</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">BaseFair</h1>
            <p className="text-sm text-gray-400">Verifiably Fair Gaming</p>
          </div>

          {/* Connect Wallet Button - Only show if not connected */}
          {!isConnected && (
            <div className="flex justify-center mb-6">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="px-8 py-3 bg-gradient-to-r from-[#0052FF] to-[#0066FF] text-white font-bold rounded-xl shadow-lg shadow-[#0052FF]/40 hover:shadow-xl hover:shadow-[#0052FF]/50 transition-all duration-300 active:scale-95"
                  >
                    🔗 Connect Wallet
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          )}

          {/* Create Game Button - Big & Prominent */}
          {isConnected && (
            <button
              onClick={() => dispatch(globalActions.setCreateModal('scale-100'))}
              className="w-full py-4 bg-gradient-to-r from-[#0052FF] to-[#0066FF] text-white font-bold text-lg rounded-2xl shadow-xl shadow-[#0052FF]/40 hover:shadow-2xl hover:shadow-[#0052FF]/50 transition-all duration-300 active:scale-[0.98] mb-6 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">➕</span>
              <span>Create New Game</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Play</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${action.gradient} ${action.shadowColor} shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.97]`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="text-3xl mb-2 block">{action.icon}</span>
              <h3 className="text-white font-bold text-base">{action.title}</h3>
              <p className="text-white/70 text-xs">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Casino Games - Horizontal Scroll */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Casino Games</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {casinoGames.map((game) => (
            <Link
              key={game.name}
              href={game.href}
              className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 bg-dark-800/80 rounded-2xl border border-dark-700/50 hover:border-[#0052FF]/50 hover:bg-dark-700/80 transition-all duration-200 active:scale-95"
            >
              <span className="text-2xl mb-1">{game.icon}</span>
              <span className="text-xs text-gray-300 font-medium">{game.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Active Games Preview */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Active Games</h2>
          <Link href="/active-games" className="text-xs text-[#0052FF] font-medium">
            View All →
          </Link>
        </div>
        <div className="bg-dark-800/60 rounded-2xl border border-dark-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0052FF]/20 to-purple-500/20 flex items-center justify-center">
                <span className="text-lg">🎮</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Join multiplayer games</p>
                <p className="text-gray-400 text-xs">Compete with other players</p>
              </div>
            </div>
            <Link
              href="/active-games"
              className="px-4 py-2 bg-[#0052FF]/20 text-[#0052FF] rounded-xl text-sm font-medium hover:bg-[#0052FF]/30 transition-colors"
            >
              Browse
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-800/60 rounded-xl p-3 text-center border border-dark-700/50">
            <p className="text-lg font-bold text-white">🔥</p>
            <p className="text-xs text-gray-400 mt-1">Live Now</p>
          </div>
          <div className="bg-dark-800/60 rounded-xl p-3 text-center border border-dark-700/50">
            <p className="text-lg font-bold text-[#0052FF]">VRF</p>
            <p className="text-xs text-gray-400 mt-1">Provably Fair</p>
          </div>
          <div className="bg-dark-800/60 rounded-xl p-3 text-center border border-dark-700/50">
            <p className="text-lg font-bold text-white">⚡</p>
            <p className="text-xs text-gray-400 mt-1">Base Chain</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Link */}
      <div className="px-4">
        <Link
          href="/leaderboard"
          className="flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-4 border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-white font-medium">Leaderboard</p>
              <p className="text-gray-400 text-xs">Top players this week</p>
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </div>

      <CreateGame />
    </div>
  )
}

export default Page
