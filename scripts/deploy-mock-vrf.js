const hre = require('hardhat');
const fs = require('fs');

async function main() {
  try {
    // Get signers
    const signers = await hre.ethers.getSigners();
    
    if (!signers || signers.length === 0) {
      throw new Error('No signers available. Please check your network configuration and PRIVATE_KEY in .env.local');
    }
    
    const deployer = signers[0];
    
    console.log('\n🚀 Deploying Mock Pyth VRF Contract...\n');
    console.log('Deploying with account:', deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log('Account balance:', hre.ethers.formatEther(balance), 'MON\n');
    
    // Get the contract factory
    const MockPythVRF = await hre.ethers.getContractFactory('contracts/MockPythVRF.sol:MockPythVRF');
    
    // Deploy the contract
    console.log('Deploying MockPythVRF...');
    const mockVRF = await MockPythVRF.deploy();
    
    console.log('⏳ Waiting for deployment confirmation...');
    await mockVRF.waitForDeployment();
    
    const address = await mockVRF.getAddress();
    console.log('\n✅ Mock Pyth VRF deployed successfully!');
    console.log('📋 Contract Address:', address);
    
    // Get network info
    const networkName = hre.network.name;
    const isTestnet = networkName === 'monad-testnet';
    const explorerBase = isTestnet 
      ? 'https://testnet.monadvision.com'
      : 'https://monad.blockscout.com';
    
    console.log(`\n🔗 Explorer: ${explorerBase}/address/${address}\n`);
    
    // Update contractAddress.json
    const contractAddressPath = './contracts/contractAddress.json';
    let contractAddresses = {};
    
    try {
      const existingData = fs.readFileSync(contractAddressPath, 'utf8');
      contractAddresses = JSON.parse(existingData);
    } catch (error) {
      console.warn('Could not read existing contractAddress.json, creating new one');
    }
    
    if (!contractAddresses[networkName === 'monad-testnet' ? 'testnet' : 'mainnet']) {
      contractAddresses[networkName === 'monad-testnet' ? 'testnet' : 'mainnet'] = {};
    }
    
    const networkKey = networkName === 'monad-testnet' ? 'testnet' : 'mainnet';
    contractAddresses[networkKey].mockPythVRF = address;
    
    fs.writeFileSync(contractAddressPath, JSON.stringify(contractAddresses, null, 2));
    console.log('✅ Updated contractAddress.json\n');
    
    console.log('💡 Next steps:');
    console.log('   1. Update FlipMatch contract to use this VRF address');
    console.log('   2. Or redeploy FlipMatch with this VRF address in constructor\n');
    
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


