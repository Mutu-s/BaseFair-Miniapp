"use client"

interface DiceProps {
  result: number | null
  isRolling: boolean
  onAnimationEnd?: () => void
  target?: number
  betType?: 'over' | 'under'
  won?: boolean
}

const diceIcons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export function Dice({ result, isRolling, onAnimationEnd, target, betType, won }: DiceProps) {
  // Get dice icon based on result (1-100 maps to 6 dice faces)
  const getDiceIcon = () => {
    if (result === null) return diceIcons[2] // Default to 3
    const diceIndex = Math.min(Math.floor((result - 1) / 17), 5)
    return diceIcons[diceIndex]
  }

  const DiceIcon = getDiceIcon()

  return (
    <div className="w-full flex flex-col items-center justify-center py-4">
      {/* Dice Container */}
      <div className="relative mb-4">
        {/* Glow Effect */}
        {isRolling && (
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/40 via-purple-500/40 to-blue-600/40 blur-3xl scale-150 animate-pulse"></div>
        )}
        
        <div
          className={`relative w-40 h-40 md:w-48 md:h-48 rounded-3xl bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-blue-600/30 border-4 flex items-center justify-center transition-all duration-500 ${
            isRolling ? "animate-dice-spin border-blue-400/60" : "border-blue-500/40"
          } ${
            won === true
              ? "bg-success-500/30 border-success-400/60 shadow-2xl shadow-success-500/40 scale-105"
              : won === false
                ? "bg-error-500/30 border-error-400/60 shadow-2xl shadow-error-500/40"
                : ""
          }`}
          style={{
            boxShadow: isRolling 
              ? "0 20px 60px rgba(59, 130, 246, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.1)"
              : won === true
                ? "0 20px 60px rgba(34, 197, 94, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.1)"
                : won === false
                  ? "0 20px 60px rgba(239, 68, 68, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.1)"
                  : "0 10px 40px rgba(59, 130, 246, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.1)"
          }}
          onAnimationEnd={(e) => {
            if (onAnimationEnd && isRolling) {
              onAnimationEnd()
            }
          }}
        >
          <div
            className={`text-6xl md:text-7xl transition-all duration-300 drop-shadow-2xl ${
              won === true ? "text-success-300" : won === false ? "text-error-300" : "text-blue-300"
            }`}
            style={{ textShadow: "0 4px 12px rgba(0, 0, 0, 0.4)" }}
          >
            {DiceIcon}
          </div>
        </div>
      </div>

      {/* Result Display */}
      <div className="text-center space-y-3">
        {result !== null ? (
          <div className="space-y-2">
            <div className="relative">
              <div className="text-5xl md:text-6xl font-extrabold text-primary mb-2 drop-shadow-lg" style={{ textShadow: "0 4px 12px rgba(59, 130, 246, 0.5)" }}>
                {result}
              </div>
              {target && betType && (
                <div className="text-sm text-gray-400 font-semibold mt-2">
                  Target: {target} ({betType === 'over' ? 'OVER' : 'UNDER'})
                </div>
              )}
            </div>
            {won !== undefined && (
              <div className={`px-6 py-3 rounded-xl border-2 backdrop-blur-sm ${
                won
                  ? "bg-success-500/20 border-success-400/50 text-success-200"
                  : "bg-error-500/20 border-error-400/50 text-error-200"
              }`}>
                <div className={`text-2xl font-bold ${won ? "text-success-300" : "text-error-300"}`}>
                  {won ? "🎉 YOU WIN!" : "💔 YOU LOSE"}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-6xl font-bold text-gray-500">--</div>
        )}
      </div>
    </div>
  )
}

