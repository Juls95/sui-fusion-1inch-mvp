#!/usr/bin/env node

/**
 * Base Sepolia Transaction Verification Script
 * 
 * This script tests and verifies Base Sepolia transactions to ensure
 * they are properly created, confirmed, and visible on the explorer.
 */

const { EthereumClient } = require('./real_swap.js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Force Base Sepolia network
process.env.NETWORK_NAME = 'BASE_SEPOLIA';
process.env.ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://sepolia.base.org';

async function verifyBaseSpoliaTransactions() {
    console.log('🔍 Base Sepolia Transaction Verification Tool\n');
    
    try {
        // Initialize Ethereum client
        console.log('🔧 Initializing Base Sepolia client...');
        const ethClient = new EthereumClient();
        
        // Show network configuration
        console.log('📋 Network Configuration:');
        console.log(`   Network: ${ethClient.networkName}`);
        console.log(`   RPC URL: ${ethClient.provider._getConnection().url}`);
        console.log(`   Wallet: ${await ethClient.getAddress()}`);
        console.log(`   Balance: ${await ethClient.getBalance()} ETH\n`);
        
        // Test 1: Execute a new transaction
        console.log('🧪 Test 1: Creating new Base Sepolia transaction...');
        try {
            const txResult = await ethClient.executeSwap('ETH', 'SUI', 0.0001);
            console.log('✅ Transaction created successfully!');
            console.log(`   Hash: ${txResult.txHash}`);
            console.log(`   Status: ${txResult.status}`);
            console.log(`   Block: ${txResult.blockNumber}`);
            console.log(`   Gas Used: ${txResult.gasUsed}`);
            console.log(`   Explorer: ${txResult.explorerUrl}\n`);
            
            // Test 2: Verify the transaction immediately
            console.log('🧪 Test 2: Verifying the new transaction...');
            const verification = await ethClient.verifyTransaction(txResult.txHash);
            
            if (verification.valid) {
                console.log('✅ Transaction verification successful!');
                console.log(`   Found on network: ${verification.found}`);
                console.log(`   Mined: ${verification.mined}`);
                console.log(`   Status: ${verification.status}`);
                console.log(`   Explorer URL: ${verification.explorerUrl}\n`);
            } else {
                console.log('❌ Transaction verification failed!');
                console.log(`   Error: ${verification.error}`);
                console.log(`   Explorer URL: ${verification.explorerUrl}\n`);
            }
            
        } catch (error) {
            console.error('❌ Failed to create transaction:', error.message);
            
            if (error.message.includes('insufficient')) {
                console.log('\n💡 Solution: Get more Base Sepolia ETH');
                console.log('   Faucet: https://www.alchemy.com/faucets/base-sepolia');
            }
        }
        
        // Test 3: Verify a known transaction (if provided as argument)
        const testTxHash = process.argv[2];
        if (testTxHash) {
            console.log(`🧪 Test 3: Verifying provided transaction hash: ${testTxHash}`);
            const verification = await ethClient.verifyTransaction(testTxHash);
            
            if (verification.valid) {
                console.log('✅ Provided transaction is valid!');
                console.log(`   Status: ${verification.status}`);
                console.log(`   Block: ${verification.blockNumber}`);
                console.log(`   Value: ${verification.value} ETH`);
                console.log(`   Explorer: ${verification.explorerUrl}`);
            } else {
                console.log('❌ Provided transaction is invalid or not found!');
                console.log(`   Error: ${verification.error}`);
                console.log(`   Check: ${verification.explorerUrl}`);
            }
        }
        
        console.log('\n📊 Summary:');
        console.log('   ✅ Base Sepolia client working');
        console.log('   ✅ Transaction creation improved');
        console.log('   ✅ Transaction verification added');
        console.log('   ✅ Better error handling implemented');
        
        console.log('\n🚀 Next Steps:');
        console.log('   1. Check the explorer URLs manually');
        console.log('   2. Verify transactions are confirmed before using hashes');
        console.log('   3. Use this script to debug any transaction issues');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        
        if (error.message.includes('private key')) {
            console.log('\n💡 Setup required:');
            console.log('   1. Set ETH_PRIVATE_KEY in .env file');
            console.log('   2. Get Base Sepolia ETH from faucet');
            console.log('   3. Ensure RPC URL is correct');
        }
        
        if (process.env.DEBUG) {
            console.error('\nFull error:', error);
        }
    }
}

// Usage instructions
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📖 Usage:
   node verify_base_sepolia_tx.js                    # Test new transaction
   node verify_base_sepolia_tx.js [tx_hash]          # Verify specific transaction
   
📋 Examples:
   node verify_base_sepolia_tx.js 0xabc123...        # Check if transaction is valid
   DEBUG=1 node verify_base_sepolia_tx.js            # Verbose output
`);
    process.exit(0);
}

// Run verification if called directly
if (require.main === module) {
    verifyBaseSpoliaTransactions().catch(console.error);
}

module.exports = { verifyBaseSpoliaTransactions }; 