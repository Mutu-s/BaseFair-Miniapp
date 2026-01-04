import { ethers } from 'ethers'
import { getCasinoTreasuryAddress, getCasinoGameAddress, BASE_MAINNET_CHAIN_ID, BASE_TESTNET_CHAIN_ID } from '../utils/network'

// Helper to get provider (works on both client and server)
const getProvider = () => {
  if (typeof window === 'undefined') {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'
    return new ethers.JsonRpcProvider(rpcUrl)
  }
  
  // Client-side: use window.ethereum
  if ((window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum)
  }
  
  // Fallback
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc3.monad.xyz'
  return new ethers.JsonRpcProvider(rpcUrl)
}

// Helper to get signer (client-side only)
const getSigner = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Signer not available on server-side')
  }
  
  if (!(window as any).ethereum) {
    throw new Error('Please install MetaMask or another Web3 wallet')
  }
  
  // Request account access if needed
  try {
    await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
  } catch (error) {
    throw new Error('Please connect your wallet')
  }
  
  const provider = new ethers.BrowserProvider((window as any).ethereum)
  const signer = await provider.getSigner()
  
  // Verify signer has an address
  const address = await signer.getAddress()
  if (!address) {
    throw new Error('Wallet not connected. Please connect your wallet.')
  }
  
  return signer
}

// Casino Game Types
export enum CasinoGameType {
  COINFLIP = 'CoinFlip',
  DICE = 'Dice',
  PLINKO = 'Plinko',
  CRASH = 'Crash',
  SLOTS = 'Slots',
  JACKPOT = 'Jackpot',
}

// Game Config Interface
export interface CasinoGameConfig {
  treasury: string
  minBet: string
  maxBet: string
  houseEdgeBps: number
  paused: boolean
}

// Game State Interface
export interface CasinoGameState {
  player: string
  betAmount: string
  gameId: number
  timestamp: number
  settled: boolean
  result: number
  payout: string
}

// Get Casino Treasury Contract
export const getCasinoTreasury = async () => {
  const provider = getProvider()
  
  // Get chainId from provider
  let chainId = BASE_MAINNET_CHAIN_ID
  try {
    const network = await provider.getNetwork()
    chainId = Number(network.chainId)
  } catch (error) {
    // If provider doesn't support getNetwork, try window.ethereum
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
        chainId = parseInt(chainIdHex, 16)
      } catch (e) {
        console.warn('Failed to get chainId, defaulting to mainnet:', e)
      }
    }
  }
  
  const address = await getCasinoTreasuryAddress(chainId)
  if (!address) {
    throw new Error('CasinoTreasury not deployed on this network')
  }

  const abi = [
    'function deposit(address token, uint256 amount) external',
    'function withdraw(address token, uint256 amount, address to) external',
    'function getBalance(address token) external view returns (uint256)',
    'function authorizeGame(address game) external',
    'function revokeGame(address game) external',
    'function pause() external',
    'function unpause() external',
    'function paused() external view returns (bool)',
    'function authorizedGames(address) external view returns (bool)',
  ]

  return new ethers.Contract(address, abi, provider)
}

