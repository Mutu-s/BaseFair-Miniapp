import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import ConnectBtn from './ConnectBtn'
import Logo from './Logo'
import { FaTrophy, FaDice } from 'react-icons/fa'
import { useAccount, useChainId } from 'wagmi'
import { hasNickname, getNickname } from '@/services/nickname'
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
      // If chain doesn't exist, add it
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
      } else {
        console.error('Failed to switch to Base:', switchError)
      }
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      // Check if user has nickname, if not show modal
      if (!hasNickname(address)) {
        // Small delay to ensure wallet is fully connected
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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-dark-900/95 via-dark-800/95 to-dark-900/95 backdrop-blur-2xl border-b-2 border-dark-700/80 shadow-2xl">
      <main className="lg:w-4/5 w-full mx-auto flex justify-between items-center px-6 py-4">
        <Link href={'/'} className="hover:opacity-80 transition-opacity duration-300">
          <Logo size={40} />
        </Link>

        <nav className="hidden md:flex items-center gap-3">
          <Link 
            href={'/flip-match'} 
            className="text-sm font-bold text-gray-300 hover:text-white transition-all duration-300 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-primary-500/20 hover:to-primary-600/20 border border-transparent hover:border-primary-500/30"
          >
            <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent font-extrabold">
              Flip & Match
            </span>
          </Link>
          <Link 
            href={'/casino'} 
            className="text-sm font-bold text-gray-300 hover:text-white transition-all duration-300 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-secondary-500/20 hover:to-secondary-600/20 border border-transparent hover:border-secondary-500/30"
          >
            <FaDice size={16} className="text-secondary-400" />
            <span>Casino</span>
          </Link>
          <Link 
            href={'/leaderboard'} 
            className="text-sm font-bold text-gray-300 hover:text-white transition-all duration-300 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-accent-500/20 hover:to-accent-600/20 border border-transparent hover:border-accent-500/30"
          >
            <FaTrophy size={16} className="text-accent-400" />
            <span>Leaderboard</span>
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {/* Base Network Badge */}
          {isConnected && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-800/50 border border-dark-700/50">
              {isCorrectNetwork ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0052FF]/20 text-[#0052FF] border border-[#0052FF]/30">
                  <svg width="16" height="16" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill="#0052FF"/>
                    <path d="M20.5 8C13.6 8 8 13.6 8 20.5C8 27.4 13.6 33 20.5 33C24.4 33 27.8 31.2 30 28.4V20H21V24H25.5C24.2 26.5 21.5 28.2 18.5 28.2C14.1 28.2 10.5 24.6 10.5 20.2C10.5 15.8 14.1 12.2 18.5 12.2C21 12.2 23.2 13.3 24.7 15L28.2 11.5C25.8 9.1 22.4 7.5 18.5 7.5L20.5 8Z" fill="white"/>
                  </svg>
                  <span className="text-xs font-bold">Base</span>
                </div>
              ) : (
                <button
                  onClick={handleSwitchToBase}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-error-500/20 text-error-400 border border-error-500/30 hover:bg-error-500/30 transition-all text-xs font-bold"
                >
                  Switch to Base
                </button>
              )}
            </div>
          )}
          
          {isConnected && address && hasNickname(address) && (
            <button
              onClick={() => setShowNicknameModal(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all cursor-pointer"
              title="Change nickname"
            >
              <span className="text-primary-400 text-xs md:text-sm font-bold">
                👤 {getNickname(address)}
              </span>
            </button>
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
