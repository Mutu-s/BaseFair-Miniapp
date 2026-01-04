const hre = require('hardhat');
const contractAddress = require('../contracts/contractAddress.json');

async function main() {
  try {
    // Get network name
    const networkName = hre.network.name;
    const isTestnet = networkName === 'monad-testnet';
    
    console.log(`\n🔍 Checking Pyth VRF Address on ${isTestnet ? 'TESTNET' : 'MAINNET'} (${networkName})...\n`);
    
    // Get contract address based on network
    const flipMatchAddress = isTestnet 
      ? contractAddress.testnet.flipmatchContract
      : contractAddress.mainnet.flipmatchContract;
    
    if (!flipMatchAddress) {
      console.error(`❌ FlipMatch contract address not found for ${networkName}`);
      process.exit(1);
    }
    
    console.log(`📋 FlipMatch Contract: ${flipMatchAddress}`);
    
    // Get FlipMatch contract
    const FlipMatch = await hre.ethers.getContractFactory('contracts/FlipMatch.sol:FlipMatch');
    const flipMatch = FlipMatch.attach(flipMatchAddress);
    
    // Get Pyth VRF address
    const pythVRFAddress = await flipMatch.pythVRF();
    console.log(`\n🔗 Pyth VRF Address: ${pythVRFAddress}`);
    
    // Check if it's a placeholder
    const placeholderAddresses = [
      '0x2222222222222222222222222222222222222222',
      '0x0000000000000000000000000000000000000000',
    ];
    
    if (placeholderAddresses.includes(pythVRFAddress.toLowerCase())) {
      console.log('\n⚠️  WARNING: Pyth VRF address is a placeholder!');
      console.log('   This will cause createGame to fail when requesting VRF.');
      console.log('\n💡 Solution: Deploy a mock VRF contract or use a real Pyth VRF address.');
      console.log('   The contract needs a valid VRF contract that implements IPythVRF interface.');
    } else {
      // Try to check if it's a contract
      const code = await hre.ethers.provider.getCode(pythVRFAddress);
      if (code === '0x') {
        console.log('\n⚠️  WARNING: Pyth VRF address is not a contract!');
        console.log('   This will cause createGame to fail.');
      } else {
        console.log('\n✅ Pyth VRF address appears to be a contract.');
        console.log(`   Code length: ${code.length} bytes`);
      }
    }
    
    // Explorer link
    const explorerBase = isTestnet 
      ? 'https://testnet.monadvision.com'
      : 'https://monad.blockscout.com';
    
    console.log(`\n🔗 Explorer: ${explorerBase}/address/${flipMatchAddress}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


