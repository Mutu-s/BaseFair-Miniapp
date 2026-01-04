import React, { useEffect, useState } from 'react'
import { getActiveGames } from '@/services/blockchain'
import { GameStruct, GameType } from '@/utils/type.dt'
import { FaGamepad, FaUsers, FaCoins, FaChartLine, FaTrophy } from 'react-icons/fa'

interface AnalyticsData {
  totalGames: number
  activeGames: number
  completedGames: number
  totalPlayers: number
  totalVolume: number
  totalPrizes: number
  aiGames: number
  pvpGames: number
  averageStake: number
  topWinner: {
    address: string
    wins: number
    earnings: number
  } | null
}

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalGames: 0,
    activeGames: 0,
    completedGames: 0,
    totalPlayers: 0,
    totalVolume: 0,
    totalPrizes: 0,
    aiGames: 0,
    pvpGames: 0,
    averageStake: 0,
    topWinner: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const games = await getActiveGames()
        const allGames = games // In production, fetch all games including completed

        const stats: AnalyticsData = {
          totalGames: allGames.length,
          activeGames: allGames.filter((g) => g.status === 0 || g.status === 1).length,
          completedGames: allGames.filter((g) => g.status === 2).length,
          totalPlayers: 0,
          totalVolume: 0,
          totalPrizes: 0,
          aiGames: 0,
          pvpGames: 0,
          averageStake: 0,
          topWinner: null,
        }

        const playerSet = new Set<string>()
        const winnerStats = new Map<string, { wins: number; earnings: number }>()

        allGames.forEach((game) => {
          // Count players
          if (game.players) {
            game.players.forEach((p) => playerSet.add(p.toLowerCase()))
          }

          // Count volume
          stats.totalVolume += game.totalPrize || 0

          // Count game types
          if (game.gameType === GameType.AI_VS_PLAYER) {
            stats.aiGames++
          } else {
            stats.pvpGames++
          }

          // Count prizes
          if (game.status === 2 && game.winner && game.winner !== '0x0000000000000000000000000000000000000000') {
            const winnerPrize = game.winnerPrize || (game.gameType === GameType.AI_VS_PLAYER ? game.stake : game.totalPrize * 0.9)
            stats.totalPrizes += winnerPrize
            const winner = game.winner?.toLowerCase()
            if (winner) {
              const existing = winnerStats.get(winner) || { wins: 0, earnings: 0 }
              existing.wins++
              existing.earnings += winnerPrize
              winnerStats.set(winner, existing)
            }
          }
        })

        stats.totalPlayers = playerSet.size
        stats.averageStake =
          allGames.length > 0
            ? allGames.reduce((sum, g) => sum + (g.stake || 0), 0) / allGames.length
            : 0

        // Find top winner
        if (winnerStats.size > 0) {
          const topWinner = Array.from(winnerStats.entries())
            .sort((a, b) => b[1].wins - a[1].wins)[0]
          stats.topWinner = {
            address: topWinner[0],
            wins: topWinner[1].wins,
            earnings: topWinner[1].earnings,
          }
        }

        setAnalytics(stats)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const StatCard: React.FC<{
    icon: React.ReactNode
    label: string
    value: string | number
    trend?: string
  }> = ({ icon, label, value, trend }) => (
    <div className="card group hover:scale-105 transition-transform">
      <div className="flex items-center justify-between mb-2">
        <div className="p-3 bg-primary-500/10 rounded-lg text-primary-400">{icon}</div>
        {trend && (
          <span className="text-xs px-2 py-1 bg-success-500/10 text-success-400 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="text-xl md:text-2xl font-bold text-gray-100 mb-1 tracking-tight">{value}</div>
      <div className="text-xs md:text-sm text-gray-300 font-medium tracking-wide">{label}</div>
    </div>
  )

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-8 bg-dark-800 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-dark-800 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-300 bg-clip-text text-transparent mb-4 tracking-tight font-display">Platform Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FaGamepad size={20} />}
            label="Total Games"
            value={analytics.totalGames}
          />
          <StatCard
            icon={<FaUsers size={20} />}
            label="Total Players"
            value={analytics.totalPlayers}
          />
          <StatCard
            icon={<FaCoins size={20} />}
            label="Total Volume"
            value={`${analytics.totalVolume.toFixed(2)} MON`}
          />
          <StatCard
            icon={<FaChartLine size={20} />}
            label="Active Games"
            value={analytics.activeGames}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
            <FaChartLine className="text-primary-400" />
            Game Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-dark-800/60">
              <span className="text-gray-300 font-medium tracking-wide">Completed Games</span>
              <span className="font-bold text-gray-100 tracking-tight">{analytics.completedGames}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dark-800/60">
              <span className="text-gray-300 font-medium tracking-wide">AI vs Player</span>
              <span className="font-bold text-gray-100 tracking-tight">{analytics.aiGames}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dark-800/60">
              <span className="text-gray-300 font-medium tracking-wide">Player vs Player</span>
              <span className="font-bold text-gray-100 tracking-tight">{analytics.pvpGames}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300 font-medium tracking-wide">Average Stake</span>
              <span className="font-bold text-primary-300 tracking-tight">
                {analytics.averageStake.toFixed(4)} MON
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
            <FaTrophy className="text-yellow-400" />
            Top Performer
          </h3>
          {analytics.topWinner ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-sm text-gray-300 mb-2 font-semibold tracking-wide">Top Winner</div>
                <div className="font-mono text-sm text-gray-200 mb-3 break-all tracking-wide">
                  {analytics.topWinner.address}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1 font-medium">Wins</div>
                    <div className="text-base md:text-lg font-bold text-yellow-300 tracking-tight">
                      {analytics.topWinner.wins}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1 font-medium">Earnings</div>
                    <div className="text-base md:text-lg font-bold text-primary-300 tracking-tight">
                      {analytics.topWinner.earnings.toFixed(4)} MON
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No winners yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Financial Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-800/60 rounded-lg border border-dark-700/70">
            <div className="text-sm text-gray-300 mb-1 font-semibold tracking-wide">Total Volume</div>
            <div className="text-xl md:text-2xl font-bold text-primary-300 tracking-tight">
              {analytics.totalVolume.toFixed(4)} MON
            </div>
          </div>
          <div className="p-4 bg-dark-800/60 rounded-lg border border-dark-700/70">
            <div className="text-sm text-gray-300 mb-1 font-semibold tracking-wide">Total Prizes Distributed</div>
            <div className="text-xl md:text-2xl font-bold text-success-300 tracking-tight">
              {analytics.totalPrizes.toFixed(4)} MON
            </div>
          </div>
          <div className="p-4 bg-dark-800/60 rounded-lg border border-dark-700/70">
            <div className="text-sm text-gray-300 mb-1 font-semibold tracking-wide">Platform Revenue</div>
            <div className="text-xl md:text-2xl font-bold text-accent-300 tracking-tight">
              {(analytics.totalVolume - analytics.totalPrizes).toFixed(4)} MON
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics

