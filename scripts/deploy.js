const hre = require('hardhat')
const fs = require('fs')

async function main() {
  try {
    // Get signers
    const signers = await hre.ethers.getSigners()
    
    if (!signers || signers.length === 0) {
      throw new Error('No signers available. Please check your network configuration and PRIVATE_KEY in .env.local')
    }
    
    const deployer = signers[0]
    
    console.log('========================================')
    console.log('🚀 BaseFair Contract Deployment')
    console.log('========================================')
    console.log('Deploying contracts with account:', deployer.address)
    
    const balance = await hre.ethers.provider.getBalance(deployer.address)
    console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH')

    // Check if balance is sufficient
    if (balance === 0n) {
      console.warn('⚠️  Warning: Account balance is 0. Make sure you have ETH for deployment.')
      process.exit(1)
    }

    // Verify we're on Base Mainnet
    const network = await hre.ethers.provider.getNetwork()
    const chainId = Number(network.chainId)
    
    if (chainId !== 8453) {
      console.error('❌ Error: This script is for Base Mainnet (chainId: 8453)')
      console.error(`   Current chainId: ${chainId}`)
      console.error('   Run with: yarn hardhat run scripts/deploy.js --network base')
      process.exit(1)
    }
    
    console.log('✅ Network: Base Mainnet (Chain ID: 8453)')

    // Get the contract factory (Lite version for size optimization)
    console.log('\n📦 Getting contract factory...')
    const FlipMatch = await hre.ethers.getContractFactory('contracts/FlipMatchLite.sol:FlipMatchLite')
    
    // AI address (immutable, set in constructor)
    const AI_ADDRESS = '0x1111111111111111111111111111111111111111'
    
    // VRF address - For Base, we'll use Chainlink VRF or deploy a mock
    let VRF_ADDRESS = process.env.VRF_ADDRESS || process.env.CHAINLINK_VRF_ADDRESS
    
    if (!VRF_ADDRESS) {
      // Try to get Mock VRF from contractAddress.json
      try {
        const contractAddressPath = './contracts/contractAddress.json'
        if (fs.existsSync(contractAddressPath)) {
          const contractAddresses = JSON.parse(fs.readFileSync(contractAddressPath, 'utf8'))
          if (contractAddresses.mainnet && contractAddresses.mainnet.mockPythVRF) {
            VRF_ADDRESS = contractAddresses.mainnet.mockPythVRF
            console.log('✅ Using Mock VRF from contractAddress.json:', VRF_ADDRESS)
          }
        }
      } catch (error) {
        console.warn('Could not read contractAddress.json for Mock VRF:', error.message)
      }
    }
    
    if (!VRF_ADDRESS) {
      console.warn('⚠️  WARNING: VRF_ADDRESS not set in .env.local')
      console.warn('⚠️  Deploying Mock VRF first...')
      
      // Deploy Mock VRF
      const MockPythVRF = await hre.ethers.getContractFactory('MockPythVRF')
      const mockVRF = await MockPythVRF.deploy()
      await mockVRF.waitForDeployment()
      VRF_ADDRESS = await mockVRF.getAddress()
      console.log('✅ Mock VRF deployed to:', VRF_ADDRESS)
      
      // Save Mock VRF address
      const contractAddressPath = './contracts/contractAddress.json'
      let addressData = { mainnet: {} }
      if (fs.existsSync(contractAddressPath)) {
        try {
          addressData = JSON.parse(fs.readFileSync(contractAddressPath, 'utf8'))
        } catch (e) {}
      }
      if (!addressData.mainnet) addressData.mainnet = {}
      addressData.mainnet.mockPythVRF = VRF_ADDRESS
      fs.writeFileSync(contractAddressPath, JSON.stringify(addressData, null, 2), 'utf8')
    }
    
    // Deploy the contract
    console.log('\n📝 Deploying FlipMatch contract...')
    console.log('   AI Address:', AI_ADDRESS)
    console.log('   VRF Address:', VRF_ADDRESS)
    
    const deployOptions = {}
    
    // Get current gas price and add buffer
    try {
      const feeData = await hre.ethers.provider.getFeeData()
      if (feeData.gasPrice) {
        deployOptions.gasPrice = feeData.gasPrice * 120n / 100n // 20% buffer
        console.log('   Gas price:', hre.ethers.formatUnits(deployOptions.gasPrice, 'gwei'), 'gwei')
      }
    } catch (e) {
      console.warn('   Could not get fee data, using default')
    }
    
    const contract = await FlipMatch.deploy(AI_ADDRESS, VRF_ADDRESS, deployOptions)
    console.log('⏳ Waiting for deployment confirmation...')
    await contract.waitForDeployment()

    const address = await contract.getAddress()
    console.log('\n✅ FlipMatch contract deployed successfully!')
    console.log('   Contract address:', address)

    // Save contract address
    let addressData = { mainnet: {} }
    const addressPath = './contracts/contractAddress.json'
    if (fs.existsSync(addressPath)) {
      try {
        addressData = JSON.parse(fs.readFileSync(addressPath, 'utf8'))
      } catch (e) {
        console.warn('Could not parse existing contractAddress.json, creating new structure')
      }
    }
    
    if (!addressData.mainnet) {
      addressData.mainnet = {}
    }
    
    addressData.mainnet.flipmatchContract = address
    fs.writeFileSync(addressPath, JSON.stringify(addressData, null, 2), 'utf8')
    console.log('   Address saved to contracts/contractAddress.json')

    // Wait for block confirmations
    console.log('\n⏳ Waiting for block confirmations...')
    const deploymentTx = contract.deploymentTransaction()
    if (deploymentTx) {
      await deploymentTx.wait(5) // Wait for 5 confirmations on mainnet
      console.log('✅ Deployment confirmed!')
    }

    // Verify on BaseScan
    console.log('\n📋 Contract Verification')
    console.log('   Run this command to verify on BaseScan:')
    console.log(`   yarn hardhat verify --network base ${address} ${AI_ADDRESS} ${VRF_ADDRESS}`)

    console.log('\n========================================')
    console.log('🎉 Deployment Complete!')
    console.log('========================================')
    console.log('FlipMatch Contract:', address)
    console.log('VRF Contract:', VRF_ADDRESS)
    console.log('Explorer:', `https://basescan.org/address/${address}`)
    console.log('========================================')
    
  } catch (error) {
    console.error('\n❌ Error deploying contract:', error.message)
    if (error.message.includes('signers')) {
      console.error('\n📋 Troubleshooting:')
      console.error('   1. Make sure PRIVATE_KEY is set in .env.local')
      console.error('   2. Make sure your account has ETH on Base')
      console.error('   3. Check your network connection')
    }
    process.exitCode = 1
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
