import React, { useState } from 'react'
import { FaCopy, FaCheck, FaShare, FaLink, FaQrcode, FaUserPlus } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { createSlug } from '@/utils/helper'
import { GameStruct } from '@/utils/type.dt'

interface ShareButtonProps {
  gameId: number
  game?: GameStruct
  className?: string
  showFullMenu?: boolean
}

const ShareButton: React.FC<ShareButtonProps> = ({ gameId, game, className = '', showFullMenu = false }) => {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [referralCode, setReferralCode] = useState<string>('')
  
  // Generate referral code from address if available
  React.useEffect(() => {
    const generateReferralCode = async () => {
      try {
        const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null
        if (ethereum) {
          const accounts = await ethereum.request({ method: 'eth_accounts' })
          if (accounts?.length > 0) {
            // Use first 8 chars of address as referral code
            const code = accounts[0].slice(2, 10).toUpperCase()
            setReferralCode(code)
          }
        }
      } catch (error) {
        console.warn('Could not generate referral code:', error)
      }
    }
    generateReferralCode()
  }, [])

  const gameSlug = game?.name ? createSlug(game.name, gameId) : `game-${gameId}`
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const gameUrl = `${baseUrl}/gameplay/${gameSlug}-${gameId}`
  const referralUrl = referralCode ? `${gameUrl}?ref=${referralCode}` : gameUrl

  const handleCopy = async (url: string, type: 'link' | 'referral' = 'link') => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success(type === 'referral' ? 'Referral link copied!' : 'Link copied to clipboard!')
      setShowMenu(false)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  const handleShare = async (useReferral = false) => {
    const url = useReferral ? referralUrl : gameUrl
    if (canShare) {
      try {
        await navigator.share({
          title: game?.name || `MonFair Game #${gameId}`,
          text: useReferral 
            ? `Join my game on MonFair! Use referral code: ${referralCode}`
            : `Join this game on MonFair!`,
          url: url,
        })
        setShowMenu(false)
      } catch (error) {
        // User cancelled or error
      }
    } else {
      handleCopy(url, useReferral ? 'referral' : 'link')
    }
  }

  const generateQRCode = () => {
    // QR code generation would go here
    toast.info('QR code feature coming soon!')
    setShowMenu(false)
  }

  if (showFullMenu) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-primary-500/30 ${className}`}
          title="Share options"
        >
          <FaShare size={14} />
          Share Game
        </button>
        
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 bg-dark-800 border-2 border-primary-500/30 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-2">
                <button
                  onClick={() => handleCopy(gameUrl, 'link')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 rounded-lg transition-all text-left"
                >
                  <div className="p-2 bg-primary-500/20 rounded-lg">
                    <FaLink className="text-primary-400" size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-100">Copy Game Link</div>
                    <div className="text-xs text-gray-400 truncate">{gameUrl}</div>
                  </div>
                </button>
                
                {referralCode && (
                  <button
                    onClick={() => handleCopy(referralUrl, 'referral')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 rounded-lg transition-all text-left mt-2"
                  >
                    <div className="p-2 bg-success-500/20 rounded-lg">
                      <FaUserPlus className="text-success-400" size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-100">Copy Referral Link</div>
                      <div className="text-xs text-gray-400">Code: {referralCode}</div>
                    </div>
                  </button>
                )}
                
                <button
                  onClick={() => handleShare(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 rounded-lg transition-all text-left mt-2"
                >
                  <div className="p-2 bg-secondary-500/20 rounded-lg">
                    <FaShare className="text-secondary-400" size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-100">Share via...</div>
                    <div className="text-xs text-gray-400">Native share dialog</div>
                  </div>
                </button>
                
                <button
                  onClick={generateQRCode}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 rounded-lg transition-all text-left mt-2"
                >
                  <div className="p-2 bg-warning-500/20 rounded-lg">
                    <FaQrcode className="text-warning-400" size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-100">Generate QR Code</div>
                    <div className="text-xs text-gray-400">Coming soon</div>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={canShare ? () => handleShare(false) : () => handleCopy(gameUrl, 'link')}
      className={`flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all text-xs ${className}`}
      title={copied ? 'Copied!' : 'Share game'}
    >
      {copied ? <FaCheck size={12} /> : canShare ? <FaShare size={12} /> : <FaCopy size={12} />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}

export default ShareButton
