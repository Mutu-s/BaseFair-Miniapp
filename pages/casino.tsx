import { NextPage } from 'next'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { ethers } from 'ethers'
import { BASE_TESTNET_CHAIN_ID, BASE_MAINNET_CHAIN_ID } from '@/utils/network'
import { CasinoGameType, getGameConfig, playCoinFlip, playDice, playPlinko, playSlots, getTreasuryBalance, getGameState } from '@/services/casino'
import { FaCoins, FaDice, FaCircle, FaDiceFive, FaTrophy, FaArrowLeft } from 'react-icons/fa'
import Image from 'next/image'
import { Coin } from '@/components/Coin'
import { Dice } from '@/components/Dice'
import { Plinko } from '@/components/Plinko'
import { Slots } from '@/components/Slots'
import CasinoVRFVerification from '@/components/CasinoVRFVerification'

interface GameConfig {
  minBet: string
  maxBet: string
  houseEdgeBps: number
  paused: boolean
}

const CasinoPage: NextPage = () => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [selectedGame, setSelectedGame] = useState<CasinoGameType | null>(null)
  const [betAmount, setBetAmount] = useState('1')
  const [loading, setLoading] = useState(false)
  const [gameResult, setGameResult] = useState<any>(null)
  const [gameStateForVerification, setGameStateForVerification] = useState<any>(null)
  const [gameConfigs, setGameConfigs] = useState<Record<string, GameConfig>>({})
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0')
  const [loadingConfigs, setLoadingConfigs] = useState(true)

  // Dice game state
  const [diceTarget, setDiceTarget] = useState('50')
  const [diceRollUnder, setDiceRollUnder] = useState(true)

  // Plinko game state
  const [plinkoRows, setPlinkoRows] = useState('12')

  // CoinFlip game state
  const [coinFlipping, setCoinFlipping] = useState(false)
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<0 | 1 | null>(null)

  // Dice game animation state
  const [diceRolling, setDiceRolling] = useState(false)
  const [diceResult, setDiceResult] = useState<number | null>(null)

  // Plinko game animation state
  const [plinkoDropping, setPlinkoDropping] = useState(false)
  const [plinkoResult, setPlinkoResult] = useState<number | null>(null)

  // Slots game animation state
  const [slotsSpinning, setSlotsSpinning] = useState(false)
  const [slotsResult, setSlotsResult] = useState<{ reel1: number; reel2: number; reel3: number } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoadingConfigs(true)
      try {
        // Load game configs
        const configs: Record<string, GameConfig> = {}
        const gameTypes = [
          CasinoGameType.COINFLIP,
          CasinoGameType.DICE,
          CasinoGameType.PLINKO,
          CasinoGameType.SLOTS,
        ]
        
        for (const gameType of gameTypes) {
          try {
            console.log(`[Casino] Loading config for ${gameType}...`)
            const config = await getGameConfig(gameType as CasinoGameType)
            configs[gameType] = {
              minBet: ethers.formatEther(config.minBet),
              maxBet: ethers.formatEther(config.maxBet),
              houseEdgeBps: config.houseEdgeBps,
              paused: config.paused,
            }
            console.log(`[Casino] ✅ ${gameType} config loaded:`, configs[gameType])
          } catch (error: any) {
            console.error(`[Casino] ❌ Failed to load config for ${gameType}:`, error)
            // Set default config if loading fails
            configs[gameType] = {
              minBet: '0.01',
              maxBet: '100',
              houseEdgeBps: 250,
              paused: false,
            }
          }
        }
        setGameConfigs(configs)
        console.log('[Casino] All configs loaded:', configs)

        // Load treasury balance
        try {
          const balance = await getTreasuryBalance()
          setTreasuryBalance(parseFloat(balance).toFixed(4))
          console.log('[Casino] Treasury balance loaded:', balance)
        } catch (error) {
          console.error('[Casino] Failed to load treasury balance:', error)
        }
      } catch (error) {
        console.error('[Casino] Error loading data:', error)
      } finally {
        setLoadingConfigs(false)
        console.log('[Casino] Config loading completed')
      }
    }
    loadData()
  }, [])

  const validateBetAmount = (amount: string, gameType?: CasinoGameType): boolean => {
    const numAmount = parseFloat(amount)
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return false
    }

    // Use contract config if available
    if (gameType && gameConfigs[gameType]) {
      const config = gameConfigs[gameType]
      const numMin = parseFloat(config.minBet)
      const numMax = parseFloat(config.maxBet)
      
      if (numAmount < numMin) {
        return false
      }
      
      if (numAmount > numMax) {
        return false
      }
    } else {
      // Fallback validation
      if (numAmount < 0.01) {
        return false
      }
      
      if (numAmount > 500) {
        return false
      }
    }

    return true
  }

  const handlePlayCoinFlip = async (choice: 0 | 1) => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    const config = gameConfigs[CasinoGameType.COINFLIP]
    if (!config) {
      alert('Game configuration not loaded. Please wait...')
      return
    }

    if (config.paused) {
      alert('This game is currently paused')
      return
    }

    if (!validateBetAmount(betAmount, CasinoGameType.COINFLIP)) {
      alert(`Bet amount must be between ${config.minBet} and ${config.maxBet} MON`)
      return
    }

    // Set selected choice and show waiting state
    setSelectedChoice(choice)
    setCoinFlipping(false)
    setCoinResult(null)
    setGameResult(null)
    setLoading(true)

    try {
      // Wait for transaction and wallet confirmation
      const result = await playCoinFlip(betAmount, choice)
      
      // Check if VRF is still pending
      if (result.pending) {
        // VRF is still pending, show waiting state
        setGameResult({
          ...result,
          pending: true,
          message: 'Waiting for VRF fulfillment...'
        })
        setLoading(true)
        
        // Poll for result
        pollGameResult(CasinoGameType.COINFLIP, result.gameId!)
        return
      }
      
      // VRF fulfilled, show result
      if (result.result !== null && result.result !== undefined) {
        const finalResult: 'heads' | 'tails' = result.result === 0 ? 'heads' : 'tails'
        setCoinResult(finalResult)
        setGameResult(result)
        setCoinFlipping(true)
      } else {
        setGameResult(result)
        setLoading(false)
      }
      
      // Fetch game state for verification
      if (result.gameId) {
        try {
          const state = await getGameState(CasinoGameType.COINFLIP, result.gameId)
          if (state) {
            setGameStateForVerification(state)
          }
        } catch (error) {
          console.error('Failed to fetch game state:', error)
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to play CoinFlip'
      console.error('CoinFlip error:', error)
      alert(errorMsg)
      setCoinFlipping(false)
      setCoinResult(null)
      setSelectedChoice(null)
      setLoading(false)
    }
  }
  
  // Poll for game result when VRF is pending
  const pollGameResult = async (gameType: CasinoGameType, gameId: number) => {
    let attempts = 0
    const maxAttempts = 30 // 30 seconds
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setLoading(false)
        setGameResult({
          gameId,
          pending: false,
          error: 'VRF fulfillment timeout. Please check the game result manually.'
        })
        return
      }
      
      try {
        const state = await getGameState(gameType, gameId)
        if (state && state[0] !== ethers.ZeroAddress) {
          // Game is settled
          setLoading(false)
          
          // Parse result based on game type
          if (gameType === CasinoGameType.COINFLIP) {
            const result = Number(state[2]) // result field
            const reward = ethers.formatEther(state[3].toString()) // reward field
            const finalResult: 'heads' | 'tails' = result === 0 ? 'heads' : 'tails'
            setCoinResult(finalResult)
            setGameResult({
              gameId,
              result,
              payout: reward,
              won: parseFloat(reward) > 0,
              pending: false
            })
            setCoinFlipping(true)
          } else if (gameType === CasinoGameType.DICE) {
            const roll = Number(state[2])
            const reward = ethers.formatEther(state[3].toString())
            setDiceResult(roll)
            setGameResult({
              gameId,
              roll,
              payout: reward,
              won: parseFloat(reward) > 0,
              pending: false
            })
            setDiceRolling(true)
          } else if (gameType === CasinoGameType.PLINKO) {
            const position = Number(state[2])
            const reward = ethers.formatEther(state[4].toString())
            setPlinkoResult(position)
            setGameResult({
              gameId,
              position,
              payout: reward,
              won: parseFloat(reward) > 0,
              pending: false
            })
            setPlinkoDropping(true)
          } else if (gameType === CasinoGameType.SLOTS) {
            const reel1 = Number(state[2])
            const reel2 = Number(state[3])
            const reel3 = Number(state[4])
            const reward = ethers.formatEther(state[6].toString())
            setSlotsResult({ reel1, reel2, reel3 })
            setGameResult({
              gameId,
              reel1,
              reel2,
              reel3,
              payout: reward,
              won: parseFloat(reward) > 0,
              pending: false
            })
            setSlotsSpinning(true)
          }
          
          // Fetch game state for verification
          try {
            const verificationState = await getGameState(gameType, gameId)
            if (verificationState) {
              setGameStateForVerification(verificationState)
            }
          } catch (error) {
            console.error('Failed to fetch game state for verification:', error)
          }
        } else {
          // Still pending, poll again
          attempts++
          setTimeout(poll, 1000)
        }
      } catch (error) {
        console.error('Error polling game result:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000)
        } else {
          setLoading(false)
          setGameResult({
            gameId,
            pending: false,
            error: 'Failed to get game result. Please check manually.'
          })
        }
      }
    }
    
    poll()
  }

  const handleCoinAnimationEnd = () => {
    setCoinFlipping(false)
    setLoading(false)
  }

  const handlePlayDice = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    // Check if configs are still loading
    if (loadingConfigs) {
      alert('Game configurations are still loading. Please wait...')
      return
    }

    const config = gameConfigs[CasinoGameType.DICE]
    if (!config) {
      // Try to load config on the fly
      try {
        console.log('[handlePlayDice] Config not found, loading...')
        const loadedConfig = await getGameConfig(CasinoGameType.DICE)
        const newConfig = {
          minBet: ethers.formatEther(loadedConfig.minBet),
          maxBet: ethers.formatEther(loadedConfig.maxBet),
          houseEdgeBps: loadedConfig.houseEdgeBps,
          paused: loadedConfig.paused,
        }
        setGameConfigs((prev: Record<string, GameConfig>) => ({ ...prev, [CasinoGameType.DICE]: newConfig }))
        // Retry after setting config
        setTimeout(() => handlePlayDice(), 100)
        return
      } catch (error: any) {
        alert(`Failed to load game configuration: ${error.message || 'Unknown error'}. Please refresh the page.`)
        return
      }
    }

    if (config.paused) {
      alert('This game is currently paused')
      return
    }

    if (!validateBetAmount(betAmount, CasinoGameType.DICE)) {
      alert(`Bet amount must be between ${config.minBet} and ${config.maxBet} MON`)
      return
    }

    const target = parseInt(diceTarget)
    if (isNaN(target) || target < 1 || target > 99) {
      alert('Target must be between 1 and 99')
      return
    }

    setDiceRolling(false)
    setDiceResult(null)
    setGameResult(null)
    setLoading(true)

    try {
      const result = await playDice(betAmount, target, diceRollUnder)
      
      if (result.pending) {
        setGameResult({
          ...result,
          pending: true,
          message: 'Waiting for VRF fulfillment...'
        })
        setLoading(true)
        pollGameResult(CasinoGameType.DICE, result.gameId!)
        return
      }
      
      if (result.roll !== null && result.roll !== undefined) {
        setDiceResult(result.roll)
        setGameResult(result)
        setDiceRolling(true)
      } else {
        setGameResult(result)
        setLoading(false)
      }
      
      // Fetch game state for verification
      if (result.gameId) {
        try {
          const state = await getGameState(CasinoGameType.DICE, result.gameId)
          if (state) {
            setGameStateForVerification(state)
          }
        } catch (error) {
          console.error('Failed to fetch game state:', error)
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to play Dice'
      console.error('Dice error:', error)
      alert(errorMsg)
      setDiceRolling(false)
      setDiceResult(null)
      setLoading(false)
    }
  }

  const handleDiceAnimationEnd = () => {
    setDiceRolling(false)
    setLoading(false)
  }

  // Fallback: Reset loading if animation doesn't trigger
  useEffect(() => {
    if (diceRolling) {
      const timeout = setTimeout(() => {
        if (diceRolling) {
          setDiceRolling(false)
          setLoading(false)
        }
      }, 3000) // 3 seconds fallback
      return () => clearTimeout(timeout)
    }
  }, [diceRolling])

  const handlePlayPlinko = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    // Check if configs are still loading
    if (loadingConfigs) {
      alert('Game configurations are still loading. Please wait...')
      return
    }

    const config = gameConfigs[CasinoGameType.PLINKO]
    if (!config) {
      // Try to load config on the fly
      try {
        console.log('[handlePlayPlinko] Config not found, loading...')
        const loadedConfig = await getGameConfig(CasinoGameType.PLINKO)
        const newConfig = {
          minBet: ethers.formatEther(loadedConfig.minBet),
          maxBet: ethers.formatEther(loadedConfig.maxBet),
          houseEdgeBps: loadedConfig.houseEdgeBps,
          paused: loadedConfig.paused,
        }
        setGameConfigs((prev: Record<string, GameConfig>) => ({ ...prev, [CasinoGameType.PLINKO]: newConfig }))
        // Retry after setting config
        setTimeout(() => handlePlayPlinko(), 100)
        return
      } catch (error: any) {
        alert(`Failed to load game configuration: ${error.message || 'Unknown error'}. Please refresh the page.`)
        return
      }
    }

    if (config.paused) {
      alert('This game is currently paused')
      return
    }

    if (!validateBetAmount(betAmount, CasinoGameType.PLINKO)) {
      alert(`Bet amount must be between ${config.minBet} and ${config.maxBet} MON`)
      return
    }

    const rows = parseInt(plinkoRows)
    if (isNaN(rows) || rows < 8 || rows > 16) {
      alert('Rows must be between 8 and 16')
      return
    }

    setPlinkoDropping(false)
    setPlinkoResult(null)
    setGameResult(null)
    setLoading(true)

    try {
      const result = await playPlinko(betAmount, rows)
      
      if (result.pending) {
        setGameResult({
          ...result,
          pending: true,
          message: 'Waiting for VRF fulfillment...'
        })
        setLoading(true)
        pollGameResult(CasinoGameType.PLINKO, result.gameId!)
        return
      }
      
      if (result.position !== null && result.position !== undefined) {
        setPlinkoResult(result.position)
        setGameResult(result)
        setPlinkoDropping(true)
      } else {
        setGameResult(result)
        setLoading(false)
      }
      
      // Fetch game state for verification
      if (result.gameId) {
        try {
          const state = await getGameState(CasinoGameType.PLINKO, result.gameId)
          if (state) {
            setGameStateForVerification(state)
          }
        } catch (error) {
          console.error('Failed to fetch game state:', error)
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to play Plinko'
      console.error('Plinko error:', error)
      alert(errorMsg)
      setPlinkoDropping(false)
      setPlinkoResult(null)
      setLoading(false)
    }
  }

  const handlePlinkoAnimationEnd = () => {
    setPlinkoDropping(false)
    setLoading(false)
  }

  const handlePlaySlots = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    // Check if configs are still loading
    if (loadingConfigs) {
      alert('Game configurations are still loading. Please wait...')
      return
    }

    const config = gameConfigs[CasinoGameType.SLOTS]
    if (!config) {
      // Try to load config on the fly
      try {
        console.log('[handlePlaySlots] Config not found, loading...')
        const loadedConfig = await getGameConfig(CasinoGameType.SLOTS)
        const newConfig = {
          minBet: ethers.formatEther(loadedConfig.minBet),
          maxBet: ethers.formatEther(loadedConfig.maxBet),
          houseEdgeBps: loadedConfig.houseEdgeBps,
          paused: loadedConfig.paused,
        }
        setGameConfigs((prev: Record<string, GameConfig>) => ({ ...prev, [CasinoGameType.SLOTS]: newConfig }))
        // Retry after setting config
        setTimeout(() => handlePlaySlots(), 100)
        return
      } catch (error: any) {
        alert(`Failed to load game configuration: ${error.message || 'Unknown error'}. Please refresh the page.`)
        return
      }
    }

    if (config.paused) {
      alert('This game is currently paused')
      return
    }

    if (!validateBetAmount(betAmount, CasinoGameType.SLOTS)) {
      alert(`Bet amount must be between ${config.minBet} and ${config.maxBet} MON`)
      return
    }

    setSlotsSpinning(false)
    setSlotsResult(null)
    setGameResult(null)
    setLoading(true)

    try {
      const result = await playSlots(betAmount)
      
      if (result.pending) {
        setGameResult({
          ...result,
          pending: true,
          message: 'Waiting for VRF fulfillment...'
        })
        setLoading(true)
        pollGameResult(CasinoGameType.SLOTS, result.gameId!)
        return
      }
      
      if (result.reel1 !== undefined && result.reel1 !== null && 
          result.reel2 !== undefined && result.reel2 !== null && 
          result.reel3 !== undefined && result.reel3 !== null) {
        setSlotsResult({ reel1: result.reel1, reel2: result.reel2, reel3: result.reel3 })
        setGameResult(result)
        setSlotsSpinning(true)
      } else {
        setGameResult(result)
        setLoading(false)
      }
      
      // Fetch game state for verification
      if (result.gameId) {
        try {
          const state = await getGameState(CasinoGameType.SLOTS, result.gameId)
          if (state) {
            setGameStateForVerification(state)
          }
        } catch (error) {
          console.error('Failed to fetch game state:', error)
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to play Slots'
      console.error('Slots error:', error)
      alert(errorMsg)
      setSlotsSpinning(false)
      setSlotsResult(null)
      setLoading(false)
    }
  }

  const handleSlotsAnimationEnd = () => {
    setSlotsSpinning(false)
    setLoading(false)
  }

  const games = [
    {
      id: CasinoGameType.COINFLIP,
      name: 'Coin Flip',
      icon: FaCoins,
      description: 'Simple 50/50 chance!',
      payout: '1.95x',
      color: 'from-yellow-500 to-orange-500',
      component: (
        <div className="space-y-3 relative z-10" style={{ pointerEvents: 'auto' }}>
          {/* Coin Display */}
          <div className="flex justify-center py-3 pointer-events-none">
            <Coin 
              result={coinResult} 
              isFlipping={coinFlipping}
              onAnimationEnd={handleCoinAnimationEnd}
            />
          </div>

          {/* Choice Buttons */}
          <div className="grid grid-cols-2 gap-3 relative z-10" style={{ pointerEvents: 'auto' }}>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!loading && !coinFlipping) {
                  handlePlayCoinFlip(0)
                }
              }}
              disabled={loading || coinFlipping}
              style={{ pointerEvents: (loading || coinFlipping) ? 'none' : 'auto' }}
              className={`relative py-4 text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer z-10 border-2 ${
                selectedChoice === 0 && !coinFlipping
                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 shadow-xl shadow-yellow-500/50 scale-105 border-yellow-300/50'
                  : 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 text-yellow-300 border-2 border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-500/30 hover:scale-102'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-2xl drop-shadow-lg">🪙</div>
                <div className="text-sm font-extrabold tracking-wide">HEADS</div>
                <div className="text-[10px] text-yellow-800/70 font-semibold">50% Win</div>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!loading && !coinFlipping) {
                  handlePlayCoinFlip(1)
                }
              }}
              disabled={loading || coinFlipping}
              style={{ pointerEvents: (loading || coinFlipping) ? 'none' : 'auto' }}
              className={`relative py-4 text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer z-10 border-2 ${
                selectedChoice === 1 && !coinFlipping
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-blue-900 shadow-xl shadow-blue-500/50 scale-105 border-blue-300/50'
                  : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-300 border-2 border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/30 hover:scale-102'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-2xl drop-shadow-lg">🪙</div>
                <div className="text-sm font-extrabold tracking-wide">TAILS</div>
                <div className="text-[10px] text-blue-800/70 font-semibold">50% Win</div>
              </div>
            </button>
          </div>


          {/* Loading State - Waiting for wallet confirmation */}
          {loading && !coinFlipping && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
              <p className="text-gray-400 mt-2">Waiting for wallet confirmation...</p>
            </div>
          )}

          {/* Loading State - Coin flipping */}
          {coinFlipping && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
              <p className="text-gray-400 mt-2">Flipping coin...</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: CasinoGameType.DICE,
      name: 'Dice',
      icon: FaDice,
      description: 'Roll under or over your target!',
      payout: 'Dynamic',
      color: 'from-blue-500 to-purple-500',
      component: (
        <div className="space-y-3 relative z-10" style={{ pointerEvents: 'auto' }}>
          {/* Dice Display */}
          <div className="flex justify-center py-3 pointer-events-none">
            <Dice 
              result={diceResult} 
              isRolling={diceRolling}
              onAnimationEnd={handleDiceAnimationEnd}
              target={parseInt(diceTarget) || 50}
              betType={diceRollUnder ? 'under' : 'over'}
              won={gameResult?.won}
            />
          </div>

          {/* Bet Type */}
          <div className="relative z-10 card p-4 bg-dark-800/50 border-primary-500/20" style={{ pointerEvents: 'auto' }}>
            <label className="block text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
              <span>🎯</span>
              <span>Bet Type</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDiceRollUnder(false)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={loading || diceRolling}
                style={{ pointerEvents: (loading || diceRolling) ? 'none' : 'auto' }}
                className={`h-12 text-sm font-bold rounded-lg transition-all border-2 ${
                  !diceRollUnder
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/40 border-primary-400/50 scale-105'
                    : 'bg-dark-800/50 border-dark-700 text-gray-400 hover:border-primary-500/30 hover:bg-dark-700/50'
                } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-base">📈</span>
                  <span>OVER</span>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDiceRollUnder(true)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={loading || diceRolling}
                style={{ pointerEvents: (loading || diceRolling) ? 'none' : 'auto' }}
                className={`h-12 text-sm font-bold rounded-lg transition-all border-2 ${
                  diceRollUnder
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/40 border-primary-400/50 scale-105'
                    : 'bg-dark-800/50 border-dark-700 text-gray-400 hover:border-primary-500/30 hover:bg-dark-700/50'
                } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-base">📉</span>
                  <span>UNDER</span>
                </div>
              </button>
            </div>
          </div>

          {/* Target */}
          <div className="relative z-10 card p-4 bg-dark-800/50 border-primary-500/20" style={{ pointerEvents: 'auto' }}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <span>🎲</span>
                <span>Target: <span className="text-primary text-2xl font-extrabold">{diceTarget}</span></span>
              </label>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="px-2 py-1 bg-primary-500/20 border border-primary-500/30 rounded">
                  <span className="text-gray-400">Win: </span>
                  <span className="text-primary-300 font-bold">{diceRollUnder ? parseInt(diceTarget) : 100 - parseInt(diceTarget)}%</span>
                </div>
                <div className="px-2 py-1 bg-primary-500/20 border border-primary-500/30 rounded">
                  <span className="text-gray-400">Multi: </span>
                  <span className="text-primary-300 font-bold">{diceRollUnder 
                    ? (100 / parseInt(diceTarget)).toFixed(2)
                    : (100 / (100 - parseInt(diceTarget))).toFixed(2)
                  }x</span>
                </div>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="99"
              value={diceTarget}
              onChange={(e) => {
                e.stopPropagation()
                setDiceTarget(e.target.value)
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              disabled={loading || diceRolling}
              style={{ pointerEvents: (loading || diceRolling) ? 'none' : 'auto' }}
              className="w-full h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>1</span>
              <span>99</span>
            </div>
          </div>

          {/* Roll Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!loading && !diceRolling) {
                handlePlayDice()
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            disabled={loading || diceRolling}
            style={{ pointerEvents: (loading || diceRolling) ? 'none' : 'auto', zIndex: 50 }}
            className="btn-primary w-full py-3 text-base font-extrabold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative z-50 rounded-lg border-2 border-primary-400/30 shadow-lg hover:shadow-xl hover:scale-102 transition-all duration-300"
          >
            {diceRolling ? "🎲 ROLLING..." : loading ? "⏳ WAITING..." : "🎲 ROLL DICE"}
          </button>

          {/* Loading State - Waiting for wallet confirmation */}
          {loading && !diceRolling && !gameResult?.pending && (
            <div className="text-center py-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-400"></div>
              <p className="text-gray-400 mt-2 text-sm">Waiting for wallet confirmation...</p>
            </div>
          )}

          {/* Loading State - Waiting for VRF */}
          {gameResult?.pending && (
            <div className="text-center py-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-400"></div>
              <p className="text-gray-400 mt-2 text-sm">Waiting for VRF fulfillment...</p>
              <p className="text-gray-500 mt-1 text-xs">Game ID: {gameResult.gameId}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: CasinoGameType.PLINKO,
      name: 'Plinko',
      icon: FaCircle,
      description: 'Drop the ball and watch it bounce!',
      payout: 'Up to 1000x',
      color: 'from-green-500 to-emerald-500',
      component: (
        <div className="space-y-3 relative z-10" style={{ pointerEvents: 'auto' }}>
          {/* Plinko Board */}
          <div className="flex justify-center py-3 pointer-events-none">
            <Plinko 
              result={plinkoResult} 
              rows={parseInt(plinkoRows) || 12}
              isDropping={plinkoDropping}
              onAnimationEnd={handlePlinkoAnimationEnd}
            />
          </div>

          {/* Controls */}
          <div className="relative z-10 card p-4 bg-dark-800/50 border-green-500/20" style={{ pointerEvents: 'auto' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <span>📊</span>
                <span>Rows: <span className="text-primary text-xl font-extrabold">{plinkoRows}</span></span>
              </label>
              <div className="text-[10px] text-gray-400 font-semibold">
                More rows = Higher risk/reward
              </div>
            </div>
            <input
              type="range"
              min="8"
              max="16"
              value={plinkoRows}
              onChange={(e) => {
                e.stopPropagation()
                setPlinkoRows(e.target.value)
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              disabled={loading || plinkoDropping}
              style={{ pointerEvents: (loading || plinkoDropping) ? 'none' : 'auto' }}
              className="w-full h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span className="px-1.5 py-0.5 bg-dark-700/50 rounded">8 (Safer)</span>
              <span className="px-1.5 py-0.5 bg-dark-700/50 rounded">16 (Riskier)</span>
            </div>
          </div>

          {/* Drop Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!loading && !plinkoDropping) {
                handlePlayPlinko()
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            disabled={loading || plinkoDropping}
            style={{ pointerEvents: (loading || plinkoDropping) ? 'none' : 'auto', zIndex: 50 }}
            className="btn-primary w-full py-3 text-base font-extrabold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative z-50 rounded-lg border-2 border-green-400/30 shadow-lg hover:shadow-xl hover:scale-102 transition-all duration-300"
          >
            {plinkoDropping ? "🎯 DROPPING..." : loading ? "⏳ WAITING..." : "🎯 DROP BALL"}
          </button>

          {/* Loading State - Waiting for wallet confirmation */}
          {loading && !plinkoDropping && !gameResult?.pending && (
            <div className="text-center py-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
              <p className="text-gray-400 mt-2 text-sm">Waiting for wallet confirmation...</p>
            </div>
          )}

          {/* Loading State - Waiting for VRF */}
          {gameResult?.pending && (
            <div className="text-center py-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
              <p className="text-gray-400 mt-2 text-sm">Waiting for VRF fulfillment...</p>
              <p className="text-gray-500 mt-1 text-xs">Game ID: {gameResult.gameId}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: CasinoGameType.SLOTS,
      name: 'Slots',
      icon: FaDiceFive,
      description: 'Match 3 symbols to win big!',
      payout: 'Up to 25x',
      color: 'from-pink-500 to-rose-500',
      component: (
        <div className="space-y-3 relative z-10" style={{ pointerEvents: 'auto' }}>
          {/* Slots Machine */}
          <div className="flex justify-center py-3 pointer-events-none">
            <Slots 
              result={slotsResult} 
              isSpinning={slotsSpinning}
              onAnimationEnd={handleSlotsAnimationEnd}
            />
          </div>

          {/* Controls */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!loading && !slotsSpinning) {
                handlePlaySlots()
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            disabled={loading || slotsSpinning}
            style={{ pointerEvents: (loading || slotsSpinning) ? 'none' : 'auto' }}
            className="btn-primary w-full py-3 text-base font-extrabold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative z-10 rounded-lg border-2 border-pink-400/30 shadow-lg hover:shadow-xl hover:scale-102 transition-all duration-300"
          >
            {slotsSpinning ? "🎰 SPINNING..." : loading ? "⏳ WAITING..." : "🎰 SPIN REELS"}
          </button>


          {/* Loading State - Waiting for wallet confirmation */}
          {loading && !slotsSpinning && !gameResult?.pending && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
              <p className="text-gray-400 mt-2">Waiting for wallet confirmation...</p>
            </div>
          )}

          {/* Loading State - Waiting for VRF */}
          {gameResult?.pending && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
              <p className="text-gray-400 mt-2">Waiting for VRF fulfillment...</p>
              <p className="text-gray-500 mt-1 text-xs">Game ID: {gameResult.gameId}</p>
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <Head>
        <title>MonFair | Casino Platform</title>
        <meta
          name="description"
          content="Decentralized, provably fair on-chain casino platform on Monad"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="py-16 px-4 min-h-screen relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="lg:w-4/5 w-full mx-auto relative z-10" style={{ pointerEvents: 'auto' }}>
          {/* Header */}
          <div className="mb-16 text-center">
            <div className="inline-block mb-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-3 tracking-tight font-display">
                <span className="bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-300 bg-clip-text text-transparent animate-gradient drop-shadow-lg">
                  🎰 Casino Platform
                </span>
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 mx-auto rounded-full shadow-lg shadow-primary-500/50"></div>
            </div>
            <p className="text-gray-100 text-base md:text-lg font-medium mb-6 tracking-wide leading-relaxed">
              Decentralized, Provably Fair On-Chain Casino on Monad
            </p>
            
            {/* Treasury Balance */}
            {!loadingConfigs && (
              <div className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-dark-800/90 to-dark-900/90 backdrop-blur-xl border-2 border-primary-500/30 rounded-xl shadow-xl shadow-primary-500/20">
                <div className="p-2 bg-primary-500/20 rounded-lg">
                  <FaTrophy className="text-primary-400 text-base" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] md:text-xs text-gray-400 font-semibold uppercase tracking-wider">Treasury Balance</div>
                  <div className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                    {treasuryBalance} MON
                  </div>
                </div>
              </div>
            )}

            {!isConnected && (
              <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-warning-900/40 to-warning-800/40 backdrop-blur-xl border-2 border-warning-500/50 rounded-xl shadow-xl max-w-md">
                <div className="text-lg">⚠️</div>
                <p className="text-warning-300 text-sm md:text-base font-semibold">Please connect your wallet to play</p>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loadingConfigs ? (
            <div className="text-center py-20">
              <div className="inline-block relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500/30 border-t-primary-500"></div>
                <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-r-secondary-500/50" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <p className="text-gray-300 mt-6 text-base md:text-lg font-semibold">Loading casino games...</p>
              <p className="text-gray-500 mt-2 text-xs md:text-sm">Please wait while we prepare the games</p>
            </div>
          ) : (
            <>
              {/* Game Selection */}
              {!selectedGame ? (
                <div className="space-y-6 mb-12">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <div className="relative bg-gradient-to-br from-dark-900/95 via-dark-800/95 to-dark-900/95 backdrop-blur-2xl border border-dark-700/80 rounded-3xl p-0 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="bg-gradient-to-r from-dark-800/80 to-dark-700/80 border-b border-dark-600/50">
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Game</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Payout</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Min Bet</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Max Bet</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">House Edge</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Status</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-700/50">
                            {games.map((game, index) => {
                              const Icon = game.icon
                              const config = gameConfigs[game.id]
                              return (
                                <tr
                                  key={game.id}
                                  className={`${
                                    loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                  onClick={() => !loading && !config?.paused && setSelectedGame(game.id)}
                                  style={{ pointerEvents: loading || config?.paused ? 'none' : 'auto' }}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3 min-w-[200px]">
                                      <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br ${game.color} rounded-lg flex-shrink-0`}>
                                        <Icon size={20} className="text-white" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-gray-100 mb-0.5 truncate">{game.name}</h3>
                                        <p className="text-[10px] text-gray-400 truncate">{game.description}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-1 bg-primary-500/20 border border-primary-500/30 rounded-lg">
                                      <span className="text-xs font-bold text-primary-300">{game.payout}</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    {config ? (
                                      <span className="text-xs font-semibold text-gray-200">{parseFloat(config.minBet).toFixed(2)} MON</span>
                                    ) : (
                                      <span className="text-[10px] text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    {config ? (
                                      <span className="text-xs font-semibold text-gray-200">{parseFloat(config.maxBet).toFixed(2)} MON</span>
                                    ) : (
                                      <span className="text-[10px] text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    {config ? (
                                      <span className="text-xs font-semibold text-gray-300">{(config.houseEdgeBps / 100).toFixed(2)}%</span>
                                    ) : (
                                      <span className="text-[10px] text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    {config?.paused ? (
                                      <span className="inline-flex items-center px-2 py-0.5 bg-warning-500/20 border border-warning-500/30 rounded">
                                        <span className="text-[10px] font-bold text-warning-400">PAUSED</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded">
                                        <span className="text-[10px] font-bold text-green-400">ACTIVE</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (!loading && !config?.paused) {
                                          setSelectedGame(game.id)
                                        }
                                      }}
                                      disabled={loading || config?.paused}
                                      className="px-3 py-1.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg border border-primary-400/50"
                                      style={{ pointerEvents: loading || config?.paused ? 'none' : 'auto' }}
                                    >
                                      Play
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile/Tablet Card View */}
                  <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {games.map((game) => {
                      const Icon = game.icon
                      const config = gameConfigs[game.id]
                      return (
                        <div
                          key={game.id}
                          onClick={() => !loading && !config?.paused && setSelectedGame(game.id)}
                          className={`relative bg-gradient-to-br from-dark-900/95 via-dark-800/95 to-dark-900/95 backdrop-blur-2xl border-2 border-dark-700/80 rounded-3xl p-5 cursor-pointer ${
                            loading || config?.paused ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          style={{ pointerEvents: loading || config?.paused ? 'none' : 'auto' }}
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${game.color} rounded-xl flex-shrink-0`}>
                              <Icon size={24} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-100 mb-1 truncate">{game.name}</h3>
                              <p className="text-xs text-gray-400 line-clamp-2">{game.description}</p>
                            </div>
                          </div>
                          
                          {config && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-dark-800/50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-1">Payout</div>
                                <div className="text-sm font-bold text-primary-300">{game.payout}</div>
                              </div>
                              <div className="bg-dark-800/50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-1">House Edge</div>
                                <div className="text-sm font-bold text-gray-200">{(config.houseEdgeBps / 100).toFixed(2)}%</div>
                              </div>
                              <div className="bg-dark-800/50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-1">Min Bet</div>
                                <div className="text-sm font-bold text-gray-200">{config ? parseFloat(config.minBet).toFixed(2) : '1.00'} MON</div>
                              </div>
                              <div className="bg-dark-800/50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-1">Max Bet</div>
                                <div className="text-sm font-bold text-gray-200">{config ? parseFloat(config.maxBet).toFixed(2) : '500.00'} MON</div>
                              </div>
                            </div>
                          )}
                          
                          {config?.paused ? (
                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-warning-500/20 border border-warning-500/30 rounded-lg">
                              <span className="text-xs font-bold text-warning-400">⚠️ PAUSED</span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!loading) {
                                  setSelectedGame(game.id)
                                }
                              }}
                              disabled={loading}
                              className="w-full py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg border border-primary-400/50"
                              style={{ pointerEvents: loading ? 'none' : 'auto' }}
                            >
                              Play Now
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Back Button */}
                  <button
                    onClick={() => {
                      setSelectedGame(null)
                      setGameResult(null)
                    }}
                    disabled={loading}
                    className="btn-outline flex items-center gap-2 disabled:opacity-50"
                  >
                    <FaArrowLeft /> Back to Games
                  </button>

                  {/* Selected Game */}
                  {(() => {
                    const game = games.find((g) => g.id === selectedGame)
                    if (!game) return null

                    const Icon = game.icon
                    const config = gameConfigs[game.id]
                    return (
                      <div className="card p-3.5 rounded-xl bg-dark-900/85 border border-dark-700/70">
                        <div className="flex items-center gap-3 mb-3.5">
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 bg-gradient-to-br ${game.color} rounded-lg flex items-center justify-center`}>
                              <Icon size={24} className="text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-white mb-0.5 tracking-tight font-display truncate">{game.name}</h2>
                            <p className="text-white/85 text-xs font-medium truncate">{game.description}</p>
                            <span className={`inline-flex mt-1 px-2 py-0.5 text-[10px] font-bold rounded bg-gradient-to-r ${game.color} text-white/90`}>
                              Theme
                            </span>
                          </div>
                          {config && (
                            <div className="hidden sm:flex flex-col items-end gap-0.5 text-[10px] text-white/80">
                              <div>Min: 1.00</div>
                              <div>Edge: {(config.houseEdgeBps / 100).toFixed(2)}%</div>
                            </div>
                          )}
                        </div>

                        {config?.paused ? (
                          <div className="bg-warning-900/30 border border-warning-800 rounded-xl p-6 text-center">
                            <p className="text-warning-400 font-semibold text-lg">
                              ⚠️ This game is currently paused
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Bet Amount Input */}
                            <div className="card p-3 mb-3 border-primary-500/20 bg-gradient-to-br from-dark-800/50 to-dark-900/50 backdrop-blur-sm max-w-[440px] w-full mx-auto">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-dark-700/50">
                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-200">
                                  <div className="p-0.5 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded border border-primary-500/30">
                                    <span className="text-xs">💰</span>
                                  </div>
                                  <span>Bet Amount</span>
                                </label>
                                {config && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="px-1.5 py-0.5 bg-dark-700/60 rounded border border-dark-600/50">
                                      <span className="text-[9px] text-gray-400 mr-1">Min:</span>
                                      <span className="text-[10px] font-bold text-primary-300">{parseFloat(config.minBet).toFixed(2)}</span>
                                    </div>
                                    <div className="px-1.5 py-0.5 bg-dark-700/60 rounded border border-dark-600/50">
                                      <span className="text-[9px] text-gray-400 mr-1">Max:</span>
                                      <span className="text-[10px] font-bold text-primary-300">{parseFloat(config.maxBet).toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Input Field */}
                              <div className="mb-2">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={betAmount}
                                    onChange={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setBetAmount(e.target.value)
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                    className="input w-full text-xs font-bold text-center pr-9 py-1.5 relative z-10 bg-dark-900/50 border border-primary-500/30 focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20"
                                    placeholder="1"
                                    disabled={loading}
                                    style={{ pointerEvents: loading ? 'none' : 'auto' }}
                                  />
                                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                    <span className="text-[10px] font-bold text-primary-400">MON</span>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Bet Buttons */}
                              <div>
                                <div className="text-[8.5px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">Quick Bet</div>
                                <div className="grid grid-cols-4 gap-1 relative z-10" style={{ pointerEvents: 'auto' }}>
                                  {['1', '5', '10', '50'].map((amount) => (
                                    <button
                                      key={amount}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (!loading) {
                                          setBetAmount(amount)
                                        }
                                      }}
                                      disabled={loading}
                                      style={{ pointerEvents: loading ? 'none' : 'auto' }}
                                      className={`relative py-1 px-1.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-bold text-[10px] ${
                                        betAmount === amount
                                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white border-primary-400/60'
                                          : 'bg-gradient-to-br from-dark-700/60 to-dark-800/60 text-gray-300 border-dark-600/50'
                                      }`}
                                    >
                                      <span className="block leading-tight">{amount}</span>
                                      <span className="text-[8px] opacity-70 leading-tight">MON</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Game Component */}
                            <div className="bg-dark-900/40 rounded-xl p-3.5 mb-4 relative z-10 max-w-[440px] w-full mx-auto" style={{ pointerEvents: 'auto' }}>
                              {game.component}
                            </div>

                            {/* Game Result */}
                            {gameResult && (
                              <div className={`card p-6 border-2 ${
                                gameResult.won 
                                  ? 'border-success-500/50 bg-gradient-to-br from-success-900/30 to-success-800/20' 
                                  : 'border-error-500/50 bg-gradient-to-br from-error-900/30 to-error-800/20'
                              }`}
                              style={{ pointerEvents: 'auto', position: 'relative' }}
                              >
                                <div className="text-center mb-4 relative z-10">
                                  <div className={`text-4xl mb-3 ${gameResult.won ? 'animate-bounce' : ''}`}>
                                    {gameResult.won ? '🎊' : '😔'}
                                  </div>
                                  <h3 className={`text-xl font-extrabold mb-2 tracking-tight font-display ${
                                    gameResult.won ? 'text-transparent bg-clip-text bg-gradient-to-r from-success-300 to-success-400' : 'text-error-300'
                                  }`}>
                                    {gameResult.won ? '🎉 You Won!' : 'Better Luck Next Time'}
                                  </h3>
                                  {gameResult.won ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-500/20 border-2 border-success-500/40 rounded-lg mb-3">
                                      <span className="text-lg font-bold text-success-200">+{parseFloat(gameResult.payout).toFixed(4)} MON</span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-error-500/20 border-2 border-error-500/40 rounded-lg mb-3">
                                      <span className="text-sm font-bold text-error-300">-{parseFloat(betAmount).toFixed(4)} MON</span>
                                    </div>
                                  )}
                                </div>
                                <div className="bg-dark-900/60 rounded-lg p-3 space-y-2 relative z-10 border border-dark-700/50">
                                  {gameResult.gameId && (
                                    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                                      <span className="text-gray-400 text-xs font-semibold flex items-center gap-1.5">
                                        <span>🎮</span>
                                        <span>Game ID:</span>
                                      </span>
                                      <span className="text-gray-200 text-xs font-bold font-mono">{gameResult.gameId}</span>
                                    </div>
                                  )}
                                  {/* CoinFlip Result */}
                                  {selectedGame === CasinoGameType.COINFLIP && coinResult && (
                                    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                                      <span className="text-gray-400 text-xs font-semibold flex items-center gap-1.5">
                                        <span>🪙</span>
                                        <span>Result:</span>
                                      </span>
                                      <span className="text-gray-200 text-xs font-bold capitalize">{coinResult}</span>
                                    </div>
                                  )}
                                  {/* Dice Result */}
                                  {selectedGame === CasinoGameType.DICE && gameResult.roll !== undefined && (
                                    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                                      <span className="text-gray-400 text-xs font-semibold flex items-center gap-1.5">
                                        <span>🎲</span>
                                        <span>Roll:</span>
                                      </span>
                                      <span className="text-gray-200 text-xs font-bold">{gameResult.roll} (Target: {diceTarget} {diceRollUnder ? 'Under' : 'Over'})</span>
                                    </div>
                                  )}
                                  {/* Plinko Result */}
                                  {selectedGame === CasinoGameType.PLINKO && plinkoResult !== null && (
                                    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                                      <span className="text-gray-400 text-xs font-semibold flex items-center gap-1.5">
                                        <span>📊</span>
                                        <span>Position:</span>
                                      </span>
                                      <span className="text-gray-200 text-xs font-bold">{Math.round(plinkoResult)}</span>
                                    </div>
                                  )}
                                  {/* Slots Result */}
                                  {selectedGame === CasinoGameType.SLOTS && slotsResult && (
                                    <div className="flex items-center justify-between py-1.5 px-2 bg-dark-800/50 rounded border border-dark-700/50">
                                      <span className="text-gray-400 text-xs font-semibold flex items-center gap-1.5">
                                        <span>🎰</span>
                                        <span>Reels:</span>
                                      </span>
                                      <span className="text-gray-200 text-xs font-bold">
                                        {slotsResult.reel1} | {slotsResult.reel2} | {slotsResult.reel3}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Transaction Link */}
                                {gameResult.txHash && (
                                  <div className="mt-3 pt-3 border-t border-dark-700 relative z-50" style={{ pointerEvents: 'auto' }}>
                                    <div className="mb-2">
                                      <div className="text-[10px] text-gray-500 font-semibold mb-1">Transaction:</div>
                                      <div className="text-[10px] text-gray-400 font-mono break-all bg-dark-800/50 px-2 py-1 rounded">
                                        {gameResult.txHash}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        // Get current chainId to determine explorer URL
                                        const isTestnet = chainId === BASE_TESTNET_CHAIN_ID
                                        const explorerBase = isTestnet 
                                          ? 'https://testnet.monadvision.com' 
                                          : 'https://monadvision.com'
                                        const url = `${explorerBase}/tx/${gameResult.txHash}`
                                        console.log('[Casino] Opening transaction:', { txHash: gameResult.txHash, chainId, explorerBase, url })
                                        window.open(url, '_blank')
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 border-2 border-primary-500/40 hover:border-primary-500/60 rounded-lg text-xs font-bold text-primary-300 hover:text-primary-200 transition-all duration-300 cursor-pointer"
                                      style={{ 
                                        pointerEvents: 'auto', 
                                        zIndex: 50, 
                                        position: 'relative'
                                      }}
                                    >
                                      <span>View on MonadVision</span>
                                      <span>→</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* VRF Verification Section */}
                            {gameStateForVerification && selectedGame && (
                              <div className="mt-6">
                                <CasinoVRFVerification 
                                  gameType={selectedGame}
                                  gameState={gameStateForVerification}
                                />
                              </div>
                            )}

                            {loading && (
                              <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                                <p className="text-white/70 mt-4">Processing transaction...</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Info Section */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card group p-6 hover:border-primary-500/50 transition-all duration-300">
                  <div className="mb-3 inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
                    Provably Fair
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    All games use on-chain VRF for verifiable randomness. Every outcome can be independently verified.
                  </p>
                </div>
                
                <div className="card group p-6 hover:border-secondary-500/50 transition-all duration-300">
                  <div className="mb-3 inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-secondary-500/20 to-secondary-600/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-secondary-400 to-secondary-300 bg-clip-text text-transparent">
                    Non-Custodial
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Your funds stay in your wallet. You interact directly with smart contracts - no middleman.
                  </p>
                </div>
                
                <div className="card group p-6 hover:border-accent-500/50 transition-all duration-300 sm:col-span-2 lg:col-span-1">
                  <div className="mb-3 inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-accent-500/20 to-accent-600/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Image 
                      src="/images/monad-icon.png" 
                      alt="Monad" 
                      width={32} 
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-accent-400 to-accent-300 bg-clip-text text-transparent">
                    On Monad
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Fast transactions, low fees. Built on Monad&apos;s high-throughput EVM for the best gaming experience.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CasinoPage
