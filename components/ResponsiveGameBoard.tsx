import React, { useState, useEffect } from 'react'
import GameCard from './GameCard'
import { GameCardStruct } from '@/utils/type.dt'

interface ResponsiveGameBoardProps {
  cards: GameCardStruct[]
  onCardClick: (id: number) => void
}

const ResponsiveGameBoard: React.FC<ResponsiveGameBoardProps> = ({ cards, onCardClick }) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
      setIsTablet(window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const gridCols = isMobile ? 'grid-cols-3' : isTablet ? 'grid-cols-4' : 'grid-cols-6'
  const cardSize = isMobile ? 'w-20 h-20 md:w-24 md:h-24' : 'w-32 h-32'

  return (
    <div className={`grid ${gridCols} gap-2 md:gap-4 justify-center`}>
      {cards.map((card) => (
        <GameCard
          key={card.id}
          card={card}
          isDisabled={card.isFlipped || false}
          onClick={(id) => onCardClick(id)}
          className={cardSize}
        />
      ))}
    </div>
  )
}

export default ResponsiveGameBoard

