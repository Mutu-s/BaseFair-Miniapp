const hre = require('hardhat');
const fs = require('fs');

async function main() {
  try {
    const signers = await hre.ethers.getSigners();
    const deployer = signers[0];
    
    console.log('Updating Casino Games VRF Address...');
    console.log('Deployer:', deployer.address);
    
    // Read contract addresses
    const contractAddressPath = './contracts/contractAddress.json';
    const addresses = JSON.parse(fs.readFileSync(contractAddressPath, 'utf8'));
    const networkType = hre.network.name === 'monad-testnet' ? 'testnet' : 'mainnet';
    const networkAddresses = addresses[networkType];
    
    if (!networkAddresses) {
      throw new Error(`No addresses found for ${networkType}`);
    }
    
    const newVRFAddress = networkAddresses.mockPythVRF;
    if (!newVRFAddress) {
      throw new Error('Mock VRF address not found in contractAddress.json');
    }
    
    console.log('New VRF Address:', newVRFAddress);
    
    // Games to update
    const games = ['CoinFlip', 'Dice', 'Plinko', 'Crash', 'Slots'];
    
    for (const gameName of games) {
      const gameAddress = networkAddresses.casinoGames[gameName];
      if (!gameAddress) {
        console.warn(`⚠️  ${gameName} address not found, skipping...`);
        continue;
      }
      
      console.log(`\n📝 Updating ${gameName}...`);
      console.log(`   Address: ${gameAddress}`);
      
      try {
        const Game = await hre.ethers.getContractFactory(gameName);
        const game = Game.attach(gameAddress);
        
        // Check current VRF
        const currentVRF = await game.pythVRF();
        console.log(`   Current VRF: ${currentVRF}`);
        
        if (currentVRF.toLowerCase() === newVRFAddress.toLowerCase()) {
          console.log(`   ✅ ${gameName} already using correct VRF address`);
          continue;
        }
        
        // Update VRF
        console.log(`   🔄 Updating VRF to ${newVRFAddress}...`);
        const tx = await game.setPythVRF(newVRFAddress);
        console.log(`   ⏳ Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`   ✅ ${gameName} VRF updated successfully!`);
        
      } catch (error) {
        console.error(`   ❌ Error updating ${gameName}:`, error.message);
        if (error.reason) {
          console.error(`      Reason: ${error.reason}`);
        }
      }
    }
    
    console.log('\n✅ VRF update process completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('   Reason:', error.reason);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


