import React, { useEffect, useState } from 'react'
import { getAllGames, getGame } from '@/services/blockchain'
import { GameStruct, GameType } from '@/utils/type.dt'
import PlayerAvatar from './PlayerAvatar'
import { FaTrophy, FaMedal, FaAward } from 'react-icons/fa'
import { getNickname, formatAddress } from '@/services/nickname'

interface LeaderboardEntry {
  address: string
  gamesPlayed: number
  gamesWon: number
  totalEarnings: number
  bestFlipCount: number
  winRate: number
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all')

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        let games: GameStruct[] = []
        try {
          games = await getAllGames()
        } catch (error: any) {
          console.error('Error fetching all games:', error)
          // Try to get active games as fallback
          try {
            const { getActiveGames } = await import('@/services/blockchain')
            games = await getActiveGames()
          } catch (fallbackError) {
            console.error('Error fetching active games:', fallbackError)
            setLeaderboard([])
            setLoading(false)
            return
          }
        }
        
        const completedGames = games.filter((g) => g.status === 2) // COMPLETED

        // Aggregate player stats
        const playerStats = new Map<string, LeaderboardEntry>()

        for (const game of completedGames) {
          if (game.winner && game.winner !== '0x0000000000000000000000000000000000000000') {
            const winner = game.winner.toLowerCase()
            const existing = playerStats.get(winner) || {
              address: winner,
              gamesPlayed: 0,
              gamesWon: 0,
              totalEarnings: 0,
              bestFlipCount: Infinity,
              winRate: 0,
            }

            existing.gamesPlayed++
            existing.gamesWon++
            // Calculate winner prize
            const winnerPrize = game.winnerPrize || 
              (game.gameType === GameType.AI_VS_PLAYER 
                ? game.stake 
                : game.totalPrize * 0.9) // PvP: 90% after 10% commission
            existing.totalEarnings += winnerPrize
            if (game.winnerFlipCount < existing.bestFlipCount) {
              existing.bestFlipCount = game.winnerFlipCount
            }

            playerStats.set(winner, existing)
          }

          // Count all players who participated
          if (game.players && game.players.length > 0) {
            game.players.forEach((player) => {
              const addr = player.toLowerCase()
              if (addr !== game.winner?.toLowerCase()) {
                const existing = playerStats.get(addr) || {
                  address: addr,
                  gamesPlayed: 0,
                  gamesWon: 0,
                  totalEarnings: 0,
                  bestFlipCount: Infinity,
                  winRate: 0,
                }
                existing.gamesPlayed++
                playerStats.set(addr, existing)
              }
            })
          } else {
            // Fallback: try to get players from contract
            try {
              const { getGamePlayers } = await import('@/services/blockchain')
              const players = await getGamePlayers(game.id)
              players.forEach((player) => {
                const addr = player.toLowerCase()
                if (addr !== game.winner?.toLowerCase()) {
                  const existing = playerStats.get(addr) || {
                    address: addr,
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalEarnings: 0,
                    bestFlipCount: Infinity,
                    winRate: 0,
                  }
                  existing.gamesPlayed++
                  playerStats.set(addr, existing)
                }
              })
            } catch (error) {
              console.warn('Could not fetch game players:', error)
            }
          }
        }

        // AI address constant
        const AI_ADDRESS = '0x1111111111111111111111111111111111111111'

        // Calculate win rates and filter out AI player
        const entries = Array.from(playerStats.values())
          .filter((entry) => entry.address.toLowerCase() !== AI_ADDRESS.toLowerCase()) // Filter out AI
          .map((entry) => ({
            ...entry,
            winRate: entry.gamesPlayed > 0 ? (entry.gamesWon / entry.gamesPlayed) * 100 : 0,
            bestFlipCount: entry.bestFlipCount === Infinity ? 0 : entry.bestFlipCount,
          }))

        // Sort by games won, then by win rate
        entries.sort((a, b) => {
          if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon
          return b.winRate - a.winRate
        })

        setLeaderboard(entries.slice(0, 100)) // Top 100
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [timeframe])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <FaTrophy className="text-yellow-400" />
    if (rank === 2) return <FaMedal className="text-gray-300" />
    if (rank === 3) return <FaAward className="text-orange-400" />
    return null
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30'
    if (rank === 2) return 'from-gray-400/20 to-gray-500/10 border-gray-400/30'
    if (rank === 3) return 'from-orange-500/20 to-orange-600/10 border-orange-500/30'
    return 'from-dark-800 to-dark-900 border-dark-700'
  }

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-8 bg-dark-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-dark-800 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-2 tracking-tight">Leaderboard</h2>
          <p className="text-gray-300 text-xs md:text-sm font-medium tracking-wide">Top players and their achievements</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'week', 'month'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 ${
                timeframe === tf
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-dark-800/60 text-gray-400 hover:text-gray-200 hover:bg-dark-700/60 border border-dark-700/50'
              }`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-gray-300 text-base md:text-lg mb-2 font-bold">No players yet</p>
          <p className="text-gray-500 text-xs md:text-sm">Be the first to play and appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((entry, index) => {
            const rank = index + 1
            return (
              <div
                key={entry.address}
                className={`bg-gradient-to-r ${getRankColor(rank)} border-2 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5 flex-1">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl font-extrabold text-xl shadow-lg ${
                      rank === 1 ? 'bg-yellow-500/30 border-2 border-yellow-500/50 text-yellow-300' :
                      rank === 2 ? 'bg-gray-400/30 border-2 border-gray-400/50 text-gray-300' :
                      rank === 3 ? 'bg-orange-500/30 border-2 border-orange-500/50 text-orange-300' :
                      'bg-dark-800/50 border-2 border-dark-700/50 text-gray-400'
                    }`}>
                      {getRankIcon(rank) || (
                        <span>#{rank}</span>
                      )}
                    </div>
                    <PlayerAvatar address={entry.address} size={48} showAddress />
                    <div className="flex-1">
                      <div className="mb-2">
                        <div className="text-base md:text-lg font-bold text-gray-100 tracking-tight">
                          {getNickname(entry.address) || formatAddress(entry.address)}
                        </div>
                        <div className="text-[10px] md:text-xs text-gray-400 font-mono tracking-wide">
                          {formatAddress(entry.address, true)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm">
                        <span className="px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 font-bold">
                          🏆 {entry.gamesWon} wins
                        </span>
                        <span className="px-3 py-1.5 rounded-lg bg-dark-800/50 border border-dark-700/50 text-gray-300 font-semibold">
                          🎮 {entry.gamesPlayed} games
                        </span>
                        <span className="px-3 py-1.5 rounded-lg bg-success-500/10 border border-success-500/20 text-success-400 font-bold">
                          📊 {entry.winRate.toFixed(1)}%
                        </span>
                        {entry.bestFlipCount > 0 && (
                          <span className="px-3 py-1.5 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400 font-semibold">
                            ⚡ {entry.bestFlipCount} flips
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-1">
                      {entry.totalEarnings.toFixed(4)} ETH
                    </div>
                    <div className="text-xs text-gray-400 font-medium">Total Earnings</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Leaderboard

