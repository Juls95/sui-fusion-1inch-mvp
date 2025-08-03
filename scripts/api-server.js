const express = require('express');
const cors = require('cors');
const { SuiHTLCClient, OneinchFusionClient, EthereumClient } = require('./real_swap');
const debug = require('debug')('sui-fusion:api');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure Base Sepolia as default network for the API
if (!process.env.NETWORK_NAME) {
    process.env.NETWORK_NAME = 'BASE_SEPOLIA';
    process.env.ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://sepolia.base.org';
    process.env.CHAIN_ID = process.env.CHAIN_ID || '84532';
    console.log('🌐 No network specified - defaulting to Base Sepolia for UI compatibility');
}

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
        
        // Initialize Fusion client with better error handling
        try {
            fusionClient = new OneinchFusionClient();
        } catch (error) {
            if (error.message.includes('ONEINCH_API_KEY')) {
                console.warn('⚠️  1inch API key not configured - running in demo mode');
                console.warn('   To enable REAL 1inch integration:');
                console.warn('   1. Get API key from https://portal.1inch.dev/');
                console.warn('   2. Add ONEINCH_API_KEY=your_key to .env file');
                
                // Create demo client for development with order storage
                const demoOrders = new Map();
                fusionClient = {
                    createFusionOrder: (fromToken, toToken, amount, userAddress) => {
                        const orderId = crypto.randomBytes(32).toString('hex');
                        const secret = crypto.randomBytes(32);
                        const secretHash = crypto.createHash('sha256').update(secret).digest();
                        
                        const order = {
                            id: orderId,
                            fromToken,
                            toToken,
                            amount,
                            userAddress,
                            secret: secret.toString('hex'),
                            secretHash: secretHash.toString('hex'),
                            status: 'pending',
                            createdAt: Date.now(),
                            expiresAt: Date.now() + (30 * 60 * 1000),
                            mode: 'demo'
                        };
                        
                        // Store the order for later retrieval
                        demoOrders.set(orderId, order);
                        console.log(`📝 Demo order created and stored: ${orderId}`);
                        
                        return order;
                    },
                    getOrder: (orderId) => {
                        const order = demoOrders.get(orderId);
                        console.log(`🔍 Demo order lookup: ${orderId} -> ${order ? 'found' : 'not found'}`);
                        return order;
                    },
                    executeCrossChainSwap: async (orderData) => {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        return {
                            txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
                            outputAmount: parseFloat(orderData.amount) * 0.99,
                            gasUsed: 50000,
                            explorerUrl: `https://etherscan.io/tx/0x${crypto.randomBytes(32).toString('hex')}`,
                            realFusion: false
                        };
                    }
                };
            } else {
                throw error;
            }
        }
        
        ethClient = new EthereumClient();
        
        // Test connections
        const suiAddress = await suiClient.getAddress();
        const ethAddress = await ethClient.getAddress();
        
        console.log('✅ API Server initialized');
        console.log(`   Sui Address: ${suiAddress}`);
        console.log(`   ETH Address: ${ethAddress}`);
        console.log(`   1inch Integration: ${process.env.ONEINCH_API_KEY ? 'REAL' : 'DEMO'}`);
        
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

