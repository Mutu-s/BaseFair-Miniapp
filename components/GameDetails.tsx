import { globalActions } from '@/store/globalSlices'
import { RootState, GameType } from '@/utils/type.dt'
import React from 'react'
import { FaTimes } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import GameStatusBadge from './GameStatusBadge'
import PlayerAvatar from './PlayerAvatar'
import { FaUsers, FaCoins, FaTrophy, FaCheckCircle } from 'react-icons/fa'

const GameDetails: React.FC = () => {
  const dispatch = useDispatch()
  const { setResultModal } = globalActions
  const { game, resultModal } = useSelector((states: RootState) => states.globalStates)

  const closeModal = () => {
    dispatch(setResultModal('scale-0'))
  }

  const getGameTypeLabel = (gameType: GameType) => {
    return gameType === GameType.AI_VS_PLAYER ? 'AI vs Player' : 'Player vs Player'
  }

  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
    bg-black/60 backdrop-blur-sm transform z-50 transition-transform duration-300 ${resultModal}`}
      onClick={closeModal}
    >
      {game && (
        <div 
          className="card w-11/12 md:w-2/5 max-h-[90vh] overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">
                {game.name || `Game #${game.id}`} - {getGameTypeLabel(game.gameType)}
              </h2>
              <button 
                onClick={closeModal} 
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="w-full">
                <GameStatusBadge status={game.status} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-dark-800">
                  <span className="text-gray-400 flex items-center gap-2">
                    <FaUsers size={14} />
                    Creator:
                  </span>
                  <PlayerAvatar address={game.creator} size={24} showAddress className="inline-flex" />
                </div>
                
                {game.gameType !== GameType.AI_VS_PLAYER && (
                  <div className="flex items-center justify-between py-2 border-b border-dark-800">
                    <span className="text-gray-400">Players:</span>
                    <span className="text-gray-200 font-medium">{game.currentPlayers}/{game.maxPlayers}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between py-2 border-b border-dark-800">
                  <span className="text-gray-400 flex items-center gap-2">
                    <FaCoins size={14} />
                    Stake:
                  </span>
                  <span className="text-primary-400 font-semibold">{game.stake} MON</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-dark-800">
                  <span className="text-gray-400 flex items-center gap-2">
                    <FaTrophy size={14} />
                    Total Prize:
                  </span>
                  <span className="text-success-400 font-semibold">{game.totalPrize} MON</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-dark-800">
                  <span className="text-gray-400">Game Type:</span>
                  <span className="text-gray-200 font-medium">{getGameTypeLabel(game.gameType)}</span>
                </div>
                
                {game.winner && game.winner !== '0x0000000000000000000000000000000000000000' && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-dark-800">
                      <span className="text-gray-400">Winner:</span>
                      <PlayerAvatar address={game.winner} size={24} showAddress className="inline-flex" />
                    </div>
                    {game.winnerFlipCount > 0 && (
                      <div className="flex items-center justify-between py-2 border-b border-dark-800">
                        <span className="text-gray-400">Winner Flip Count:</span>
                        <span className="text-success-400 font-semibold">{game.winnerFlipCount}</span>
                      </div>
                    )}
                  </>
                )}
                
                {game.vrfFulfilled && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400 flex items-center gap-2">
                      <FaCheckCircle className="text-success-400" size={14} />
                      VRF Status:
                    </span>
                    <span className="text-success-400 font-semibold">Fulfilled</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameDetails
