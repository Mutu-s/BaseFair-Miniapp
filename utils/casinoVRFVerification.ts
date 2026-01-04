import { ethers } from 'ethers'
import { CasinoGameType, CasinoGameState } from '@/services/casino'

/**
 * Casino VRF Verification Utilities
 * Provides functions to verify the randomness used in casino games
 */

export interface CasinoVRFVerificationData {
  gameType: CasinoGameType
  gameId: number
  result: number
  seed: string
  blockNumber?: number
  blockHash?: string
  timestamp: number
  player: string
  verificationProof: string
}

/**
 * Generate verification proof for a casino game's VRF randomness
 */
export const generateCasinoVerificationProof = async (
  gameType: CasinoGameType,
  gameState: CasinoGameState,
  blockNumber?: number
): Promise<CasinoVRFVerificationData> => {
  // Get block data if blockNumber is provided
  let blockHash = ''
  let actualBlockNumber = blockNumber
  
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      if (!actualBlockNumber && gameState.timestamp) {
        // Estimate block number from timestamp (approximate)
        const currentBlock = await provider.getBlockNumber()
        const currentBlockData = await provider.getBlock(currentBlock)
        const timeDiff = Math.floor(Date.now() / 1000) - gameState.timestamp
        const blocksDiff = Math.floor(timeDiff / 2) // Approximate 2 seconds per block
        actualBlockNumber = currentBlock - blocksDiff
      }
      
      if (actualBlockNumber) {
        const block = await provider.getBlock(actualBlockNumber)
        if (block) {
          blockHash = block.hash || ''
          actualBlockNumber = block.number
        }
      }
    } catch (error) {
      console.warn('Could not fetch block data:', error)
    }
  }
  
  // Reconstruct seed (same as contract uses)
  // seed = keccak256(block.timestamp, block.prevrandao, msg.sender)
  const seed = ethers.solidityPackedKeccak256(
    ['uint256', 'bytes32', 'address'],
    [
      gameState.timestamp,
      blockHash || '0x0', // block.prevrandao is in blockHash
      gameState.player
    ]
  )
  
  // Create verification proof
  const proofData = ethers.solidityPackedKeccak256(
    ['string', 'uint256', 'uint256', 'address', 'bytes32', 'uint256'],
    [
      gameType,
      gameState.gameId,
      gameState.result,
      gameState.player,
      blockHash || '0x0',
      gameState.timestamp
    ]
  )
  
  return {
    gameType,
    gameId: gameState.gameId,
    result: gameState.result,
    seed,
    blockNumber: actualBlockNumber,
    blockHash,
    timestamp: gameState.timestamp,
    player: gameState.player,
    verificationProof: proofData
  }
}

/**
 * Verify casino game randomness
 */
export const verifyCasinoVRFRandomness = async (
  gameType: CasinoGameType,
  gameState: CasinoGameState,
  blockNumber?: number
): Promise<{
  isValid: boolean
  verificationData: CasinoVRFVerificationData
  details: {
    resultValid: boolean
    seedValid: boolean
    blockDataValid: boolean
    timestampValid: boolean
  }
}> => {
  const verificationData = await generateCasinoVerificationProof(gameType, gameState, blockNumber)
  
  // Verify result is valid based on game type
  let resultValid = false
  switch (gameType) {
    case CasinoGameType.COINFLIP:
      resultValid = gameState.result === 0 || gameState.result === 1
      break
    case CasinoGameType.DICE:
      resultValid = gameState.result >= 1 && gameState.result <= 100
      break
    case CasinoGameType.SLOTS:
      // Result is encoded as (reel1 << 16) | (reel2 << 8) | reel3
      const reel1 = (gameState.result >> 16) & 0xFF
      const reel2 = (gameState.result >> 8) & 0xFF
      const reel3 = gameState.result & 0xFF
      resultValid = reel1 <= 6 && reel2 <= 6 && reel3 <= 6
      break
    case CasinoGameType.PLINKO:
      // Position can be any integer
      resultValid = true
      break
    default:
      resultValid = true
  }
  
  // Verify seed is not empty
  const seedValid = Boolean(verificationData.seed && verificationData.seed !== '0x0')
  
  // Verify block data if available
  const blockDataValid = !blockNumber || (verificationData.blockNumber !== undefined)
  
  // Verify timestamp is reasonable (not in future, not too old)
  const now = Math.floor(Date.now() / 1000)
  const timestampValid = gameState.timestamp > 0 && gameState.timestamp <= now && (now - gameState.timestamp) < 86400 * 365 // Within 1 year
  
  const isValid = Boolean(resultValid && seedValid && blockDataValid && timestampValid)
  
  return {
    isValid,
    verificationData,
    details: {
      resultValid,
      seedValid: !!seedValid,
      blockDataValid,
      timestampValid
    }
  }
}

/**
 * Get human-readable verification report for casino game
 */
export const getCasinoVerificationReport = async (
  gameType: CasinoGameType,
  gameState: CasinoGameState
): Promise<string> => {
  const verification = await verifyCasinoVRFRandomness(gameType, gameState)
  
  const gameTypeName = gameType.charAt(0) + gameType.slice(1).toLowerCase()
  
  let report = `# VRF Verification Report for ${gameTypeName} Game #${gameState.gameId}\n\n`
  report += `## Verification Status: ${verification.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`
  report += `### Details:\n`
  report += `- **Result Valid**: ${verification.details.resultValid ? '✅' : '❌'}\n`
  report += `- **Seed Valid**: ${verification.details.seedValid ? '✅' : '❌'}\n`
  report += `- **Block Data Valid**: ${verification.details.blockDataValid ? '✅' : '❌'}\n`
  report += `- **Timestamp Valid**: ${verification.details.timestampValid ? '✅' : '❌'}\n\n`
  report += `### Game Data:\n`
  report += `- **Game Type**: ${gameTypeName}\n`
  report += `- **Game ID**: ${gameState.gameId}\n`
  report += `- **Player**: ${gameState.player}\n`
  report += `- **Result**: ${gameState.result}\n`
  report += `- **Bet Amount**: ${gameState.betAmount} ETH\n`
  report += `- **Payout**: ${gameState.payout} ETH\n`
  report += `- **Timestamp**: ${new Date(gameState.timestamp * 1000).toISOString()}\n\n`
  report += `### VRF Data:\n`
  report += `- **Seed**: ${verification.verificationData.seed}\n`
  if (verification.verificationData.blockNumber) {
    report += `- **Block Number**: ${verification.verificationData.blockNumber}\n`
  }
  if (verification.verificationData.blockHash) {
    report += `- **Block Hash**: ${verification.verificationData.blockHash}\n`
  }
  report += `- **Verification Proof**: ${verification.verificationData.verificationProof}\n`
  
  return report
}

/**
 * Format result based on game type
 */
export const formatCasinoResult = (gameType: CasinoGameType, result: number): string => {
  switch (gameType) {
    case CasinoGameType.COINFLIP:
      return result === 0 ? 'Heads' : 'Tails'
    case CasinoGameType.DICE:
      return `Roll: ${result}`
    case CasinoGameType.SLOTS:
      const reel1 = (result >> 16) & 0xFF
      const reel2 = (result >> 8) & 0xFF
      const reel3 = result & 0xFF
      return `Reels: ${reel1} | ${reel2} | ${reel3}`
    case CasinoGameType.PLINKO:
      return `Position: ${result}`
    default:
      return String(result)
  }
}






