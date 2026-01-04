const hre = require('hardhat');
const contractAddress = require('../contracts/contractAddress.json');

async function main() {
  const treasuryAddress = contractAddress.casinoTreasury;
  
  if (!treasuryAddress) {
    console.error('Treasury address not found in contractAddress.json');
    process.exit(1);
  }

  console.log('Treasury Address:', treasuryAddress);
  console.log('\nFetching owner address from blockchain...\n');

  try {
    // Get Treasury contract
    const Treasury = await hre.ethers.getContractFactory('CasinoTreasury');
    const treasury = Treasury.attach(treasuryAddress);
    
    // Get owner
    const owner = await treasury.owner();
    console.log('✅ Treasury Owner Address:', owner);
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Treasury adresi bir CONTRACT adresidir (private key yok)');
    console.log('2. Yukarıdaki owner adresi, Treasury\'yi yöneten cüzdan adresidir');
    console.log('3. Bu cüzdanın private key\'i .env.local dosyasında PRIVATE_KEY olarak saklanmalıdır');
    console.log('4. Eğer .env.local dosyası yoksa veya PRIVATE_KEY yoksa, deployment yapan kişiden alınmalıdır');
    console.log('\n📝 .env.local dosyası şu şekilde olmalı:');
    console.log('PRIVATE_KEY=your_private_key_here');
    console.log('BASE_RPC_URL=https://mainnet.base.org');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️  Treasury contract\'ına erişilemedi. Kontrol edin:');
    console.log('1. Doğru network\'e bağlı mısınız? (Base Mainnet)');
    console.log('2. Treasury adresi doğru mu?');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });








