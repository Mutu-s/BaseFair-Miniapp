const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log('========================================');
  console.log('💰 BaseFair Treasury Deposit');
  console.log('========================================');
  console.log('Depositing with account:', deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH');

  // Verify we're on Base Mainnet
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    console.error('❌ Error: This script is for Base Mainnet (chainId: 8453)');
    console.error(`   Current chainId: ${chainId}`);
    process.exit(1);
  }

  // Read contract addresses
  const contractAddressPath = path.join(__dirname, '../contracts/contractAddress.json');
  
  if (!fs.existsSync(contractAddressPath)) {
    console.error('❌ Error: contractAddress.json not found');
    console.error('   Run deploy-casino.js first');
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(contractAddressPath, 'utf8'));
  
  if (!addresses.mainnet || !addresses.mainnet.casinoTreasury) {
    console.error('❌ Error: CasinoTreasury address not found');
    console.error('   Run deploy-casino.js first');
    process.exit(1);
  }

  const treasuryAddress = addresses.mainnet.casinoTreasury;
  console.log('Treasury address:', treasuryAddress);

  // Deposit amount (0.1 ETH by default, can be changed via env)
  const depositAmount = process.env.DEPOSIT_AMOUNT 
    ? hre.ethers.parseEther(process.env.DEPOSIT_AMOUNT)
    : hre.ethers.parseEther('0.1');

  console.log('Deposit amount:', hre.ethers.formatEther(depositAmount), 'ETH');

  if (balance < depositAmount) {
    console.error('❌ Error: Insufficient balance');
    console.error(`   Required: ${hre.ethers.formatEther(depositAmount)} ETH`);
    console.error(`   Available: ${hre.ethers.formatEther(balance)} ETH`);
    process.exit(1);
  }

  // Get treasury contract
  const CasinoTreasury = await hre.ethers.getContractFactory('CasinoTreasury');
  const treasury = CasinoTreasury.attach(treasuryAddress);

  // Check current treasury balance
  const treasuryBalance = await hre.ethers.provider.getBalance(treasuryAddress);
  console.log('Current treasury balance:', hre.ethers.formatEther(treasuryBalance), 'ETH');

  // Deposit ETH
  console.log('\n⏳ Depositing ETH to treasury...');
  const tx = await deployer.sendTransaction({
    to: treasuryAddress,
    value: depositAmount,
  });
  
  await tx.wait();
  console.log('✅ Deposit successful!');
  console.log('   Transaction:', tx.hash);

  // Check new balance
  const newTreasuryBalance = await hre.ethers.provider.getBalance(treasuryAddress);
  console.log('New treasury balance:', hre.ethers.formatEther(newTreasuryBalance), 'ETH');

  console.log('\n========================================');
  console.log('🎉 Treasury Funded!');
  console.log('========================================');
  console.log('Explorer:', `https://basescan.org/tx/${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
