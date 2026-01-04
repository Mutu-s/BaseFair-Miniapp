import React, { useState, useEffect } from 'react'
import Identicon from 'react-identicons'
import { useEnsAvatar, useEnsName } from 'wagmi'
import { getNickname } from '@/services/nickname'

interface PlayerAvatarProps {
  address: string
  size?: number
  className?: string
  showAddress?: boolean
}

const AI_ADDRESS = '0x1111111111111111111111111111111111111111'

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  address,
  size = 40,
  className = '',
  showAddress = false,
}) => {
  const isAI = address.toLowerCase() === AI_ADDRESS.toLowerCase()
  const [nickname, setNickname] = useState<string | null>(null)
  
  const { data: ensName } = useEnsName({
    address: !isAI ? (address as `0x${string}`) : undefined,
    enabled: !isAI,
  })
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    enabled: !!ensName && !isAI,
  })

  useEffect(() => {
    if (!isAI) {
      const storedNickname = getNickname(address)
      setNickname(storedNickname)
      
      // Listen for nickname updates
      const handleNicknameUpdate = (event: CustomEvent) => {
        if (event.detail?.address?.toLowerCase() === address.toLowerCase()) {
          setNickname(event.detail.nickname)
        }
      }
      
      window.addEventListener('nicknameUpdated', handleNicknameUpdate as EventListener)
      return () => {
        window.removeEventListener('nicknameUpdated', handleNicknameUpdate as EventListener)
      }
    }
  }, [address, isAI])

  const displayName = isAI 
    ? 'AI Player' 
    : nickname || ensName || `${address.slice(0, 6)}...${address.slice(-4)}`

  if (isAI) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold"
          style={{ width: size, height: size }}
        >
          🤖
        </div>
        {showAddress && (
          <span className="text-sm font-medium text-gray-200">
            {displayName}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {ensAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ensAvatar}
          alt={ensName || address}
          className="rounded-full border-2 border-primary-500/30"
          width={size}
          height={size}
        />
      ) : (
        <div className="rounded-full overflow-hidden border-2 border-primary-500/30">
          <Identicon string={address} size={size} />
        </div>
      )}
      {showAddress && <span className="text-sm">{displayName}</span>}
    </div>
  )
}

export default PlayerAvatar

