const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('========================================');
  console.log('✅ BaseFair Contract Verification');
  console.log('========================================');

  // Verify we're on Base Mainnet
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    console.error('❌ Error: This script is for Base Mainnet (chainId: 8453)');
    process.exit(1);
  }

  // Read contract addresses
  const contractAddressPath = path.join(__dirname, '../contracts/contractAddress.json');
  
  if (!fs.existsSync(contractAddressPath)) {
    console.error('❌ Error: contractAddress.json not found');
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(contractAddressPath, 'utf8'));
  
  if (!addresses.mainnet) {
    console.error('❌ Error: No mainnet addresses found');
    process.exit(1);
  }

  const mainnet = addresses.mainnet;

  // Verify FlipMatch
  if (mainnet.flipmatchContract && mainnet.flipmatchContract !== '0x0000000000000000000000000000000000000000') {
    console.log('\n📋 Verifying FlipMatch...');
    try {
      await hre.run('verify:verify', {
        address: mainnet.flipmatchContract,
        constructorArguments: [
          '0x1111111111111111111111111111111111111111', // AI_ADDRESS
          mainnet.mockPythVRF || '0x2222222222222222222222222222222222222222', // VRF_ADDRESS
        ],
      });
      console.log('✅ FlipMatch verified!');
    } catch (error) {
      if (error.message.includes('Already Verified')) {
        console.log('✅ FlipMatch already verified');
      } else {
        console.error('❌ FlipMatch verification failed:', error.message);
      }
    }
  }

  // Verify CasinoTreasury
  if (mainnet.casinoTreasury && mainnet.casinoTreasury !== '0x0000000000000000000000000000000000000000') {
    console.log('\n📋 Verifying CasinoTreasury...');
    try {
      const [deployer] = await hre.ethers.getSigners();
      await hre.run('verify:verify', {
        address: mainnet.casinoTreasury,
        constructorArguments: [deployer.address],
      });
      console.log('✅ CasinoTreasury verified!');
    } catch (error) {
      if (error.message.includes('Already Verified')) {
        console.log('✅ CasinoTreasury already verified');
      } else {
        console.error('❌ CasinoTreasury verification failed:', error.message);
      }
    }
  }

  // Verify Casino Games
  if (mainnet.casinoGames) {
    const [deployer] = await hre.ethers.getSigners();
    const TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
    const VRF_ADDRESS = mainnet.mockPythVRF || '0x2222222222222222222222222222222222222222';

    for (const [name, address] of Object.entries(mainnet.casinoGames)) {
      if (address && address !== '0x0000000000000000000000000000000000000000') {
        console.log(`\n📋 Verifying ${name}...`);
        try {
          await hre.run('verify:verify', {
            address: address,
            constructorArguments: [deployer.address, TOKEN_ADDRESS, VRF_ADDRESS],
          });
          console.log(`✅ ${name} verified!`);
        } catch (error) {
          if (error.message.includes('Already Verified')) {
            console.log(`✅ ${name} already verified`);
          } else {
            console.error(`❌ ${name} verification failed:`, error.message);
          }
        }
      }
    }
  }

  // Verify Mock VRF
  if (mainnet.mockPythVRF && mainnet.mockPythVRF !== '0x0000000000000000000000000000000000000000') {
    console.log('\n📋 Verifying MockPythVRF...');
    try {
      await hre.run('verify:verify', {
        address: mainnet.mockPythVRF,
        constructorArguments: [],
      });
      console.log('✅ MockPythVRF verified!');
    } catch (error) {
      if (error.message.includes('Already Verified')) {
        console.log('✅ MockPythVRF already verified');
      } else {
        console.error('❌ MockPythVRF verification failed:', error.message);
      }
    }
  }

  console.log('\n========================================');
  console.log('🎉 Verification Complete!');
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

