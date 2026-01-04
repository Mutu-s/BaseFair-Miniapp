import { GameStruct, ScoreStruct, GameType } from '@/utils/type.dt'
import React from 'react'
import PlayerAvatar from './PlayerAvatar'
import GameStatusBadge from './GameStatusBadge'
import { FaTrophy, FaCoins, FaUsers } from 'react-icons/fa'

interface ComponentProps {
  game: GameStruct
  scores: ScoreStruct[]
}

const GameResult: React.FC<ComponentProps> = ({ game, scores }) => {
  const getGameTypeLabel = (gameType: GameType) => {
    return gameType === GameType.AI_VS_PLAYER ? 'AI vs Player' : 'Player vs Player'
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-300 bg-clip-text text-transparent mb-2 tracking-tight font-display">
            {game.name || `Game #${game.id}`}
          </h1>
          <p className="text-gray-300 text-lg font-medium tracking-wide">Game Results</p>
        </div>
        <GameStatusBadge status={game.status} />
      </div>

      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20">
            <p className="text-gray-400 text-sm mb-3 flex items-center gap-2 font-medium">
              <FaUsers size={16} className="text-primary-400" />
              Game Type
            </p>
            <p className="text-gray-100 font-bold text-xl">{getGameTypeLabel(game.gameType)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-success-500/10 to-success-600/5 border border-success-500/20">
            <p className="text-gray-400 text-sm mb-3 flex items-center gap-2 font-medium">
              <FaTrophy size={16} className="text-success-400" />
              Total Prize
            </p>
            <p className="text-success-400 font-extrabold text-xl">{game.totalPrize} ETH</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent-500/10 to-accent-600/5 border border-accent-500/20">
            <p className="text-gray-400 text-sm mb-3 flex items-center gap-2 font-medium">
              <FaCoins size={16} className="text-accent-400" />
              Stake
            </p>
            <p className="text-primary-400 font-extrabold text-xl">{game.stake} ETH</p>
          </div>
        </div>

        {game.winner && game.winner !== '0x0000000000000000000000000000000000000000' && (
          <div className="bg-gradient-to-br from-yellow-500/20 via-success-500/20 to-success-600/10 border-2 border-yellow-500/30 rounded-2xl p-6 mb-6 shadow-lg shadow-yellow-500/10">
            <p className="text-gray-300 text-sm mb-4 flex items-center gap-2 font-semibold uppercase tracking-wide">
              <FaTrophy className="text-yellow-400" size={18} />
              🏆 Winner
            </p>
            <div className="flex items-center gap-6">
              <div className="relative">
                <PlayerAvatar address={game.winner} size={64} showAddress />
                <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1.5">
                  <FaTrophy className="text-dark-900" size={16} />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-success-400 font-extrabold text-2xl mb-2">
                  {game.winnerFlipCount} Flips
                </p>
                {game.winnerPrize && (
                  <p className="text-primary-400 font-bold text-xl mb-2">
                    💰 {game.winnerPrize.toFixed(4)} ETH Won
                  </p>
                )}
                <p className="text-gray-400 text-sm">
                  Winner determined by <span className="text-primary-400 font-semibold">Final Score</span> (Flips + VRF modifier). 
                  Lowest Final Score wins! Prize distributed automatically.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-2xl font-extrabold text-gray-100 mb-8 flex items-center gap-3">
          <FaUsers className="text-primary-400" size={24} />
          Player Results
        </h2>
        <div className="space-y-4">
          {scores.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No results yet</p>
            </div>
          ) : (
            [...scores]
              .sort((a, b) => {
                // Sort by: played first, then by finalScore (lower is better), then by flipCount
                if (a.played !== b.played) {
                  return a.played ? -1 : 1
                }
                if (a.played && b.played) {
                  // Use finalScore if available (this is what determines the winner)
                  if (a.finalScore !== undefined && b.finalScore !== undefined) {
                    return a.finalScore - b.finalScore
                  }
                  // Fallback to flipCount if finalScore not available
                  return a.score - b.score
                }
                return 0
              })
              .map((score, index) => {
                const isWinner = game.winner && game.winner !== '0x0000000000000000000000000000000000000000' && game.winner.toLowerCase() === score.player.toLowerCase()
                const isAI = score.player.toLowerCase() === '0x1111111111111111111111111111111111111111'
                return (
                  <div
                    key={score.id}
                    className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-300 ${
                      isWinner
                        ? 'bg-gradient-to-r from-yellow-500/20 via-success-500/20 to-success-600/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
                        : score.played
                        ? 'bg-dark-800/60 border-dark-700/50 hover:border-primary-500/30'
                        : 'bg-dark-900/40 border-dark-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-lg ${
                        isWinner && index === 0 ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-yellow-300 border-2 border-yellow-500/40' :
                        index === 0 && score.played ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-yellow-300 border-2 border-yellow-500/40' :
                        index === 1 && score.played ? 'bg-gradient-to-br from-gray-400/30 to-gray-500/20 text-gray-300 border-2 border-gray-400/40' :
                        index === 2 && score.played ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-orange-300 border-2 border-orange-500/40' :
                        'bg-dark-700/50 text-gray-500 border-2 border-dark-700'
                      }`}>
                        {score.played ? `#${index + 1}` : '⏳'}
                      </div>
                      <div>
                        <PlayerAvatar address={score.player} size={48} showAddress />
                        {isAI && (
                          <p className="text-xs text-gray-500 mt-1 font-medium">🤖 AI Player</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {score.played ? (
                        <>
                          <p className="text-gray-100 font-extrabold text-xl mb-1">Flips: {score.score}</p>
                          {score.finalScore !== undefined && score.finalScore > 0 && (
                            <p className="text-gray-400 text-sm mb-1">
                              Final Score: <span className="text-primary-400 font-semibold">{score.finalScore}</span>
                              <span className="text-gray-500 text-xs ml-2">(Flips + VRF modifier)</span>
                            </p>
                          )}
                          {isWinner && game.status === 2 && (
                            <p className="text-success-400 text-sm font-bold flex items-center justify-end gap-2 mt-2 px-3 py-1 rounded-full bg-success-500/10 border border-success-500/30">
                              <FaTrophy size={14} />
                              Winner! {score.finalScore !== undefined && `(Lowest Final Score: ${score.finalScore})`}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 text-sm font-medium">⏳ Waiting...</p>
                      )}
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </div>
    </div>
  )
}

export default GameResult