// Get Casino Game Contract
export const getCasinoGame = async (gameType: CasinoGameType) => {
  const provider = getProvider()
  
  // Get chainId from provider
  let chainId = BASE_MAINNET_CHAIN_ID
  try {
    const network = await provider.getNetwork()
    chainId = Number(network.chainId)
  } catch (error) {
    // If provider doesn't support getNetwork, try window.ethereum
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
        chainId = parseInt(chainIdHex, 16)
      } catch (e) {
        console.warn('Failed to get chainId, defaulting to mainnet:', e)
      }
    }
  }
  
  const gameAddress = await getCasinoGameAddress(gameType, chainId)
  if (!gameAddress) {
    throw new Error(`${gameType} contract not deployed on this network`)
  }

  // Base ABI for all games
  const baseAbi = [
    'function initialize(address treasury, uint256 minPlay, uint256 maxPlay, uint16 houseEdgeBps) external',
    'function pause() external',
    'function unpause() external',
    'function config() external view returns (address treasury, uint256 minPlay, uint256 maxPlay, uint16 houseEdgeBps, bool paused)',
    'function gameCounter() external view returns (uint256)',
    'function token() external view returns (address)',
    'function prizePool() external view returns (uint256)',
  ]

  // Game-specific ABIs to avoid ambiguous function calls
  let gameSpecificAbi: string[] = []
  
  switch (gameType) {
    case CasinoGameType.COINFLIP:
      gameSpecificAbi = [
        'function play(uint256 amount, uint8 choice, bool cashOut) external payable',
        'function games(uint256) external view returns (address player, uint256 gameId, uint256 result, uint256 reward, uint8 streak, uint256 lootRarity)',
        'event GameStarted(uint256 indexed gameId, address indexed player)',
        'event GameSettled(uint256 indexed gameId, uint256 result, uint256 reward, uint8 streak, uint256 lootRarity)',
      ]
      break
    case CasinoGameType.DICE:
      gameSpecificAbi = [
        'function play(uint256 amount, uint8 target, bool rollUnder) external payable',
        'function games(uint256) external view returns (address player, uint256 gameId, uint256 roll, uint256 reward, uint8 streak, uint256 lootRarity)',
        'event GameStarted(uint256 indexed gameId, address indexed player)',
        'event GameSettled(uint256 indexed gameId, uint256 roll, uint256 reward, uint8 streak, uint256 lootRarity)',
      ]
      break
    case CasinoGameType.PLINKO:
      gameSpecificAbi = [
        'function play(uint256 amount, uint8 rows) external payable',
        'function games(uint256) external view returns (address player, uint256 gameId, int256 position, uint256 multiplier, uint256 reward, uint256 lootRarity)',
        'event GameStarted(uint256 indexed gameId, address indexed player)',
        'event GameSettled(uint256 indexed gameId, int256 position, uint256 multiplier, uint256 reward, uint256 lootRarity)',
      ]
      break
    case CasinoGameType.CRASH:
      gameSpecificAbi = [
        'function placeBet(uint256 betAmount, uint256 autoCashout) external payable',
        'function cashout(uint256 gameId, uint256 currentMultiplier) external',
        'event BetPlaced(address indexed player, uint256 indexed gameId, uint256 betAmount, uint256 autoCashout)',
        'event Cashout(address indexed player, uint256 indexed gameId, uint256 multiplier, uint256 payout)',
        'event Crashed(uint256 indexed gameId, uint256 multiplier)',
      ]
      break
    case CasinoGameType.SLOTS:
      gameSpecificAbi = [
        'function spin(uint256 amount) external payable',
        'function games(uint256) external view returns (address player, uint256 gameId, uint8 reel1, uint8 reel2, uint8 reel3, uint256 multiplier, uint256 reward, uint8 streak, uint256 lootRarity)',
        'event GameStarted(uint256 indexed gameId, address indexed player)',
        'event GameSettled(uint256 indexed gameId, uint8 reel1, uint8 reel2, uint8 reel3, uint256 multiplier, uint256 reward, uint8 streak, uint256 lootRarity)',
      ]
      break
    default:
      throw new Error(`Unknown game type: ${gameType}`)
  }

  const abi = [...baseAbi, ...gameSpecificAbi]
  return new ethers.Contract(gameAddress, abi, provider)
}

// Get Game Config
export const getGameConfig = async (gameType: CasinoGameType): Promise<CasinoGameConfig> => {
  try {
    const game = await getCasinoGame(gameType)
    
    if (!game) {
      throw new Error(`${gameType} contract not found`)
    }
    
    // Get config from contract
    const config = await game.config()
    
    if (!config || config.treasury === ethers.ZeroAddress) {
      throw new Error(`${gameType} contract not initialized`)
    }
    
    return {
      treasury: config.treasury,
      minBet: config.minPlay.toString(), // Note: contract uses minPlay, not minBet
      maxBet: config.maxPlay.toString(), // Note: contract uses maxPlay, not maxBet
      houseEdgeBps: Number(config.houseEdgeBps),
      paused: config.paused,
    }
  } catch (error: any) {
    console.error(`[getGameConfig] Error getting ${gameType} config:`, error)
    console.error(`[getGameConfig] Error details:`, {
      message: error.message,
      reason: error.reason,
      code: error.code
    })
    throw new Error(`Failed to load ${gameType} configuration: ${error.message || 'Unknown error'}`)
  }
}

// Get Game State
export const getGameState = async (gameType: CasinoGameType, gameId: number): Promise<any | null> => {
  try {
    const game = await getCasinoGame(gameType)
    const state = await game.games(gameId)
    
    if (!state || state.player === ethers.ZeroAddress) {
      return null
    }

    // Return raw state (structure varies by game type)
    return state
  } catch (error) {
    console.error(`Error getting ${gameType} game state:`, error)
    return null
  }
}

