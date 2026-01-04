const hre = require('hardhat');
const contractAddress = require('../contracts/contractAddress.json');

async function main() {
  try {
    // Parse command line arguments
    // Hardhat passes arguments after -- to process.argv
    // Format: node script.js --network xxx -- --amount 10
    // We need to find --amount in the arguments
    let amountStr = null;
    
    // Try to find --amount=value format
    for (let i = 0; i < process.argv.length; i++) {
      if (process.argv[i].startsWith('--amount=')) {
        amountStr = process.argv[i].split('=')[1];
        break;
      }
      // Try --amount value format
      if (process.argv[i] === '--amount' && i + 1 < process.argv.length) {
        amountStr = process.argv[i + 1];
        break;
      }
    }
    
    // Also check environment variable as fallback
    if (!amountStr) {
      amountStr = process.env.AMOUNT;
    }
    
    if (!amountStr) {
      console.error('❌ Error: Amount is required');
      console.log('\nUsage:');
      console.log('  yarn hardhat run scripts/deposit-house-balance.js --network <network> -- --amount <AMOUNT_IN_ETH>');
      console.log('  OR: AMOUNT=10 yarn hardhat run scripts/deposit-house-balance.js --network <network>');
      console.log('\nExample:');
      console.log('  yarn hardhat run scripts/deposit-house-balance.js --network monad-testnet -- --amount 10');
      process.exit(1);
    }
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Error: Invalid amount. Must be a positive number.');
      process.exit(1);
    }
    
    // Get network name
    const networkName = hre.network.name;
    const isTestnet = networkName === 'monad-testnet';
    
    console.log(`\n💰 Depositing House Balance on ${isTestnet ? 'TESTNET' : 'MAINNET'} (${networkName})...\n`);
    
    // Get signers
    const signers = await hre.ethers.getSigners();
    if (!signers || signers.length === 0) {
      throw new Error('No signers available. Please check your network configuration and PRIVATE_KEY in .env.local');
    }
    
    const deployer = signers[0];
    console.log(`👤 Deployer Address: ${deployer.address}`);
    
    // Check deployer balance
    const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
    const deployerBalanceFormatted = hre.ethers.formatEther(deployerBalance);
    console.log(`💼 Deployer Balance: ${deployerBalanceFormatted} ETH`);
    
    // Get contract address
    const flipMatchAddress = isTestnet 
      ? contractAddress.testnet.flipmatchContract
      : contractAddress.mainnet.flipmatchContract;
    
    if (!flipMatchAddress) {
      console.error(`❌ FlipMatch contract address not found for ${networkName}`);
      process.exit(1);
    }
    
    console.log(`📋 FlipMatch Contract: ${flipMatchAddress}\n`);
    
    // Get FlipMatch contract
    const FlipMatch = await hre.ethers.getContractFactory('contracts/FlipMatch.sol:FlipMatch');
    const flipMatch = FlipMatch.attach(flipMatchAddress);
    
    // Check if deployer is owner
    const owner = await flipMatch.owner();
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error(`❌ Error: Deployer address (${deployer.address}) is not the contract owner!`);
      console.log(`   Contract owner: ${owner}`);
      console.log('\n⚠️  Only the contract owner can deposit house balance.');
      process.exit(1);
    }
    
    // Get current house balance
    const currentHouseBalance = await flipMatch.houseBalance();
    const currentHouseBalanceFormatted = hre.ethers.formatEther(currentHouseBalance);
    console.log(`🏠 Current House Balance: ${currentHouseBalanceFormatted} ETH`);
    
    // Convert amount to wei
    const amountWei = hre.ethers.parseEther(amount.toString());
    
    // Check if deployer has enough balance (including gas)
    const gasReserve = hre.ethers.parseEther('0.0001'); // Reserve 0.0001 ETH for gas (Base has low fees)
    if (deployerBalance < amountWei + gasReserve) {
      console.error(`❌ Error: Insufficient balance!`);
      console.log(`   Required: ${hre.ethers.formatEther(amountWei + gasReserve)} ETH (${amount} ETH + 0.0001 ETH gas)`);
      console.log(`   Available: ${deployerBalanceFormatted} ETH`);
      process.exit(1);
    }
    
    console.log(`\n💸 Depositing: ${amount} ETH`);
    console.log(`   Amount in Wei: ${amountWei.toString()}\n`);
    
    // Deposit house balance
    console.log('📤 Sending transaction...');
    const tx = await flipMatch.depositHouseBalance({
      value: amountWei,
    });
    
    console.log(`⏳ Transaction Hash: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...\n');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log(`   Block Number: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);
    
    // Get updated house balance
    const newHouseBalance = await flipMatch.houseBalance();
    const newHouseBalanceFormatted = hre.ethers.formatEther(newHouseBalance);
    
    console.log('📊 Updated Balance:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏠 House Balance: ${newHouseBalanceFormatted} ETH`);
    console.log(`   (Increased by ${amount} ETH)\n`);
    
    // Explorer link
    const explorerBase = isTestnet 
      ? 'https://testnet.monadvision.com'
      : 'https://monad.blockscout.com';
    
    console.log(`🔗 Transaction: ${explorerBase}/tx/${tx.hash}`);
    console.log(`🔗 Contract: ${explorerBase}/address/${flipMatchAddress}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('   Reason:', error.reason);
    }
    console.log('\n⚠️  Make sure:');
    console.log('1. You are the contract owner');
    console.log('2. You have sufficient balance (amount + gas)');
    console.log('3. You are connected to the correct network');
    console.log('4. Contract address is correct');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

