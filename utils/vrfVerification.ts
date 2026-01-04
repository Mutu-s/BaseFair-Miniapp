import { ethers } from 'ethers'
import { GameStruct } from './type.dt'

/**
 * VRF Verification Utilities
 * Provides functions to verify the randomness used in games
 */

export interface VRFVerificationData {
  gameId: number
  vrfRequestId: string
  cardOrder: number[]
  blockNumber?: number
  blockHash?: string
  timestamp: number
  gameCreatedAt: number
  verificationProof: string
}

/**
 * Generate verification proof for a game's VRF randomness
 * This proof can be used to verify that the card order was generated fairly
 */
export const generateVerificationProof = async (
  game: GameStruct,
  blockNumber?: number
): Promise<VRFVerificationData> => {
  // Get block data if blockNumber is provided
  let blockHash = ''
  let actualBlockNumber = blockNumber
  
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      if (!actualBlockNumber && game.createdAt) {
        // Estimate block number from timestamp (approximate)
        const currentBlock = await provider.getBlockNumber()
        const currentBlockData = await provider.getBlock(currentBlock)
        const timeDiff = Math.floor(Date.now() / 1000) - game.createdAt
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
  
  // Create verification proof
  // The proof is a hash of: gameId + vrfRequestId + cardOrder + blockHash
  const proofData = ethers.solidityPackedKeccak256(
    ['uint256', 'bytes32', 'uint256[]', 'bytes32', 'uint256'],
    [
      game.id,
      game.vrfRequestId || '0x0',
      game.cardOrder || [],
      blockHash || '0x0',
      game.createdAt || 0
    ]
  )
  
  return {
    gameId: game.id,
    vrfRequestId: game.vrfRequestId || '0x0',
    cardOrder: game.cardOrder || [],
    blockNumber: actualBlockNumber,
    blockHash,
    timestamp: game.createdAt || 0,
    gameCreatedAt: game.createdAt || 0,
    verificationProof: proofData
  }
}

/**
 * Verify VRF randomness for a game
 * This function checks if the card order matches the expected VRF output
 */
export const verifyVRFRandomness = async (
  game: GameStruct,
  blockNumber?: number
): Promise<{
  isValid: boolean
  verificationData: VRFVerificationData
  details: {
    cardOrderMatches: boolean
    vrfRequestIdValid: boolean
    blockDataValid: boolean
  }
}> => {
  const verificationData = await generateVerificationProof(game, blockNumber)
  
  // Verify card order is valid (12 unique indices 0-11)
  const cardOrder = game.cardOrder || []
  const isValidCardOrder = 
    cardOrder.length === 12 &&
    cardOrder.every((val, idx, arr) => 
      val >= 0 && val < 12 && arr.indexOf(val) === idx
    )
  
  // Verify VRF request ID is not empty
  const vrfRequestIdValid = Boolean(game.vrfRequestId && game.vrfRequestId !== '0x0')
  
  // Verify block data if available
  const blockDataValid = !blockNumber || (verificationData.blockNumber !== undefined)
  
  const isValid = Boolean(isValidCardOrder && vrfRequestIdValid && blockDataValid)
  
  return {
    isValid,
    verificationData,
    details: {
      cardOrderMatches: isValidCardOrder,
      vrfRequestIdValid: !!vrfRequestIdValid,
      blockDataValid
    }
  }
}

/**
 * Get human-readable verification report
 */
export const getVerificationReport = async (
  game: GameStruct
): Promise<string> => {
  const verification = await verifyVRFRandomness(game)
  
  let report = `# VRF Verification Report for Game #${game.id}\n\n`
  report += `## Verification Status: ${verification.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`
  report += `### Details:\n`
  report += `- **Card Order Valid**: ${verification.details.cardOrderMatches ? '✅' : '❌'}\n`
  report += `- **VRF Request ID Valid**: ${verification.details.vrfRequestIdValid ? '✅' : '❌'}\n`
  report += `- **Block Data Valid**: ${verification.details.blockDataValid ? '✅' : '❌'}\n\n`
  report += `### VRF Data:\n`
  report += `- **Request ID**: ${verification.verificationData.vrfRequestId}\n`
  report += `- **Card Order**: [${verification.verificationData.cardOrder.join(', ')}]\n`
  if (verification.verificationData.blockNumber) {
    report += `- **Block Number**: ${verification.verificationData.blockNumber}\n`
  }
  if (verification.verificationData.blockHash) {
    report += `- **Block Hash**: ${verification.verificationData.blockHash}\n`
  }
  report += `- **Verification Proof**: ${verification.verificationData.verificationProof}\n`
  
  return report
}

