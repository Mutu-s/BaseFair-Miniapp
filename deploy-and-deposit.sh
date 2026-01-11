#!/bin/bash
# Contract deploy ve house balance deposit scripti

echo "=========================================="
echo "🚀 BaseFair Contract Deployment & Setup"
echo "=========================================="
echo ""

# 1. Contract deploy
echo "📦 Step 1: Deploying FlipMatchLite contract..."
yarn hardhat run scripts/deploy.js --network base

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Contract deployed successfully!"
echo ""

# 2. House balance deposit (1 dolar = ~0.0003 ETH)
echo "💰 Step 2: Depositing 1 USD (~0.0003 ETH) to house balance..."
yarn hardhat run scripts/deposit-house-balance.js --network base -- --amount 0.0003

if [ $? -ne 0 ]; then
    echo "❌ Deposit failed!"
    exit 1
fi

echo ""
echo "✅✅✅ All done! Contract deployed and house balance funded!"
echo "=========================================="
