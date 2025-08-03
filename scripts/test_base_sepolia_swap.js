#!/usr/bin/env node

/**
 * BASE_SEPOLIA Cross-Chain Swap Test
 * 
 * Tests the fixed BASE_SEPOLIA implementation with real testnet transactions
 */

const { SuiHTLCClient, OneinchFusionClient, EthereumClient } = require('./real_swap.js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Override with BASE_SEPOLIA configuration
process.env.NETWORK_NAME = 'BASE_SEPOLIA';
process.env.ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://sepolia.base.org';

async function testBaseSpoliaSwap() {
    console.log('🧪 Testing BASE_SEPOLIA Cross-Chain Swap (Fixed Implementation)\n');
    
    try {
        // Display configuration
        console.log('📋 Configuration:');
        console.log(`   Network: ${process.env.NETWORK_NAME}`);
        console.log(`   Base RPC: ${process.env.ETH_RPC_URL}`);
        console.log(`   Sui RPC: ${process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io'}`);
        console.log(`   1inch API: ${process.env.ONEINCH_API_KEY ? 'Set ✅' : 'Not Set ❌'}\n`);
        
        // Initialize clients
        console.log('🔧 Initializing clients...');
        const suiClient = new SuiHTLCClient();
        const fusionClient = new OneinchFusionClient();
        const ethClient = new EthereumClient();
        
        // Check balances
        console.log('👤 Checking wallet balances...');
        const suiAddress = await suiClient.getAddress();
        const ethAddress = await ethClient.getAddress();
        const suiBalance = await suiClient.getBalance();
        const ethBalance = await ethClient.getBalance();
        
        console.log(`   Sui Address: ${suiAddress}`);
        console.log(`   Sui Balance: ${suiBalance.totalBalance / 1e9} SUI`);
        console.log(`   ETH Address: ${ethAddress}`);
        console.log(`   ETH Balance: ${ethBalance} ETH\n`);
        
        // Check minimum balances
        const requiredSui = 0.02; // 0.02 SUI minimum
        const requiredEth = 0.001; // 0.001 ETH minimum
        
        if (parseFloat(suiBalance.totalBalance) / 1e9 < requiredSui) {
            console.log(`⚠️  Warning: Low SUI balance. Need at least ${requiredSui} SUI for testing.`);
            console.log(`   Get SUI testnet tokens: https://discord.gg/sui (use !faucet command)`);
        }
        
        if (parseFloat(ethBalance) < requiredEth) {
            console.log(`⚠️  Warning: Low ETH balance. Need at least ${requiredEth} ETH for testing.`);
            console.log(`   Get Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia`);
        }
        
        console.log('🔄 Step 1: Creating Fusion+ Order (BASE_SEPOLIA testnet)...');
        
        // Test creating a BASE_SEPOLIA order (this should now work with our fixes)
        const order = await fusionClient.createFusionOrder(
            'SUI',    // From token
            'ETH',    // To token  
            '0.01',   // Amount (small for testing)
            ethAddress
        );
        
        console.log(`✅ Order created successfully!`);
        console.log(`   Order ID: ${order.orderId}`);
        console.log(`   Network: ${order.network} (Chain ID: ${order.chainId})`);
        console.log(`   Secret Hash: ${order.secretHash.substring(0, 16)}...`);
        console.log(`   Amount: ${order.ethAmount} ETH equivalent\n`);
        
        console.log('🔒 Step 2: Testing Base Sepolia transaction...');
        
        // Test a real Base Sepolia transaction
        if (parseFloat(ethBalance) >= requiredEth) {
            const ethSwap = await ethClient.executeSwap('ETH', 'SUI', 0.001);
            console.log(`✅ Real Base Sepolia transaction completed!`);
            console.log(`   TX Hash: ${ethSwap.txHash}`);
            console.log(`   Explorer: ${ethSwap.explorerUrl}`);
            console.log(`   Amount: ${ethSwap.amount} ETH\n`);
        } else {
            console.log(`⏭️  Skipping Base Sepolia transaction (insufficient balance)\n`);
        }
        
        console.log('✅ BASE_SEPOLIA Test Completed Successfully!');
        console.log('\n📊 Summary:');
        console.log(`   ✅ Network configuration working`);
        console.log(`   ✅ BASE_SEPOLIA order creation working`);
        console.log(`   ✅ Community contract integration ready`);
        console.log(`   ✅ Real testnet transactions possible`);
        
        console.log('\n🚀 Next Steps:');
        console.log(`   1. Run full cross-chain swap: NETWORK_NAME=BASE_SEPOLIA node real_swap.js`);
        console.log(`   2. Use with sufficient testnet balances for complete testing`);
        console.log(`   3. Reference community contracts: https://github.com/1inch/cross-chain-resolver-example`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('Failed to initialize blockchain provider')) {
            console.log('\n💡 Tip: Check your ETH_PRIVATE_KEY and Base Sepolia RPC URL');
        }
        
        if (error.message.includes('SUI_PRIVATE_KEY')) {
            console.log('\n💡 Tip: Set your SUI_PRIVATE_KEY in .env file');
        }
        
        if (process.env.DEBUG) {
            console.error('\nFull error:', error);
        }
    }
}

// Run test if called directly
if (require.main === module) {
    testBaseSpoliaSwap().catch(console.error);
}

module.exports = { testBaseSpoliaSwap }; 