// Play CoinFlip
export const playCoinFlip = async (betAmount: string, choice: 0 | 1) => {
  try {
    const signer = await getSigner()
    const game = await getCasinoGame(CasinoGameType.COINFLIP)
    const gameWithSigner = game.connect(signer) as any
    
    const amountWei = ethers.parseEther(betAmount)
    
    // Native ETH: send value with transaction
    // cashOut = false (player can cash out later if they want)
    console.log('[playCoinFlip] Sending transaction with params:', {
      amount: amountWei.toString(),
      choice,
      cashOut: false,
      value: amountWei.toString()
    })
    
    // Check contract state before sending
    const config = await game.config()
    console.log('[playCoinFlip] Contract config:', {
      treasury: config.treasury,
      minPlay: config.minPlay.toString(),
      maxPlay: config.maxPlay.toString(),
      houseEdgeBps: config.houseEdgeBps.toString(),
      paused: config.paused
    })
    
    if (config.paused) {
      throw new Error('Game is paused')
    }
    
    if (config.treasury === ethers.ZeroAddress) {
      throw new Error('Game contract not initialized. Treasury address is zero.')
    }
    
    // Check if treasury contract exists and is valid
    const provider = getProvider()
    const treasuryCode = await provider.getCode(config.treasury)
    if (treasuryCode === '0x') {
      throw new Error('Treasury contract does not exist at the configured address')
    }
    
    // Check treasury paused status and authorization
    try {
      const treasuryAbi = [
        'function paused() external view returns (bool)',
        'function authorizedGames(address) external view returns (bool)'
      ]
      const treasury = new ethers.Contract(config.treasury, treasuryAbi, provider)
      const treasuryPaused = await treasury.paused()
      if (treasuryPaused) {
        throw new Error('Treasury is paused')
      }
      
      // Check if game is authorized in treasury
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      const gameAddress = await getCasinoGameAddress(CasinoGameType.COINFLIP, chainId)
      const isAuthorized = await treasury.authorizedGames(gameAddress)
      if (!isAuthorized) {
        throw new Error('Game contract is not authorized in treasury. Please contact admin.')
      }
      
      // Check treasury balance (should have enough for payouts)
      const treasuryBalance = await provider.getBalance(config.treasury)
      console.log('[playCoinFlip] Treasury balance:', ethers.formatEther(treasuryBalance), 'ETH')
    } catch (treasuryError: any) {
      console.warn('[playCoinFlip] Treasury check failed:', treasuryError)
      // Continue anyway - the contract will handle the error
    }
    
    // Validate bet amount
    if (amountWei < config.minPlay) {
      throw new Error(`Bet amount too low. Minimum: ${ethers.formatEther(config.minPlay)} ETH`)
    }
    
    if (amountWei > config.maxPlay) {
      throw new Error(`Bet amount too high. Maximum: ${ethers.formatEther(config.maxPlay)} ETH`)
    }
    
    // Validate choice
    if (choice !== 0 && choice !== 1) {
      throw new Error('Invalid choice. Must be 0 (heads) or 1 (tails)')
    }
    
    // Check user balance
    const userBalance = await provider.getBalance(await signer.getAddress())
    if (userBalance < amountWei) {
      throw new Error(`Insufficient balance. You have ${ethers.formatEther(userBalance)} ETH, but need ${ethers.formatEther(amountWei)} ETH`)
    }
    
    // Try static call to catch revert reasons before sending transaction
    try {
      await gameWithSigner.play.staticCall(amountWei, choice, false, {
        value: amountWei
      })
      console.log('[playCoinFlip] Static call passed, sending transaction...')
    } catch (staticCallError: any) {
      console.error('[playCoinFlip] Static call failed:', staticCallError)
      let errorMessage = 'Transaction will fail'
      
      // Try to extract revert reason
      if (staticCallError.reason) {
        errorMessage = staticCallError.reason
      } else if (staticCallError.data) {
        try {
          // Try to decode error data
          const errorData = typeof staticCallError.data === 'string' 
            ? staticCallError.data 
            : staticCallError.data.data || staticCallError.data
          
          if (errorData && errorData.length >= 10) {
            // Check if it's a standard revert with reason string
            if (errorData.slice(0, 10) === '0x08c379a0') {
              try {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + errorData.slice(10))
                errorMessage = decoded[0]
              } catch (decodeError) {
                console.warn('[playCoinFlip] Failed to decode revert reason:', decodeError)
              }
            }
          }
        } catch (parseError) {
          console.warn('[playCoinFlip] Failed to parse error data:', parseError)
        }
      } else if (staticCallError.message) {
        // Check for common error patterns in the message
        const message = staticCallError.message.toLowerCase()
        if (message.includes('paused')) {
          errorMessage = 'Game is paused'
        } else if (message.includes('amount') || message.includes('bet')) {
          errorMessage = `Invalid bet amount. Must be between ${ethers.formatEther(config.minPlay)} and ${ethers.formatEther(config.maxPlay)} ETH`
        } else if (message.includes('transfer') || message.includes('balance')) {
          errorMessage = 'Transfer failed. Please check your balance and try again.'
        } else if (message.includes('choice')) {
          errorMessage = 'Invalid choice. Must be 0 (heads) or 1 (tails)'
        } else {
          errorMessage = staticCallError.message
        }
      }
      
      throw new Error(errorMessage)
    }
    
    const tx = await gameWithSigner.play(amountWei, choice, false, {
      value: amountWei,
      gasLimit: 3000000n // Increased gas limit
    })
    
    console.log('[playCoinFlip] Transaction sent, waiting for confirmation...', tx.hash)
    const receipt = await tx.wait()
    
    if (receipt.status === 0) {
      // Transaction reverted - try to get more details
      console.error('[playCoinFlip] Transaction reverted! Receipt:', receipt)
      
      // Try to call the contract to see what might have failed
      try {
        const configAfter = await game.config()
        if (configAfter.paused) {
          throw new Error('Game is paused')
        }
        if (configAfter.treasury === ethers.ZeroAddress) {
          throw new Error('Game contract not initialized. Treasury address is zero.')
        }
        
        // Check treasury authorization again
        const treasuryAbi = [
          'function paused() external view returns (bool)',
          'function authorizedGames(address) external view returns (bool)'
        ]
        const treasury = new ethers.Contract(configAfter.treasury, treasuryAbi, provider)
        const treasuryPaused = await treasury.paused()
        if (treasuryPaused) {
          throw new Error('Treasury is paused')
        }
        
        const networkAfter = await provider.getNetwork()
        const chainIdAfter = Number(networkAfter.chainId)
        const gameAddress = await getCasinoGameAddress(CasinoGameType.COINFLIP, chainIdAfter)
        const isAuthorized = await treasury.authorizedGames(gameAddress)
        if (!isAuthorized) {
          throw new Error('Game contract is not authorized in treasury. Please contact admin.')
        }
        
        // Check treasury balance
        const treasuryBalance = await provider.getBalance(configAfter.treasury)
        if (treasuryBalance < amountWei) {
          throw new Error(`Treasury has insufficient balance. Treasury: ${ethers.formatEther(treasuryBalance)} ETH, Required: ${ethers.formatEther(amountWei)} ETH`)
        }
      } catch (diagnosticError: any) {
        throw new Error(diagnosticError.message || 'Transaction reverted. Please check contract state and try again.')
      }
      
      throw new Error('Transaction reverted. Please check contract state and try again.')
    }
    
    // Use tx.hash as primary (it's available immediately), receipt.hash as fallback
    const transactionHash = tx.hash || receipt.hash
    console.log('[playCoinFlip] Transaction confirmed:', { txHash: tx.hash, receiptHash: receipt.hash, using: transactionHash })
    
    // Parse GameStarted event to get gameId
    const startedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = game.interface.parseLog(log)
        return parsed?.name === 'GameStarted'
      } catch {
        return false
      }
    })

    if (startedEvent) {
      const parsed = game.interface.parseLog(startedEvent)
      const gameId = Number(parsed?.args.gameId)
      
      console.log('[playCoinFlip] Game started, gameId:', gameId)
      console.log('[playCoinFlip] Waiting for VRF fulfillment...')
      
      // Wait for VRF fulfillment (GameSettled event)
      // Poll for game result (VRF is async)
      // MockPythVRF should fulfill immediately, so check right away
      let settled = false
      let attempts = 0
      const maxAttempts = 10 // Reduced to 10 seconds (Mock VRF should be instant)
      
      // First check immediately (Mock VRF should fulfill instantly)
      try {
        const gameResult = await game.games(gameId)
        if (gameResult && gameResult[0] !== ethers.ZeroAddress) {
          settled = true
          
          // Parse result (CoinFlip GameResult: player, gameId, result, reward, streak, lootRarity)
          const result = Number(gameResult[2]) // result is 3rd field
          const reward = ethers.formatEther(gameResult[3].toString()) // reward is 4th field
          const won = gameResult[3] > 0n // reward > 0 means won
          
          console.log('[playCoinFlip] Game settled immediately:', { gameId, result, reward, won })
          
          return {
            txHash: receipt.hash,
            gameId: gameId,
            result: result,
            payout: reward,
            won: won,
          }
        }
      } catch (error) {
        console.warn('[playCoinFlip] Immediate check failed:', error)
      }
      
      // If not settled, poll with shorter intervals
      while (!settled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Reduced to 500ms for faster response
        
        try {
          // Check if game is settled by reading games mapping
          const gameResult = await game.games(gameId)
          if (gameResult && gameResult[0] !== ethers.ZeroAddress) { // player is first field
            settled = true
            
            // Parse result (CoinFlip GameResult: player, gameId, result, reward, streak, lootRarity)
            const result = Number(gameResult[2]) // result is 3rd field
            const reward = ethers.formatEther(gameResult[3].toString()) // reward is 4th field
            const won = gameResult[3] > 0n // reward > 0 means won
            
            console.log('[playCoinFlip] Game settled:', { gameId, result, reward, won })
            
            return {
              txHash: tx.hash || receipt.hash,
              gameId: gameId,
              result: result,
              payout: reward,
              won: won,
            }
          }
        } catch (error) {
          console.warn('[playCoinFlip] Error checking game state:', error)
        }
        
        attempts++
      }
      
      // If not settled yet, return with gameId (frontend can poll)
      return {
        txHash: receipt.hash,
        gameId: gameId,
        result: null,
        payout: '0',
        won: false,
        pending: true, // Indicates VRF is still pending
      }
    }

    return { txHash: tx.hash || receipt.hash }
  } catch (error: any) {
    console.error('[playCoinFlip] Error:', error)
    
    // If error already has a user-friendly message, use it
    if (error.message && !error.message.includes('Failed to play CoinFlip')) {
      throw error
    }
    
    // Try to extract revert reason from different error formats
    let errorMessage = error.message || 'Failed to play CoinFlip'
    
    if (error.reason) {
      errorMessage = error.reason
    } else if (error.data) {
      try {
        const errorData = typeof error.data === 'string' 
          ? error.data 
          : error.data.data || error.data
        
        if (errorData && errorData.length >= 10 && errorData.slice(0, 10) === '0x08c379a0') {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + errorData.slice(10))
          errorMessage = decoded[0]
        }
      } catch (parseError) {
        // Ignore parse errors
      }
    }
    
    // Provide common solutions for common errors
    if (errorMessage.toLowerCase().includes('transfer') || errorMessage.toLowerCase().includes('failed')) {
      errorMessage += '. Please check: 1) Your balance is sufficient, 2) Treasury is funded, 3) Contract is authorized.'
    }
    
    throw new Error(errorMessage)
  }
}

// Play Dice
export const playDice = async (betAmount: string, target: number, rollUnder: boolean) => {
  try {
    // Validate target before sending transaction
    if (target < 1 || target > 99) {
      throw new Error('Target must be between 1 and 99')
    }

    const signer = await getSigner()
    const game = await getCasinoGame(CasinoGameType.DICE)
    const gameWithSigner = game.connect(signer) as any
    
    const amountWei = ethers.parseEther(betAmount)
    const targetUint8 = target as number
    
    // Check contract state before sending
    const config = await game.config()
    console.log('[playDice] Contract config:', {
      treasury: config.treasury,
      minPlay: config.minPlay.toString(),
      maxPlay: config.maxPlay.toString(),
      houseEdgeBps: config.houseEdgeBps.toString(),
      paused: config.paused
    })
    
    if (config.paused) {
      throw new Error('Game is paused')
    }
    
    if (config.treasury === ethers.ZeroAddress) {
      throw new Error('Game contract not initialized')
    }
    
    // Validate bet amount
    if (amountWei < config.minPlay) {
      throw new Error(`Bet amount too low. Minimum: ${ethers.formatEther(config.minPlay)} ETH`)
    }
    
    if (amountWei > config.maxPlay) {
      throw new Error(`Bet amount too high. Maximum: ${ethers.formatEther(config.maxPlay)} ETH`)
    }
    
    // Native ETH: send value with transaction
    console.log('[playDice] Sending transaction with params:', {
      amount: amountWei.toString(),
      target: targetUint8,
      rollUnder,
      value: amountWei.toString()
    })
    
    // Try to call the function statically to get revert reason
    try {
      await gameWithSigner.play.staticCall(amountWei, targetUint8, rollUnder, {
        value: amountWei
      })
    } catch (staticCallError: any) {
      console.error('[playDice] Static call failed:', staticCallError)
      let errorMessage = 'Transaction will fail'
      if (staticCallError.reason) {
        errorMessage = staticCallError.reason
      } else if (staticCallError.data && staticCallError.data.length >= 10) {
        try {
          const errorData = staticCallError.data
          if (errorData.slice(0, 10) === '0x08c379a0') {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + errorData.slice(10))
            errorMessage = decoded[0]
          }
        } catch {}
      }
      throw new Error(errorMessage)
    }
    
    const tx = await gameWithSigner.play(amountWei, targetUint8, rollUnder, {
      value: amountWei,
      gasLimit: 3000000n
    })
    
    console.log('[playDice] Transaction sent, waiting for confirmation...', tx.hash)
    const receipt = await tx.wait()
    
    if (receipt.status === 0) {
      throw new Error('Transaction reverted. Please check contract state and try again.')
    }
    
    console.log('[playDice] Transaction confirmed:', receipt.hash)
    
    // Parse GameStarted event
    const startedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = game.interface.parseLog(log)
        return parsed?.name === 'GameStarted'
      } catch {
        return false
      }
    })

    if (startedEvent) {
      const parsed = game.interface.parseLog(startedEvent)
      const gameId = Number(parsed?.args.gameId)
      
      console.log('[playDice] Game started, gameId:', gameId)
      console.log('[playDice] Checking for VRF fulfillment...')
      
      // Wait for VRF fulfillment
      // MockPythVRF should fulfill immediately via callback
      let settled = false
      let attempts = 0
      const maxAttempts = 10 // Reduced to 10 seconds
      
      // First check immediately (Mock VRF should fulfill instantly)
      try {
        const gameResult = await game.games(gameId)
        if (gameResult && gameResult[0] !== ethers.ZeroAddress) {
          settled = true
          // Dice GameResult: player, gameId, roll, reward, streak, lootRarity
          const roll = Number(gameResult[2]) // roll is 3rd field
          const reward = ethers.formatEther(gameResult[3].toString()) // reward is 4th field
          const won = gameResult[3] > 0n
          
          console.log('[playDice] Game settled immediately:', { gameId, roll, reward, won })
          
          return {
            txHash: receipt.hash,
            gameId: gameId,
            roll: roll,
            payout: reward,
            won: won,
          }
        }
      } catch (error) {
        console.warn('[playDice] Immediate check failed:', error)
      }
      
      // If not settled, poll with shorter intervals
      while (!settled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Reduced to 500ms for faster response
        
        try {
          const gameResult = await game.games(gameId)
          if (gameResult && gameResult[0] !== ethers.ZeroAddress) {
            settled = true
            // Dice GameResult: player, gameId, roll, reward, streak, lootRarity
            const roll = Number(gameResult[2]) // roll is 3rd field
            const reward = ethers.formatEther(gameResult[3].toString()) // reward is 4th field
            const won = gameResult[3] > 0n
            
            console.log('[playDice] Game settled:', { gameId, roll, reward, won })
            
            return {
              txHash: receipt.hash,
              gameId: gameId,
              roll: roll,
              payout: reward,
              won: won,
            }
          }
        } catch (error) {
          console.warn('[playDice] Error checking game state:', error)
        }
        
        attempts++
      }
      
      return {
        txHash: receipt.hash,
        gameId: gameId,
        roll: null,
        payout: '0',
        won: false,
        pending: true,
      }
    }

    return { txHash: tx.hash || receipt.hash }
  } catch (error: any) {
    console.error('[playDice] Error:', error)
    throw new Error(error.reason || error.message || 'Failed to play Dice')
  }
}

