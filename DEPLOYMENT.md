# BaseFair Deployment Guide

This guide covers deploying BaseFair to Base Mainnet as a Farcaster Mini App.

## Prerequisites

1. **Node.js** v18+ and Yarn
2. **Private Key** with ETH on Base Mainnet
3. **BaseScan API Key** (for contract verification)
4. **Vercel Account** (for frontend deployment)

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Setup environment
copy env.example.txt .env.local
# Edit .env.local with your values

# 3. Deploy contracts
yarn deploy

# 4. Deploy casino games
yarn deploy:casino

# 5. Fund the treasury
yarn fund:treasury

# 6. Verify contracts on BaseScan
yarn verify
```

## Environment Setup

Copy `env.example.txt` to `.env.local` and configure:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PRIVATE_KEY` | Deployer wallet private key (without 0x) | `abc123...` |
| `NEXT_PUBLIC_RPC_URL` | Base Mainnet RPC URL | `https://mainnet.base.org` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASESCAN_API_KEY` | For contract verification | - |
| `VRF_ADDRESS` | Chainlink VRF address | Auto-deploys MockVRF |
| `NEXT_PUBLIC_APP_URL` | Production URL | `https://basefair.xyz` |

## Contract Deployment

### 1. Deploy FlipMatch Contract

```bash
yarn deploy
```

This deploys:
- FlipMatch main contract
- Mock VRF (if VRF_ADDRESS not set)

### 2. Deploy Casino Games

```bash
yarn deploy:casino
```

This deploys:
- CasinoTreasury
- CoinFlip
- Dice
- Plinko
- Crash
- Slots
- Jackpot

### 3. Fund Treasury

```bash
# Default: 0.1 ETH
yarn fund:treasury

# Custom amount
DEPOSIT_AMOUNT=0.5 yarn fund:treasury
```

### 4. Verify Contracts

```bash
yarn verify
```

## Frontend Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub/GitLab repository

2. **Configure Environment Variables**
   - Add all variables from `.env.local` to Vercel

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Manual Build

```bash
yarn build
yarn start
```

## Farcaster Mini App Setup

### 1. Manifest File

The manifest is at `public/.well-known/farcaster.json`. Update:

```json
{
  "name": "BaseFair",
  "website": "https://your-domain.xyz",
  "start_url": "/",
  ...
}
```

### 2. Frame Meta Tags

Located in `pages/_document.tsx`. Update the URLs:

```tsx
<meta property="fc:frame:image" content="https://your-domain.xyz/images/og-image.png" />
<meta property="fc:frame:post_url" content="https://your-domain.xyz/api/frame" />
```

### 3. Generate Images

```bash
yarn generate:images
```

This converts SVG images to PNG for Farcaster compatibility.

### 4. Test Frame

Use [Warpcast Frame Validator](https://warpcast.com/~/developers/frames) to test.

## Network Configuration

### Base Mainnet

| Property | Value |
|----------|-------|
| Chain ID | 8453 |
| RPC URL | https://mainnet.base.org |
| Explorer | https://basescan.org |
| Currency | ETH |

### Alternative RPC Providers

- **Alchemy**: `https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- **Infura**: `https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID`
- **QuickNode**: Custom endpoint

## Scripts Reference

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server |
| `yarn build` | Build for production |
| `yarn deploy` | Deploy FlipMatch to Base |
| `yarn deploy:local` | Deploy to local Hardhat |
| `yarn deploy:casino` | Deploy casino games to Base |
| `yarn fund:treasury` | Deposit ETH to treasury |
| `yarn verify` | Verify contracts on BaseScan |
| `yarn generate:images` | Convert SVG to PNG |

## Contract Addresses

After deployment, addresses are saved to `contracts/contractAddress.json`:

```json
{
  "mainnet": {
    "flipmatchContract": "0x...",
    "casinoTreasury": "0x...",
    "mockPythVRF": "0x...",
    "casinoGames": {
      "CoinFlip": "0x...",
      "Dice": "0x...",
      "Plinko": "0x...",
      "Crash": "0x...",
      "Slots": "0x...",
      "Jackpot": "0x..."
    }
  }
}
```

## Troubleshooting

### Deployment Fails

1. **Insufficient Balance**
   ```
   Make sure you have ETH on Base Mainnet
   ```

2. **Wrong Network**
   ```
   Ensure PRIVATE_KEY account is funded on Base (chainId: 8453)
   ```

3. **RPC Issues**
   ```
   Try alternative RPC provider (Alchemy, Infura)
   ```

### Verification Fails

1. **Already Verified**
   - This is normal if re-verifying

2. **Constructor Arguments**
   - Check the verify script uses correct arguments

### Frame Not Working

1. **Images Must Be PNG**
   - Run `yarn generate:images`

2. **CORS Issues**
   - Check `vercel.json` headers

3. **URL Mismatch**
   - Ensure all URLs in meta tags match your domain

## Security Checklist

- [ ] Private key stored securely (not in code)
- [ ] Environment variables set in Vercel (not committed)
- [ ] Contract ownership transferred to multisig (for production)
- [ ] Treasury funded with appropriate amount
- [ ] Game parameters verified (min/max bet, house edge)

## Support

- [Base Docs](https://docs.base.org)
- [Farcaster Frames](https://docs.farcaster.xyz/developers/frames)
- [Hardhat Docs](https://hardhat.org/docs)
- [Vercel Docs](https://vercel.com/docs)

