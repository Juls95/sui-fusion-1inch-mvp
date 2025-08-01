import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            
            // Show user-friendly error messages
            if (error.message.includes('Failed to fetch')) {
                toast.error('Cannot connect to backend. Make sure the API server is running.');
                throw new Error('Backend connection failed. Please check if the API server is running on localhost:3001');
            }
            
            throw error;
        }
    }

    // Health check
    async checkHealth() {
        return this.request('/health');
    }

    // Get real-time quote
    async getQuote({ fromToken, toToken, amount }) {
        return this.request('/quote', {
            method: 'POST',
            body: JSON.stringify({
                fromToken,
                toToken,
                amount: amount.toString()
            })
        });
    }

    // Get wallet information
    async getWalletInfo() {
        return this.request('/wallet');
    }

    // Create a new swap order
    async createSwap({ fromToken, toToken, amount }) {
        return this.request('/swap/create', {
            method: 'POST',
            body: JSON.stringify({
                fromToken,
                toToken,
                amount: amount.toString()
            })
        });
    }

    // Lock funds in HTLC escrow
    async lockFunds({ orderId, amount }) {
        return this.request('/swap/lock', {
            method: 'POST',
            body: JSON.stringify({
                orderId,
                amount: amount.toString()
            })
        });
    }

    // Claim funds from HTLC escrow
    async claimFunds({ escrowId, orderId, amount }) {
        return this.request('/swap/claim', {
            method: 'POST',
            body: JSON.stringify({
                escrowId,
                orderId,
                amount: amount.toString()
            })
        });
    }

    // Get swap status
    async getSwapStatus(orderId) {
        return this.request(`/swap/${orderId}/status`);
    }

    // Get contract deployment status
    async getContractStatus() {
        return this.request('/contract/status');
    }

    // Utility method for testing connection
    async testConnection() {
        try {
            const health = await this.checkHealth();
            const contractStatus = await this.getContractStatus();
            
            return {
                connected: true,
                health,
                contract: contractStatus,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Additional methods for real swap integration
    async createFusionOrder(swapParams) {
        return this.createSwap({
            fromToken: swapParams.fromToken,
            toToken: swapParams.toToken,
            amount: swapParams.amount
        }).then(response => ({
            success: true,
            data: {
                id: response.orderId || response.id,
                secretHash: response.secretHash || 'demo_secret_hash',
                secret: response.secret || 'demo_secret',
                expiresAt: response.expiresAt || Date.now() + (30 * 60 * 1000)
            }
        })).catch(error => ({
            success: false,
            error: error.message
        }));
    }

    async createEscrow({ redeemer, secretHash, amount, timelock, orderID }) {
        return this.lockFunds({
            orderId: orderID,
            amount: amount
        }).then(response => ({
            success: true,
            data: {
                escrowId: response.escrowId,
                txHash: response.txHash,
                gasUsed: 100000 // Placeholder
            }
        })).catch(error => ({
            success: false,
            error: error.message
        }));
    }

    async executeCrossChainSwap({ orderID, escrowID, direction, amount }) {
        // Call the real backend API for cross-chain execution
        return this.request('/swap/execute', {
            method: 'POST',
            body: JSON.stringify({
                orderID,
                escrowID,
                direction,
                amount: amount.toString()
            })
        }).then(response => ({
            success: true,
            data: {
                txHash: response.txHash,
                outputAmount: response.outputAmount || amount * 0.99,
                gasUsed: response.gasUsed || 50000,
                explorerUrl: response.explorerUrl,
                realFusion: response.realFusion || false
            }
        })).catch(error => ({
            success: false,
            error: error.message
        }));
    }

    async claimEscrow({ escrowID, secret, amount }) {
        return this.claimFunds({
            escrowId: escrowID,
            orderId: 'placeholder', // The API expects orderId
            amount: amount
        }).then(response => ({
            success: true,
            data: {
                txHash: response.txHash,
                amount: amount,
                gasUsed: 80000 // Placeholder
            }
        })).catch(error => ({
            success: false,
            error: error.message
        }));
    }

    async getTransactionStatus(txHash) {
        // Simulate transaction status check
        // In a real implementation, this would query the blockchain
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        confirmed: true,
                        blockHeight: Math.floor(Math.random() * 1000000),
                        confirmations: Math.floor(Math.random() * 20) + 1
                    }
                });
            }, 1000);
        });
    }
}

// Create singleton instance
const apiService = new APIService();

export default apiService; 