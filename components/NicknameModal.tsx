import React, { useState, useEffect } from 'react'
import { FaTimes, FaCheck } from 'react-icons/fa'
import { setNickname, getNickname } from '@/services/nickname'
import { useAccount } from 'wagmi'

interface NicknameModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (nickname: string) => void
}

const NicknameModal: React.FC<NicknameModalProps> = ({ isOpen, onClose, onSave }) => {
  const { address } = useAccount()
  const [nickname, setNicknameValue] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && address) {
      const existing = getNickname(address)
      if (existing) {
        setNicknameValue(existing)
      } else {
        setNicknameValue('')
      }
      setError('')
    }
  }, [isOpen, address])

  const handleSave = async () => {
    if (!address) {
      setError('Please connect your wallet')
      return
    }

    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }

    if (nickname.length > 20) {
      setError('Nickname must be 20 characters or less')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      setNickname(address, nickname.trim())
      onSave(nickname.trim())
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save nickname')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center
      bg-black/60 backdrop-blur-sm transform z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="card w-11/12 md:w-2/5 border-2 border-primary-500/20 shadow-2xl relative"
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-1 tracking-tight font-display">Create Your Nickname</h2>
              <p className="text-gray-300 text-sm font-medium tracking-wide">Choose a unique nickname to display in games and leaderboard</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-dark-800 rounded-xl transition-all text-gray-400 hover:text-gray-200 hover:scale-110"
              disabled={isSaving}
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="w-full mb-6">
            <label className="text-sm font-bold text-gray-200 mb-3 block flex items-center gap-2">
              <span className="text-primary-400">👤</span>
              Nickname
            </label>
            <input
              type="text"
              placeholder="Enter your nickname (max 20 characters)"
              value={nickname}
              onChange={(e) => {
                setNicknameValue(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSaving && nickname.trim()) {
                  handleSave()
                }
              }}
              className="input text-lg font-medium"
              maxLength={20}
              disabled={isSaving}
              autoFocus
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-2 px-2">
              {nickname.length}/20 characters • Letters, numbers, spaces, and _ - . allowed
            </p>
            {error && (
              <p className="text-red-400 text-sm mt-2 px-2">{error}</p>
            )}
          </div>

          <div className="w-full pt-4 border-t border-dark-700/50 flex gap-3">
            <button
              onClick={onClose}
              className="btn-outline flex-1 font-bold"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex-1 font-bold flex items-center justify-center gap-2"
              disabled={isSaving || !nickname.trim()}
            >
              <FaCheck size={16} />
              {isSaving ? 'Saving...' : 'Save Nickname'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NicknameModal

