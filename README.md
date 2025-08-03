# Sui Fusion+ 1inch MVP - Real Cross-Chain Swaps

🚀 **LIVE TESTNET**: Real cross-chain swaps between Sui and Base Sepolia with verifiable transaction hashes

## 🎯 **Project Overview**

This project implements a **real cross-chain swap protocol** that extends 1inch Fusion+ functionality to the Sui blockchain using Hash Time Locked Contracts (HTLC). The system enables trustless atomic swaps between SUI and ETH on Base Sepolia testnet with **actual onchain transactions**.

### **Latest Updates (2024)**
- ✅ **Base Sepolia Integration**: Real ETH transactions on Base Sepolia testnet
- ✅ **Transaction Hash Fix**: UI now returns real, confirmed transaction hashes
- ✅ **Enhanced API**: Improved error handling and transaction verification
- ✅ **Real 1inch Integration**: Official Fusion+ SDK implementation
- ✅ **UI Improvements**: Better explorer links and transaction tracking

## 🔗 **Real Transaction Evidence**

### **Live Infrastructure**
- **HTLC Contract Package**: `0x4f5ce6e089f48137b532bfdda171d18c09a2cd278d2212b7c3f71ae7c88525d`
- **Network**: Sui Testnet + Base Sepolia Testnet
- **Latest Base Sepolia TX**: [`0xd2482181aca2dc0f123b7949afd48667d219d3ecc411c9ddef0fbb277099173e`](https://sepolia.basescan.org/tx/0xd2482181aca2dc0f123b7949afd48667d219d3ecc411c9ddef0fbb277099173e)

*All transactions are real and verifiable on testnet explorers*

## 🏗️ **Architecture & Key Components**

### **1. Smart Contract Layer (`docs/htlc_escrow/sources/htlc_escrow.move`)**
- **HTLC Implementation**: Move-based Hash Time Locked Contract
- **Auction Parameters**: Enhanced for Fusion+ compatibility
- **Partial Fills**: Support for incremental claims
- **Security Features**: Timelock protection and hashlock validation

### **2. Backend Integration (`scripts/real_swap.js`)**
The core swap execution engine with three main client classes:

#### **SuiHTLCClient Class**
```javascript
// Handles Sui blockchain operations
class SuiHTLCClient {
  // Creates real escrow with HTLC on Sui testnet
  async createEscrow(redeemer, secretHash, amount, timelock)
  
  // Claims funds with secret reveal
  async claimEscrow(escrowId, secret, amount)
  
  // Refunds after timelock expiration
  async refundEscrow(escrowId)
}
```

#### **OneinchFusionClient Class**
```javascript
// Handles 1inch Fusion+ API integration
class OneinchFusionClient {
  // Creates real Fusion+ orders using official SDK
  async createFusionOrder(fromToken, toToken, amount, userAddress)
  
  // Special Base Sepolia testnet support
  async createBaseSpoliaTestOrder(fromToken, toToken, amount, userAddress)
  
  // Monitors order execution
  async executeCrossChainSwap(orderData)
}
```

#### **EthereumClient Class**
```javascript
// Handles Base Sepolia transactions
class EthereumClient {
  // Executes real ETH transactions with confirmation
  async executeSwap(fromToken, toToken, amount)
  
  // Verifies transaction on Base Sepolia
  async verifyTransaction(txHash)
}
```

### **3. API Server (`scripts/api-server.js`)**
Express.js backend that connects UI to blockchain operations:

#### **Key Endpoints**
- `POST /api/swap/create` - Creates Fusion+ orders
- `POST /api/swap/lock` - Locks funds in HTLC escrow
- `POST /api/swap/claim` - Claims funds from escrow
- `POST /api/swap/execute` - **NEW**: Executes real Base Sepolia transactions
- `POST /api/test/base-sepolia` - **NEW**: Test endpoint for Base Sepolia verification

#### **Base Sepolia Integration**
```javascript
// NEW: Real Base Sepolia transaction execution
app.post('/api/swap/execute', async (req, res) => {
  // Execute real Base Sepolia transaction using ethClient
  const ethTxResult = await ethClient.executeSwap('ETH', 'SUI', amount);
  
  // Return REAL transaction hash to UI
  res.json({
    txHash: ethTxResult.txHash, // Real Base Sepolia hash
    explorerUrl: ethTxResult.explorerUrl,
    network: 'BASE_SEPOLIA',
    realTransaction: true
  });
});
```

### **4. React UI (`ui/src/`)**

#### **Main Components**
- **SwapInterface**: Token selection and swap initiation
- **TransactionModal**: Displays real transaction details with explorer links
- **WalletConnection**: Wallet integration simulation
- **StatusTracker**: Real-time swap progress monitoring

#### **Real Swap Hook (`ui/src/hooks/useRealSwap.js`)**
```javascript
// Manages real cross-chain swap execution
export const useRealSwap = () => {
  const executeSwap = async (swapParams) => {
    // Step 1: Create Fusion+ order
    const orderResponse = await apiService.createSwap(swapParams);
    
    // Step 2: Lock funds in HTLC (Real Sui transaction)
    const lockResponse = await apiService.lockFunds({
      orderId: orderResponse.orderId,
      amount: swapParams.amount
    });
    
    // Step 3: Execute cross-chain (Real Base Sepolia transaction)
    const claimResponse = await apiService.claimFunds({
      escrowId: lockResponse.escrowId,
      orderId: orderResponse.orderId
    });
    
    // Return real transaction hashes
    return {
      transactions: {
        escrowCreation: lockResponse.txHash, // Real Sui hash
        fundsClaim: claimResponse.txHash     // Real Base Sepolia hash
      },
      explorerUrls: {
        sui: `https://suiscan.xyz/testnet/tx/${lockResponse.txHash}`,
        baseSepolia: `https://sepolia.basescan.org/tx/${claimResponse.txHash}`
      }
    };
  };
};
```

## 🚀 **Installation & Setup**

### **Prerequisites**
- **Node.js** 18 or higher
- **Git** for cloning the repository
- **Sui CLI** (optional, for key generation)

### **Step 1: Clone Repository**
```bash
git clone https://github.com/your-repo/sui-fusion-1inch-mvp.git
cd sui-fusion-1inch-mvp
```

### **Step 2: Install Dependencies**
```bash
# Install backend dependencies
cd scripts
npm install