// Play Plinko
export const playPlinko = async (betAmount: string, rows: number) => {
  try {
    const signer = await getSigner()
    const game = await getCasinoGame(CasinoGameType.PLINKO)
    const gameWithSigner = game.connect(signer) as any
    
    const amountWei = ethers.parseEther(betAmount)
    
    // Native ETH: send value with transaction
    console.log('[playPlinko] Sending transaction with params:', {
      amount: amountWei.toString(),
      rows,
      value: amountWei.toString()
    })
    
    // Check contract state before sending
    const config = await game.config()
    if (config.paused) {
      throw new Error('Game is paused')
    }
    if (config.treasury === ethers.ZeroAddress) {
      throw new Error('Game contract not initialized')
    }
    if (amountWei < config.minPlay || amountWei > config.maxPlay) {
      throw new Error(`Bet amount must be between ${ethers.formatEther(config.minPlay)} and ${ethers.formatEther(config.maxPlay)} ETH`)
    }
    
    // Try to simulate transaction first
    try {
      const estimatedGas = await gameWithSigner.play.estimateGas(amountWei, rows, {
        value: amountWei
      })
      console.log('[playPlinko] Estimated gas:', estimatedGas.toString())
    } catch (estimateError: any) {
      console.error('[playPlinko] Gas estimation failed:', estimateError)
      const reason = estimateError.reason || estimateError.message || 'Transaction will fail'
      throw new Error(`Transaction will fail: ${reason}`)
    }
    
    const tx = await gameWithSigner.play(amountWei, rows, {
      value: amountWei,
      gasLimit: 3000000n
    })
    
    console.log('[playPlinko] Transaction sent, waiting for confirmation...', tx.hash)
    const receipt = await tx.wait()
    
    if (receipt.status === 0) {
      throw new Error('Transaction reverted. Please check contract state and try again.')
    }
    
    const transactionHash = tx.hash || receipt.hash
    console.log('[playPlinko] Transaction confirmed:', { txHash: tx.hash, receiptHash: receipt.hash, using: transactionHash })
    
    // Parse GameStarted event
    const startedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = game.interface.parseLog(log)
        return parsed?.name === 'GameStarted'
      } catch {
        return false
      }
    })

    if (startedEvent) {
      const parsed = game.interface.parseLog(startedEvent)
      const gameId = Number(parsed?.args.gameId)
      
      console.log('[playPlinko] Game started, gameId:', gameId)
      console.log('[playPlinko] Checking for VRF fulfillment...')
      
      // Wait for VRF fulfillment
      // MockPythVRF should fulfill immediately via callback
      let settled = false
      let attempts = 0
      const maxAttempts = 10 // Reduced to 10 seconds
      
      // First check immediately (Mock VRF should fulfill instantly)
      try {
        const gameResult = await game.games(gameId)
        if (gameResult && gameResult[0] !== ethers.ZeroAddress) {
          settled = true
          // Plinko GameResult: player, gameId, position, multiplier, reward, lootRarity
          const position = Number(gameResult[2]) // position is 3rd field
          const reward = ethers.formatEther(gameResult[4].toString()) // reward is 5th field
          const won = gameResult[4] > 0n
          
          console.log('[playPlinko] Game settled immediately:', { gameId, position, reward, won })
          
          return {
            txHash: receipt.hash,
            gameId: gameId,
            position: position,
            payout: reward,
            won: won,
          }
        }
      } catch (error) {
        console.warn('[playPlinko] Immediate check failed:', error)
      }
      
      // If not settled, poll with shorter intervals
      while (!settled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Reduced to 500ms for faster response
        
        try {
          const gameResult = await game.games(gameId)
          if (gameResult && gameResult[0] !== ethers.ZeroAddress) {
            settled = true
            // Plinko GameResult: player, gameId, position, multiplier, reward, lootRarity
            const position = Number(gameResult[2]) // position is 3rd field
            const reward = ethers.formatEther(gameResult[4].toString()) // reward is 5th field
            const won = gameResult[4] > 0n
            
            console.log('[playPlinko] Game settled:', { gameId, position, reward, won })
            
            return {
              txHash: receipt.hash,
              gameId: gameId,
              position: position,
              payout: reward,
              won: won,
            }
          }
        } catch (error) {
          console.warn('[playPlinko] Error checking game state:', error)
        }
        
        attempts++
      }
      
      return {
        txHash: receipt.hash,
        gameId: gameId,
        position: null,
        payout: '0',
        won: false,
        pending: true,
      }
    }

    return { txHash: tx.hash || receipt.hash }
  } catch (error: any) {
    console.error('[playPlinko] Error:', error)
    throw new Error(error.reason || error.message || 'Failed to play Plinko')
  }
}

