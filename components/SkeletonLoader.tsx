import React from 'react'

export const GameListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-24 bg-gray-700 rounded-lg"></div>
        </div>
      ))}
    </div>
  )
}

export const GameCardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="w-40 h-40 bg-gray-700 rounded-lg"></div>
    </div>
  )
}

export const PlayerListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
          <div className="h-4 bg-gray-700 rounded w-32"></div>
        </div>
      ))}
    </div>
  )
}

export const GameDetailsSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
    </div>
  )
}