# Install UI dependencies
cd ../ui
npm install
```

### **Step 3: Environment Configuration**

Create `.env` file in the project root:
```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# === SUI CONFIGURATION ===
SUI_RPC_URL=https://fullnode.testnet.sui.io
SUI_PRIVATE_KEY=suiprivkey1your_sui_private_key_here

# === BASE SEPOLIA CONFIGURATION ===
NETWORK_NAME=BASE_SEPOLIA
ETH_RPC_URL=https://sepolia.base.org
ETH_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef12345678
CHAIN_ID=84532

# === 1INCH FUSION+ API (Optional) ===
ONEINCH_API_KEY=your_1inch_api_key_from_portal_1inch_dev

# === GAS SETTINGS ===
GAS_BUDGET=20000000

# === API SERVER ===
API_PORT=3001
```

### **Step 4: Get Testnet Tokens**

#### **Sui Testnet Tokens**
```bash
# Join Sui Discord: https://discord.gg/sui
# Use command: !faucet YOUR_SUI_ADDRESS
```

#### **Base Sepolia ETH**
- Visit: https://www.alchemy.com/faucets/base-sepolia
- Connect your wallet and request testnet ETH

### **Step 5: Generate Private Keys (if needed)**

#### **Sui Private Key**
```bash
# Install Sui CLI
sui client new-address ed25519

# Copy the private key from output (starts with 'suiprivkey...')
```

#### **Ethereum Private Key**
- Use MetaMask or any Ethereum wallet
- Export private key (starts with '0x...')
- **WARNING**: Only use testnet keys, never mainnet!

## 🔧 **Running the Application**

### **Option 1: Full Stack (Recommended)**

#### **Terminal 1: Start API Server**
```bash
cd scripts
node api-server.js
```
*Should show: "🚀 API Server running on http://localhost:3001"*

#### **Terminal 2: Start UI**
```bash
cd ui
npm start
```
*Should open browser at: http://localhost:3000*

### **Option 2: Backend Testing Only**

#### **Test Base Sepolia Integration**
```bash
cd scripts
node verify_base_sepolia_tx.js
```

#### **Test Complete Swap Flow**
```bash
cd scripts
node test_base_sepolia_swap.js
```

#### **Test UI API Integration**
```bash
cd scripts
node test_ui_base_sepolia.js
```

## 🧪 **Usage Examples**

### **1. Command Line Swap**
```bash
cd scripts

# Test bidirectional swap
node bidirectional_demo.js

# Execute single swap
NETWORK_NAME=BASE_SEPOLIA node real_swap.js
```

### **2. UI Swap**
1. Open http://localhost:3000
2. Select tokens (SUI → ETH)
3. Enter amount (e.g., 0.01 SUI)
4. Click "Initiate Swap"
5. **View real transaction hash** in modal
6. Click explorer link to verify on Base Sepolia

### **3. API Testing**
```bash
# Test Base Sepolia transaction endpoint
curl -X POST http://localhost:3001/api/test/base-sepolia

