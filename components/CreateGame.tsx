import { createGame, getActiveGames, getMyGames, getHouseBalance } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { GameParams, RootState, GameType } from '@/utils/type.dt'
import React, { ChangeEvent, FormEvent, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import LoadingButton from './LoadingButton'
import { getErrorMessage } from '@/utils/errorMessages'
import { useChainId } from 'wagmi'
import { BASE_MAINNET_CHAIN_ID } from '@/utils/network'

const CreateGame: React.FC = () => {
  const { createModal } = useSelector((states: RootState) => states.globalStates)
  const dispatch = useDispatch()
  const { setCreateModal } = globalActions
  const chainId = useChainId()

  const [game, setGame] = useState<GameParams>({
    name: '',
    gameType: GameType.AI_VS_PLAYER,
    maxPlayers: 1,
    stake: '',
    durationHours: 0,
    password: '',
  })
  
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single')
  const [durationValue, setDurationValue] = useState<number>(60)
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('minutes')
  const [password, setPassword] = useState<string>('')
  const [usePassword, setUsePassword] = useState<boolean>(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [houseBalance, setHouseBalance] = useState<string | null>(null)
  const [checkingHouseBalance, setCheckingHouseBalance] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setError('') // Clear error on change
    setGame((prevState: GameParams) => ({
      ...prevState,
      [name]: name === 'gameType' ? Number(value) : name === 'maxPlayers' ? Number(value) : value,
    }))
  }

  const closeModal = () => {
    dispatch(setCreateModal('scale-0'))
    setGame({
      name: '',
      gameType: GameType.AI_VS_PLAYER,
      maxPlayers: 1,
      stake: '',
      durationHours: 0,
      password: '',
    })
    setGameMode('single')
    setDurationValue(60)
    setDurationUnit('minutes')
    setPassword('')
    setUsePassword(false)
    setIsSubmitting(false)
    setError('')
  }

  const handleGameCreation = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate game name
    if (!game.name || game.name.trim().length === 0) {
      setError('Please enter a game name')
      return
    }

    if (game.name.trim().length > 50) {
      setError('Game name must be 50 characters or less')
      return
    }

    // Validate stake amount
    const stakeAmount = Number(game.stake)
    if (!game.stake || isNaN(stakeAmount) || stakeAmount < 0.000003) {
      setError('Stake amount must be at least 0.000003 ETH (~$0.01)')
      return
    }

    if (stakeAmount > 500) {
      setError('Stake amount cannot exceed 500 ETH')
      return
    }

    // Check house balance for AI games
    if (gameMode === 'single' && game.gameType === GameType.AI_VS_PLAYER) {
      setCheckingHouseBalance(true)
      try {
        const balance = await getHouseBalance(chainId)
        const balanceNum = parseFloat(balance)
        // House needs to cover potential player win: stake * 1.95 (with 5% house edge)
        // Required: (stake * 1.95) - stake = stake * 0.95
        const requiredBalance = stakeAmount * 0.95
        if (balanceNum < requiredBalance) {
          setError(
            `Insufficient house balance. Required: ${requiredBalance.toFixed(6)} ETH, Available: ${balanceNum.toFixed(6)} ETH. ` +
            `Please try a smaller stake amount or wait for the house balance to be funded.`
          )
          setCheckingHouseBalance(false)
          return
        }
        setHouseBalance(balance)
      } catch (error: any) {
        console.warn('Could not check house balance:', error)
        // Continue anyway, contract will reject if insufficient
      }
      setCheckingHouseBalance(false)
    }

    // Validate based on game mode
    if (gameMode === 'single') {
      // Single player: must be AI_VS_PLAYER with 1 player
      if (game.gameType !== GameType.AI_VS_PLAYER || game.maxPlayers !== 1) {
        setError('Invalid game configuration for single player mode')
        return
      }
      game.durationHours = 0 // No time limit for single player
    } else {
      // Multi player: must be PLAYER_VS_PLAYER with 2-5 players
      if (game.gameType !== GameType.PLAYER_VS_PLAYER) {
        setError('Multi-player games must be Player vs Player mode')
        return
      }
      if (game.maxPlayers < 2 || game.maxPlayers > 5) {
        setError('Multi-player games must have between 2 and 5 players')
        return
      }
      // Calculate duration in hours
      const hours = durationUnit === 'days' ? durationValue * 24 : durationUnit === 'hours' ? durationValue : durationValue / 60
      if (!hours || hours <= 0) {
        setError('Game duration must be greater than 0')
        return
      }
      if (hours > 720) { // 30 days max
        setError('Game duration cannot exceed 30 days (720 hours)')
        return
      }
      if (hours < 1/60) { // Minimum 1 minute
        setError('Game duration must be at least 1 minute')
        return
      }
      game.durationHours = hours
    }

    // Validate password if enabled
    if (gameMode === 'multi' && usePassword) {
      if (!password || password.trim().length === 0) {
        setError('Please enter a password or disable password protection')
        return
      }
      if (password.trim().length > 50) {
        setError('Password must be 50 characters or less')
        return
      }
      game.password = password.trim()
    } else {
      game.password = ''
    }

    setIsSubmitting(true)

    try {
      console.log('[CreateGame] Creating game...')
      const result = await createGame(game)
      let txHash: string
      let gameId: number | null = null
      
      // Parse result (could be string hash or JSON with hash and gameId)
      try {
        const parsed = JSON.parse(result)
        txHash = parsed.hash
        gameId = parsed.gameId || null
        console.log('[CreateGame] Game created! Hash:', txHash, 'Game ID:', gameId)
      } catch {
        // Legacy format: just the hash
        txHash = result
        console.log('[CreateGame] Game created! Hash:', txHash)
      }
      
      closeModal()
      
      // Use chainId from hook (already network-aware)
      const currentChainId = chainId || BASE_MAINNET_CHAIN_ID
      console.log('[CreateGame] Using chainId from hook:', currentChainId, '(Base Mainnet)')
      
      // Validate chainId
      let validChainId = currentChainId
      if (currentChainId !== BASE_MAINNET_CHAIN_ID) {
        console.warn('[CreateGame] Invalid chainId, defaulting to mainnet:', currentChainId)
        validChainId = BASE_MAINNET_CHAIN_ID
      }
      
      // Get player address for localStorage
      let playerAddress = ''
      try {
        const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null
        const accounts = await ethereum?.request?.({ method: 'eth_accounts' })
        if (accounts?.length > 0) {
          playerAddress = accounts[0]
        }
      } catch (e) {
        console.warn('[CreateGame] Could not get player address:', e)
      }
      
      // Dispatch custom event to notify pages immediately
      const gameCreatedEvent = new CustomEvent('gameCreated', { detail: { chainId: validChainId, gameId } })
      window.dispatchEvent(gameCreatedEvent)
      
      // Also set storage event for cross-tab communication
      localStorage.setItem('gameCreated', JSON.stringify({ chainId: validChainId, gameId, timestamp: Date.now() }))
      
      // Verify gameId is valid before redirecting
      // If gameId is null, try multiple methods to get it
      if (!gameId) {
        console.log('[CreateGame] ⚠️ Game ID not found in event, trying alternative methods...')
        
        // Method 1: Use getGameCount (most reliable - returns _gameIdCounter)
        try {
          await new Promise(resolve => setTimeout(resolve, 15000)) // Wait 15 seconds for indexing (createGame waits 12s)
          const { getReadOnlyContract } = await import('@/services/blockchain')
          const contract = await getReadOnlyContract(validChainId)
          const gameCount = await contract.getGameCount()
          if (gameCount !== null && gameCount !== undefined) {
            const countNum = Number(gameCount)
            if (countNum > 0) {
              gameId = countNum
              console.log('[CreateGame] ✅ Got game ID from getGameCount (method 1 - MOST RELIABLE):', gameId)
            }
          }
        } catch (e) {
          console.warn('[CreateGame] Could not get game ID from getGameCount (method 1):', e)
        }
        
        // Method 2: Try getActiveGames (fallback)
        if (!gameId) {
          try {
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 more seconds
            const activeGames = await getActiveGames(validChainId)
            if (activeGames && activeGames.length > 0) {
              // Get the highest game ID (likely the one we just created)
              const gameIds = activeGames.map(g => g.id).filter((id: number) => id > 0)
              if (gameIds.length > 0) {
                gameId = Math.max(...gameIds)
                console.log('[CreateGame] ✅ Got game ID from getActiveGames (method 2):', gameId)
              }
            }
          } catch (e) {
            console.warn('[CreateGame] Could not get game ID from getActiveGames (method 2):', e)
          }
        }
        
        // Method 3: Try getActiveGames one more time
        if (!gameId) {
          try {
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 more seconds
            const activeGames = await getActiveGames(validChainId)
            if (activeGames && activeGames.length > 0) {
              const gameIds = activeGames.map(g => g.id).filter((id: number) => id > 0)
              if (gameIds.length > 0) {
                gameId = Math.max(...gameIds)
                console.log('[CreateGame] ✅ Got game ID from getActiveGames (method 3):', gameId)
              }
            }
          } catch (e) {
            console.warn('[CreateGame] Could not get game ID from getActiveGames (method 3):', e)
          }
        }
        
        // If still no gameId, show error but don't redirect
        if (!gameId) {
          console.error('[CreateGame] ❌ Could not get game ID from any method!')
          setError('Game created but could not get game ID. Please check "My Games" page in a few moments.')
          setIsSubmitting(false)
          return
        }
      }
      
      // CRITICAL: Verify gameId is valid by checking with getGameCount
      if (gameId) {
        try {
          const { getReadOnlyContract } = await import('@/services/blockchain')
          const contract = await getReadOnlyContract(validChainId)
          const gameCount = await contract.getGameCount().catch(() => null)
          if (gameCount !== null) {
            const maxGameId = Number(gameCount)
            // Game ID should be <= maxGameId (or maxGameId + 1 if still indexing)
            if (gameId > maxGameId + 2) {
              console.error(`[CreateGame] ❌ Game ID ${gameId} is invalid! Max game ID is ${maxGameId}`)
              setError(`Invalid game ID ${gameId}. Please check "My Games" page.`)
              setIsSubmitting(false)
              return
            } else if (gameId > maxGameId) {
              // Game ID is slightly higher than maxGameId - might still be indexing
              console.log(`[CreateGame] ⚠️ Game ID ${gameId} is higher than maxGameId ${maxGameId}. Waiting for indexing...`)
              // Wait a bit more and use maxGameId instead
              await new Promise(resolve => setTimeout(resolve, 5000))
              const updatedGameCount = await contract.getGameCount().catch(() => null)
              if (updatedGameCount !== null) {
                const updatedMaxGameId = Number(updatedGameCount)
                if (gameId <= updatedMaxGameId) {
                  console.log(`[CreateGame] ✅ Game ID ${gameId} is now valid (maxGameId updated to ${updatedMaxGameId})`)
                } else if (gameId > updatedMaxGameId + 1) {
                  // Still invalid, use maxGameId
                  console.log(`[CreateGame] ⚠️ Game ID ${gameId} still invalid. Using maxGameId ${updatedMaxGameId} instead.`)
                  gameId = updatedMaxGameId
                }
              }
            } else {
              console.log(`[CreateGame] ✅ Game ID ${gameId} verified (maxGameId: ${maxGameId})`)
            }
          }
        } catch (e) {
          console.warn('[CreateGame] Could not verify game ID with getGameCount:', e)
          // Continue anyway - might be a contract version issue
        }
      }
      
      // If we have gameId, try to save to localStorage first, then redirect
      if (gameId && playerAddress) {
        console.log('[CreateGame] Saving game to localStorage before redirect...')
        try {
          // Try to fetch and save game immediately (with timeout)
          const { getGame } = await import('@/services/blockchain')
          const { saveGameToStorage } = await import('@/utils/gameStorage')
          
          // Wait longer for transaction to be indexed (newly created games need more time)
          // Increased to 15 seconds to ensure blockchain indexing (createGame waits 12s)
          await new Promise(resolve => setTimeout(resolve, 15000))
          
          try {
            // Try to fetch game with retry (getGame has built-in retry)
            const game = await getGame(gameId, validChainId)
            if (game) {
              saveGameToStorage(game, validChainId, playerAddress)
              console.log('[CreateGame] ✅ Saved game to localStorage:', gameId)
            }
          } catch (e) {
            console.warn('[CreateGame] Could not fetch game, will save later:', e)
            // Create a minimal game object for localStorage
            const minimalGame = {
              id: gameId,
              name: game.name || `Game #${gameId}`,
              creator: playerAddress,
              gameType: game.gameType,
              status: 0, // CREATED
              stake: parseFloat(game.stake.toString()) || 0,
              totalPrize: 0,
              maxPlayers: game.maxPlayers,
              currentPlayers: 1,
              createdAt: Date.now(),
              startedAt: 0,
              completedAt: 0,
              endTime: 0,
              winner: '0x0000000000000000000000000000000000000000',
              winnerFlipCount: 0,
              vrfRequestId: '0x',
              cardOrder: [],
              vrfFulfilled: false,
              players: [playerAddress],
            }
            saveGameToStorage(minimalGame as any, validChainId, playerAddress)
            console.log('[CreateGame] ✅ Saved minimal game to localStorage:', gameId)
          }
        } catch (e) {
          console.warn('[CreateGame] Error saving to localStorage:', e)
        }
        
        // Redirect after saving
        console.log('[CreateGame] Redirecting to game page:', `/gameplay/${gameId}`)
        window.location.href = `/gameplay/${gameId}`
        return // Don't continue with refresh logic
      } else if (gameId) {
        // gameId var ama playerAddress yok, yine de yönlendir
        console.log('[CreateGame] Redirecting to game page (no player address):', `/gameplay/${gameId}`)
        window.location.href = `/gameplay/${gameId}`
        return
      }
      
      // If no gameId, wait a bit for the transaction to be indexed, then refresh
      console.log('[CreateGame] No gameId yet, waiting for transaction to be indexed...')
      setTimeout(async () => {
        try {
          // Try to get gameId from getActiveGames (fallback)
          if (!gameId) {
            try {
              const activeGames = await getActiveGames(validChainId)
              if (activeGames && activeGames.length > 0) {
                // Get the highest game ID (likely the one we just created)
                const gameIds = activeGames.map(g => g.id).filter((id: number) => id > 0)
                if (gameIds.length > 0) {
                  const latestGameId = Math.max(...gameIds)
                  console.log('[CreateGame] Found latest game ID:', latestGameId)
                  // Redirect to the latest game
                  window.location.href = `/gameplay/${latestGameId}`
                  return
                }
              }
            } catch (e) {
              console.warn('[CreateGame] Could not get latest game ID:', e)
            }
          }
          
          // Refresh games list based on current page
          if (window.location.pathname === '/games') {
            // On My Games page, refresh my games
            console.log('[CreateGame] Refreshing my games for chainId:', validChainId)
            const myGames = await getMyGames(undefined, validChainId)
            console.log('[CreateGame] Found', myGames.length, 'my games after refresh')
            dispatch(globalActions.setGames(myGames))
          } else {
            // On home page or other pages, refresh active games
            console.log('[CreateGame] Refreshing active games for chainId:', validChainId)
            const updatedGames = await getActiveGames(validChainId)
            console.log('[CreateGame] Found', updatedGames.length, 'active games after refresh')
            dispatch(globalActions.setGames(updatedGames))
          }
        } catch (error) {
          console.error('[CreateGame] Error refreshing games list:', error)
          // Still dispatch event even on error
          const gameCreatedEvent = new CustomEvent('gameCreated', { detail: { chainId: validChainId } })
          window.dispatchEvent(gameCreatedEvent)
          // Fallback to page reload
          console.log('[CreateGame] Falling back to page reload')
          window.location.reload()
        }
      }, 8000) // Wait 8 seconds for transaction to be indexed
    } catch (error: any) {
      const errorMsg = getErrorMessage(error)
      console.error('[CreateGame] Error creating game:', errorMsg)
      setError(errorMsg)
      setIsSubmitting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on child elements
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }

  // Don't render if modal is closed
  if (createModal === 'scale-0') {
    return null
  }

  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
    bg-black/60 backdrop-blur-sm transform z-50 transition-transform duration-300 ${createModal}`}
      onClick={handleBackdropClick}
    >
      <div 
        className="card w-11/12 md:w-2/5 max-h-[90vh] overflow-y-auto scrollbar-hide border-2 border-primary-500/20 shadow-2xl relative"
        onClick={(e) => {
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        style={{ pointerEvents: 'auto', zIndex: 60 }}
      >
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-1 tracking-tight font-display">Create New Game</h2>
              <p className="text-gray-300 text-xs md:text-sm font-medium tracking-wide">Start your gaming adventure</p>
            </div>
            <button
              onClick={closeModal}
              className="p-3 hover:bg-dark-800 rounded-xl transition-all text-gray-400 hover:text-gray-200 hover:scale-110"
              disabled={isSubmitting}
            >
              <FaTimes size={22} />
            </button>
          </div>

          <form
            className="flex flex-col justify-center items-start relative"
            onSubmit={handleGameCreation}
            onClick={(e) => {
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            style={{ pointerEvents: 'auto', zIndex: 70 }}
          >
            <div className="w-full mb-6">
              <label className="text-sm font-bold text-gray-100 mb-3 block flex items-center gap-2 tracking-wide">
                <span className="text-primary-400">📝</span>
                Game Name
              </label>
              <input
                placeholder="Enter a custom name for your game"
                type="text"
                className="input text-sm md:text-base font-medium"
                name="name"
                value={game.name}
                onChange={handleChange}
                maxLength={50}
                required
                disabled={isSubmitting}
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-2 px-2 font-medium">✨ Give your game a memorable name!</p>
            </div>

            <div className="w-full mb-6">
              <label className="text-sm font-bold text-gray-100 mb-3 block flex items-center gap-2 tracking-wide">
                <span className="text-primary-400">🎮</span>
                Game Mode
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setGameMode('single')
                  setGame({
                    ...game,
                    gameType: GameType.AI_VS_PLAYER,
                    maxPlayers: 1,
                    durationHours: 0,
                    password: '',
                  })
                  setUsePassword(false)
                  setPassword('')
                  setError('')
                }}
                  className={`flex-1 py-3 px-5 rounded-xl font-bold transition-all duration-300 text-sm md:text-base ${
                    gameMode === 'single'
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105'
                      : 'bg-dark-800/60 text-gray-400 hover:bg-dark-700/60 border border-dark-700/50 hover:scale-105'
                  }`}
                  disabled={isSubmitting}
                >
                  🎯 Single Player
                </button>
                <button
                  type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setGameMode('multi')
                  setGame({
                    ...game,
                    gameType: GameType.PLAYER_VS_PLAYER,
                    maxPlayers: 2,
                    durationHours: durationUnit === 'days' ? durationValue * 24 : durationUnit === 'hours' ? durationValue : durationValue / 60,
                    password: '',
                  })
                  setUsePassword(false)
                  setPassword('')
                  setError('')
                }}
                  className={`flex-1 py-3 px-5 rounded-xl font-bold transition-all duration-300 text-sm md:text-base ${
                    gameMode === 'multi'
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105'
                      : 'bg-dark-800/60 text-gray-400 hover:bg-dark-700/60 border border-dark-700/50 hover:scale-105'
                  }`}
                  disabled={isSubmitting}
                >
                  👥 Multi Player
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 px-2 font-medium">
                {gameMode === 'multi' && '⚡ Play with other players - fastest player wins'}
              </p>
            </div>

            {gameMode === 'multi' && (
              <>
                <div className="w-full mb-6">
                  <label className="text-sm font-bold text-gray-100 mb-3 block flex items-center gap-2 tracking-wide">
                    <span className="text-primary-400">👥</span>
                    Number of Players
                  </label>
                  <select
                    name="maxPlayers"
                    value={game.maxPlayers}
                    onChange={handleChange}
                    className="input text-sm md:text-base font-medium"
                    required
                    disabled={isSubmitting}
                  >
                    <option value={2}>2 Players</option>
                    <option value={3}>3 Players</option>
                    <option value={4}>4 Players</option>
                    <option value={5}>5 Players</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-2 px-2 font-medium">⚡ Fastest player wins the entire prize pool</p>
                </div>

                <div className="w-full mb-6">
                  <label className="text-sm font-bold text-gray-100 mb-3 block flex items-center gap-2 tracking-wide">
                    <span className="text-primary-400">🔒</span>
                    Password Protection (Optional)
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => {
                        setUsePassword(e.target.checked)
                        if (!e.target.checked) {
                          setPassword('')
                          setGame({ ...game, password: '' })
                        }
                        setError('')
                      }}
                      className="w-5 h-5 rounded border-dark-700 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-300">Enable password protection</span>
                  </div>
                  {usePassword && (
                    <input
                      type="password"
                      placeholder="Enter game password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setGame({ ...game, password: e.target.value.trim() })
                        setError('')
                      }}
                      className="input text-sm md:text-base font-medium"
                      maxLength={50}
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  )}
                  <p className="text-xs text-gray-400 mt-2 px-2 font-medium">🔐 Only players with the password can join this game</p>
                </div>

                <div className="w-full mb-6">
                  <label className="text-sm font-bold text-gray-100 mb-3 block flex items-center gap-2 tracking-wide">
                    <span className="text-primary-400">⏰</span>
                    Game Duration
                  </label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <input
                      type="number"
                      value={durationValue}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setDurationValue(value)
                        const hours = durationUnit === 'days' ? value * 24 : durationUnit === 'hours' ? value : value / 60
                        setGame({ ...game, durationHours: hours })
                        setError('')
                      }}
                      className="input text-lg font-medium"
                      placeholder={durationUnit === 'days' ? 'Days' : durationUnit === 'hours' ? 'Hours' : 'Minutes'}
                      min={1}
                      max={durationUnit === 'days' ? 30 : durationUnit === 'hours' ? 720 : 43200}
                      required={gameMode === 'multi'}
                      disabled={isSubmitting}
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => {
                        const unit = e.target.value as 'minutes' | 'hours' | 'days'
                        setDurationUnit(unit)
                        const hours = unit === 'days' ? durationValue * 24 : unit === 'hours' ? durationValue : durationValue / 60
                        setGame({ ...game, durationHours: hours })
                        setError('')
                      }}
                      className="input text-lg font-medium"
                      disabled={isSubmitting}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                    <div className="flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20">
                      <span className="text-sm font-bold text-primary-300">
                        {durationUnit === 'days' 
                          ? `${durationValue * 24} hours`
                          : durationUnit === 'hours'
                          ? `${durationValue} hours`
                          : `${Math.floor(durationValue / 60)}h ${durationValue % 60}m`}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 px-2 font-medium">
                    ⏱️ Game will automatically end after {durationValue} {durationUnit === 'days' ? 'day(s)' : durationUnit === 'hours' ? 'hour(s)' : 'minute(s)'}. Fastest player at that time wins.
                  </p>
                </div>
              </>
            )}

            <div className="w-full mb-8">
              <label className="text-sm font-bold text-gray-100 mb-3 block flex items-center gap-2 tracking-wide">
                <span className="text-primary-400">💰</span>
                Stake Amount (ETH)
              </label>
              <input
                placeholder="Minimum 0.000003 ETH (~$0.01)"
                type="number"
                className="input text-sm md:text-base font-medium"
                name="stake"
                value={game.stake}
                onChange={async (e) => {
                  handleChange(e)
                  // Reset house balance when stake changes
                  setHouseBalance(null)
                  // Check house balance for AI games
                  if (gameMode === 'single' && game.gameType === GameType.AI_VS_PLAYER && e.target.value) {
                    const stakeValue = Number(e.target.value)
                    if (!isNaN(stakeValue) && stakeValue >= 0.000003) {
                      setCheckingHouseBalance(true)
                      try {
                        const balance = await getHouseBalance(chainId)
                        setHouseBalance(balance)
                      } catch (error) {
                        console.warn('Could not check house balance:', error)
                      }
                      setCheckingHouseBalance(false)
                    }
                  }
                }}
                step={0.000001}
                min={0.000003}
                max={500}
                required
                disabled={isSubmitting || checkingHouseBalance}
                autoComplete="off"
              />
              {checkingHouseBalance && (
                <p className="text-xs text-yellow-400 mt-2 px-2 font-medium animate-pulse">
                  ⏳ Checking house balance...
                </p>
              )}
              {houseBalance && gameMode === 'single' && !checkingHouseBalance && (
                <p className="text-xs text-green-400 mt-2 px-2 font-medium">
                  ✅ House balance: {parseFloat(houseBalance).toFixed(6)} ETH (sufficient for this stake)
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2 px-2 font-medium">
                {game.gameType === GameType.AI_VS_PLAYER
                  ? '🤖 If you win, you receive 1.95x your stake (5% house edge). If AI wins, your stake goes to house.'
                  : '🏆 Fastest player wins the entire prize pool'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="w-full mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div className="w-full pt-4 border-t border-dark-700/50">
              <LoadingButton
                type="submit"
                onClick={async () => {
                  // This will be handled by form submit
                  return undefined
                }}
                disabled={isSubmitting}
                className="btn-primary w-full font-bold text-sm md:text-base"
              >
                {isSubmitting ? 'Creating...' : '🚀 Create Game'}
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateGame
