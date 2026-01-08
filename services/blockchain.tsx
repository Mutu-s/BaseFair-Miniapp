import { ethers } from 'ethers'
import { GameStruct, GameType, GameStatus, Player, GameParams } from '@/utils/type.dt'
import { getErrorMessage } from '@/utils/errorMessages'
import { getFlipMatchAddress, BASE_MAINNET_CHAIN_ID } from '@/utils/network'
import { getNetworkConfig } from '@/utils/networkConfig'
// Import ABI from TypeScript file - guaranteed to work with webpack
import { FLIPMATCH_ABI } from '@/utils/flipMatchAbi'

// Contract ABI - using TypeScript export for reliable webpack bundling
// Note: We need to update flipMatchAbi.ts with FlipMatchLite ABI, but for now using existing ABI
// The createGame function signature is different - we'll handle it in the function call
const flipmatchAbi = { abi: FLIPMATCH_ABI }

const toWei = (num: number | string) => ethers.parseEther(num.toString())
const fromWei = (num: bigint | string) => ethers.formatEther(num.toString())

/**
 * Wait for transaction with exponential backoff retry for rate limiting (429 errors)
 */
const waitForTransactionWithRetry = async (tx: any, functionName: string = 'transaction'): Promise<any> => {
  let receipt: any = null
  let retries = 0
  const maxRetries = 5
  const baseDelay = 2000 // 2 seconds
  
  while (retries < maxRetries && !receipt) {
    try {
      receipt = await tx.wait()
      break
    } catch (error: any) {
      // Check if it's a rate limit error (429)
      const isRateLimit = error?.code === 'UNKNOWN_ERROR' || 
                         error?.message?.includes('429') ||
                         error?.message?.includes('Too Many Requests') ||
                         error?.data?.originalError?.message?.includes('429') ||
                         error?.data?.originalError?.code === 429
      
      if (isRateLimit && retries < maxRetries - 1) {
        retries++
        const delay = baseDelay * Math.pow(2, retries) // Exponential backoff: 4s, 8s, 16s, 32s
        console.warn(`[${functionName}] Rate limit error (429), retrying in ${delay}ms (attempt ${retries}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // If not rate limit or max retries reached, throw the error
      throw error
    }
  }
  
  if (!receipt) {
    throw new Error(`Failed to get transaction receipt after ${maxRetries} retries. Transaction may still be pending. Hash: ${tx.hash}`)
  }
  
  return receipt
}

let ethereum: any
if (typeof window !== 'undefined') ethereum = (window as any).ethereum

const getEthereumContracts = async () => {
  const accounts = await ethereum?.request?.({ method: 'eth_accounts' })

  if (accounts?.length > 0) {
    const provider = new ethers.BrowserProvider(ethereum)
    const signer = await provider.getSigner()
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)
    
    console.log('[getEthereumContracts] Connected network chainId:', chainId, '(Base Mainnet)')
    
    // Use appropriate RPC URL based on chainId (for consistency)
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'
    
    console.log('[getEthereumContracts] Using RPC URL:', rpcUrl)
    
    const contractAddress = await getFlipMatchAddress(chainId)
    if (!contractAddress) {
      console.error(`[getEthereumContracts] FlipMatch contract not deployed on this network (chainId: ${chainId})`)
      throw new Error(`FlipMatch contract not deployed on this network (chainId: ${chainId})`)
    }
    
    console.log('[getEthereumContracts] Using contract address:', contractAddress, 'for chainId:', chainId)
    
    // Validate ABI is loaded
    if (!flipmatchAbi || !flipmatchAbi.abi || (flipmatchAbi.abi as unknown as any[]).length === 0) {
      console.error('[getEthereumContracts] Contract ABI is not loaded or is empty')
      throw new Error('Contract ABI is not loaded. Please ensure contracts/FlipMatch.abi.json exists and is committed to git.')
    }
    
    const contracts = new ethers.Contract(contractAddress, flipmatchAbi.abi, signer)
    return contracts
  } else {
    // Fallback: try to detect network from window.ethereum
    let chainId = BASE_MAINNET_CHAIN_ID
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
        chainId = parseInt(chainIdHex, 16)
        console.log('[getEthereumContracts] Fallback: Detected chainId:', chainId, '(Base Mainnet)')
      } catch (error) {
        console.warn('[getEthereumContracts] Fallback: Failed to get chainId, defaulting to mainnet:', error)
      }
    }
    
    // Use appropriate RPC URL based on chainId
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'
    
    console.log('[getEthereumContracts] Fallback: Using RPC URL:', rpcUrl)
    
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = ethers.Wallet.createRandom()
    const signer = wallet.connect(provider)
    const contractAddress = await getFlipMatchAddress(chainId)
    if (!contractAddress) {
      console.error(`[getEthereumContracts] Fallback: FlipMatch contract not deployed on this network (chainId: ${chainId})`)
      throw new Error(`FlipMatch contract not deployed on this network (chainId: ${chainId})`)
    }
    
    console.log('[getEthereumContracts] Fallback: Using contract address:', contractAddress, 'for chainId:', chainId)
    
    const contracts = new ethers.Contract(contractAddress, flipmatchAbi.abi, signer)
    return contracts
  }
}

const getReadOnlyContract = async (chainIdParam?: number) => {
  // Use provided chainId, or try to get from window.ethereum, or default to mainnet
  let chainId = chainIdParam || BASE_MAINNET_CHAIN_ID
  
  if (!chainIdParam && typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
      chainId = parseInt(chainIdHex, 16)
      console.log('[getReadOnlyContract] Detected chainId from window.ethereum:', chainId, '(Base Mainnet)')
    } catch (error) {
      console.warn('[getReadOnlyContract] Failed to get chainId, defaulting to mainnet:', error)
    }
  } else if (chainIdParam) {
    console.log('[getReadOnlyContract] Using provided chainId:', chainId, '(Base Mainnet)')
  }

  // Get network-specific configuration (ensures no conflicts)
  const networkConfig = getNetworkConfig(chainId)
  console.log('[getReadOnlyContract] Network config:', networkConfig.name, 'RPC:', networkConfig.rpcUrl)
  
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
  const contractAddress = await getFlipMatchAddress(chainId)
  if (!contractAddress) {
    console.error(`[getReadOnlyContract] FlipMatch contract not deployed on ${networkConfig.name} (chainId: ${chainId})`)
    throw new Error(`FlipMatch contract not deployed on ${networkConfig.name} (chainId: ${chainId})`)
  }
  
  console.log('[getReadOnlyContract] Using contract address:', contractAddress, 'on', networkConfig.name)
  
  // Validate ABI is loaded
  if (!flipmatchAbi || !flipmatchAbi.abi || (flipmatchAbi.abi as unknown as any[]).length === 0) {
    console.error('[getReadOnlyContract] Contract ABI is not loaded or is empty')
    throw new Error('Contract ABI is not loaded. Please ensure contracts/FlipMatch.abi.json exists and is committed to git.')
  }
  
  return new ethers.Contract(contractAddress, flipmatchAbi.abi, provider)
}

// New contract functions
export const createGame = async (gameParams: GameParams): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    const contract = await getEthereumContracts()
    
    // Get provider and signer to check balance
    const accounts = await ethereum?.request?.({ method: 'eth_accounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('Please connect your wallet')
    }
    
    const browserProvider = new ethers.BrowserProvider(ethereum)
    const signer = await browserProvider.getSigner()
    const userAddress = await signer.getAddress()
    const balance = await browserProvider.getBalance(userAddress)
    
    // Get network info for logging
    const network = await browserProvider.getNetwork()
    const networkChainId = Number(network.chainId)
    const isMainnet = networkChainId === BASE_MAINNET_CHAIN_ID
    
    // Validate and parse stake amount
    const stakeStr = String(gameParams.stake || '').trim()
    if (!stakeStr || stakeStr === '') {
      throw new Error('Please enter a stake amount')
    }
    
    // Parse stake as float to handle decimals
    const stakeAmount = parseFloat(stakeStr)
    if (isNaN(stakeAmount) || stakeAmount < 0.000003) {
      throw new Error('Minimum bet must be at least 0.000003 ETH (~$0.01)')
    }
    
    // Convert to wei using parseEther which handles decimals properly
    const stake = ethers.parseEther(stakeAmount.toString())
    
    // Verify the stake is at least 0.000003 ether (~$0.01 USD)
    const minBet = ethers.parseEther('0.000003')
    if (stake < minBet) {
      throw new Error('Minimum bet must be at least 0.000003 ETH (~$0.01)')
    }
    
    // Check if user has enough balance (including gas fees)
    // Reserve some amount for gas (approximately 0.005 ETH for testnet, 0.01 ETH for mainnet)
    const gasReserveAmount = 0.001 // Base has low gas fees
    const gasReserve = ethers.parseEther(gasReserveAmount.toString())
    if (balance < stake + gasReserve) {
      const balanceFormatted = parseFloat(fromWei(balance))
      const stakeFormatted = stakeAmount
      const requiredTotal = stakeFormatted + gasReserveAmount
      const shortfall = requiredTotal - balanceFormatted
      throw new Error(
        `Insufficient balance. You have ${balanceFormatted.toFixed(4)} ETH, but need at least ${requiredTotal.toFixed(4)} ETH (${stakeFormatted.toFixed(4)} ETH stake + ${gasReserveAmount.toFixed(3)} ETH gas). ` +
        `You need ${shortfall.toFixed(4)} ETH more. ` +
        `Tip: Try a lower stake amount (minimum 0.000003 ETH) or add more ETH to your wallet.`
      )
    }
    
    // Use game name or default to "Game #{id}" format
    const gameName = gameParams.name.trim() || `Game #${Date.now()}`
    
    // Validate game type and max players
    // Contract requires: AI_VS_PLAYER must have exactly 1 player
    if (gameParams.gameType === GameType.AI_VS_PLAYER && gameParams.maxPlayers !== 1) {
      throw new Error('AI games must have exactly 1 player')
    }
    
    // Validation is handled in CreateGame component based on game mode
    
    // Duration in hours (0 for single player, or specified hours for multi-player)
    const durationHours = gameParams.durationHours || 0
    
    // Password (empty string if not provided or for single player)
    const password = gameParams.password || ''
    
    // Debug: Log all parameters before sending transaction
    console.log(`[createGame] Creating game on Base Mainnet (chainId: ${networkChainId}) with parameters:`, {
      gameName,
      gameType: gameParams.gameType,
      maxPlayers: gameParams.maxPlayers,
      durationHours,
      password: password ? '***' : '(empty)',
      stake: stake.toString(),
      stakeFormatted: fromWei(stake),
      minBet: minBet.toString(),
    })
    
    // Validate parameters match contract requirements
    // Contract requires: AI_VS_PLAYER must have exactly 1 player
    if (gameParams.gameType === GameType.AI_VS_PLAYER && gameParams.maxPlayers !== 1) {
      throw new Error('AI games must have exactly 1 player')
    }
    if (gameParams.maxPlayers < 1 || gameParams.maxPlayers > 5) {
      throw new Error('Number of players must be between 1 and 5')
    }
    
    // For AI games, check house balance before sending transaction
    if (gameParams.gameType === GameType.AI_VS_PLAYER) {
      try {
        const readOnlyContract = await getReadOnlyContract(networkChainId)
        const currentHouseBalance = await readOnlyContract.houseBalance()
        const currentHouseBalanceFormatted = parseFloat(fromWei(currentHouseBalance))
        
        // Calculate required house balance: (stake * 1.95) - stake = stake * 0.95
        const HOUSE_EDGE_PCT = 5
        const maxPayout = (stake * BigInt(200 - HOUSE_EDGE_PCT)) / 100n
        const requiredHouseBalance = maxPayout - stake
        const requiredHouseBalanceFormatted = parseFloat(fromWei(requiredHouseBalance))
        
        console.log('[createGame] House balance check:', {
          currentHouseBalance: currentHouseBalanceFormatted,
          requiredHouseBalance: requiredHouseBalanceFormatted,
          stake: parseFloat(fromWei(stake)),
          maxPayout: parseFloat(fromWei(maxPayout)),
          sufficient: currentHouseBalance >= requiredHouseBalance,
        })
        
        if (currentHouseBalance < requiredHouseBalance) {
          throw new Error(`Insufficient house balance. Required: ${requiredHouseBalanceFormatted.toFixed(4)} ETH, Available: ${currentHouseBalanceFormatted.toFixed(4)} ETH. Please try a smaller stake or wait for the house balance to be funded.`)
        }
      } catch (balanceError: any) {
        // If it's our error, throw it
        if (balanceError.message && balanceError.message.includes('Insufficient house balance')) {
          throw balanceError
        }
        // Otherwise log warning but continue (contract will reject if insufficient)
        console.warn('[createGame] Could not check house balance:', balanceError)
      }
    }
    
    // Validate contract instance
    if (!contract) {
      throw new Error('Contract instance is not available. Please check your network connection and contract address.')
    }
    
    // Debug: Log contract info
    console.log('[createGame] Contract target:', contract.target)
    console.log('[createGame] Contract interface exists:', !!contract.interface)
    console.log('[createGame] ABI length:', (flipmatchAbi.abi as unknown as any[]).length)
    
    // Check if createGame function exists in the interface
    try {
      const createGameFragment = contract.interface.getFunction('createGame')
      if (!createGameFragment) {
        console.error('[createGame] createGame function not found in contract interface')
        throw new Error('createGame function not found on contract.')
      }
      console.log('[createGame] createGame function found:', createGameFragment.name)
    } catch (fragError) {
      console.error('[createGame] Error checking contract interface:', fragError)
    }
    
    console.log('[createGame] Sending transaction to create game...')
    
    // FlipMatchLite contract only takes gameType and maxPlayers (no name, duration, password)
    // Create ABI fragment for FlipMatchLite's createGame function
    const createGameAbi = [
      {
        inputs: [
          {
            internalType: "enum FlipMatchLite.GameType",
            name: "_gameType",
            type: "uint8"
          },
          {
            internalType: "uint256",
            name: "_maxPlayers",
            type: "uint256"
          }
        ],
        name: "createGame",
        outputs: [],
        stateMutability: "payable",
        type: "function"
      }
    ]
    
    // Create interface with correct ABI for FlipMatchLite
    const flipMatchLiteInterface = new ethers.Interface(createGameAbi)
    const data = flipMatchLiteInterface.encodeFunctionData('createGame', [gameParams.gameType, gameParams.maxPlayers])
    
    // Send transaction directly using sendTransaction
    const tx = await signer.sendTransaction({
      to: contract.target,
      value: stake,
      data: data,
    })
    
    console.log('[createGame] Transaction sent, waiting for confirmation...', tx.hash)
    const receipt = await waitForTransactionWithRetry(tx, 'createGame')
    console.log('[createGame] Transaction confirmed! Block:', receipt.blockNumber, 'Hash:', receipt.hash)
    
    // Try to get the game ID from the GameCreated event
    let gameId: number | null = null
    try {
      // Method 1: Try to parse logs directly
      const gameCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log)
          return parsedLog && parsedLog.name === 'GameCreated'
        } catch {
          return false
        }
      })
      
      if (gameCreatedEvent) {
        try {
          const parsedLog = contract.interface.parseLog(gameCreatedEvent)
          if (parsedLog && parsedLog.args && parsedLog.args.length > 0) {
            gameId = Number(parsedLog.args[0])
            console.log('[createGame] Game ID from event (method 1):', gameId)
          }
        } catch (error) {
          console.warn('[createGame] Could not parse GameCreated event (method 1):', error)
        }
      }
      
      // Method 2: Query events from the transaction
      if (!gameId) {
        try {
          const filter = contract.filters.GameCreated()
          const events = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber)
          if (events && events.length > 0) {
            // Find the event from this transaction
            const txEvent = events.find((e: any) => e.transactionHash === receipt.hash)
            if (txEvent && 'args' in txEvent && txEvent.args && Array.isArray(txEvent.args) && txEvent.args.length > 0) {
              gameId = Number(txEvent.args[0])
              console.log('[createGame] Game ID from event (method 2):', gameId)
            }
          }
        } catch (error) {
          console.warn('[createGame] Could not query GameCreated event (method 2):', error)
        }
      }
      
      // Method 3: Try to get the latest game ID by querying getActiveGames
      if (!gameId) {
        try {
          // Wait a bit for the transaction to be indexed
          await new Promise(resolve => setTimeout(resolve, 2000))
          const activeGames = await contract.getActiveGames()
          if (activeGames && activeGames.length > 0) {
            // Get the highest game ID (likely the one we just created)
            const gameIds = activeGames.map((id: any) => Number(id)).filter((id: number) => id > 0)
            if (gameIds.length > 0) {
              gameId = Math.max(...gameIds)
              console.log('[createGame] Game ID from getActiveGames (method 3):', gameId)
            }
          }
        } catch (error) {
          console.warn('[createGame] Could not get game ID from getActiveGames (method 3):', error)
        }
      }
    } catch (error) {
      console.warn('[createGame] Could not extract game ID from event:', error)
    }
    
    // Return both hash and gameId if available
    return JSON.stringify({ hash: receipt.hash, gameId })
  } catch (error: any) {
    // Debug: Log full error object
    console.error('Error creating game:', {
      error,
      message: error?.message,
      reason: error?.reason,
      data: error?.data,
      code: error?.code,
      info: error?.info,
      shortMessage: error?.shortMessage,
    })
    
    // Provide more specific error messages
    let errorMessage = error?.message || error?.toString() || 'Unknown error'
    
    // Try to extract revert reason from ethers error
    if (error?.reason) {
      errorMessage = error.reason
    } else if (error?.shortMessage) {
      errorMessage = error.shortMessage
    } else if (error?.data?.message) {
      errorMessage = error.data.message
    } else if (error?.data) {
      // Try to decode error data
      try {
        const contract = await getEthereumContracts()
        const decodedError = contract.interface.parseError(error.data)
        if (decodedError) {
          errorMessage = decodedError.name + ': ' + (decodedError.args?.join(', ') || '')
        }
      } catch (e) {
        // If decoding fails, try to extract from error data directly
        if (error.data && typeof error.data === 'string') {
          // Try to find revert reason in data
          const revertMatch = error.data.match(/0x08c379a0(.{64})(.{64})/)
          if (revertMatch) {
            try {
              const reasonLength = parseInt(revertMatch[2], 16)
              const reasonHex = error.data.slice(138, 138 + reasonLength * 2)
              // Browser-compatible hex to string conversion
              let reason = ''
              for (let i = 0; i < reasonHex.length; i += 2) {
                const charCode = parseInt(reasonHex.substr(i, 2), 16)
                if (charCode > 0) {
                  reason += String.fromCharCode(charCode)
                }
              }
              if (reason) {
                errorMessage = reason
              }
            } catch (e2) {
              // Ignore decode errors
            }
          }
        }
      }
    }
    
    // Check for specific contract revert reasons
    if (errorMessage.includes('Bet must be at least') || errorMessage.includes('minimum bet')) {
      // Contract says "1 ETH" but actually requires 0.000003 ETH - clarify for user
      throw new Error('Minimum bet must be at least 0.000003 ETH (~$0.01). Please increase your stake.')
    }
    if (errorMessage.includes('Players must be between') || errorMessage.includes('Invalid player count')) {
      throw new Error('Number of players must be between 1 and 5')
    }
    if (errorMessage.includes('AI games must have exactly 1 player')) {
      throw new Error('AI games must have exactly 1 player (not 2 or more)')
    }
    if (errorMessage.includes('AI games must have')) {
      throw new Error('AI games must have exactly 1 player')
    }
    if (errorMessage.includes('Game cannot be started')) {
      throw new Error('Game cannot be started. Please check game settings.')
    }
    if (errorMessage.includes('Not enough players')) {
      throw new Error('Not enough players to start the game.')
    }
    if (errorMessage.includes('VRF not requested') || errorMessage.includes('VRF already fulfilled')) {
      throw new Error('VRF error. Please try again.')
    }
    if (errorMessage.includes('Low house') || errorMessage.includes('Insufficient house balance')) {
      throw new Error('House balance is insufficient for this stake amount. For AI games, house needs stake * 0.95 ETH. Please try a smaller stake or wait for house to be funded.')
    }
    if (errorMessage.includes('Insufficient balance')) {
      throw error // Re-throw balance errors as-is
    }
    if (errorMessage.includes('user rejected') || errorMessage.includes('User denied') || errorMessage.includes('rejected')) {
      throw new Error('Transaction was rejected. Please try again.')
    }
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
      throw new Error('Insufficient balance. Please ensure you have enough ETH tokens and gas fees.')
    }
    if (errorMessage.includes('require(false)') || errorMessage.includes('execution reverted (no data present')) {
      // This is a generic require(false) - try to get more context
      console.error('Contract revert error details:', {
        error,
        message: errorMessage,
        reason: error?.reason,
        data: error?.data,
        code: error?.code,
      })
      
      // Try to provide more specific error based on game parameters
      let specificError = 'Transaction failed. Please check:\n'
      specificError += '1) Your stake is at least 0.000003 ETH (~$0.01)\n'
      specificError += '2) You have enough balance (stake + gas fees)\n'
      specificError += '3) For AI games: maxPlayers must be exactly 1\n'
      specificError += '4) For AI games: House balance must be sufficient (stake * 0.95)\n'
      specificError += '5) Game settings are valid (maxPlayers: 1-5, gameType: AI_VS_PLAYER or PLAYER_VS_PLAYER)'
      
      throw new Error(specificError)
    }
    if (errorMessage.includes('revert') || errorMessage.includes('CALL_EXCEPTION') || errorMessage.includes('execution reverted')) {
      // Try to extract the revert reason
      const revertReason = error?.reason || error?.data?.message || errorMessage
      if (revertReason && !revertReason.includes('require(false)')) {
        throw new Error(`Transaction failed: ${revertReason}`)
      }
      throw new Error('Transaction failed. Please check: 1) Your stake is at least 1 ETH, 2) You have enough balance, 3) Game settings are valid.')
    }
    
    throw new Error(getErrorMessage(error))
  }
}

export const joinGame = async (gameId: number, stake: number | string, password?: string): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    const contract = await getEthereumContracts()
    const gamePassword = password || ''
    
    // Ensure stake is a valid number and convert to wei
    const stakeAmount = typeof stake === 'string' ? parseFloat(stake) : stake
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      throw new Error('Invalid stake amount. Stake must be greater than 0.')
    }
    
    const stakeWei = toWei(stakeAmount.toString())
    console.log('[joinGame] Joining game:', gameId, 'with stake:', stakeAmount, 'ETH (', stakeWei.toString(), 'wei)')
    
    // Verify the stake is at least MIN_BET (0.000003 ETH)
    const minBet = ethers.parseEther('0.000003')
    if (stakeWei < minBet) {
      throw new Error('Stake must be at least 0.000003 ETH (~$0.01)')
    }
    
    const tx = await contract.joinGame(gameId, gamePassword, { value: stakeWei })
    console.log('[joinGame] Transaction sent:', tx.hash)
    const receipt = await waitForTransactionWithRetry(tx, 'joinGame')
    console.log('[joinGame] Transaction confirmed:', receipt.hash)
    return receipt.hash
  } catch (error: any) {
    console.error('[joinGame] Error:', error)
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Commit score for PVP games (Commit-Reveal mechanism)
 */
export const commitScore = async (gameId: number, hash: string): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    // Check if wallet is connected
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('Please connect your wallet first')
    }

    const contract = await getEthereumContracts()
    if (!contract) {
      throw new Error('Contract not initialized. Please connect your wallet.')
    }

    console.log('[commitScore] Calling contract.commitScore with gameId:', gameId, 'hash:', hash)
    
    const tx = await (contract as any).commitScore(gameId, hash, {
      gasLimit: 500000n, // Reasonable gas limit for commit
    })
    
    console.log('[commitScore] Transaction sent:', tx.hash)
    const receipt = await waitForTransactionWithRetry(tx, 'commitScore')
    
    if (!receipt) {
      throw new Error('Transaction receipt is null')
    }
    
    console.log('[commitScore] Transaction confirmed:', receipt.hash)
    return receipt.hash
  } catch (error: any) {
    console.error('[commitScore] Error:', error)
    throw new Error(getErrorMessage(error) || 'Failed to commit score')
  }
}

/**
 * Commit, Reveal, and Submit in one transaction (UX optimization - single wallet confirmation)
 */
export const commitRevealAndSubmit = async (gameId: number, flipCount: number, salt: number): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    // Check if wallet is connected
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('Please connect your wallet first')
    }

    const contract = await getEthereumContracts()
    if (!contract) {
      throw new Error('Contract not initialized. Please connect your wallet.')
    }

    console.log('[commitRevealAndSubmit] Calling contract.commitRevealAndSubmit with gameId:', gameId, 'flipCount:', flipCount, 'salt:', salt)
    
    // Use populateTransaction to avoid ABI issues
    try {
      const populatedTx = await (contract as any).commitRevealAndSubmit.populateTransaction(gameId, flipCount, salt)
      
      // Get provider and signer
      const provider = new ethers.BrowserProvider(ethereum)
      const walletSigner = await provider.getSigner()
      
      // Send transaction directly with manual gasLimit
      const tx = await walletSigner.sendTransaction({
        to: populatedTx.to,
        data: populatedTx.data,
        gasLimit: 3000000n, // Higher gas limit for all operations
      })
      
      console.log('[commitRevealAndSubmit] Transaction sent:', tx.hash)
      const receipt = await waitForTransactionWithRetry(tx, 'commitRevealAndSubmit')
      
      if (!receipt) {
        throw new Error('Transaction receipt is null')
      }
      
      console.log('[commitRevealAndSubmit] Transaction confirmed:', receipt.hash)
      return receipt.hash
    } catch (populateError: any) {
      // Fallback: try direct call if populateTransaction fails
      console.warn('[commitRevealAndSubmit] populateTransaction failed, trying direct call:', populateError)
      const tx = await (contract as any).commitRevealAndSubmit(gameId, flipCount, salt, {
        gasLimit: 3000000n,
      })
      
      console.log('[commitRevealAndSubmit] Transaction sent:', tx.hash)
      const receipt = await waitForTransactionWithRetry(tx, 'commitRevealAndSubmit')
      
      if (!receipt) {
        throw new Error('Transaction receipt is null')
      }
      
      console.log('[commitRevealAndSubmit] Transaction confirmed:', receipt.hash)
      return receipt.hash
    }
  } catch (error: any) {
    console.error('[commitRevealAndSubmit] Error:', error)
    throw new Error(getErrorMessage(error) || 'Failed to commit, reveal and submit score')
  }
}

/**
 * Commit and Reveal in one transaction (UX optimization - reduces wallet confirmations)
 */
export const commitAndReveal = async (gameId: number, flipCount: number, salt: number): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    // Check if wallet is connected
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('Please connect your wallet first')
    }

    const contract = await getEthereumContracts()
    if (!contract) {
      throw new Error('Contract not initialized. Please connect your wallet.')
    }

    console.log('[commitAndReveal] Calling contract.commitAndReveal with gameId:', gameId, 'flipCount:', flipCount, 'salt:', salt)
    
    const tx = await (contract as any).commitAndReveal(gameId, flipCount, salt, {
      gasLimit: 500000n, // Reasonable gas limit for commit+reveal
    })
    
    console.log('[commitAndReveal] Transaction sent:', tx.hash)
    const receipt = await waitForTransactionWithRetry(tx, 'commitAndReveal')
    
    if (!receipt) {
      throw new Error('Transaction receipt is null')
    }
    
    console.log('[commitAndReveal] Transaction confirmed:', receipt.hash)
    return receipt.hash
  } catch (error: any) {
    console.error('[commitAndReveal] Error:', error)
    throw new Error(getErrorMessage(error) || 'Failed to commit and reveal score')
  }
}

/**
 * Reveal score for PVP games (Commit-Reveal mechanism)
 */
export const revealScore = async (gameId: number, flipCount: number, salt: number): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    // Check if wallet is connected
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('Please connect your wallet first')
    }

    const contract = await getEthereumContracts()
    if (!contract) {
      throw new Error('Contract not initialized. Please connect your wallet.')
    }

    console.log('[revealScore] Calling contract.revealScore with gameId:', gameId, 'flipCount:', flipCount, 'salt:', salt)
    
    const tx = await (contract as any).revealScore(gameId, flipCount, salt, {
      gasLimit: 500000n, // Reasonable gas limit for reveal
    })
    
    console.log('[revealScore] Transaction sent:', tx.hash)
    const receipt = await waitForTransactionWithRetry(tx, 'revealScore')
    
    if (!receipt) {
      throw new Error('Transaction receipt is null')
    }
    
    console.log('[revealScore] Transaction confirmed:', receipt.hash)
    return receipt.hash
  } catch (error: any) {
    console.error('[revealScore] Error:', error)
    throw new Error(getErrorMessage(error) || 'Failed to reveal score')
  }
}

export const submitCompletion = async (gameId: number, flipCount: number): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    const contract = await getEthereumContracts()
    
    // Check game status before submitting
    const game = await contract.getGame(gameId)
    
    // Check if this is an AI game
    const isAIGame = Number(game.gameType || 0) === GameType.AI_VS_PLAYER
    const gameStatus = Number(game.status)
    const vrfFulfilled = Boolean(game.vrfFulfilled)
    
    console.log('[submitCompletion] Game status check:', {
      gameId,
      gameType: game.gameType,
      isAIGame,
      gameStatus,
      vrfFulfilled,
      maxPlayers: game.maxPlayers,
      currentPlayers: game.currentPlayers,
    })
    
    // Check game status - contract requires IN_PROGRESS for all games
    // Mission X: IN_PROGRESS = 2, WAITING_VRF = 1
    if (gameStatus !== 2) { // 2 = IN_PROGRESS (Mission X)
      // Contract requires IN_PROGRESS status for submitCompletion
      const statusMessages: Record<number, string> = {
        0: 'Game has not started yet. Please wait for the game to start.',
        1: 'Waiting for VRF fulfillment. Please wait a few seconds.',
        3: 'Game completed.',
        4: 'Game cancelled.',
        5: 'Game tied.',
      }
      throw new Error(statusMessages[gameStatus] || `Game is not in progress (status: ${gameStatus}). Please wait for the game to start.`)
    }
    
    // Check VRF status - contract requires VRF fulfilled for all games
    // Even AI games need VRF fulfilled (contract requirement)
    if (!vrfFulfilled) {
      throw new Error('VRF has not been fulfilled yet. Please wait a few seconds and try again.')
    }
    
    // Check if player has joined
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    if (!accounts || accounts.length === 0) {
      throw new Error('Please connect your wallet first.')
    }
    
    // Check if player has joined - REQUIRED for contract
    // Contract requires hasJoined to be true, so we must check this
    // For single player AI games, creator is already joined in createGame
    let playerData
    try {
      playerData = await contract.getPlayer(gameId, accounts[0])
    } catch (error: any) {
      // Player doesn't exist - check if this is a single player AI game
      // In single player AI games, creator is already joined, so this might be a query issue
      if (isAIGame) {
        console.log('[submitCompletion] Player query failed for AI game, but continuing (creator should be joined)')
        // For AI games, try to submit anyway - contract will handle it
      } else {
        // For non-AI games, this is an error
        throw new Error('You are not a player in this game. Please join the game first.')
      }
    }
    
    // If playerData exists, check hasJoined
    if (playerData) {
      if (!playerData.hasJoined) {
        // For single player AI games, creator should already be joined
        if (isAIGame) {
          console.log('[submitCompletion] Player hasJoined is false for AI game, but continuing (creator should be joined)')
          // For AI games, try to submit anyway - contract will handle it
        } else {
          throw new Error('You are not a player in this game. Please join the game first.')
        }
      }
      
      // Check if already completed
      if (playerData.hasCompleted) {
        throw new Error('You have already completed this game.')
      }
    }
    
    console.log('[submitCompletion] Calling contract.submitCompletion with gameId:', gameId, 'flipCount:', flipCount)
    
    // Use the contract instance from getEthereumContracts which already has signer
    // This ensures wallet approval is requested
    console.log('[submitCompletion] Sending transaction (wallet approval will be requested)...')
    
    // Populate transaction first to avoid estimateGas call
    // This allows wallet to prompt even if estimateGas would fail
    try {
      const populatedTx = await contract.submitCompletion.populateTransaction(gameId, flipCount)
      
      // Get provider and signer
      const provider = new ethers.BrowserProvider(ethereum)
      const walletSigner = await provider.getSigner()
      
      // Set a reasonable gas limit to avoid estimateGas call
      // This ensures wallet prompt appears even if contract would revert
      // Typical gas usage for submitCompletion is around 200k-300k
      // But if _determineWinner is called, it can use more gas (loops, prize distribution)
      // Increased to 3M to handle worst case scenario (all players, prize distribution, etc.)
      const gasLimit = 3000000n // 3M gas should be enough for worst case
      
      // Send transaction directly with manual gasLimit to skip estimateGas
      // This will trigger wallet approval prompt even if contract would revert
      const tx = await walletSigner.sendTransaction({
        to: populatedTx.to,
        data: populatedTx.data,
        gasLimit: gasLimit,
        // Don't let wallet estimate gas - use manual limit
      })
      
      console.log('[submitCompletion] Transaction sent, waiting for confirmation...', tx.hash)
      
      let receipt
      try {
        receipt = await waitForTransactionWithRetry(tx, 'submitCompletion')
        if (!receipt) {
          throw new Error('Transaction receipt is null')
        }
      } catch (waitError: any) {
        // Transaction might have reverted during wait
        console.error('[submitCompletion] Transaction wait failed:', waitError)
        
        // Check if it's a revert error
        if (waitError?.receipt?.status === 0 || waitError?.code === 'CALL_EXCEPTION') {
          receipt = waitError.receipt
        } else {
          // Re-throw if it's not a revert
          throw waitError
        }
      }
      
      // Check transaction status
      if (receipt && receipt.status === 0) {
        // Transaction reverted - try to get revert reason
        console.error('[submitCompletion] Transaction reverted! Receipt:', receipt)
        
        // Try to call the contract to see what the error is
        try {
          // Re-check game state to see what might have failed
          const gameAfter = await contract.getGame(gameId)
          
          console.error('[submitCompletion] Game state after revert:', {
            gameStatus: gameAfter.status,
            vrfFulfilled: gameAfter.vrfFulfilled,
            gameType: gameAfter.gameType,
            maxPlayers: gameAfter.maxPlayers,
            currentPlayers: gameAfter.currentPlayers,
          })
          
          // Determine which require likely failed based on game state
          // CRITICAL FIX: Enum values: CREATED=0, WAITING_VRF=1, IN_PROGRESS=2, COMPLETED=3
          if (Number(gameAfter.status) !== 2) { // 2 = IN_PROGRESS
            const statusMessages: Record<number, string> = {
              0: 'Game has not started yet. Please wait for the game to start.',
              1: 'Game is waiting for VRF. Please wait.',
              3: 'Game is already completed.',
              4: 'Game has been cancelled.',
            }
            throw new Error(statusMessages[Number(gameAfter.status)] || `Game is not in progress (status: ${gameAfter.status}).`)
          }
          
          if (!gameAfter.vrfFulfilled) {
            throw new Error('VRF has not been fulfilled yet. Please wait a few seconds and try again.')
          }
          
          // Try to get player data - if it fails, player might not be joined
          let playerAfter = null
          try {
            playerAfter = await contract.getPlayer(gameId, accounts[0])
            console.error('[submitCompletion] Player state after revert:', {
              playerHasJoined: playerAfter.hasJoined,
              playerHasCompleted: playerAfter.hasCompleted,
              playerFlipCount: playerAfter.flipCount,
            })
            
            if (!playerAfter.hasJoined) {
              throw new Error('You are not a player in this game. Please join the game first.')
            }
            if (playerAfter.hasCompleted) {
              throw new Error('You have already completed this game.')
            }
          } catch (playerError: any) {
            // Player query failed - likely means player is not joined
            if (playerError.message && (playerError.message.includes('not a player') || playerError.message.includes('not found'))) {
              throw new Error('You are not a player in this game. Please join the game first.')
            }
            // If it's an AI game, player might not be in the mapping yet (indexing delay)
            if (Number(gameAfter.gameType) === GameType.AI_VS_PLAYER) {
              console.warn('[submitCompletion] Player query failed for AI game, but game state looks correct')
              throw new Error('Player data not found. This might be an indexing delay. Please wait a moment and try again, or refresh the page.')
            }
            throw new Error('Unable to verify player status. Please refresh the page and try again.')
          }
          
          // If we get here, all checks passed but transaction still reverted
          // This might be a flipCount issue or other contract logic
          throw new Error('Transaction reverted. Please check that you have completed all card matches and try again.')
        } catch (checkError: any) {
          // If we got a specific error, use it
          if (checkError.message && !checkError.message.includes('Transaction reverted')) {
            throw checkError
          }
          // Otherwise, generic revert error
          throw new Error('Transaction reverted. The game may not be in the correct state. Please refresh and try again.')
        }
      }
      
      console.log('[submitCompletion] Transaction confirmed:', receipt.hash)
      return receipt.hash
    } catch (txError: any) {
      // If transaction fails, check if it's a revert reason
      if (txError?.code === 'ACTION_REJECTED' || txError?.code === 4001) {
        throw new Error('Transaction was rejected by user')
      }
      // Re-throw other errors
      throw txError
    }
  } catch (error: any) {
    // Log full error for debugging
    console.error('Submit completion error:', error)
    
    // If it's already our custom error, re-throw it
    if (error.message && !error.message.includes('Hata:')) {
      throw error
    }
    
    // Check for specific contract errors
    if (error?.reason) {
      throw new Error(error.reason)
    }
    
    if (error?.data?.message) {
      throw new Error(error.data.message)
    }
    
    // Check for revert reason in error message
    const errorMessage = error?.message || error?.error?.message || error?.toString() || ''
    const lowerMessage = errorMessage.toLowerCase()
    
    if (lowerMessage.includes('vrf not fulfilled') || lowerMessage.includes('vrf not fulfilled yet')) {
      throw new Error('VRF has not been fulfilled yet. Please wait a few seconds and try again. (Note: VRF must be manually fulfilled by the owner)')
    }
    if (lowerMessage.includes('game not in progress')) {
      throw new Error('Game has not started or has been completed.')
    }
    if (lowerMessage.includes('not a player')) {
      throw new Error('You are not a player in this game.')
    }
    if (lowerMessage.includes('already completed')) {
      throw new Error('You have already completed this game.')
    }
    
    throw new Error(getErrorMessage(error))
  }
}

