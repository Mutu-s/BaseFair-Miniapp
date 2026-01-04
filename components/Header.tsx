import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import ConnectBtn from './ConnectBtn'
import { FaTrophy } from 'react-icons/fa'
import { useAccount, useChainId } from 'wagmi'
import { hasNickname } from '@/services/nickname'
import NicknameModal from './NicknameModal'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'

const Header: React.FC = () => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  
  const isCorrectNetwork = chainId === BASE_MAINNET_CHAIN_ID
  
  // Switch to Base Mainnet if on wrong network
  const handleSwitchToBase = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${BASE_MAINNET_CHAIN_ID.toString(16)}` }],
        })
      }
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${BASE_MAINNET_CHAIN_ID.toString(16)}`,
              chainName: 'Base',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          })
        } catch (addError) {
          console.error('Failed to add Base network:', addError)
        }
      }
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      if (!hasNickname(address)) {
        const timer = setTimeout(() => {
          setShowNicknameModal(true)
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [isConnected, address])

  const handleNicknameSave = () => {
    setShowNicknameModal(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-xl border-b border-dark-700/50">
      <main className="max-w-4xl mx-auto flex justify-between items-center px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0052FF] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-[#0052FF]/30">
            <span className="text-lg">🎴</span>
          </div>
          <span className="font-bold text-white text-lg hidden sm:block">FlipMatch</span>
        </Link>

        {/* Nav Links - Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          <Link 
            href="/active-games" 
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-dark-800/50 rounded-lg transition-all"
          >
            Browse Games
          </Link>
          <Link 
            href="/games" 
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-dark-800/50 rounded-lg transition-all"
          >
            My Games
          </Link>
          <Link 
            href="/leaderboard" 
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-dark-800/50 rounded-lg transition-all flex items-center gap-1.5"
          >
            <FaTrophy size={14} className="text-yellow-500" />
            Ranks
          </Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Network Badge */}
          {isConnected && !isCorrectNetwork && (
            <button
              onClick={handleSwitchToBase}
              className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/30 transition-all"
            >
              Switch to Base
            </button>
          )}
          
          {isConnected && isCorrectNetwork && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#0052FF]/10 border border-[#0052FF]/30 rounded-lg">
              <div className="w-2 h-2 bg-[#0052FF] rounded-full" />
              <span className="text-xs font-medium text-[#0052FF]">Base</span>
            </div>
          )}

          <ConnectBtn />
        </div>
      </main>

      <NicknameModal 
        isOpen={showNicknameModal} 
        onClose={() => setShowNicknameModal(false)}
        onSave={handleNicknameSave}
      />
    </header>
  )
}

export default Header
