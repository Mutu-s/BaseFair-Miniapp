import React from 'react'
import { GameStatus } from '@/utils/type.dt'

interface GameStatusBadgeProps {
  status: GameStatus
  className?: string
}

const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({ status, className = '' }) => {
  const config: Record<GameStatus, { label: string; badgeClass: string; icon: string }> = {
    [GameStatus.CREATED]: {
      label: 'Waiting',
      badgeClass: 'px-4 py-1.5 rounded-full text-sm font-bold bg-warning-500/20 text-warning-400 border-2 border-warning-500/30 shadow-lg shadow-warning-500/10',
      icon: '⏳',
    },
    [GameStatus.WAITING_VRF]: {
      label: 'Waiting VRF',
      badgeClass: 'px-4 py-1.5 rounded-full text-sm font-bold bg-info-500/20 text-info-400 border-2 border-info-500/30 shadow-lg shadow-info-500/10',
      icon: '⏳',
    },
    [GameStatus.IN_PROGRESS]: {
      label: 'In Progress',
      badgeClass: 'px-4 py-1.5 rounded-full text-sm font-bold bg-primary-500/20 text-primary-400 border-2 border-primary-500/30 shadow-lg shadow-primary-500/10',
      icon: '🎮',
    },
    [GameStatus.COMPLETED]: {
      label: 'Completed',
      badgeClass: 'px-4 py-1.5 rounded-full text-sm font-bold bg-success-500/20 text-success-400 border-2 border-success-500/30 shadow-lg shadow-success-500/10',
      icon: '✅',
    },
    [GameStatus.CANCELLED]: {
      label: 'Cancelled',
      badgeClass: 'px-4 py-1.5 rounded-full text-sm font-bold bg-error-500/20 text-error-400 border-2 border-error-500/30 shadow-lg shadow-error-500/10',
      icon: '❌',
    },
    [GameStatus.TIED]: {
      label: 'Tied',
      badgeClass: 'px-4 py-1.5 rounded-full text-sm font-bold bg-warning-500/20 text-warning-400 border-2 border-warning-500/30 shadow-lg shadow-warning-500/10',
      icon: '🤝',
    },
  }

  const { label, badgeClass, icon } = config[status] || config[GameStatus.CREATED]

  return (
    <span className={`inline-flex items-center gap-2 ${badgeClass} ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  )
}

export default GameStatusBadge
