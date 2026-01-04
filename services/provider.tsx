'use client'

import * as React from 'react'
import { WagmiConfig, createConfig } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultWallets, darkTheme } from '@rainbow-me/rainbowkit'
import { publicProvider } from 'wagmi/providers/public'
import { configureChains } from 'wagmi'
import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { ethers } from 'ethers'
import '@rainbow-me/rainbowkit/styles.css'

// Base Mainnet Network Configuration (Only Mainnet - No Testnet)
const base = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://base-rpc.publicnode.com',
      ],
    },
    public: {
      http: [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://base-rpc.publicnode.com',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
  testnet: false,
} as const

// WalletConnect Project ID - get one at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.NEXT_PUBLIC_PROJECT_ID || 'demo-project-id'

const { chains, publicClient } = configureChains(
  [base], // Only Base Mainnet
  [publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName: 'BaseFair - Mini App',
  projectId,
  chains,
})

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

const queryClient = new QueryClient()

const appInfo = {
  appName: 'BaseFair',
  learnMoreUrl: 'https://base.org',
}

export function Providers({
  children,
  pageProps,
}: {
  children: React.ReactNode
  pageProps: {
    session: Session | null
  }
}) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider refetchInterval={0} session={pageProps.session}>
          <RainbowKitProvider 
            chains={chains}
            theme={darkTheme({
              accentColor: '#0052FF', // Base blue
              accentColorForeground: 'white',
              borderRadius: 'medium',
            })} 
            appInfo={appInfo}
            showRecentTransactions={false}
            initialChain={base.id}
          >
            {mounted && children}
          </RainbowKitProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiConfig>
  )
}


