import { globalActions } from '@/store/globalSlices'
import { GameStruct, RootState, GameType, GameStatus } from '@/utils/type.dt'
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import GameStatusBadge from './GameStatusBadge'
import PlayerAvatar from './PlayerAvatar'
import ShareButton from './ShareButton'
import Link from 'next/link'
import { truncate, createSlug } from '@/utils/helper'
import { FaUsers, FaCoins, FaTrophy, FaClock, FaLock, FaUnlock, FaFire, FaGift } from 'react-icons/fa'

interface GameListProps {
  games: GameStruct[]
  showTitle?: boolean
}

const GameList: React.FC<GameListProps> = ({ games, showTitle = true }) => {
  const dispatch = useDispatch()
  const { setGame } = globalActions
  const { game } = useSelector((states: RootState) => states.globalStates)

  const handleGameClick = (selectedGame: GameStruct) => {
    dispatch(setGame(selectedGame))
  }

  const getGameTypeLabel = (gameType: GameType) => {
    return gameType === GameType.AI_VS_PLAYER ? 'AI vs Player' : 'Player vs Player'
  }

  const getPlayModeLabel = (playMode?: number) => {
    if (playMode === 0) return 'Free Play'
    if (playMode === 1) return 'Wagered'
    return 'Unknown'
  }

  // Component to display remaining time
  const RemainingTime: React.FC<{ game: GameStruct }> = ({ game }) => {
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [isExpired, setIsExpired] = useState(false)

    useEffect(() => {
      if (!game.endTime || game.endTime === 0) {
        setTimeLeft('')
        return
      }

      const updateTime = () => {
        const now = Math.floor(Date.now() / 1000)
        const endTime = game.endTime
        const remaining = endTime - now

        if (remaining <= 0) {
          setTimeLeft('Expired')
          setIsExpired(true)
          return
        }

        const days = Math.floor(remaining / 86400)
        const hours = Math.floor((remaining % 86400) / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)
        const seconds = remaining % 60

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`)
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`)
        } else {
          setTimeLeft(`${seconds}s`)
        }
        setIsExpired(false)
      }

      updateTime()
      const interval = setInterval(updateTime, 1000)

      return () => clearInterval(interval)
    }, [game.endTime])

    if (!game.endTime || game.endTime === 0 || timeLeft === '') {
      return null
    }

    return (
      <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
        isExpired 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-gradient-to-r from-warning-500/15 to-warning-600/10 border-warning-500/30'
      }`}>
        <span className="text-gray-300 flex items-center gap-2 text-xs font-semibold">
          <FaClock size={12} className={isExpired ? 'text-red-400' : 'text-warning-400'} />
          {isExpired ? 'Expired' : 'Time Left'}
        </span>
        <span className={`font-bold text-sm tracking-tight ${
          isExpired ? 'text-red-400' : 'text-warning-300'
        }`}>
          {timeLeft}
        </span>
      </div>
    )
  }

  return (
    <section className={showTitle ? "py-16 px-4" : "py-4"}>
      <div className={showTitle ? "lg:w-4/5 w-full mx-auto" : "w-full mx-auto"}>
        {showTitle && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-2 tracking-tight">
                Active Games
              </h2>
              <p className="text-gray-300 text-xs md:text-sm font-medium tracking-wide">
                Join available multi-player games
              </p>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20 shadow-lg">
              <div className="text-2xl font-extrabold text-primary-400">
                {games.length}
              </div>
              <div className="text-xs text-gray-400 font-medium">
                {games.length === 1 ? 'game' : 'games'}
              </div>
            </div>
          </div>
        )}
        
        {games.length === 0 ? (
          <div className="card text-center py-16 bg-gradient-to-br from-dark-900/50 to-dark-800/50">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-gray-300 text-xl mb-2 font-semibold">No active games yet</p>
            <p className="text-gray-500 text-sm">Be the first to create a game!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {games.map((gameItem) => {
              const isFull = gameItem.currentPlayers >= gameItem.maxPlayers
              const isFree = gameItem.playMode === 0
              const isCompleted = gameItem.status === GameStatus.COMPLETED || gameItem.status === GameStatus.TIED
              
              return (
                <div
                  key={gameItem.id}
                  className={`card group transition-all duration-300 ${
                    isCompleted
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-primary-500/10 cursor-pointer border-2 hover:border-primary-500/40'
                  }`}
                  onClick={() => {
                    if (!isCompleted) {
                      handleGameClick(gameItem)
                    }
                  }}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-dark-700/60">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="text-lg md:text-xl font-extrabold text-gray-100 truncate">
                          {gameItem.name || `Game #${gameItem.id}`}
                        </h4>
                        {isFree && (
                          <span className="px-2 py-0.5 rounded-full bg-success-500/20 border border-success-500/30 text-xs font-bold text-success-300 flex-shrink-0 flex items-center gap-1">
                            <FaGift size={10} />
                            FREE
                          </span>
                        )}
                        {isFull && !isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-warning-500/20 border border-warning-500/30 text-xs font-bold text-warning-300 flex-shrink-0 flex items-center gap-1">
                            <FaLock size={10} />
                            FULL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <GameStatusBadge status={gameItem.status} />
                        {gameItem.gameType === GameType.PLAYER_VS_PLAYER && (
                          <span className="px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-xs font-bold text-primary-300 flex items-center gap-1">
                            <FaUsers size={10} />
                            PVP
                          </span>
                        )}
                      </div>
                    </div>
                    <ShareButton gameId={gameItem.id} game={gameItem} showFullMenu={true} className="flex-shrink-0" />
                  </div>

                  {/* Game Info Grid */}
                  <div className="space-y-3 mb-4">
                    {/* Game Type */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-800/60 border border-dark-700/60">
                      <span className="text-gray-400 flex items-center gap-2 text-xs font-semibold">
                        <FaUsers size={14} className="text-primary-400" />
                        Type
                      </span>
                      <span className="text-gray-100 font-bold text-sm">{getGameTypeLabel(gameItem.gameType)}</span>
                    </div>

                    {/* Stake/Prize */}
                    {!isFree && (
                      <>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-primary-500/15 to-primary-600/10 border border-primary-500/30">
                          <span className="text-gray-400 flex items-center gap-2 text-xs font-semibold">
                            <FaCoins size={14} className="text-primary-400" />
                            Stake
                          </span>
                          <span className="text-primary-300 font-extrabold text-sm">{gameItem.stake} MON</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-success-500/15 to-success-600/10 border border-success-500/30">
                          <span className="text-gray-400 flex items-center gap-2 text-xs font-semibold">
                            <FaTrophy size={14} className="text-success-400" />
                            Prize
                          </span>
                          <span className="text-success-300 font-extrabold text-sm">{gameItem.totalPrize} MON</span>
                        </div>
                      </>
                    )}

                    {isFree && gameItem.totalPrize > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-success-500/15 to-success-600/10 border border-success-500/30">
                        <span className="text-gray-400 flex items-center gap-2 text-xs font-semibold">
                          <FaGift size={14} className="text-success-400" />
                          Prize Pool
                        </span>
                        <span className="text-success-300 font-extrabold text-sm">{gameItem.totalPrize} MON</span>
                      </div>
                    )}

                    {/* Players Count */}
                    {gameItem.gameType !== GameType.AI_VS_PLAYER && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-800/60 border border-dark-700/60">
                        <span className="text-gray-400 text-xs font-semibold">Players</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${
                            isFull ? 'text-warning-400' : 'text-gray-100'
                          }`}>
                            {gameItem.currentPlayers}/{gameItem.maxPlayers}
                          </span>
                          {isFull && (
                            <FaLock size={12} className="text-warning-400" />
                          )}
                          {!isFull && (
                            <FaUnlock size={12} className="text-success-400" />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Remaining Time */}
                    {gameItem.gameType === GameType.PLAYER_VS_PLAYER && 
                     !isCompleted && (
                      <RemainingTime game={gameItem} />
                    )}
                  </div>

                  {/* Players List */}
                  {gameItem.gameType !== GameType.AI_VS_PLAYER && (
                    <div className="mb-4 pt-4 border-t border-dark-800/60">
                      <p className="text-xs text-gray-400 mb-2 font-medium">Players</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <PlayerAvatar
                          address={gameItem.creator}
                          size={28}
                          showAddress={false}
                        />
                        {gameItem.currentPlayers > 1 && (
                          <span className="text-xs text-gray-400 font-medium">
                            +{gameItem.currentPlayers - 1} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!isCompleted && (
                    <div className="flex gap-2">
                      <Link
                        href={`/gameplay/${createSlug(gameItem.name || `Game #${gameItem.id}`, gameItem.id)}-${gameItem.id}`}
                        className="flex-1 btn-primary text-center text-sm py-2.5 font-bold flex items-center justify-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {gameItem.gameType === GameType.PLAYER_VS_PLAYER 
                          ? (isFull ? (
                            <>
                              <FaTrophy size={14} />
                              View
                            </>
                          ) : (
                            <>
                              <FaUsers size={14} />
                              Join Game
                            </>
                          ))
                          : (gameItem.status === GameStatus.CREATED ? 'Join' : 'View')}
                      </Link>
                    </div>
                  )}

                  {/* Completed State */}
                  {isCompleted && (
                    <Link
                      href={`/results/${createSlug(gameItem.name || `Game #${gameItem.id}`, gameItem.id)}-${gameItem.id}`}
                      className="btn-primary text-center text-sm py-2.5 font-bold flex items-center justify-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaTrophy size={14} />
                      View Results
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default GameList
