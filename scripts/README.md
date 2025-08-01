# Sui Fusion+ Cross-Chain Swap Testing

This directory contains both mock simulations and real blockchain testing scripts for the Sui Fusion+ cross-chain swap functionality.

## Files Overview

- `swap_mock_data.js` - Mock simulation for development and testing
- `real_swap.js` - Real blockchain implementation with actual transactions
- `deploy_htlc.js` - Script to deploy the HTLC contract to Sui testnet
- `.env.example` - Example environment configuration
- `package.json` - Dependencies and npm scripts

## Setup for Real Testing

### 1. Prerequisites

Make sure you have:
- Node.js 18+ installed
- Sui CLI installed ([installation guide](https://docs.sui.io/guides/developer/getting-started/sui-install))
- Access to Sui testnet and Ethereum Sepolia testnet
- Test tokens for both networks

### 2. Install Sui CLI

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# Verify installation
sui --version
```

### 3. Get Test Funds

#### Sui Testnet Faucet
```bash
# Generate a new Sui address or use existing
sui client new-address ed25519

# Get testnet SUI from faucet
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
    "FixedAmountRequest": {
        "recipient": "YOUR_SUI_ADDRESS"
    }
}'
```

#### Ethereum Sepolia Faucet
- Visit [Sepolia Faucet](https://sepoliafaucet.com/) or [Alchemy Faucet](https://sepoliafaucet.com/)
- Get test ETH for your Ethereum address

### 4. Environment Setup

```bash
# Install dependencies
npm install

# Go to root directory and copy example environment file
cd ..
cp .env.example .env

# Edit .env with your configuration
nano .env

# Return to scripts directory
cd scripts
```

#### Required Environment Variables

```bash
# Sui Configuration
SUI_PRIVATE_KEY=your_sui_private_key_here  # Get from: sui keytool export <key-id> ed25519
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Ethereum Configuration  
ETH_PRIVATE_KEY=your_eth_private_key_here  # Without 0x prefix
ETH_NETWORK=sepolia
INFURA_PROJECT_ID=your_infura_project_id  # From infura.io
ETH_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id

# 1inch API Configuration
ONEINCH_API_KEY=your_1inch_api_key  # From 1inch Developer Portal

# Test Configuration
DEBUG=true
GAS_BUDGET=100000000
```

### 5. Get API Keys

#### Infura Project ID
1. Go to [Infura.io](https://infura.io/)
2. Create account and new project
3. Copy the Project ID

#### 1inch API Key
1. Go to [1inch Developer Portal](https://portal.1inch.dev/)
2. Create account and get API key
3. Note: Some functionality may work without API key for testing

### 6. Extract Private Keys

#### Sui Private Key
```bash
# List your keys
sui keytool list

# Export private key (replace <key-id> with actual ID)
sui keytool export <key-id> ed25519

# Copy the entire output including "suiprivkey..." prefix
# Example: suiprivkey1qg8mzyk7p7q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9q9
```

**Important**: Use the complete `suiprivkey...` string that Sui CLI exports. The scripts now automatically handle this format.

#### Ethereum Private Key
Use your preferred wallet (MetaMask, etc.) to export the private key. Remove the `0x` prefix when adding to `.env`.

## Testing Workflow

### Step 1: Deploy HTLC Contract

```bash
# Deploy the HTLC contract to Sui testnet
npm run deploy
```

This will:
- Build the Move package
- Deploy to Sui testnet
- Update your `.env` file with the package ID

### Step 2: Run Real Cross-Chain Swap Test

```bash
# Enable debug logging
DEBUG=sui-fusion npm run swap

# Or run directly
node real_swap.js
```

### Step 3: Monitor Results

The script will:
1. Check your wallet balances
2. Create a 1inch Fusion+ order
3. Create HTLC escrow on Sui
4. Simulate resolver actions
5. Execute claim transaction
6. Display transaction hashes and results

## Available Scripts

```bash
# Run mock simulation (no real transactions)
npm run mock

# Deploy HTLC contract
npm run deploy

# Run real swap test
npm run swap

# Enable debug logging for any script
DEBUG=sui-fusion npm run <script>
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit private keys** to version control
2. **Use testnet only** for these scripts
3. **Keep private keys secure** and use environment variables
4. **Test with small amounts** first
5. **Verify all transactions** on block explorers

## Troubleshooting

### Common Issues

#### 1. "SUI_PRIVATE_KEY not found"
- Ensure `.env` file exists with correct private key
- Check that private key is in hex format without `0x` prefix

#### 2. "Insufficient balance"
- Get more test tokens from faucets
- Check you're connected to the correct network

#### 3. "HTLC package not deployed"
- Run `npm run deploy` first
- Check that `HTLC_PACKAGE_ID` is set in `.env`

#### 4. Move compilation errors
- Ensure Sui CLI is properly installed
- Check that you're in the correct directory
- Try `sui move build` manually in `docs/htlc_escrow/`

#### 5. 1inch API errors
- Verify API key is correct
- Check API rate limits
- Script falls back to test mode if API unavailable

### Debug Mode

Enable detailed logging:
```bash
DEBUG=sui-fusion npm run swap
```

This will show:
- API calls and responses
- Transaction details
- Error stack traces
- Network communications

### Block Explorers

Monitor your transactions:
- **Sui Testnet**: [Sui Explorer](https://testnet.suivision.xyz/)
- **Ethereum Sepolia**: [Sepolia Etherscan](https://sepolia.etherscan.io/)

## Architecture Overview

The testing system consists of:

1. **Real Sui Client** (`SuiHTLCClient`)
   - Connects to Sui testnet
   - Deploys and interacts with HTLC contract
   - Handles escrow creation, claiming, and refunds

2. **1inch Fusion+ Client** (`OneinchFusionClient`)
   - Integrates with 1inch Fusion+ API
   - Creates intent orders
   - Falls back to test mode if API unavailable

3. **Ethereum Client** (`EthereumClient`)
   - Connects to Ethereum Sepolia
   - Executes swaps via 1inch
   - Handles ETH transactions

## Expected Test Flow

1. **Setup Phase**
   - Validate environment configuration
   - Check wallet balances
   - Ensure sufficient test funds

2. **Order Creation**
   - Create 1inch Fusion+ intent order
   - Generate secret and hash for HTLC

3. **Escrow Creation**
   - Lock SUI tokens in HTLC contract
   - Set timelock for refund safety

4. **Resolution Simulation**
   - In production: resolver picks up order
   - For testing: manually claim with secret

5. **Verification**
   - Check transaction confirmations
   - Verify balance changes
   - Display gas costs and timing

## Next Steps

After successful testing:
1. Deploy to mainnet with real funds
2. Integrate with actual resolver network
3. Add monitoring and alerting
4. Implement partial fill handling
5. Add comprehensive error recovery

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Enable debug mode for detailed logs
3. Verify all prerequisites are met
4. Check network connectivity and API access 