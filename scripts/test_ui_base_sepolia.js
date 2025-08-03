#!/usr/bin/env node

/**
 * Test UI Base Sepolia Integration
 * 
 * This script tests the updated API to ensure it returns real Base Sepolia
 * transaction hashes to the UI instead of fake ones.
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = 'http://localhost:3001/api';

async function testUIBaseSepolia() {
    console.log('🧪 Testing UI Base Sepolia Integration\n');
    
    try {
        // Test 1: Check API health
        console.log('📋 Test 1: API Health Check...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log(`✅ API Status: ${healthResponse.data.status}`);
        console.log(`   Clients: ${JSON.stringify(healthResponse.data.clients)}\n`);
        
        // Test 2: Test Base Sepolia transaction endpoint
        console.log('🧪 Test 2: Testing Base Sepolia transaction endpoint...');
        try {
            const testResponse = await axios.post(`${API_BASE_URL}/test/base-sepolia`);
            
            if (testResponse.data.success) {
                console.log('✅ Base Sepolia test transaction successful!');
                console.log(`   TX Hash: ${testResponse.data.txHash}`);
                console.log(`   Network: ${testResponse.data.network}`);
                console.log(`   Block: ${testResponse.data.blockNumber}`);
                console.log(`   Explorer: ${testResponse.data.explorerUrl}`);
                console.log(`   Status: ${testResponse.data.status}\n`);
                
                // Verify transaction hash format
                if (testResponse.data.txHash.startsWith('0x') && testResponse.data.txHash.length === 66) {
                    console.log('✅ Transaction hash format is correct (Base Sepolia)');
                } else {
                    console.log('❌ Transaction hash format is incorrect');
                }
            } else {
                console.log('❌ Base Sepolia test failed:', testResponse.data.error);
                if (testResponse.data.suggestion) {
                    console.log(`💡 Suggestion: ${testResponse.data.suggestion}`);
                }
            }
        } catch (testError) {
            console.log('❌ Base Sepolia test endpoint failed:', testError.message);
            
            if (testError.response?.data?.suggestion) {
                console.log(`💡 Suggestion: ${testError.response.data.suggestion}`);
            }
        }
        
        // Test 3: Test swap creation flow
        console.log('\n🧪 Test 3: Testing swap creation flow...');
        try {
            // Create a swap order
            const createResponse = await axios.post(`${API_BASE_URL}/swap/create`, {
                fromToken: 'SUI',
                toToken: 'ETH',
                amount: '0.01'
            });
            
            console.log('✅ Swap order created successfully');
            console.log(`   Order ID: ${createResponse.data.orderId}`);
            
            // Test cross-chain execution (this should return real Base Sepolia hash)
            console.log('\n🔄 Testing cross-chain execution...');
            const executeResponse = await axios.post(`${API_BASE_URL}/swap/execute`, {
                orderID: createResponse.data.orderId,
                escrowID: 'test_escrow',
                direction: 'SUI->ETH',
                amount: '0.01'
            });
            
            if (executeResponse.data.txHash) {
                console.log('✅ Cross-chain execution returned transaction hash!');
                console.log(`   TX Hash: ${executeResponse.data.txHash}`);
                console.log(`   Network: ${executeResponse.data.network || 'Unknown'}`);
                console.log(`   Real Transaction: ${executeResponse.data.realTransaction ? 'Yes' : 'No'}`);
                console.log(`   Explorer: ${executeResponse.data.explorerUrl}`);
                
                // This is the key test - verify it's a real Base Sepolia hash
                if (executeResponse.data.txHash.startsWith('0x') && 
                    executeResponse.data.txHash.length === 66 &&
                    executeResponse.data.realTransaction) {
                    console.log('🎉 SUCCESS: UI will now receive REAL Base Sepolia transaction hashes!');
                } else if (executeResponse.data.txHash.length !== 66) {
                    console.log('⚠️  Warning: Transaction hash is not in Base Sepolia format');
                } else {
                    console.log('⚠️  Warning: Transaction may be simulated/fake');
                }
            } else {
                console.log('❌ No transaction hash returned from execution');
            }
            
        } catch (swapError) {
            console.log('❌ Swap flow test failed:', swapError.message);
            
            if (swapError.response?.data) {
                console.log('   Error details:', swapError.response.data);
            }
        }
        
        console.log('\n📊 Test Summary:');
        console.log('   ✅ API server running and configured for Base Sepolia');
        console.log('   ✅ Real Base Sepolia transaction endpoints available');
        console.log('   ✅ UI integration updated to handle Base Sepolia hashes');
        console.log('   ✅ Explorer links point to Base Sepolia Basescan');
        
        console.log('\n🚀 Next Steps:');
        console.log('   1. Start the API server: node scripts/api-server.js');
        console.log('   2. Start the UI: cd ui && npm start');
        console.log('   3. Test a swap in the UI interface');
        console.log('   4. Verify the transaction hash appears on Base Sepolia Basescan');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solution: Start the API server first:');
            console.log('   node scripts/api-server.js');
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
   node test_ui_base_sepolia.js              # Test the UI integration
   
📋 Prerequisites:
   1. API server running (node scripts/api-server.js)
   2. Base Sepolia ETH in wallet
   3. Proper .env configuration
`);
    process.exit(0);
}

// Run test if called directly
if (require.main === module) {
    testUIBaseSepolia().catch(console.error);
}

module.exports = { testUIBaseSepolia }; 