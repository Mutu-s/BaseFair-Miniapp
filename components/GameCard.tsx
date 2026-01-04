import { GameCardStruct } from '@/utils/type.dt'
import { FaQuestion } from 'react-icons/fa'
import React from 'react'

interface ComponentProps {
  card: GameCardStruct
  isDisabled: boolean
  onClick: (id: number) => void
  className?: string
}

const GameCard: React.FC<ComponentProps> = ({ onClick, card, isDisabled, className = '' }) => {
  const handleClick = () => {
    if (!isDisabled) {
      onClick(card.id)
    }
  }

  return (
    <div
      className={`${className} aspect-square transition-all duration-300 cursor-pointer
      flex items-center justify-center group rounded-2xl border-2
      ${card.matched
        ? 'bg-gradient-to-br from-success-500/30 to-success-600/20 border-success-500/50 shadow-lg shadow-success-500/20'
        : card.isFlipped 
        ? 'bg-gradient-to-br from-primary-500/30 to-primary-600/20 border-primary-500/50 shadow-lg shadow-primary-500/20' 
        : 'bg-gradient-to-br from-dark-800/80 to-dark-900/80 border-dark-700/50 hover:border-primary-500/50 hover:bg-dark-700/60 hover:shadow-lg hover:shadow-primary-500/10'
      }
      ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 active:scale-95'}`}
      onClick={handleClick}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {card.matched ? (
          <div className="text-5xl md:text-7xl animate-scale-in">
            {card.icon}
          </div>
        ) : card.isFlipped ? (
          <div className="text-5xl md:text-7xl animate-scale-in">
            {card.icon}
          </div>
        ) : (
          <FaQuestion 
            size={56} 
            className="text-gray-500 group-hover:text-primary-400 transition-all duration-300 group-hover:scale-110" 
          />
        )}
      </div>
    </div>
  )
}

export default GameCard
