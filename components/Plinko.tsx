"use client"
import { useEffect, useState, useRef } from 'react'

interface PlinkoProps {
  result: number | null // position
  rows: number
  isDropping: boolean
  onAnimationEnd?: () => void
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
}

interface Peg {
  x: number
  y: number
}

const PRIZE_VALUES = [100, 50, 25, 10, 5, 10, 25, 50, 100]

export function Plinko({ result, rows, isDropping, onAnimationEnd }: PlinkoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [balls, setBalls] = useState<Ball[]>([])
  const [pegs, setPegs] = useState<Peg[]>([])
  const [hitPegs, setHitPegs] = useState<Set<number>>(new Set())
  const animationRef = useRef<number>()

  const CANVAS_WIDTH = 300
  const CANVAS_HEIGHT = 400
  const PEG_RADIUS = 3
  const BALL_RADIUS = 8
  const GRAVITY = 0.35
  const BOUNCE = 0.68
  const FRICTION = 0.99

  // Generate pegs based on rows
  useEffect(() => {
    const newPegs: Peg[] = []
    const startY = 100
    const rowGap = 35
    const boardWidth = CANVAS_WIDTH

    for (let row = 0; row < rows; row++) {
      const pegsInRow = row + 3
      const pegGap = CANVAS_WIDTH / (pegsInRow + 1)

      for (let col = 0; col < pegsInRow; col++) {
        newPegs.push({
          x: pegGap * (col + 1) + (row % 2 === 0 ? pegGap / 2 : 0),
          y: startY + row * rowGap,
        })
      }
    }

    setPegs(newPegs)
  }, [rows])

  // Drop ball when isDropping becomes true
  useEffect(() => {
    if (isDropping && result === null) {
      setHitPegs(new Set())
      const newBall: Ball = {
        x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 50,
        y: 30,
        vx: (Math.random() - 0.5) * 2,
        vy: 0,
      }
      setBalls([newBall])
    } else if (!isDropping) {
      setBalls([])
      setHitPegs(new Set())
    }
  }, [isDropping, result])

  // Animation loop
  useEffect(() => {
    if (!isDropping || balls.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = () => {
      setBalls((prevBalls) => {
        const updatedBalls = prevBalls
          .map((ball) => {
            let newVy = ball.vy + GRAVITY
            let newVx = ball.vx * FRICTION
            let newX = ball.x + newVx
            let newY = ball.y + newVy

            // Collision with pegs
            pegs.forEach((peg, pegIndex) => {
              const dx = newX - peg.x
              const dy = newY - peg.y
              const distance = Math.sqrt(dx * dx + dy * dy)

              if (distance < BALL_RADIUS + PEG_RADIUS) {
                setHitPegs((prev) => new Set([...prev, pegIndex]))
                const angle = Math.atan2(dy, dx)
                const targetX = peg.x + Math.cos(angle) * (BALL_RADIUS + PEG_RADIUS)
                const targetY = peg.y + Math.sin(angle) * (BALL_RADIUS + PEG_RADIUS)

                newX = targetX
                newY = targetY

                const speed = Math.sqrt(newVx * newVx + newVy * newVy)
                newVx = Math.cos(angle) * speed * BOUNCE + (Math.random() - 0.5) * 1.5
                newVy = Math.sin(angle) * speed * BOUNCE
              }
            })

            // Wall collisions
            if (newX < BALL_RADIUS) {
              newX = BALL_RADIUS
              newVx = Math.abs(newVx) * BOUNCE
            }
            if (newX > CANVAS_WIDTH - BALL_RADIUS) {
              newX = CANVAS_WIDTH - BALL_RADIUS
              newVx = -Math.abs(newVx) * BOUNCE
            }

            // Ball reached bottom
            if (newY > CANVAS_HEIGHT - 70) {
              if (onAnimationEnd) {
                setTimeout(() => {
                  onAnimationEnd()
                }, 500)
              }
              return null
            }

            return {
              x: newX,
              y: newY,
              vx: newVx * 0.99,
              vy: newVy,
            }
          })
          .filter((ball): ball is Ball => ball !== null)

        if (updatedBalls.length === 0) {
          if (onAnimationEnd) {
            onAnimationEnd()
          }
        }

        return updatedBalls
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isDropping, balls.length, pegs, onAnimationEnd])

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw pegs
    pegs.forEach((peg, index) => {
      const isHit = hitPegs.has(index)
      ctx.beginPath()
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = isHit ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.3)'
      ctx.fill()
      ctx.strokeStyle = isHit ? 'rgba(255, 255, 255, 0.8)' : 'rgba(34, 197, 94, 0.5)'
      ctx.lineWidth = isHit ? 2 : 1
      ctx.stroke()
    })

    // Draw balls
    balls.forEach((ball) => {
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
      const gradient = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 0, ball.x, ball.y, BALL_RADIUS)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0.8)')
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }, [balls, pegs, hitPegs])

  // Calculate slot index from result position
  const getSlotIndex = (position: number): number => {
    const normalized = (position + rows) / (rows * 2)
    return Math.max(0, Math.min(PRIZE_VALUES.length - 1, Math.floor(normalized * PRIZE_VALUES.length)))
  }

  // Calculate multiplier from position
  const getMultiplier = (position: number): number => {
    const slotIndex = getSlotIndex(position)
    return PRIZE_VALUES[slotIndex]
  }

  return (
    <div className="w-full">
      <div className="relative bg-gradient-to-b from-dark-900/50 to-dark-950/50 rounded-xl p-4 border border-green-500/20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-green-500/5 pointer-events-none"></div>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto mx-auto block rounded-lg"
            style={{ maxWidth: '100%', height: 'auto' }}
          />

          {/* Prize slots at bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex h-16 border-t border-dark-700/50 bg-dark-900/80 backdrop-blur-sm">
            {PRIZE_VALUES.map((value, index) => {
              const isActive = result !== null && getSlotIndex(result) === index
              const isEdge = index === 0 || index === PRIZE_VALUES.length - 1
              const isMid = index === 1 || index === PRIZE_VALUES.length - 2
              return (
                <div
                  key={index}
                  className={`flex-1 flex items-center justify-center text-xs font-bold border-r border-dark-700/30 last:border-r-0 transition-all ${
                    isActive
                      ? 'bg-green-500/30 border-green-400/50 text-green-300 scale-110'
                      : isEdge
                        ? 'bg-green-500/10 text-green-400/70'
                        : isMid
                          ? 'bg-emerald-500/10 text-emerald-400/70'
                          : 'bg-dark-800/30 text-gray-500'
                  }`}
                >
                  {value}x
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Result Display */}
      {result !== null && !isDropping && (
        <div className="mt-4 text-center">
          <div className="inline-block bg-dark-900/90 backdrop-blur-sm border border-green-500/50 rounded-xl px-6 py-3">
            <div className="text-xs text-gray-400 mb-1 font-semibold">Position</div>
            <div className="text-2xl font-bold text-green-400">{Math.round(result)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

