# BaseFair - Farcaster Mini App

A verifiably fair gaming platform built on **Base** blockchain using VRF (Verifiable Random Functions) for provable randomness. Designed as a **Farcaster Mini App** for seamless in-feed gaming.

## 🚀 Mini App Features

- **Farcaster Frame SDK** integrated for native mini app experience
- **In-feed embedding** - Play directly from Farcaster feed
- **Wallet connection** via Frame SDK or RainbowKit
- **Mobile-first** responsive design
- **Splash screen** and loading states
- **Deep linking** support

## 🎯 Verifiably Fair

BaseFair is a hyper-casual gaming platform where randomness is **verifiable** and **transparent**. Every game outcome is powered by VRF technology, ensuring complete fairness that can be independently verified.

### Key Features

- 🎲 **VRF-Powered Randomness**: All games use verifiable random functions
- ✅ **Transparent Fairness**: Verify the randomness behind every outcome with built-in verification UI
- 🎮 **Multiple Game Modes**: FlipMatch card game and various casino games
- 🔗 **Base Network**: Built for Base L2 blockchain (Coinbase's Ethereum L2)
- 📊 **On-Chain Verification**: All randomness is verifiable on-chain
- 🔍 **VRF Verification Tool**: Built-in UI to verify game fairness
- 📱 **Mini App Ready**: Optimized for Farcaster Mini App integration

## 🎮 How to Play

### FlipMatch - Memory Card Game

FlipMatch is a memory card matching game where players compete to match pairs of cards with the fewest flips.

#### Game Modes

**1. Player vs Player (Multi-Player)**
- Create or join a game with other players
- Each player plays the same card layout (determined by VRF)
- Complete the game by matching all card pairs
- Submit your flip count (number of card flips used)
- Winner is determined by the lowest final score (flip count + VRF modifier)
- Prize pool is distributed to the winner

**2. AI vs Player (Single Player)**
- Play against the AI opponent
- Same gameplay mechanics as multi-player
- Lower scores mean better performance
- Can play for free or with stakes

#### How to Play FlipMatch

1. **Create or Join a Game**
   - Click "Create Game" on the homepage
   - Choose game mode (Player vs Player or AI vs Player)
   - Set game parameters (name, player count, duration, optional password)
   - For wager games, set your stake amount (minimum 0.0001 ETH)

2. **Start Playing**
   - When the game starts, a grid of cards appears face down
   - Click cards to flip them and reveal their values
   - Match pairs of identical cards to remove them
   - Goal: Match all pairs with as few flips as possible

3. **Submit Your Score**
   - After completing the game, submit your flip count
   - Your final score = flip count + VRF modifier (ensures fairness)
   - In multi-player games, all players submit their scores
   - The player with the lowest final score wins

### Casino Games

BaseFair offers several casino-style games powered by VRF randomness:

#### 🪙 CoinFlip
- Choose Heads or Tails
- Each flip uses VRF for verifiable randomness
- Streak multipliers increase your potential winnings

#### 🎲 Dice
- Select a target number (1-100)
- Choose to roll under or over your target
- Adjustable difficulty affects payout multipliers

#### 🎯 Plinko
- Drop a ball from the top
- Ball bounces through pegs and lands in a multiplier slot
- Adjustable rows (more rows = higher risk/reward)

#### 🎰 Slots
- Classic slot machine gameplay
- Three reels with various symbols
- VRF determines each spin's outcome

#### 🚀 Crash
- Watch the multiplier increase in real-time
- Cash out before it crashes to win
- Auto-cashout available for convenience

#### 🏆 Jackpot
- Join the progressive jackpot pool
- Play casino games to contribute to the pool
- Random VRF-determined winners

## 🔍 Verifying Fairness

BaseFair uses **Verifiable Random Functions (VRF)** to ensure fair gameplay. Every game's randomness can be independently verified:

1. **Automatic Verification**: Visit any game result page and use the VRF Verification component
2. **Manual Verification**: Check the VRF data on-chain using BaseScan
3. **Transparent Process**: All randomness is generated on-chain and publicly verifiable

## 📊 Base Network

BaseFair runs on the **Base blockchain** (Mainnet only):

- **Chain ID**: 8453
- **Currency**: ETH
- **RPC Endpoints**: https://mainnet.base.org
- **Block Explorer**: https://basescan.org

### Getting Started

1. **Connect Your Wallet**
   - Use MetaMask, Coinbase Wallet, or any Web3 wallet
   - Ensure you're connected to Base network
   - Have some ETH for transactions and stakes

2. **Browse Games**
   - View active games on the homepage
   - Filter by game type (FlipMatch or Casino)
   - Join existing games or create your own

3. **Play & Win**
   - Play games to compete and win
   - Check results and verify fairness
   - View your game history and statistics

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Yarn or npm
- MetaMask or Coinbase Wallet

### Installation

```bash
# Install dependencies
yarn install

# Copy environment file
cp .env.example .env.local

# Add your private key and API keys to .env.local
```

### Environment Variables

```env
PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id
BASESCAN_API_KEY=your_basescan_api_key
```

### Running Locally

```bash
# Install dependencies (includes @farcaster/frame-sdk)
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

### Mini App Configuration

1. **Update manifest** - Edit `public/.well-known/farcaster.json`:
   - Replace `your-domain.com` with your actual domain
   - Generate proper `accountAssociation` via Farcaster Developer Hub

2. **Set environment variables**:
   ```env
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. **Generate images** (convert SVG to PNG):
   ```bash
   # Using sharp-cli
   npx sharp-cli public/images/og-image.svg -o public/images/og-image.png
   npx sharp-cli public/images/splash.svg -o public/images/splash.png
   npx sharp-cli public/images/base-logo.svg -o public/images/base-logo.png --resize 200
   ```

### Deploying Contracts

```bash
# Deploy to Base mainnet
yarn hardhat run scripts/deploy.js --network base

# Verify contracts on BaseScan
yarn hardhat verify --network base <CONTRACT_ADDRESS>
```

## 📚 Technologies

Built with:
- **Next.js 14**: Modern React framework
- **TypeScript**: Type-safe development
- **Hardhat**: Smart contract development
- **Ethers.js v6**: Blockchain interactions
- **Wagmi v2**: React Hooks for Ethereum
- **RainbowKit v2**: Wallet connection UI
- **Redux Toolkit**: State management
- **Tailwind CSS**: Modern styling

## 🔗 Useful Links

- 🏠 [Base Network](https://base.org)
- 📖 [Base Docs](https://docs.base.org)
- 🔍 [BaseScan](https://basescan.org)
- ⚽ [Coinbase Wallet](https://www.coinbase.com/wallet)
- 📱 [Farcaster](https://farcaster.xyz)

## 🔐 Security & Fairness

- **VRF Verification**: All randomness is verifiable on-chain
- **Transparent Contracts**: Open-source smart contracts
- **No Owner Control**: Game mechanics cannot be manipulated
- **Provably Fair**: Every outcome can be independently verified
- **Decentralized**: Runs entirely on Base blockchain

---

**Play Fair. Win Big. Verify Everything.** 🎮✨