export const createRematch = async (originalGameId: number, gameName: string, stake: number): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    const contract = await getEthereumContracts()
    
    // Validate stake amount
    const stakeAmount = Number(stake)
    if (isNaN(stakeAmount) || stakeAmount < 1) {
      throw new Error('Minimum stake is 1 ETH')
    }
    
    const stakeWei = toWei(stake.toString())
    
    // Verify the stake is at least 1 ether (1 ETH)
    const minBet = ethers.parseEther('1')
    if (stakeWei < minBet) {
      throw new Error('Minimum stake is 1 ETH')
    }
    
    // Use game name or default
    const finalGameName = gameName.trim() || `Rematch #${Date.now()}`
    
    const tx = await contract.createRematch(originalGameId, finalGameName, {
      value: stakeWei,
    })
    
    const receipt = await waitForTransactionWithRetry(tx, 'createRematch')
    return receipt.hash
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

export const cancelGame = async (gameId: number): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    const contract = await getEthereumContracts()
    const tx = await contract.cancelGame(gameId)
    const receipt = await waitForTransactionWithRetry(tx, 'cancelGame')
    return receipt.hash
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

// View functions
// Get transaction hash from GameCompleted event
const getGameCompletedTxHash = async (gameId: number, chainIdParam?: number): Promise<string | null> => {
  try {
    const contract = await getReadOnlyContract(chainIdParam)
    
    // Get GameCompleted events for this game
    const filter = contract.filters.GameCompleted(gameId)
    const events = await contract.queryFilter(filter)
    
    if (events && events.length > 0) {
      // Get the most recent event
      const latestEvent = events[events.length - 1]
      return latestEvent.transactionHash || null
    }
    
    return null
  } catch (error) {
    console.warn('Error fetching GameCompleted transaction:', error)
    return null
  }
}

