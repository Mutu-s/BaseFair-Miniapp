const hre = require('hardhat');
const contractAddress = require('../contracts/contractAddress.json');

async function main() {
  try {
    // Get network name
    const networkName = hre.network.name;
    const isBase = networkName === 'base';
    
    console.log(`\n🔍 Checking House Balance on ${isTestnet ? 'TESTNET' : 'MAINNET'} (${networkName})...\n`);
    
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
    
    // Get house balance
    const houseBalance = await flipMatch.houseBalance();
    const houseBalanceFormatted = hre.ethers.formatEther(houseBalance);
    
    // Get contract balance (total ETH in contract)
    const contractBalance = await hre.ethers.provider.getBalance(flipMatchAddress);
    const contractBalanceFormatted = hre.ethers.formatEther(contractBalance);
    
    // Get treasury balance
    const treasuryBalance = await flipMatch.treasuryBalance();
    const treasuryBalanceFormatted = hre.ethers.formatEther(treasuryBalance);
    
    console.log('\n💰 Balance Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏠 House Balance:     ${houseBalanceFormatted} ETH`);
    console.log(`💼 Treasury Balance:  ${treasuryBalanceFormatted} ETH`);
    console.log(`📦 Contract Balance:   ${contractBalanceFormatted} ETH`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Calculate minimum required balance for different stake amounts
    const HOUSE_EDGE_PCT = 5; // 5% house edge
    const testStakes = [0.000003, 0.0001, 0.001, 0.01, 0.1];
    
    console.log('📊 Minimum House Balance Required for Different Stakes:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Stake Amount | Max Payout | Required House Balance');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testStakes.forEach(stake => {
      const stakeWei = hre.ethers.parseEther(stake.toString());
      const maxPayout = (stakeWei * BigInt(200 - HOUSE_EDGE_PCT)) / 100n; // stake * 1.95
      const requiredHouseBalance = maxPayout - stakeWei; // stake * 0.95
      const requiredFormatted = hre.ethers.formatEther(requiredHouseBalance);
      const maxPayoutFormatted = hre.ethers.formatEther(maxPayout);
      
      const canSupport = houseBalance >= requiredHouseBalance;
      const status = canSupport ? '✅' : '❌';
      
      console.log(`${status} ${stake.toString().padEnd(10)} ETH | ${maxPayoutFormatted.padEnd(10)} ETH | ${requiredFormatted} ETH`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check if house balance is sufficient for minimum bet
    const MIN_BET = hre.ethers.parseEther('0.000003');
    const minRequired = (MIN_BET * BigInt(200 - HOUSE_EDGE_PCT)) / 100n - MIN_BET;
    
    if (houseBalance < minRequired) {
      console.log('⚠️  WARNING: House balance is insufficient for minimum bet (0.000003 ETH)');
      console.log(`   Required: ${hre.ethers.formatEther(minRequired)} ETH`);
      console.log(`   Current:  ${houseBalanceFormatted} ETH`);
      console.log(`   Missing:  ${hre.ethers.formatEther(minRequired - houseBalance)} ETH\n`);
      console.log('💡 To deposit house balance, run:');
      console.log(`   yarn hardhat run scripts/deposit-house-balance.js --network ${networkName} -- --amount <AMOUNT_IN_ETH>\n`);
    } else {
      console.log('✅ House balance is sufficient for minimum bets!\n');
    }
    
    // Explorer links
    const explorerBase = isTestnet 
      'https://basescan.org';
    
    console.log(`🔗 Explorer: ${explorerBase}/address/${flipMatchAddress}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Make sure:');
    console.log('1. You are connected to the correct network');
    console.log('2. Contract address is correct in contractAddress.json');
    console.log('3. Contract is deployed and accessible');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


