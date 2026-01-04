/**
 * Pyth Network Helper Utilities
 * Provides helper functions for Pyth Network VRF integration
 * 
 * Note: Pyth VRF integration will be enabled when available on Monad
 */

import { ethers } from 'ethers'

/**
 * Pyth Network VRF Configuration
 */
export interface PythVRFConfig {
  contractAddress: string
  chainId: number
  enabled: boolean
}

/**
 * Get Pyth VRF contract address for a given chain
 */
export const getPythVRFAddress = (chainId: number): string | null => {
  // Pyth VRF addresses for Monad
  // Using same address for both networks (if Pyth uses same contract)
  // TODO: Update with actual Pyth VRF contract addresses when available
  const addresses: Record<number, string> = {
    143: process.env.NEXT_PUBLIC_PYTH_VRF_ADDRESS || '', // Monad Mainnet
    10143: process.env.NEXT_PUBLIC_PYTH_VRF_ADDRESS || '', // Monad Testnet (same address)
  }
  
  return addresses[chainId] || null
}

/**
 * Check if Pyth VRF is available on a chain
 */
export const isPythVRFAvailable = (chainId: number): boolean => {
  const address = getPythVRFAddress(chainId)
  return address !== null && address !== ''
}

/**
 * Get Pyth VRF contract instance
 */
export const getPythVRFContract = async (
  chainId: number,
  signerOrProvider: ethers.Signer | ethers.Provider
): Promise<ethers.Contract | null> => {
  const address = getPythVRFAddress(chainId)
  if (!address) {
    return null
  }
  
  // Pyth VRF ABI (simplified - actual ABI will be provided by Pyth)
  const abi = [
    'function requestRandomness(bytes32 seed) external returns (bytes32 requestId)',
    'function getRandomness(bytes32 requestId) external view returns (uint256 randomNumber, uint256 blockNumber)',
    'function verifyRandomness(bytes32 requestId, uint256 randomNumber, bytes calldata proof) external view returns (bool isValid)',
  ]
  
  return new ethers.Contract(address, abi, signerOrProvider)
}

/**
 * Request randomness from Pyth VRF
 */
export const requestPythRandomness = async (
  chainId: number,
  seed: string,
  signer: ethers.Signer
): Promise<string> => {
  const contract = await getPythVRFContract(chainId, signer)
  if (!contract) {
    throw new Error('Pyth VRF not available on this chain')
  }
  
  const seedBytes = ethers.id(seed)
  const tx = await contract.requestRandomness(seedBytes)
  const receipt = await tx.wait()
  
  // Extract request ID from event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log)
      return parsed && parsed.name === 'RandomnessRequested'
    } catch {
      return false
    }
  })
  
  if (event) {
    const parsed = contract.interface.parseLog(event)
    if (parsed) {
      return String(parsed.args.requestId)
    }
  }
  
  throw new Error('Failed to get request ID from Pyth VRF')
}

/**
 * Get randomness from Pyth VRF
 */
export const getPythRandomness = async (
  chainId: number,
  requestId: string,
  provider: ethers.Provider
): Promise<{ randomNumber: bigint; blockNumber: number } | null> => {
  const contract = await getPythVRFContract(chainId, provider)
  if (!contract) {
    return null
  }
  
  try {
    const result = await contract.getRandomness(requestId)
    return {
      randomNumber: result.randomNumber,
      blockNumber: Number(result.blockNumber),
    }
  } catch (error) {
    console.error('Error getting Pyth randomness:', error)
    return null
  }
}

/**
 * Verify Pyth VRF randomness
 */
export const verifyPythRandomness = async (
  chainId: number,
  requestId: string,
  randomNumber: bigint,
  proof: string,
  provider: ethers.Provider
): Promise<boolean> => {
  const contract = await getPythVRFContract(chainId, provider)
  if (!contract) {
    return false
  }
  
  try {
    const isValid = await contract.verifyRandomness(requestId, randomNumber, proof)
    return isValid
  } catch (error) {
    console.error('Error verifying Pyth randomness:', error)
    return false
  }
}

