#!/usr/bin/env node

/**
 * Base Sepolia Testnet Configuration Test
 * 
 * This script tests the 1inch Fusion+ integration with Base Sepolia testnet
 * using community-deployed Limit Order Contract for testing.
 */

const { OneinchFusionClient, EthereumClient } = require('./real_swap.js');
const dotenv = require('dotenv');
const path = require('path');

// Load Base Sepolia environment
//dotenv.config({ path: path.join(__dirname, 'test_base_sepolia.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
async function testBaseSepolia() {
    console.log('🧪 Testing Base Sepolia Testnet Configuration\n');
    
    try {
        // Test network configuration
        console.log('📋 Configuration:');
        console.log(`   Network: ${process.env.NETWORK_NAME}`);
        console.log(`   Chain ID: ${process.env.CHAIN_ID}`);
        console.log(`   RPC URL: ${process.env.ETH_RPC_URL}`);
        console.log(`   API Key: ${process.env.ONEINCH_API_KEY ? 'Set' : 'Not Set'}\n`);
        
        // Initialize clients
        console.log('🔧 Initializing clients...');
        const fusionClient = new OneinchFusionClient();
        const ethClient = new EthereumClient();
        
        // Test wallet connection
        console.log('👤 Testing wallet connection...');
        const address = await ethClient.getAddress();
        const balance = await ethClient.getBalance();
        
        console.log(`   Address: ${address}`);
        console.log(`   Balance: ${balance} ETH\n`);
        
        // Test 1inch Fusion+ configuration
        console.log('🔗 Testing 1inch Fusion+ SDK initialization...');
        console.log(`   Network Name: ${fusionClient.networkName}`);
        console.log(`   Chain ID: ${fusionClient.chainId}`);
        console.log(`   Base URL: ${fusionClient.baseUrl}\n`);
        
        // Test token addresses
        console.log('🪙 Base Sepolia Token Addresses:');
        const tokenAddresses = {
            'ETH': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',   // Native ETH
            'WETH': '0x4200000000000000000000000000000000000006', // Wrapped ETH on Base
            'USDC': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
            'USDT': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'  // Mock USDT for testing
        };
        
        Object.entries(tokenAddresses).forEach(([symbol, address]) => {
            console.log(`   ${symbol}: ${address}`);
        });
        
        console.log('\n✅ Base Sepolia configuration test completed successfully!');
        console.log('\n📖 Next Steps:');
        console.log('   1. Get Base Sepolia testnet ETH: https://www.alchemy.com/faucets/base-sepolia');
        console.log('   2. Get SUI testnet tokens: https://discord.gg/sui (use !faucet command)');
        console.log('   3. Set your private keys in test_base_sepolia.env');
        console.log('   4. Run: node real_swap.js to test cross-chain swap');
        
    } catch (error) {
        console.error('❌ Configuration test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Check that test_base_sepolia.env has correct values');
        console.log('   - Ensure 1inch API key is valid');
        console.log('   - Verify Base Sepolia RPC is accessible');
        
        if (process.env.DEBUG) {
            console.error('\nFull error:', error);
        }
    }
}

// Run test if called directly
if (require.main === module) {
    testBaseSepolia().catch(console.error);
}

module.exports = { testBaseSepolia }; 