"use client"

interface CoinProps {
  result: "heads" | "tails" | null
  isFlipping: boolean
  onAnimationEnd?: () => void
}

export function Coin({ result, isFlipping, onAnimationEnd }: CoinProps) {
  // Determine animation class based on result
  const getAnimationClass = () => {
    if (!isFlipping && result) {
      // Show final result when not flipping
      return result === "heads" ? "rotate-y-0" : "rotate-y-180"
    }
    // During flipping, use animation based on result
    if (isFlipping) {
      if (result === "heads") {
        return "animate-flip-heads"
      } else if (result === "tails") {
        return "animate-flip-tails"
      }
      // If flipping but no result yet, use default heads animation
      return "animate-flip-heads"
    }
    // Default state
    return ""
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-2">
      {/* Coin Container */}
      <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-2" style={{ perspective: "800px" }}>
        {/* Glow Effect */}
        {isFlipping && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/30 via-orange-500/30 to-blue-500/30 blur-2xl animate-pulse scale-150"></div>
        )}
        
        <div
          className={`w-full h-full relative transition-all duration-300 ${getAnimationClass()}`}
          style={{ 
            transformStyle: "preserve-3d",
            filter: isFlipping 
              ? 'drop-shadow(0 10px 30px rgba(251, 191, 36, 0.5))' 
              : result === "heads"
                ? 'drop-shadow(0 5px 15px rgba(251, 191, 36, 0.3))'
                : 'drop-shadow(0 5px 15px rgba(59, 130, 246, 0.3))'
          }}
          onAnimationEnd={onAnimationEnd}
        >
          {/* Front - Heads */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 shadow-xl flex items-center justify-center border-4 border-yellow-200/40"
            style={{ 
              backfaceVisibility: "hidden",
              boxShadow: "inset 0 0 15px rgba(255, 255, 255, 0.3), 0 5px 20px rgba(251, 191, 36, 0.4)"
            }}
          >
            <div className="text-center relative z-10">
              <div className="text-2xl md:text-3xl font-extrabold text-yellow-900 drop-shadow-lg" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}>H</div>
              <div className="text-[8px] md:text-[10px] font-bold text-yellow-800/90 tracking-wider">HEADS</div>
            </div>
            {/* Shine Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"></div>
          </div>

          {/* Back - Tails */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-300 via-blue-400 to-indigo-600 shadow-xl flex items-center justify-center border-4 border-blue-200/40"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: "inset 0 0 15px rgba(255, 255, 255, 0.3), 0 5px 20px rgba(59, 130, 246, 0.4)"
            }}
          >
            <div className="text-center relative z-10">
              <div className="text-2xl md:text-3xl font-extrabold text-blue-900 drop-shadow-lg" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}>T</div>
              <div className="text-[8px] md:text-[10px] font-bold text-blue-800/90 tracking-wider">TAILS</div>
            </div>
            {/* Shine Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* Result Indicator */}
      {result && !isFlipping && (
        <div className={`mt-2 px-3 py-1.5 rounded-lg border-2 backdrop-blur-sm ${
          result === "heads"
            ? "bg-yellow-500/20 border-yellow-400/50 text-yellow-200"
            : "bg-blue-500/20 border-blue-400/50 text-blue-200"
        }`}>
          <div className="text-xs font-bold tracking-wide">
            {result === "heads" ? "🪙 HEADS" : "🪙 TAILS"}
          </div>
        </div>
      )}
    </div>
  )
}