# Expected response:
{
  "success": true,
  "txHash": "0x...",
  "network": "BASE_SEPOLIA",
  "explorerUrl": "https://sepolia.basescan.org/tx/0x..."
}
```

## 🔍 **Verification & Debugging**

### **Check Transaction Status**
```bash
cd scripts

# Verify specific transaction
node verify_base_sepolia_tx.js 0x[transaction_hash]

# Test current configuration
node test_base_sepolia.js
```

### **Common Issues & Solutions**

#### **"Insufficient Balance" Error**
```bash
# Solution: Get more testnet tokens
# Base Sepolia: https://www.alchemy.com/faucets/base-sepolia
# Sui Testnet: Discord !faucet command
```

#### **"Transaction Not Found" Error**
- **Cause**: Using fake/mock transaction hash
- **Solution**: Ensure API server is running with latest code
- **Verification**: Check if hash starts with '0x' and is 66 characters

#### **"API Connection Failed"**
```bash
# Check if API server is running
curl http://localhost:3001/api/health

# Restart API server
cd scripts
node api-server.js
```

## 📊 **Project Structure**

```
sui-fusion-1inch-mvp/
├── 📁 docs/htlc_escrow/          # Smart Contract
│   ├── 📄 sources/htlc_escrow.move   # HTLC implementation
│   ├── 📄 Move.toml                  # Contract configuration  
│   └── 📁 tests/                     # Contract tests
├── 📁 scripts/                   # Backend & Integration
│   ├── 📄 real_swap.js              # Core swap execution
│   ├── 📄 api-server.js             # Express API server
│   ├── 📄 verify_base_sepolia_tx.js # Transaction verification
│   ├── 📄 test_base_sepolia_swap.js # Integration tests
│   └── 📄 bidirectional_demo.js     # Demo flows
├── 📁 ui/                        # React Frontend
│   ├── 📁 src/components/           # UI components
│   ├── 📁 src/hooks/               # React hooks
│   ├── 📁 src/services/            # API integration
│   └── 📄 package.json             # UI dependencies
├── 📄 .env.example               # Environment template
├── 📄 README.md                  # This file
└── 📄 package.json               # Root dependencies
```

## 🎯 **Key Features Demonstrated**

### **✅ Real Blockchain Integration**
- **Sui Testnet**: Actual HTLC contract deployment and execution
- **Base Sepolia**: Real ETH transactions with confirmations
- **Explorer Verification**: All transactions visible on testnet explorers

### **✅ 1inch Fusion+ Integration**
- **Official SDK**: Using @1inch/fusion-sdk package
- **Real API**: Connects to 1inch Fusion+ endpoints
- **Order Management**: Create, monitor, and execute orders

### **✅ Security Features**
- **Hashlock Protection**: Funds only released with correct secret
- **Timelock Safety**: Automatic refund after expiration
- **Transaction Confirmation**: Waits for onchain confirmation
- **Error Handling**: Comprehensive error messages and recovery

### **✅ User Experience**
- **Real-time Updates**: Live transaction status
- **Explorer Links**: Direct links to view transactions
- **Error Messages**: Clear instructions for common issues
- **Mobile Responsive**: Works on all devices

## 🔗 **Explorer Links**

### **Testnet Explorers**
- **Sui Testnet**: https://suiscan.xyz/testnet/
- **Base Sepolia**: https://sepolia.basescan.org/

### **Recent Transactions**
- **Base Sepolia Example**: https://sepolia.basescan.org/tx/0xd2482181aca2dc0f123b7949afd48667d219d3ecc411c9ddef0fbb277099173e

## 🏆 **Achievement Summary**

This MVP successfully demonstrates:

1. **✅ Real Cross-Chain Execution**: Actual transactions on Sui and Base Sepolia
2. **✅ HTLC Implementation**: Secure hashlock/timelock mechanisms in Move
3. **✅ 1inch Integration**: Official Fusion+ SDK with real API calls
4. **✅ Bidirectional Swaps**: SUI↔ETH in both directions
5. **✅ UI Integration**: React interface with real transaction tracking
6. **✅ Verification**: All transactions verifiable on testnet explorers

**All requirements met with verifiable onchain evidence! 🎉**

## 📞 **Support & Contributing**

### **Getting Help**
- Check console logs for detailed error messages
- Verify testnet balances on both chains
- Use verification scripts to debug issues
- Review transaction status on explorers

### **Contributing**
- Fork the repository
- Create feature branch
- Test on testnet only
- Submit pull request with description

### **Security Note**
⚠️ **This is testnet code only. Never use mainnet private keys or real funds.**

---

*Built with ❤️ for the Sui ecosystem and 1inch community, from LATAM to the world.* 