// Play Slots
export const playSlots = async (betAmount: string) => {
  try {
    const signer = await getSigner()
    const game = await getCasinoGame(CasinoGameType.SLOTS)
    const gameWithSigner = game.connect(signer) as any
    
    const amountWei = ethers.parseEther(betAmount)
    
    // Native ETH: send value with transaction
    console.log('[playSlots] Sending transaction with params:', {
      amount: amountWei.toString(),
      value: amountWei.toString()
    })
    
    // Check contract state before sending
    const config = await game.config()
    if (config.paused) {
      throw new Error('Game is paused')
    }
    if (config.treasury === ethers.ZeroAddress) {
      throw new Error('Game contract not initialized')
    }
    if (amountWei < config.minPlay || amountWei > config.maxPlay) {
      throw new Error(`Bet amount must be between ${ethers.formatEther(config.minPlay)} and ${ethers.formatEther(config.maxPlay)} ETH`)
    }
    
    // Try to simulate transaction first
    try {
      const estimatedGas = await gameWithSigner.spin.estimateGas(amountWei, {
        value: amountWei
      })
      console.log('[playSlots] Estimated gas:', estimatedGas.toString())
    } catch (estimateError: any) {
      console.error('[playSlots] Gas estimation failed:', estimateError)
      const reason = estimateError.reason || estimateError.message || 'Transaction will fail'
      throw new Error(`Transaction will fail: ${reason}`)
    }
    
    const tx = await gameWithSigner.spin(amountWei, {
      value: amountWei,
      gasLimit: 3000000n
    })
    
    console.log('[playSlots] Transaction sent, waiting for confirmation...', tx.hash)
    const receipt = await tx.wait()
    
    if (receipt.status === 0) {
      throw new Error('Transaction reverted. Please check contract state and try again.')
    }
    
    const transactionHash = tx.hash || receipt.hash
    console.log('[playSlots] Transaction confirmed:', { txHash: tx.hash, receiptHash: receipt.hash, using: transactionHash })
    
    // Parse GameStarted event
    const startedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = game.interface.parseLog(log)
        return parsed?.name === 'GameStarted'
      } catch {
        return false
      }
    })

    if (startedEvent) {
      const parsed = game.interface.parseLog(startedEvent)
      const gameId = Number(parsed?.args.gameId)
      
      console.log('[playSlots] Game started, gameId:', gameId)
      console.log('[playSlots] Checking for VRF fulfillment...')
      
      // Wait for VRF fulfillment
      // MockPythVRF should fulfill immediately via callback
      let settled = false
      let attempts = 0
      const maxAttempts = 10 // Reduced to 10 seconds
      
      // First check immediately (Mock VRF should fulfill instantly)
      try {
        const gameResult = await game.games(gameId)
        if (gameResult && gameResult[0] !== ethers.ZeroAddress) {
          settled = true
          // Slots GameResult: player, gameId, reel1, reel2, reel3, multiplier, reward, streak, lootRarity
          const reel1 = Number(gameResult[2]) // reel1 is 3rd field
          const reel2 = Number(gameResult[3]) // reel2 is 4th field
          const reel3 = Number(gameResult[4]) // reel3 is 5th field
          const reward = ethers.formatEther(gameResult[6].toString()) // reward is 7th field
          const won = gameResult[6] > 0n
          
          console.log('[playSlots] Game settled immediately:', { gameId, reel1, reel2, reel3, reward, won })
          
          return {
            txHash: receipt.hash,
            gameId: gameId,
            reel1: reel1,
            reel2: reel2,
            reel3: reel3,
            payout: reward,
            won: won,
          }
        }
      } catch (error) {
        console.warn('[playSlots] Immediate check failed:', error)
      }
      
      // If not settled, poll with shorter intervals
      while (!settled && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Reduced to 500ms for faster response
        
        try {
          const gameResult = await game.games(gameId)
          if (gameResult && gameResult[0] !== ethers.ZeroAddress) {
            settled = true
            // Slots GameResult: player, gameId, reel1, reel2, reel3, multiplier, reward, streak, lootRarity
            const reel1 = Number(gameResult[2]) // reel1 is 3rd field
            const reel2 = Number(gameResult[3]) // reel2 is 4th field
            const reel3 = Number(gameResult[4]) // reel3 is 5th field
            const reward = ethers.formatEther(gameResult[6].toString()) // reward is 7th field
            const won = gameResult[6] > 0n
            
            console.log('[playSlots] Game settled:', { gameId, reel1, reel2, reel3, reward, won })
            
            return {
              txHash: receipt.hash,
              gameId: gameId,
              reel1: reel1,
              reel2: reel2,
              reel3: reel3,
              payout: reward,
              won: won,
            }
          }
        } catch (error) {
          console.warn('[playSlots] Error checking game state:', error)
        }
        
        attempts++
      }
      
      return {
        txHash: receipt.hash,
        gameId: gameId,
        reel1: null,
        reel2: null,
        reel3: null,
        payout: '0',
        won: false,
        pending: true,
      }
    }

    return { txHash: tx.hash || receipt.hash }
  } catch (error: any) {
    console.error('[playSlots] Error:', error)
    throw new Error(error.reason || error.message || 'Failed to play Slots')
  }
}

// Get Treasury Balance (use address(0) for native ETH)
export const getTreasuryBalance = async (tokenAddress: string = '0x0000000000000000000000000000000000000000'): Promise<string> => {
  try {
    const treasury = await getCasinoTreasury()
    const balance = await treasury.getBalance(tokenAddress)
    return ethers.formatEther(balance)
  } catch (error) {
    console.error('Error getting treasury balance:', error)
    return '0'
  }
}

