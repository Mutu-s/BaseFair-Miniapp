import { BASE_MAINNET_CHAIN_ID } from './network'

/**
 * Network-specific configuration for Base Mainnet
 * Only Base Mainnet is supported - no testnet
 */

export interface NetworkConfig {
  chainId: number
  rpcUrl: string
  name: string
  isTestnet: boolean
  explorerUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

export const MAINNET_CONFIG: NetworkConfig = {
  chainId: BASE_MAINNET_CHAIN_ID,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org',
  name: 'Base',
  isTestnet: false,
  explorerUrl: 'https://basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
}

/**
 * Get network configuration - always returns Base Mainnet config
 */
export const getNetworkConfig = (chainId?: number): NetworkConfig => {
  return MAINNET_CONFIG
}

/**
 * Get network configuration from window.ethereum
 */
export const getCurrentNetworkConfig = async (): Promise<NetworkConfig> => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex, 16)
      return getNetworkConfig(chainId)
    } catch (error) {
      console.warn('Failed to get chainId from ethereum provider:', error)
    }
  }
  return MAINNET_CONFIG
}

/**
 * Validate that we're on the correct network
 */
export const validateNetwork = async (expectedChainId: number): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex, 16)
      return chainId === expectedChainId
    } catch (error) {
      console.warn('Failed to validate network:', error)
      return false
    }
  }
  return false
}

