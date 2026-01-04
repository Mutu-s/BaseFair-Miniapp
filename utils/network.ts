import address from '@/contracts/contractAddress.json'

// Network types
export type NetworkType = 'mainnet'

// Chain IDs - Base Network (Mainnet Only)
export const BASE_MAINNET_CHAIN_ID = 8453
export const BASE_CHAIN_ID = BASE_MAINNET_CHAIN_ID // Alias

// Legacy aliases for backward compatibility (all point to mainnet)
export const BASE_TESTNET_CHAIN_ID = BASE_MAINNET_CHAIN_ID
export const MONAD_MAINNET_CHAIN_ID = BASE_MAINNET_CHAIN_ID
export const MONAD_TESTNET_CHAIN_ID = BASE_MAINNET_CHAIN_ID

/**
 * Get current network type based on chain ID
 * @param chainId - The chain ID (defaults to mainnet)
 * @returns Network type (always 'mainnet' - only Base Mainnet is supported)
 */
export const getNetworkType = async (chainId?: number): Promise<NetworkType> => {
  // Always return mainnet - only Base Mainnet is supported
  return 'mainnet'
}

/**
 * Get contract addresses for the current network
 * @param networkType - Network type ('mainnet' or 'testnet')
 * @returns Contract addresses object
 */
export const getContractAddresses = (networkType: NetworkType = 'mainnet') => {
  const addresses = address as any
  const networkAddresses = addresses[networkType] || addresses.mainnet

  // Backward compatibility: if old format exists, use it
  if (addresses.flipmatchContract && !networkAddresses) {
    return {
      flipmatchContract: addresses.flipmatchContract || addresses.monfairContract,
      casinoTreasury: addresses.casinoTreasury || '',
      casinoGames: addresses.casinoGames || {},
    }
  }

  return {
    flipmatchContract: networkAddresses?.flipmatchContract || networkAddresses?.monfairContract || '',
    casinoTreasury: networkAddresses?.casinoTreasury || '',
    casinoGames: networkAddresses?.casinoGames || {},
  }
}

/**
 * Get FlipMatch contract address for current network
 */
export const getFlipMatchAddress = async (chainId?: number): Promise<string> => {
  const networkType = await getNetworkType(chainId)
  const addresses = getContractAddresses(networkType)
  return addresses.flipmatchContract
}

/**
 * Get Casino Treasury address for current network
 */
export const getCasinoTreasuryAddress = async (chainId?: number): Promise<string> => {
  const networkType = await getNetworkType(chainId)
  const addresses = getContractAddresses(networkType)
  return addresses.casinoTreasury
}

/**
 * Get Casino Game address for current network
 */
export const getCasinoGameAddress = async (gameType: string, chainId?: number): Promise<string> => {
  const networkType = await getNetworkType(chainId)
  const addresses = getContractAddresses(networkType)
  return addresses.casinoGames[gameType] || ''
}