export const getGame = async (gameId: number, chainIdParam?: number): Promise<GameStruct> => {
  try {
    const contract = await getReadOnlyContract(chainIdParam)
    const game = await contract.getGame(gameId)
    return await structuredGame(game, contract)
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

export const getActiveGames = async (chainIdParam?: number): Promise<GameStruct[]> => {
  try {
    // Use getReadOnlyContract which handles chainId detection
    const contract = await getReadOnlyContract(chainIdParam)
    
    // Try to call getActiveGames with better error handling
    let gameIds: any[] = []
    try {
      gameIds = await contract.getActiveGames()
      console.log('[getActiveGames] Raw game IDs from contract:', gameIds.length, gameIds)
    } catch (error: any) {
      // If contract call fails, try alternative method: query GameCreated events
      const errorMsg = error?.message || error?.toString() || ''
      console.warn('[getActiveGames] getActiveGames() failed, trying event-based approach:', errorMsg)
      
      // Try to get games from events as fallback
      try {
        const filter = contract.filters.GameCreated()
        // Use same block range for both mainnet and testnet
        const blockRange = -1000
        const events = await contract.queryFilter(filter, blockRange)
        console.log('[getActiveGames] Found', events.length, 'GameCreated events (checked', Math.abs(blockRange), 'blocks)')
        
        // Extract unique game IDs from events
        const uniqueGameIds = new Set<number>()
        for (const event of events) {
          try {
            if ('args' in event && event.args && Array.isArray(event.args) && event.args.length > 0) {
              const gameId = Number(event.args[0])
              if (gameId > 0) {
                uniqueGameIds.add(gameId)
              }
            }
          } catch (e) {
            console.warn('[getActiveGames] Error parsing event:', e)
          }
        }
        
        gameIds = Array.from(uniqueGameIds)
        console.log('[getActiveGames] Extracted', gameIds.length, 'unique game IDs from events')
      } catch (eventError) {
        console.error('[getActiveGames] Event-based approach also failed:', eventError)
        if (errorMsg.includes('ABI decoding') || 
            errorMsg.includes('deferred error') || 
            errorMsg.includes('overflow')) {
          console.warn('[getActiveGames] Returning empty array due to ABI decoding error')
          return []
        }
        throw error
      }
    }
    
    // Handle empty games array
    if (!gameIds || gameIds.length === 0) {
      console.log('[getActiveGames] No game IDs found')
      return []
    }
    
    // Convert game IDs to numbers and filter out invalid ones
    const validGameIds = gameIds
      .map((id: any) => {
        try {
          if (typeof id === 'bigint') {
            return Number(id)
          }
          return Number(id) || 0
        } catch {
          return 0
        }
      })
      .filter((id: number) => id > 0)
    
    console.log('[getActiveGames] Valid game IDs:', validGameIds)
    
    // Fetch each game individually
    const games: any[] = []
    for (const gameId of validGameIds) {
      try {
        const game = await contract.getGame(gameId)
        if (game && game.id && Number(game.id) > 0) {
          games.push(game)
        }
      } catch (error: any) {
        console.warn(`[getActiveGames] Error fetching game ${gameId}:`, error?.message)
        // Continue with other games
      }
    }
    
    console.log('[getActiveGames] Successfully fetched', games.length, 'games from contract')
    
    // Process games with error handling for each game
    const processedGames: GameStruct[] = []
    for (let i = 0; i < games.length; i++) {
      try {
        const game = games[i]
        // Skip if game is invalid
        if (!game) {
          continue
        }
        
        // Skip if game.id is invalid or causes overflow
        try {
          const gameId = typeof game.id === 'bigint' ? game.id.toString() : String(game.id || '0')
          if (!gameId || gameId === '0') {
            continue
          }
        } catch {
          continue
        }
        
        const processedGame = await structuredGame(game, contract)
        // Filter out completed and tied games
        if (processedGame.status !== GameStatus.COMPLETED && processedGame.status !== GameStatus.TIED) {
          processedGames.push(processedGame)
        }
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || ''
        // Log but don't fail on overflow errors
        if (errorMsg.includes('overflow')) {
          console.warn(`Skipping game at index ${i} due to overflow error`)
        } else {
          console.error(`Error processing game at index ${i}:`, error)
        }
        // Skip invalid games and continue
      }
    }
    
    console.log('[getActiveGames] Returning', processedGames.length, 'active games after filtering')
    return processedGames
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || ''
    console.error('[getActiveGames] Error:', errorMsg)
    // Return empty array instead of throwing to prevent page crash
    return []
  }
}

export const getPlayer = async (gameId: number, playerAddress: string, chainIdParam?: number): Promise<Player> => {
  try {
    const contract = await getReadOnlyContract(chainIdParam)
    const player = await contract.getPlayer(gameId, playerAddress)
    
    // Mission X: Parse finalScore if available
    const finalScore = player.finalScore !== undefined ? Number(player.finalScore) : 0
    
    // Safely parse flipCount (could be BigInt)
    let flipCount = 0
    try {
      if (player.flipCount) {
        const flipCountStr = typeof player.flipCount === 'bigint' 
          ? player.flipCount.toString() 
          : String(player.flipCount)
        flipCount = parseInt(flipCountStr, 10) || 0
      }
    } catch (error) {
      console.warn('Error parsing flipCount:', error)
      flipCount = 0
    }
    
    // Mission X: Parse player state (0 = NOT_STARTED, 1 = PLAYING, 2 = SUBMITTED)
    const playerState = player.state !== undefined ? Number(player.state) : 0
    
    return {
      playerAddress: player.playerAddress || playerAddress,
      flipCount: flipCount,
      finalScore: finalScore, // Mission X: VRF-determined final score
      completedAt: player.completedAt ? Number(player.completedAt) : 0,
      hasCompleted: Boolean(player.hasCompleted),
      hasJoined: Boolean(player.hasJoined),
      state: playerState, // Mission X: Player lifecycle state
    }
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

export const getGamePlayers = async (gameId: number, chainIdParam?: number): Promise<string[]> => {
  try {
    const contract = await getReadOnlyContract(chainIdParam)
    return await contract.getGamePlayers(gameId)
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

export const getCardOrder = async (gameId: number, chainIdParam?: number): Promise<number[]> => {
  try {
    const contract = await getReadOnlyContract(chainIdParam)
    const cardOrder = await contract.getCardOrder(gameId)
    return cardOrder.map((id: bigint) => Number(id))
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

export const getPlayerGames = async (playerAddress: string, chainIdParam?: number): Promise<number[]> => {
  try {
    // Use provided chainId, or try to get from window.ethereum, or default to mainnet
    let chainId = chainIdParam || BASE_MAINNET_CHAIN_ID
    
    if (!chainIdParam && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
        chainId = parseInt(chainIdHex, 16)
        console.log('[getPlayerGames] Detected chainId from window.ethereum:', chainId, '(Base Mainnet)')
      } catch (error) {
        console.warn('[getPlayerGames] Failed to get chainId, defaulting to mainnet:', error)
      }
    } else if (chainIdParam) {
      console.log('[getPlayerGames] Using provided chainId:', chainId, '(Base Mainnet)')
    }

    // Use getReadOnlyContract which handles chainId detection
    const contract = await getReadOnlyContract(chainId)
    console.log('[getPlayerGames] Contract address:', contract.target)
    console.log('[getPlayerGames] Calling getPlayerGames for address:', playerAddress)
    
    let gameIds: any[]
    try {
      gameIds = await contract.getPlayerGames(playerAddress)
      console.log('[getPlayerGames] Raw game IDs from contract:', gameIds)
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || ''
      console.error('[getPlayerGames] Contract call error:', errorMsg)
      
      // If the function doesn't exist or returns empty, return empty array
      if (errorMsg.includes('function does not exist') || 
          errorMsg.includes('execution reverted') ||
          errorMsg.includes('ABI decoding')) {
        console.warn('[getPlayerGames] Contract function may not exist or returned error, returning empty array')
        return []
      }
      throw error
    }
    
    // Handle empty or invalid response
    if (!gameIds || !Array.isArray(gameIds)) {
      console.warn('[getPlayerGames] Invalid response from contract, returning empty array')
      return []
    }
    
    const mappedIds = gameIds
      .map((id: any) => {
        try {
          if (typeof id === 'bigint') {
            return Number(id)
          }
          return Number(id) || 0
        } catch {
          return 0
        }
      })
      .filter((id: number) => id > 0) // Filter out invalid IDs
    
    console.log('[getPlayerGames] Mapped game IDs:', mappedIds)
    return mappedIds
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || ''
    console.error('[getPlayerGames] Error:', errorMsg)
    // Return empty array instead of throwing to prevent page crash
    console.warn('[getPlayerGames] Returning empty array due to error')
    return []
  }
}

// Helper function to auto-fulfill VRF for testing (owner only)
export const fulfillVRF = async (gameId: number): Promise<string> => {
  if (!ethereum) {
    throw new Error('Please install a browser provider')
  }

  try {
    const contract = await getEthereumContracts()
    const game = await contract.getGame(gameId)
    
    if (game.vrfFulfilled) {
      throw new Error('VRF already fulfilled.')
    }
    
    // Generate random words for VRF (for testing - in production this comes from VRF provider)
    const randomWords = [BigInt(Math.floor(Math.random() * 1000000))]
    
    const tx = await contract.fulfillVRF(game.vrfRequestId, randomWords)
    const receipt = await waitForTransactionWithRetry(tx, 'fulfillVRF')
    return receipt.hash
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

// Helper functions
const structuredGame = async (game: any, contractInstance?: ethers.Contract): Promise<GameStruct> => {
  try {
    // Get players for this game
    let players: string[] = []
    try {
      const contract = contractInstance || await getReadOnlyContract()
      const gameId = Number(game.id || 0)
      if (gameId > 0) {
        players = await contract.getGamePlayers(gameId)
      }
    } catch (error) {
      console.warn('Could not fetch game players:', error)
    }

    // Calculate winner prize based on game type
    let winnerPrize: number | undefined
    const gameStatus = Number(game.status || 0)
    const winner = game.winner ? String(game.winner) : '0x0000000000000000000000000000000000000000'
    
    // COMPLETED = 3, TIED = 5 (GameStatus enum)
    if ((gameStatus === GameStatus.COMPLETED || gameStatus === GameStatus.TIED) && winner !== '0x0000000000000000000000000000000000000000') {
      try {
        const totalPrize = game.totalPrize ? parseFloat(fromWei(game.totalPrize)) : 0
        const stake = game.stake ? parseFloat(fromWei(game.stake)) : 0
        
        if (Number(game.gameType || 0) === GameType.AI_VS_PLAYER) {
          // Mission X: AI vs Player with 5% house edge
          if (winner.toLowerCase() === '0x1111111111111111111111111111111111111111') {
            winnerPrize = stake // AI wins (goes to house balance)
          } else {
            winnerPrize = stake * 1.95 // Player wins - gets 1.95x stake (5% house edge)
          }
        } else {
          // Player vs Player: Winner gets total prize minus 10% commission
          winnerPrize = totalPrize * 0.9
        }
      } catch (error) {
        console.warn('Error calculating winner prize:', error)
      }
    }

    // Handle name field - may not exist in old contracts or may be empty
    // Safely parse game ID for name
    let gameIdForName = 0
    try {
      const idStr = typeof game.id === 'bigint' ? game.id.toString() : String(game.id || '0')
      gameIdForName = parseInt(idStr, 10) || 0
    } catch {
      gameIdForName = 0
    }
    let gameName = `Game #${gameIdForName}`
    try {
      // Check if name exists and is valid
      if (game.name !== undefined && game.name !== null && game.name !== '') {
        const nameStr = String(game.name).trim()
        if (nameStr !== '' && nameStr !== '0x' && nameStr.length > 0) {
          gameName = nameStr
        }
      }
    } catch (error) {
      // Name field doesn't exist or is invalid, use default
      // This is expected for old contracts without name field
    }

    // Safely parse all fields with defaults
    // Use BigInt-safe parsing for large numbers
    const safeParseUint256 = (value: any): number => {
      if (!value) return 0
      try {
        // Convert BigInt to string first, then parse
        const str = typeof value === 'bigint' ? value.toString() : String(value)
        const num = Number(str)
        // Check for overflow
        if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
          console.warn('Number overflow detected, using safe fallback')
          return 0
        }
        return num
      } catch {
        return 0
      }
    }
    
    const gameId = safeParseUint256(game.id)
    
    // Parse cardOrder safely - these should be small numbers (0-11)
    let cardOrder: number[] = []
    if (Array.isArray(game.cardOrder)) {
      cardOrder = game.cardOrder.map((id: any) => {
        try {
          const num = safeParseUint256(id)
          // Card IDs should be 0-11, validate
          if (num >= 0 && num < 12) {
            return num
          }
          return 0
        } catch {
          return 0
        }
      })
    }
    
    // Parse gameType safely - ensure it's 0 (AI_VS_PLAYER) or 1 (PLAYER_VS_PLAYER)
    const rawGameType = safeParseUint256(game.gameType)
    const parsedGameType = (rawGameType === 0 || rawGameType === 1) ? rawGameType as GameType : GameType.AI_VS_PLAYER
    
    // Debug log for gameType parsing
    if (rawGameType !== parsedGameType) {
      console.warn(`[structuredGame] GameType mismatch: raw=${rawGameType}, parsed=${parsedGameType}, gameId=${gameId}`)
    }
    
    const result = {
      id: gameId,
      name: gameName,
      creator: game.creator ? String(game.creator) : '0x0000000000000000000000000000000000000000',
      gameType: parsedGameType,
      status: gameStatus as GameStatus,
      stake: game.stake ? parseFloat(fromWei(game.stake)) : 0,
      totalPrize: game.totalPrize ? parseFloat(fromWei(game.totalPrize)) : 0,
      maxPlayers: safeParseUint256(game.maxPlayers) || 2,
      currentPlayers: safeParseUint256(game.currentPlayers),
      createdAt: safeParseUint256(game.createdAt),
      startedAt: safeParseUint256(game.startedAt),
      completedAt: safeParseUint256(game.completedAt),
      endTime: safeParseUint256(game.endTime || 0),
      winner: winner,
      winnerFlipCount: safeParseUint256(game.winnerFlipCount),
      winnerFinalScore: game.winnerFinalScore ? safeParseUint256(game.winnerFinalScore) : undefined, // Mission X
      winnerVRFSeed: game.winnerVRFSeed ? String(game.winnerVRFSeed) : undefined,
      vrfRequestId: game.vrfRequestId ? String(game.vrfRequestId) : '0x',
      vrfRandom: game.vrfRandom ? safeParseUint256(game.vrfRandom) : undefined, // Mission X
      cardOrder: cardOrder,
      vrfFulfilled: Boolean(game.vrfFulfilled || false),
      playMode: game.playMode !== undefined ? Number(game.playMode) : undefined, // Mission X: 0 = FREE, 1 = WAGERED
      winnerPrize,
      players,
      hasPassword: game.passwordHash ? game.passwordHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' : false,
    }
    
    // Get transaction hash for prize distribution if game is completed
    // Note: We can't pass chainId here, but contractInstance already has the correct network
    // COMPLETED = 3, TIED = 5 (GameStatus enum)
    if ((gameStatus === GameStatus.COMPLETED || gameStatus === GameStatus.TIED) && winner !== '0x0000000000000000000000000000000000000000') {
      try {
        // Try to get chainId from window.ethereum if available
        let chainId: number | undefined
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
            chainId = parseInt(chainIdHex, 16)
          } catch (e) {
            // Ignore
          }
        }
        const txHash = await getGameCompletedTxHash(gameId, chainId)
        if (txHash) {
          return {
            ...result,
            prizeTxHash: txHash,
          }
        }
      } catch (error) {
        console.warn('Error fetching prize transaction hash:', error)
      }
    }
    
    return result
  } catch (error) {
    console.error('Error in structuredGame:', error)
    // Return minimal valid game struct
    const gameId = Number(game?.id || 0)
    return {
      id: gameId,
      name: `Game #${gameId}`,
      creator: '0x0000000000000000000000000000000000000000',
      gameType: GameType.AI_VS_PLAYER,
      status: GameStatus.CREATED,
      stake: 0,
      totalPrize: 0,
      maxPlayers: 2,
      currentPlayers: 0,
      createdAt: 0,
      startedAt: 0,
      completedAt: 0,
      endTime: 0,
      winner: '0x0000000000000000000000000000000000000000',
      winnerFlipCount: 0,
      vrfRequestId: '0x',
      cardOrder: [],
      vrfFulfilled: false,
      players: [],
    }
  }
}

// Legacy functions for backward compatibility (if needed)
export const getGames = getActiveGames

// Get all games including completed ones for leaderboard
export const getAllGames = async (chainIdParam?: number): Promise<GameStruct[]> => {
  try {
    const contract = await getReadOnlyContract(chainIdParam)
    console.log('[getAllGames] Fetching all games for chainId:', chainIdParam)
    
    // Method 1: Try to get game IDs from events first (more reliable on testnet)
    let gameIds: number[] = []
    try {
      const filter = contract.filters.GameCreated()
      // Use same block range for both mainnet and testnet
      const blockRange = -5000
      const events = await contract.queryFilter(filter, blockRange)
      console.log('[getAllGames] Found', events.length, 'GameCreated events (checked', Math.abs(blockRange), 'blocks)')
      
      // Extract unique game IDs from events
      const uniqueGameIds = new Set<number>()
      for (const event of events) {
        try {
          if ('args' in event && event.args && Array.isArray(event.args) && event.args.length > 0) {
            const gameId = Number(event.args[0])
            if (gameId > 0) {
              uniqueGameIds.add(gameId)
            }
          }
        } catch (e) {
          console.warn('[getAllGames] Error parsing event:', e)
        }
      }
      
      gameIds = Array.from(uniqueGameIds).sort((a, b) => a - b)
      console.log('[getAllGames] Extracted', gameIds.length, 'unique game IDs from events')
    } catch (eventError) {
      console.warn('[getAllGames] Event-based approach failed, trying iteration method:', eventError)
    }
    
    // Method 2: If no game IDs from events, try iteration
    if (gameIds.length === 0) {
      console.log('[getAllGames] Trying iteration method...')
      const maxGames = 1000 // Reasonable limit
      const foundGameIds: number[] = []
      
      // Try to get games by ID starting from 1
      for (let i = 1; i <= maxGames; i++) {
        try {
          const game = await contract.games(i)
          if (game && game.id && Number(game.id) > 0) {
            foundGameIds.push(Number(game.id))
          } else {
            // No more games
            break
          }
        } catch (error: any) {
          // Game doesn't exist or error, continue
          if (error?.message?.includes('revert') || error?.message?.includes('invalid opcode')) {
            break // No more games
          }
          // Continue trying
        }
      }
      
      gameIds = foundGameIds
      console.log('[getAllGames] Found', gameIds.length, 'game IDs via iteration')
    }
    
    if (gameIds.length === 0) {
      console.log('[getAllGames] No game IDs found, falling back to getActiveGames')
      return getActiveGames(chainIdParam)
    }
    
    // Fetch all games by ID
    console.log('[getAllGames] Fetching', gameIds.length, 'games from contract')
    const games = await Promise.all(gameIds.map(async (id) => {
      try {
        const game = await contract.getGame(id)
        if (game && game.id && Number(game.id) > 0) {
          return await structuredGame(game, contract)
        }
        return null
      } catch (error: any) {
        console.warn(`[getAllGames] Error fetching game ${id}:`, error?.message)
        return null
      }
    }))
    
    const validGames = games.filter((game): game is GameStruct => game !== null)
    console.log('[getAllGames] Returning', validGames.length, 'games (out of', gameIds.length, 'game IDs)')
    return validGames
  } catch (error: any) {
    console.error('[getAllGames] Error:', error)
    // Fallback to active games with same chainId
    console.log('[getAllGames] Falling back to getActiveGames')
    return getActiveGames(chainIdParam)
  }
}

export const getOwner = async (): Promise<string> => {
  try {
    const contract = await getReadOnlyContract()
    return await contract.owner()
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}

export const getHouseBalance = async (chainIdParam?: number): Promise<string> => {
  try {
    const contract = await getReadOnlyContract(chainIdParam)
    const balance = await contract.houseBalance()
    return fromWei(balance)
  } catch (error: any) {
    console.error('Error getting house balance:', error)
    throw new Error(getErrorMessage(error))
  }
}

// Legacy functions for backward compatibility
export const deleteGame = cancelGame

export const invitePlayer = async (receiver: string, gameId: number): Promise<string> => {
  // In new contract, players join directly, no invitations
  // This is kept for backward compatibility
  throw new Error('Invitations are not supported in new contract. Use joinGame instead.')
}

export const saveScore = async (gameId: number, index: number, flipCount: number): Promise<string> => {
  return submitCompletion(gameId, flipCount)
}

export const payout = async (gameId: number): Promise<string> => {
  // Payout is automatic in new contract
  throw new Error('Payout is automatic when game completes.')
}

export const respondToInvite = async (
  accept: boolean,
  invitation: any,
  index: number
): Promise<string> => {
  if (accept) {
    return joinGame(invitation.gameId, invitation.stake || 1)
  } else {
    throw new Error('Rejecting invitations is not needed. Just don\'t join.')
  }
}

export const getMyGames = async (playerAddress?: string, chainIdParam?: number): Promise<GameStruct[]> => {
  try {
    // Use provided chainId, or try to get from window.ethereum, or default to mainnet
    let chainId = chainIdParam || BASE_MAINNET_CHAIN_ID
    
    if (!chainIdParam && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
        chainId = parseInt(chainIdHex, 16)
        console.log('[getMyGames] Detected chainId from window.ethereum:', chainId, '(Base Mainnet)')
      } catch (error) {
        console.warn('[getMyGames] Failed to get chainId, defaulting to mainnet:', error)
      }
    } else if (chainIdParam) {
      console.log('[getMyGames] Using provided chainId:', chainId, '(Base Mainnet)')
    }
    
    if (!playerAddress && typeof window !== 'undefined') {
      try {
        const accounts = await ethereum?.request?.({ method: 'eth_accounts' })
        if (accounts?.length > 0) {
          playerAddress = accounts[0]
          console.log('[getMyGames] Found player address from wallet:', playerAddress)
        }
      } catch (error) {
        console.warn('[getMyGames] Failed to get accounts from wallet:', error)
      }
    }
    
    if (!playerAddress) {
      console.log('[getMyGames] No player address found')
      return []
    }
    
    const playerAddressLower = playerAddress.toLowerCase()
    console.log('[getMyGames] 🔍 Fetching games for address:', playerAddress, 'on chainId:', chainId)
    
    // NEW APPROACH: First try localStorage (client-side cache)
    // This works even if blockchain queries fail
    try {
      const { getGamesFromStorage, saveGamesToStorage } = await import('@/utils/gameStorage')
      const cachedGames = getGamesFromStorage(chainId, playerAddress)
      
      if (cachedGames.length > 0) {
        console.log('[getMyGames] 📦 Found', cachedGames.length, 'games in localStorage cache')
        
        // Return cached games immediately (non-blocking)
        // Then try to update from blockchain in background
        setTimeout(async () => {
          try {
            console.log('[getMyGames] 🔄 Updating cache from blockchain...')
            const blockchainGames = await fetchGamesFromBlockchain(playerAddress!, chainId, playerAddressLower)
            if (blockchainGames.length > 0) {
              saveGamesToStorage(blockchainGames, chainId, playerAddress!)
              console.log('[getMyGames] ✅ Updated cache with', blockchainGames.length, 'games from blockchain')
            }
          } catch (e) {
            console.warn('[getMyGames] Failed to update cache from blockchain:', e)
          }
        }, 100)
        
        return cachedGames
      }
    } catch (e) {
      console.warn('[getMyGames] localStorage not available:', e)
    }
    
    // If no cache, fetch from blockchain
    return await fetchGamesFromBlockchain(playerAddress, chainId, playerAddressLower)
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || ''
    console.error('[getMyGames] Fatal error:', errorMsg)
    
    // Last resort: try localStorage even on error
    try {
      const { getGamesFromStorage } = await import('@/utils/gameStorage')
      if (playerAddress && chainIdParam) {
        const cachedGames = getGamesFromStorage(chainIdParam, playerAddress)
        if (cachedGames.length > 0) {
          console.log('[getMyGames] 🆘 Using localStorage cache as fallback:', cachedGames.length, 'games')
          return cachedGames
        }
      }
    } catch (e) {
      // Ignore
    }
    
    return []
  }
}

/**
 * Fetch games from blockchain (internal helper function)
 */
const fetchGamesFromBlockchain = async (
  playerAddress: string,
  chainId: number,
  playerAddressLower: string
): Promise<GameStruct[]> => {
  try {
    const contract = await getReadOnlyContract(chainId)
    
    // ULTIMATE METHOD: Direct iteration through all games
    // This method directly queries the contract's games mapping
    console.log('[getMyGames] 🚀 Using ULTIMATE method: Direct iteration through games mapping')
    const playerGames: GameStruct[] = []
    const maxIterations = 1000 // Same for both mainnet and testnet
    
    console.log(`[getMyGames] Iterating through up to ${maxIterations} games...`)
    
    // Use batch processing to speed up
    const batchSize = 50
    let foundGames = 0
    let checkedGames = 0
    
    for (let i = 1; i <= maxIterations; i += batchSize) {
      try {
        const batchPromises: Promise<GameStruct | null>[] = []
        
        // Create batch of promises
        for (let j = i; j < i + batchSize && j <= maxIterations; j++) {
          batchPromises.push(
            (async () => {
              try {
                const game = await contract.getGame(j)
                if (game && game.id && Number(game.id) > 0) {
                  const structured = await structuredGame(game, contract)
                  
                  // Check if player is creator or participant
                  const isCreator = structured.creator && structured.creator.toLowerCase() === playerAddressLower
                  const isPlayer = structured.players && Array.isArray(structured.players) && 
                    structured.players.some((p: string) => p && p.toLowerCase() === playerAddressLower)
                  
                  if (isCreator || isPlayer) {
                    return structured
                  }
                }
                return null
              } catch (error: any) {
                // Game doesn't exist or error - this is normal, continue
                if (error?.message?.includes('revert') || error?.message?.includes('invalid opcode')) {
                  return null // Game doesn't exist
                }
                // Other errors - log but continue
                return null
              }
            })()
          )
        }
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises)
        const validGames = batchResults.filter((game): game is GameStruct => game !== null)
        
        if (validGames.length > 0) {
          playerGames.push(...validGames)
          foundGames += validGames.length
        }
        
        checkedGames += batchSize
        if (checkedGames % 500 === 0) {
          console.log(`[getMyGames] Checked ${checkedGames} games, found ${foundGames} player games so far...`)
        }
        
        // If we've checked many games and found none, we might be past the last game
        // But continue to be thorough, especially for testnet
        if (checkedGames > 100 && foundGames === 0 && i > 100) {
          // Check if we've hit the end of games
          try {
            const testGame = await contract.getGame(i + batchSize)
            if (!testGame || !testGame.id || Number(testGame.id) === 0) {
              // Likely no more games
              console.log(`[getMyGames] No more games found after ${i}, stopping iteration`)
              break
            }
          } catch {
            // Error checking next game, might be end of games
            // Continue anyway to be safe
          }
        }
      } catch (batchError: any) {
        console.warn(`[getMyGames] Error processing batch starting at ${i}:`, batchError?.message)
        // Continue with next batch
      }
    }
    
    console.log(`[getMyGames] ✅ Direct iteration complete: Found ${playerGames.length} games after checking ${checkedGames} game IDs`)
    
    // If we found games, return them
    if (playerGames.length > 0) {
      // Remove duplicates (in case of any)
      const uniqueGames = playerGames.filter((game, index, self) => 
        index === self.findIndex(g => g.id === game.id)
      )
      console.log(`[getMyGames] ✅ Returning ${uniqueGames.length} unique games from ULTIMATE method`)
      return uniqueGames
    }
    
    // FALLBACK: Try event-based approach if direct iteration found nothing
    console.log('[getMyGames] ⚠️ Direct iteration found no games, trying event-based fallback...')
    try {
      const filter = contract.filters.GameCreated()
      // Use same block range for both mainnet and testnet
      const blockRange = -10000
      const events = await contract.queryFilter(filter, blockRange)
      console.log('[getMyGames] Found', events.length, 'GameCreated events in fallback')
      
      const uniqueGameIds = new Set<number>()
      for (const event of events) {
        try {
          if ('args' in event && event.args && Array.isArray(event.args) && event.args.length > 0) {
            const gameId = Number(event.args[0])
            if (gameId > 0) {
              uniqueGameIds.add(gameId)
            }
          }
        } catch (e) {
          // Skip invalid events
        }
      }
      
      if (uniqueGameIds.size > 0) {
        console.log('[getMyGames] Checking', uniqueGameIds.size, 'games from events...')
        const eventGames = await Promise.all(Array.from(uniqueGameIds).map(async (id) => {
          try {
            const game = await contract.getGame(id)
            if (game && game.id && Number(game.id) > 0) {
              const structured = await structuredGame(game, contract)
              const isCreator = structured.creator && structured.creator.toLowerCase() === playerAddressLower
              const isPlayer = structured.players && Array.isArray(structured.players) && 
                structured.players.some((p: string) => p && p.toLowerCase() === playerAddressLower)
              return (isCreator || isPlayer) ? structured : null
            }
            return null
          } catch {
            return null
          }
        }))
        
        const validEventGames = eventGames.filter((game): game is GameStruct => game !== null)
        if (validEventGames.length > 0) {
          console.log(`[getMyGames] ✅ Found ${validEventGames.length} games from event-based fallback`)
          return validEventGames
        }
      }
    } catch (eventError) {
      console.warn('[getMyGames] Event-based fallback also failed:', eventError)
    }
    
    console.log('[getMyGames] ❌ No games found using any method')
    
    // Save empty result to cache to avoid repeated queries
    try {
      const { saveGamesToStorage } = await import('@/utils/gameStorage')
      saveGamesToStorage([], chainId, playerAddress)
    } catch (e) {
      // Ignore
    }
    
    return []
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || ''
    console.error('[getMyGames] Fatal error in fetchGamesFromBlockchain:', errorMsg)
    return []
  }
}

export const getInvitations = async (gameId: number): Promise<any[]> => {
  // New contract doesn't have invitations
  return []
}

export const getMyInvitations = async (): Promise<any[]> => {
  // New contract doesn't have invitations
  return []
}

export const getScores = async (gameId: number, chainIdParam?: number): Promise<any[]> => {
  try {
    const players = await getGamePlayers(gameId, chainIdParam)
    const playerData = await Promise.all(
      players.map(async (address) => {
        const player = await getPlayer(gameId, address, chainIdParam)
        return {
          id: players.indexOf(address),
          gameId,
          player: address,
          score: player.flipCount, // flipCount for display
          finalScore: player.finalScore, // VRF-determined final score (used for winner determination)
          prize: 0, // Will be calculated on completion
          played: player.hasCompleted,
          state: player.state, // Mission X: Player lifecycle state
        }
      })
    )
    return playerData
  } catch (error: any) {
    throw new Error(getErrorMessage(error))
  }
}







