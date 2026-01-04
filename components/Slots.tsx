"use client"
import { useEffect, useState } from 'react'

interface SlotsProps {
  result: { reel1: number; reel2: number; reel3: number } | null
  isSpinning: boolean
  onAnimationEnd?: () => void
}

const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣']

export function Slots({ result, isSpinning, onAnimationEnd }: SlotsProps) {
  const [reels, setReels] = useState<number[]>([0, 0, 0])
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false])

  useEffect(() => {
    if (isSpinning) {
      // Start all reels spinning
      setSpinningReels([true, true, true])
      
      // Fast spin animation
      const spinInterval = setInterval(() => {
        setReels([
          Math.floor(Math.random() * symbols.length),
          Math.floor(Math.random() * symbols.length),
          Math.floor(Math.random() * symbols.length),
        ])
      }, 50)

      // Stop reels one by one with delay (cascading effect)
      const stopReel1 = setTimeout(() => {
        setSpinningReels([false, true, true])
        if (result) {
          setReels(prev => [result.reel1, prev[1], prev[2]])
        }
      }, 1500)

      const stopReel2 = setTimeout(() => {
        setSpinningReels([false, false, true])
        if (result) {
          setReels(prev => [result.reel1, result.reel2, prev[2]])
        }
      }, 2000)

      const stopReel3 = setTimeout(() => {
        clearInterval(spinInterval)
        setSpinningReels([false, false, false])
        if (result) {
          setReels([result.reel1, result.reel2, result.reel3])
          setTimeout(() => {
            if (onAnimationEnd) {
              onAnimationEnd()
            }
          }, 300)
        }
      }, 2500)

      return () => {
        clearInterval(spinInterval)
        clearTimeout(stopReel1)
        clearTimeout(stopReel2)
        clearTimeout(stopReel3)
      }
    } else if (result) {
      setReels([result.reel1, result.reel2, result.reel3])
      setSpinningReels([false, false, false])
    }
  }, [isSpinning, result, onAnimationEnd])

  const isWin = result && result.reel1 === result.reel2 && result.reel2 === result.reel3

  return (
    <div className="relative w-full max-w-full mx-auto py-3">
      {/* Glow Effect */}
      {isSpinning && (
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-rose-500/20 to-pink-600/20 blur-3xl scale-150 animate-pulse"></div>
      )}
      
      <div className="relative bg-gradient-to-br from-pink-900/40 to-rose-900/40 rounded-2xl p-3 md:p-5 border-2 border-pink-500/50 backdrop-blur-sm">
        {/* Slot Machine Frame */}
        <div className="relative bg-gradient-to-br from-dark-900/90 to-dark-800/90 rounded-xl p-4 md:p-6 border-4 border-pink-400/40 shadow-2xl" style={{
          boxShadow: isSpinning 
            ? "0 20px 60px rgba(236, 72, 153, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.05)"
            : isWin && !isSpinning
              ? "0 20px 60px rgba(34, 197, 94, 0.5), inset 0 0 40px rgba(255, 255, 255, 0.05)"
              : "0 10px 40px rgba(0, 0, 0, 0.3), inset 0 0 40px rgba(255, 255, 255, 0.05)"
        }}>
          {/* Reels Container */}
          <div className="flex gap-2 md:gap-3 justify-center items-center">
            {[0, 1, 2].map((reelIndex) => (
              <div
                key={reelIndex}
                className={`relative w-16 h-24 md:w-20 md:h-28 bg-gradient-to-b from-dark-800 to-dark-900 rounded-xl border-3 overflow-hidden transition-all duration-500 ${
                  isSpinning ? 'border-pink-400/60 shadow-lg shadow-pink-500/40 animate-pulse' : 'border-dark-700/50'
                } ${isWin && !isSpinning ? 'border-green-400/70 shadow-2xl shadow-green-500/60 animate-pulse-glow scale-105' : ''}`}
                style={{
                  boxShadow: isSpinning
                    ? "inset 0 0 20px rgba(236, 72, 153, 0.2), 0 0 20px rgba(236, 72, 153, 0.3)"
                    : isWin && !isSpinning
                      ? "inset 0 0 20px rgba(34, 197, 94, 0.2), 0 0 20px rgba(34, 197, 94, 0.4)"
                      : "inset 0 0 20px rgba(0, 0, 0, 0.3)"
                }}
              >
                {/* Reel Window */}
                <div className="absolute inset-0 flex flex-col items-center justify-start overflow-hidden">
                  {/* Multiple symbols for scrolling effect */}
                  {spinningReels[reelIndex] ? (
                    <div className="flex flex-col items-center animate-reel-spin" style={{ willChange: 'transform' }}>
                      {[...Array(25)].map((_, i) => (
                        <div key={i} className="text-3xl md:text-4xl h-12 md:h-14 flex items-center justify-center min-h-[48px] md:min-h-[56px]">
                          {symbols[Math.floor(Math.random() * symbols.length)]}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-3xl md:text-4xl h-full flex items-center justify-center transition-all duration-500 ease-out drop-shadow-lg">
                      {symbols[reels[reelIndex]]}
                    </div>
                  )}
                </div>

                {/* Top and bottom masks for reel effect */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-dark-900 via-dark-900/80 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent z-10 pointer-events-none" />
                
                {/* Center highlight line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-400/30 to-transparent z-10 pointer-events-none transform -translate-y-1/2"></div>
              </div>
            ))}
          </div>

          {/* Win Indicator */}
          {isWin && !isSpinning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="text-7xl md:text-8xl animate-bounce drop-shadow-2xl">🎉</div>
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-green-600/30 rounded-xl animate-pulse-glow"></div>
            </div>
          )}
        </div>

        {/* Result Display */}
        {result && !isSpinning && (
          <div className="mt-6 text-center">
            <div
              className={`inline-block px-6 py-4 rounded-xl backdrop-blur-sm border-2 ${
                isWin
                  ? 'bg-success-900/40 border-success-400/60 text-success-200 shadow-lg shadow-success-500/30'
                  : 'bg-dark-900/80 border-dark-700/50 text-gray-400'
              }`}
            >
              <div className="text-base md:text-lg font-bold mb-2">
                {isWin ? '🎊 Three of a Kind! 🎊' : 'No Match'}
              </div>
              <div className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
                <span className="drop-shadow-lg">{symbols[result.reel1]}</span>
                <span className="text-gray-500">|</span>
                <span className="drop-shadow-lg">{symbols[result.reel2]}</span>
                <span className="text-gray-500">|</span>
                <span className="drop-shadow-lg">{symbols[result.reel3]}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

