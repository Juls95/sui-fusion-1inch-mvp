// Mock Sui client for simulation
class MockSuiClient {
    constructor() {
        this.network = 'testnet';
    }
    
    async getFullnodeUrl() {
        return 'https://fullnode.testnet.sui.io:443';
    }
}

// Mock ethers for simulation
class MockEthers {
    static JsonRpcProvider = class {
        constructor(url) {
            this.url = url;
        }
    }
}

const crypto = require('crypto');

// Configuration
const SUI_NETWORK = 'testnet';
const ETH_NETWORK = 'sepolia';

// Revert to basic CommonJS imports
const fs = require('fs');
const dotenv = require('dotenv');
const { ethers } = require('ethers');
const https = require('https');

// Load environment variables
dotenv.config({ path: '../.env' });

// Add this after dotenv.config({ path: '../.env' });
console.log("Environment variables loaded:");
console.log("SUI_ADDRESS:", process.env.SUI_ADDRESS ? "✓ Found" : "✗ Missing");
console.log("ETH_ADDRESS:", process.env.ETH_ADDRESS ? "✓ Found" : "✗ Missing");
console.log("INFURA_KEY:", process.env.INFURA_KEY ? "✓ Found" : "✗ Missing");
console.log("SUI_PRIVATE_KEY:", process.env.SUI_PRIVATE_KEY ? "✓ Found (length: " + 
  (process.env.SUI_PRIVATE_KEY ? process.env.SUI_PRIVATE_KEY.length : 0) + ")" : "✗ Missing");

// Define constants
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
const ETH_RPC_URL = `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`;

// Initialize ethers provider
const ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);

// Simple function to make HTTP requests to Sui RPC
function suiRpcRequest(method, params = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });
    
    const options = {
      hostname: 'fullnode.testnet.sui.io',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Test functions
async function testSuiConnection() {
  try {
    const aliceAddress = process.env.SUI_ADDRESS;
    if (!aliceAddress) {
      console.error("SUI_ADDRESS not found in .env file");
      return;
    }
    
    console.log("Testing Sui connection with address:", aliceAddress);
    const result = await suiRpcRequest('suix_getOwnedObjects', [
      aliceAddress,
      null,
      null,
      null
    ]);
    
    console.log("Sui connection successful!");
    console.log("Objects:", JSON.stringify(result, null, 2).substring(0, 500) + "...");
  } catch (error) {
    console.error("Sui connection failed:", error);
  }
}

async function testEthConnection() {
  try {
    const aliceAddress = process.env.ETH_ADDRESS;
    if (!aliceAddress) {
      console.error("ETH_ADDRESS not found in .env file");
      return;
    }
    
    console.log("Testing Ethereum connection with address:", aliceAddress);
    const balance = await ethProvider.getBalance(aliceAddress);
    console.log("Ethereum connection successful!");
    console.log("Balance:", ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.error("Ethereum connection failed:", error);
  }
}

// Run the tests
if (require.main === module) {
  console.log("Testing connections...");
  testSuiConnection().catch(console.error);
  testEthConnection().catch(console.error);
}

module.exports = {
  testSuiConnection,
  testEthConnection
}; 