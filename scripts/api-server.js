const express = require('express');
const cors = require('cors');
const { SuiHTLCClient, OneinchFusionClient, EthereumClient } = require('./real_swap');
const debug = require('debug')('sui-fusion:api');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global clients (initialize once)
let suiClient, fusionClient, ethClient;

// Initialize clients
async function initializeClients() {
    try {
        suiClient = new SuiHTLCClient();
        fusionClient = new OneinchFusionClient();
        ethClient = new EthereumClient();
        
        // Test connections
        const suiAddress = await suiClient.getAddress();
        const ethAddress = await ethClient.getAddress();
        
        console.log('✅ API Server initialized');
        console.log(`   Sui Address: ${suiAddress}`);
        console.log(`   ETH Address: ${ethAddress}`);
        
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize clients:', error.message);
        return false;
    }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        clients: {
            sui: !!suiClient,
            fusion: !!fusionClient,
            ethereum: !!ethClient
        }
    });
});

// Get wallet info
app.get('/api/wallet', async (req, res) => {
    try {
        const [suiAddress, ethAddress, suiBalance, ethBalance] = await Promise.all([
            suiClient.getAddress(),
            ethClient.getAddress(),
            suiClient.getBalance(),
            ethClient.getBalance()
        ]);

        res.json({
            sui: {
                address: suiAddress,
                balance: suiBalance.totalBalance / 1e9
            },
            ethereum: {
                address: ethAddress,
                balance: parseFloat(ethBalance)
            }
        });
    } catch (error) {
        debug('Wallet info error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create swap order
app.post('/api/swap/create', async (req, res) => {
    try {
        const { fromToken, toToken, amount } = req.body;
        
        debug(`Creating swap: ${amount} ${fromToken} -> ${toToken}`);
        
        // Create Fusion+ order
        const ethAddress = await ethClient.getAddress();
        const order = await fusionClient.createFusionOrder(
            fromToken,
            toToken,
            amount,
            ethAddress
        );
        
        res.json({
            orderId: order.id,
            secretHash: order.secretHash,
            status: 'created',
            expiresAt: order.expiresAt
        });
        
    } catch (error) {
        debug('Create swap error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Lock funds in HTLC
app.post('/api/swap/lock', async (req, res) => {
    try {
        const { orderId, amount } = req.body;
        
        // Get order details
        const order = await fusionClient.getOrder(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        debug(`Locking ${amount} SUI in HTLC`);
        
        // Create escrow
        const ethAddress = await ethClient.getAddress();
        const timelock = Date.now() + (20 * 60 * 1000); // 20 minutes
        const secretHash = Buffer.from(order.secretHash, 'hex');
        const amountInMist = Math.floor(parseFloat(amount) * 1e9);
        
        const escrow = await suiClient.createEscrow(
            ethAddress,
            secretHash,
            amountInMist.toString(),
            timelock
        );
        
        res.json({
            escrowId: escrow.escrowId,
            txHash: escrow.txHash,
            status: 'locked',
            timelock
        });
        
    } catch (error) {
        debug('Lock funds error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Claim funds from HTLC
app.post('/api/swap/claim', async (req, res) => {
    try {
        const { escrowId, orderId, amount } = req.body;
        
        // Get order details for secret
        const order = await fusionClient.getOrder(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        debug(`Claiming ${amount} SUI from escrow ${escrowId}`);
        
        const secret = Buffer.from(order.secret, 'hex');
        const amountInMist = Math.floor(parseFloat(amount) * 1e9);
        
        const claim = await suiClient.claimEscrow(
            escrowId,
            secret,
            amountInMist.toString()
        );
        
        res.json({
            txHash: claim.txHash,
            status: 'claimed'
        });
        
    } catch (error) {
        debug('Claim funds error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get swap status
app.get('/api/swap/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await fusionClient.getOrder(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({
            orderId,
            status: order.status || 'pending',
            createdAt: order.createdAt,
            expiresAt: order.expiresAt
        });
        
    } catch (error) {
        debug('Get status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Contract deployment status
app.get('/api/contract/status', (req, res) => {
    res.json({
        deployed: !!process.env.HTLC_PACKAGE_ID,
        packageId: process.env.HTLC_PACKAGE_ID || null,
        network: process.env.SUI_RPC_URL || 'testnet'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    debug('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// Start server
async function startServer() {
    const initialized = await initializeClients();
    
    if (!initialized) {
        console.error('❌ Failed to initialize clients. Check your .env configuration.');
        console.log('\n🔧 Setup Steps:');
        console.log('1. Copy .env.example to .env');
        console.log('2. Configure your private keys and API keys');
        console.log('3. Run: npm run setup (to validate config)');
        console.log('4. Run: npm run deploy (to deploy HTLC contract)');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 API Server running on http://localhost:${PORT}`);
        console.log(`📋 Available endpoints:`);
        console.log(`   GET  /api/health           - Health check`);
        console.log(`   GET  /api/wallet           - Wallet information`);
        console.log(`   POST /api/swap/create      - Create swap order`);
        console.log(`   POST /api/swap/lock        - Lock funds in HTLC`);
        console.log(`   POST /api/swap/claim       - Claim funds from HTLC`);
        console.log(`   GET  /api/contract/status  - Contract deployment status`);
        console.log(`\n💡 Start the UI with: cd ui && npm start`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down API server...');
    process.exit(0);
});

if (require.main === module) {
    startServer().catch(console.error);
}

module.exports = app; 