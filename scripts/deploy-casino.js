const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log('========================================');
  console.log('🎰 BaseFair Casino Deployment');
  console.log('========================================');
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), 'ETH');

  // Verify we're on Base Mainnet
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    console.error('❌ Error: This script is for Base Mainnet (chainId: 8453)');
    console.error(`   Current chainId: ${chainId}`);
    console.error('   Run with: yarn hardhat run scripts/deploy-casino.js --network base');
    process.exit(1);
  }
  
  console.log('✅ Network: Base Mainnet (Chain ID: 8453)\n');

  // Read contract addresses
  const contractAddressPath = path.join(__dirname, '../contracts/contractAddress.json');
  let addresses = { mainnet: {} };
  
  if (fs.existsSync(contractAddressPath)) {
    try {
      addresses = JSON.parse(fs.readFileSync(contractAddressPath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse existing contractAddress.json, creating new structure');
    }
  }
  
  if (!addresses.mainnet) {
    addresses.mainnet = {};
  }

  // Deploy CasinoTreasury first
  console.log('=== Deploying CasinoTreasury ===');
  const CasinoTreasury = await hre.ethers.getContractFactory('CasinoTreasury');
  const treasury = await CasinoTreasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log('✅ CasinoTreasury deployed to:', treasuryAddress);
  addresses.mainnet.casinoTreasury = treasuryAddress;

  // Use native ETH token (address(0))
  const TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
  console.log('✅ Using native ETH token (address(0))\n');

  // Get VRF address
  let VRF_ADDRESS = process.env.VRF_ADDRESS || process.env.CHAINLINK_VRF_ADDRESS;
  
  if (!VRF_ADDRESS) {
    // Try to get Mock VRF from contractAddress.json
    if (addresses.mainnet && addresses.mainnet.mockPythVRF) {
      VRF_ADDRESS = addresses.mainnet.mockPythVRF;
      console.log('✅ Using Mock VRF from contractAddress.json:', VRF_ADDRESS);
    }
  }
  
  if (!VRF_ADDRESS) {
    console.log('⚠️  VRF_ADDRESS not set. Deploying Mock VRF...');
    const MockPythVRF = await hre.ethers.getContractFactory('MockPythVRF');
    const mockVRF = await MockPythVRF.deploy();
    await mockVRF.waitForDeployment();
    VRF_ADDRESS = await mockVRF.getAddress();
    console.log('✅ Mock VRF deployed to:', VRF_ADDRESS);
    addresses.mainnet.mockPythVRF = VRF_ADDRESS;
  }
  
  console.log('🔮 VRF Address:', VRF_ADDRESS, '\n');

  // Deploy Casino Games
  const games = [
    { name: 'CoinFlip', contract: 'CoinFlip' },
    { name: 'Dice', contract: 'Dice' },
    { name: 'Plinko', contract: 'Plinko' },
    { name: 'Crash', contract: 'Crash' },
    { name: 'Slots', contract: 'Slots' },
  ];

  const gameAddresses = {};

  for (const game of games) {
    console.log(`=== Deploying ${game.name} ===`);
    try {
      const GameContract = await hre.ethers.getContractFactory(game.contract);
      const gameInstance = await GameContract.deploy(deployer.address, TOKEN_ADDRESS, VRF_ADDRESS);
      await gameInstance.waitForDeployment();
      const gameAddress = await gameInstance.getAddress();
      console.log(`✅ ${game.name} deployed to:`, gameAddress);
      gameAddresses[game.name] = gameAddress;

      // Initialize game with default config
      const minBet = hre.ethers.parseEther('0.0001'); // 0.0001 ETH
      const maxBet = hre.ethers.parseEther('1'); // 1 ETH
      const houseEdgeBps = 250; // 2.5%

      console.log(`   Initializing ${game.name}...`);
      const initTx = await gameInstance.initialize(treasuryAddress, minBet, maxBet, houseEdgeBps);
      await initTx.wait();
      console.log(`   ${game.name} initialized`);

      // Authorize game in treasury
      console.log(`   Authorizing ${game.name} in treasury...`);
      const authTx = await treasury.authorizeGame(gameAddress);
      await authTx.wait();
      console.log(`   ${game.name} authorized\n`);
    } catch (error) {
      console.error(`❌ Error deploying ${game.name}:`, error.message, '\n');
    }
  }

  // Deploy Jackpot
  console.log('=== Deploying Jackpot ===');
  try {
    const Jackpot = await hre.ethers.getContractFactory('Jackpot');
    const jackpot = await Jackpot.deploy(deployer.address, TOKEN_ADDRESS, VRF_ADDRESS);
    await jackpot.waitForDeployment();
    const jackpotAddress = await jackpot.getAddress();
    console.log('✅ Jackpot deployed to:', jackpotAddress);
    gameAddresses.Jackpot = jackpotAddress;
    
    // Initialize Jackpot
    try {
      const rakeBps = 500; // 5% rake
      console.log('   Initializing Jackpot...');
      const jackpotInitTx = await jackpot.initialize(rakeBps);
      await jackpotInitTx.wait();
      console.log('   Jackpot initialized');
    } catch (error) {
      console.warn('   Jackpot initialize skipped:', error.message);
    }
    
    // Authorize Jackpot in treasury
    console.log('   Authorizing Jackpot in treasury...');
    const jackpotAuthTx = await treasury.authorizeGame(jackpotAddress);
    await jackpotAuthTx.wait();
    console.log('   Jackpot authorized\n');
  } catch (error) {
    console.error('❌ Error deploying Jackpot:', error.message, '\n');
  }

  // Save addresses
  addresses.mainnet.casinoGames = gameAddresses;
  fs.writeFileSync(contractAddressPath, JSON.stringify(addresses, null, 2));
  console.log('✅ Contract addresses saved to:', contractAddressPath);

  console.log('\n========================================');
  console.log('🎉 Casino Deployment Complete!');
  console.log('========================================');
  console.log('CasinoTreasury:', treasuryAddress);
  console.log('VRF:', VRF_ADDRESS);
  console.log('Games:');
  for (const [name, addr] of Object.entries(gameAddresses)) {
    console.log(`  ${name}: ${addr}`);
  }
  console.log('========================================');
  console.log('\n⚠️  Remember to fund the treasury with ETH before games can pay out!');
  console.log('   Run: yarn hardhat run scripts/deposit-casino-treasury.js --network base');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
