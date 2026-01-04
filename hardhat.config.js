require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });

// Base Mainnet RPC endpoints with failover support
const BASE_RPC_URLS = [
  process.env.BASE_RPC_URL_1 || 'https://mainnet.base.org',
  process.env.BASE_RPC_URL_2 || 'https://base.llamarpc.com',
  process.env.BASE_RPC_URL_3 || 'https://base-rpc.publicnode.com',
];

// Primary RPC (default to first)
const PRIMARY_RPC = process.env.BASE_RPC_URL || BASE_RPC_URLS[0];

module.exports = {
  defaultNetwork: 'base',
  networks: {
    hardhat: {
      chainId: 8453,
      // Fork Base mainnet for testing
      forking: process.env.FORK_BASE === 'true' ? {
        url: PRIMARY_RPC,
        blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
      } : undefined,
    },
    base: {
      url: PRIMARY_RPC,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
      timeout: 120000,
      gasPrice: 'auto',
      // Additional RPC endpoints for failover (used by external tools)
      rpcUrls: BASE_RPC_URLS,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1, // Minimize contract size (FlipMatch is large)
          },
          viaIR: true, // Enable IR-based code generation
          evmVersion: 'paris',
        },
      },
    ],
  },
  mocha: {
    timeout: 40000,
  },
  // Gas reporting
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    gasPrice: 1, // 1 gwei (adjust based on Base network)
  },
  // Contract verification
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
    ],
  },
}
