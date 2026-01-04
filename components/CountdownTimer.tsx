import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  targetTime: number // Unix timestamp in milliseconds
  onComplete?: () => void
  className?: string
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  onComplete,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const diff = targetTime - now
      const newTimeLeft = Math.max(0, diff)
      setTimeLeft(newTimeLeft)

      if (newTimeLeft === 0 && onComplete) {
        onComplete()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [targetTime, onComplete])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  if (timeLeft <= 0) {
    return (
      <div className={`text-2xl font-bold text-green-600 ${className}`}>Başladı!</div>
    )
  }

  return (
    <div className={`text-2xl font-bold text-blue-600 ${className}`}>
      {formatTime(timeLeft)}
    </div>
  )
}

export default CountdownTimer