// Get real-time quote
app.post('/api/quote', async (req, res) => {
    try {
        const { fromToken, toToken, amount } = req.body;
        
        debug(`Getting real-time quote: ${amount} ${fromToken} -> ${toToken}`);
        
        // Use 1inch API to get real market quote
        if (process.env.ONEINCH_API_KEY) {
            try {
                // Map token symbols to addresses for 1inch API
                const tokenAddresses = {
                    'ETH': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                    'SUI': '0x0000000000000000000000000000000000000000', // Placeholder for cross-chain
                    'USDC': '0xA0b86a33E6441e816d82C5e11f5E10cE1A3Df7E7'
                };
                
                const srcToken = tokenAddresses[fromToken] || fromToken;
                const dstToken = tokenAddresses[toToken] || toToken;
                const amountWei = (parseFloat(amount) * 1e18).toString();
                
                const quoteParams = new URLSearchParams({
                    src: srcToken,
                    dst: dstToken,
                    amount: amountWei,
                    includeTokensInfo: 'false',
                    includeProtocols: 'false',
                    slippage: '1'
                });

                const response = await fetch(`https://api.1inch.dev/swap/v6.0/1/quote?${quoteParams}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
                        'accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const quote = await response.json();
                    const outputAmount = (parseFloat(quote.toAmount) / 1e18).toFixed(4);
                    const rate = (parseFloat(outputAmount) / parseFloat(amount)).toFixed(4);
                    
                    return res.json({
                        estimatedOutput: outputAmount,
                        rate: rate,
                        slippage: 1,
                        gasEstimate: quote.gasEstimate || '50000',
                        realQuote: true
                    });
                }
            } catch (error) {
                debug('1inch quote error:', error);
                // Fall through to demo quote
            }
        }
        
        // Demo quote for development
        const demoRates = {
            'SUI-ETH': 0.70,
            'ETH-SUI': 1.42,
            'SUI-USDC': 1.98,
            'USDC-SUI': 0.505,
            'ETH-USDC': 2800,
            'USDC-ETH': 0.000357
        };
        
        const pair = `${fromToken}-${toToken}`;
        const rate = demoRates[pair] || 1;
        const output = (parseFloat(amount) * rate).toFixed(4);
        
        res.json({
            estimatedOutput: output,
            rate: rate.toString(),
            slippage: 1,
            gasEstimate: '50000',
            realQuote: false
        });
        
    } catch (error) {
        debug('Quote error:', error);
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
            orderId: order.orderId || order.id, // Handle both formats (BASE_SEPOLIA uses orderId, demo uses id)
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
        
        // Validate amount to prevent insufficient balance
        const maxAmount = 0.1; // Max 0.1 SUI for safety
        const swapAmount = Math.min(parseFloat(amount), maxAmount);
        
        console.log(`🔒 Locking ${swapAmount} SUI (requested: ${amount})`);
        
        // Create escrow
        const ethAddress = await ethClient.getAddress();
        const timelock = Date.now() + (20 * 60 * 1000); // 20 minutes
        const secretHash = Buffer.from(order.secretHash, 'hex');
        const amountInMist = Math.floor(swapAmount * 1e9);
        
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

// Test Base Sepolia transaction endpoint for UI verification
app.post('/api/test/base-sepolia', async (req, res) => {
    try {
        console.log('🧪 UI Test: Creating real Base Sepolia transaction...');
        
        // Execute a real Base Sepolia transaction
        const testTx = await ethClient.executeSwap('ETH', 'SUI', 0.0001);
        
        console.log(`✅ Test transaction successful: ${testTx.txHash}`);
        
        // Return detailed transaction info for UI verification
        res.json({
            success: true,
            txHash: testTx.txHash,
            network: testTx.network,
            explorerUrl: testTx.explorerUrl,
            blockNumber: testTx.blockNumber,
            gasUsed: testTx.gasUsed,
            status: testTx.status,
            amount: testTx.amount,
            confirmations: testTx.confirmations,
            timestamp: new Date().toISOString(),
            testNote: 'This is a real Base Sepolia transaction created by the UI'
        });
        
    } catch (error) {
        console.error('❌ Base Sepolia test failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            network: 'BASE_SEPOLIA',
            suggestion: error.message.includes('insufficient') 
                ? 'Get more Base Sepolia ETH from https://www.alchemy.com/faucets/base-sepolia'
                : 'Check your ETH_PRIVATE_KEY and RPC configuration'
        });
    }
});

// Execute cross-chain swap via 1inch Fusion+
app.post('/api/swap/execute', async (req, res) => {
    try {
        const { orderID, escrowID, direction, amount } = req.body;
        
        debug(`Executing cross-chain swap: ${direction}, ${amount}`);
        
        // EXECUTE REAL BASE SEPOLIA TRANSACTION
        // Instead of just calling fusion client, execute actual ETH transaction on Base Sepolia
        let ethTxResult = null;
        
        if (direction.includes('ETH') || direction.includes('BASE_SEPOLIA')) {
            console.log('🔄 Executing REAL Base Sepolia transaction...');
            
            try {
                // Execute real Base Sepolia transaction using ethClient
                ethTxResult = await ethClient.executeSwap('ETH', 'SUI', parseFloat(amount) || 0.0001);
                
                console.log(`✅ REAL Base Sepolia transaction executed: ${ethTxResult.txHash}`);
                console.log(`🔍 Explorer: ${ethTxResult.explorerUrl}`);
                
                // Return the REAL transaction hash to the UI
                return res.json({
                    txHash: ethTxResult.txHash, // REAL Base Sepolia transaction hash
                    outputAmount: ethTxResult.amount,
                    gasUsed: ethTxResult.gasUsed || '21000',
                    explorerUrl: ethTxResult.explorerUrl,
                    network: ethTxResult.network,
                    blockNumber: ethTxResult.blockNumber,
                    status: ethTxResult.status,
                    realTransaction: true, // Flag to indicate this is a real transaction
                    confirmations: ethTxResult.confirmations || 1
                });
                
            } catch (ethError) {
                console.error('❌ Base Sepolia transaction failed:', ethError.message);
                
                // Provide helpful error messages
                if (ethError.message.includes('insufficient')) {
                    return res.status(400).json({ 
                        error: 'Insufficient Base Sepolia ETH balance',
                        suggestion: 'Get more testnet ETH from https://www.alchemy.com/faucets/base-sepolia',
                        network: 'BASE_SEPOLIA'
                    });
                }
                
                // Fall back to fusion client if ETH transaction fails
                console.log('⚠️  Falling back to Fusion+ client...');
            }
        }
        
        // Fallback: Use the existing fusion client for other cases
        const swapResult = await fusionClient.executeCrossChainSwap({
            orderID,
            escrowID,
            direction,
            amount
        });
        
        // If we had a successful ETH transaction, prefer that
        if (ethTxResult) {
            res.json({
                txHash: ethTxResult.txHash,
                outputAmount: swapResult.outputAmount,
                gasUsed: ethTxResult.gasUsed || swapResult.gasUsed,
                explorerUrl: ethTxResult.explorerUrl,
                network: ethTxResult.network,
                blockNumber: ethTxResult.blockNumber,
                realFusion: swapResult.realFusion,
                realTransaction: true,
                status: 'executed'
            });
        } else {
            res.json({
                txHash: swapResult.txHash,
                outputAmount: swapResult.outputAmount,
                gasUsed: swapResult.gasUsed,
                explorerUrl: swapResult.explorerUrl,
                realFusion: swapResult.realFusion,
                realTransaction: false,
                status: 'executed'
            });
        }
        
    } catch (error) {
        debug('Execute swap error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fusion+ verification endpoints
app.get('/api/fusion/orders', async (req, res) => {
    try {
        if (!fusionClient) {
            return res.status(503).json({ error: 'Fusion+ not available - API key not configured' });
        }
        
        const orders = await fusionClient.listOrders();
        res.json({
            success: true,
            data: orders,
            count: orders.length,
            fusionEnabled: true
        });
    } catch (error) {
        debug('List orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/fusion/orders/:orderHash', async (req, res) => {
    try {
        if (!fusionClient) {
            return res.status(503).json({ error: 'Fusion+ not available - API key not configured' });
        }
        
        const { orderHash } = req.params;
        const status = await fusionClient.getOrderStatus(orderHash);
        
        res.json({
            success: true,
            data: status,
            fusionEnabled: true
        });
    } catch (error) {
        debug('Get order status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/fusion/verify/:orderHash', async (req, res) => {
    try {
        const { orderHash } = req.params;
        
        // Get local order data (works for both real and demo clients)
        const localOrder = await fusionClient.getOrder(orderHash);
        if (!localOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Try to get 1inch API data if available
        let apiStatus = null;
        let apiError = null;
        
        try {
            if (fusionClient.getOrderStatus && typeof fusionClient.getOrderStatus === 'function') {
                apiStatus = await fusionClient.getOrderStatus(orderHash);
            }
        } catch (error) {
            apiError = error.message;
            console.log('📡 API verification not available:', error.message);
        }

        // Generate appropriate explorer URL
        let explorerUrl = null;
        if (localOrder.realFusion || localOrder.ethTokens) {
            // Use the appropriate explorer based on network
            if (fusionClient.getExplorerUrl && typeof fusionClient.getExplorerUrl === 'function') {
                explorerUrl = fusionClient.getExplorerUrl(orderHash);
            } else {
                // Fallback based on network
                const networkName = localOrder.network || process.env.NETWORK_NAME || 'ETHEREUM_SEPOLIA';
                const explorers = {
                    ETHEREUM: `https://etherscan.io/tx/${orderHash}`,
                    POLYGON: `https://polygonscan.com/tx/${orderHash}`,
                    BINANCE: `https://bscscan.com/tx/${orderHash}`,
                    BASE_SEPOLIA: `https://sepolia.basescan.org/tx/${orderHash}`,
                    ETHEREUM_SEPOLIA: `https://sepolia.etherscan.io/tx/${orderHash}`
                };
                explorerUrl = explorers[networkName] || explorers.ETHEREUM_SEPOLIA;
            }
        }

        // Generate verification URL
        const chainId = localOrder.chainId || fusionClient.chainId || 11155111; // Default to Sepolia
        const verificationUrl = `https://api.1inch.dev/fusion/orders/v1.0/${chainId}/${orderHash}`;
        
        res.json({
            success: true,
            data: {
                orderHash,
                verified: !!(localOrder.realFusion || localOrder.apiWorking),
                localData: {
                    originalFromToken: localOrder.originalFromToken || localOrder.fromToken,
                    originalToToken: localOrder.originalToToken || localOrder.toToken,
                    originalAmount: localOrder.originalAmount || localOrder.amount,
                    ethSrcToken: localOrder.ethTokens?.from,
                    ethDstToken: localOrder.ethTokens?.to,
                    ethAmount: localOrder.ethAmount,
                    timestamp: localOrder.timestamp,
                    apiWorking: localOrder.apiWorking || false,
                    realFusionAttempted: localOrder.realFusionAttempted || false,
                    network: localOrder.network || process.env.NETWORK_NAME || 'ETHEREUM_SEPOLIA',
                    chainId: chainId,
                    demoNote: localOrder.demoNote
                },
                apiData: apiStatus,
                apiError: apiError,
                explorerUrl: explorerUrl,
                verificationUrl: verificationUrl,
                timestamp: new Date().toISOString()
            },
            fusionEnabled: !!fusionClient,
            networkInfo: {
                name: process.env.NETWORK_NAME || 'ETHEREUM_SEPOLIA',
                chainId: chainId,
                hasRealAPI: !!(process.env.ONEINCH_API_KEY && localOrder.realFusion)
            }
        });
    } catch (error) {
        debug('Verify order error:', error);
        res.status(500).json({ error: error.message });
    }
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
        console.log(`   GET  /api/fusion/orders    - List 1inch Fusion+ orders`);
        console.log(`   GET  /api/fusion/orders/:hash - Get order status`);
        console.log(`   GET  /api/fusion/verify/:hash - Verify Fusion+ order`);
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