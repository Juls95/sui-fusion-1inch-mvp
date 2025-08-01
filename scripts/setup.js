const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

class SetupValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.success = [];
    }

    parsePrivateKey(privateKey) {
        if (!privateKey) {
            throw new Error('SUI_PRIVATE_KEY is required');
        }

        try {
            if (privateKey.startsWith('suiprivkey')) {
                // Handle Sui CLI bech32 format (suiprivkey...)
                const { schema, secretKey } = decodeSuiPrivateKey(privateKey);
                return Ed25519Keypair.fromSecretKey(secretKey);
            } else {
                // Handle raw hex format
                const keyBytes = privateKey.startsWith('0x') 
                    ? Buffer.from(privateKey.slice(2), 'hex')
                    : Buffer.from(privateKey, 'hex');
                return Ed25519Keypair.fromSecretKey(keyBytes);
            }
        } catch (error) {
            throw new Error(`Invalid SUI_PRIVATE_KEY format: ${error.message}. Expected 'suiprivkey...' format from Sui CLI or raw hex bytes.`);
        }
    }

    error(message) {
        this.errors.push(`❌ ${message}`);
    }

    warn(message) {
        this.warnings.push(`⚠️  ${message}`);
    }

    ok(message) {
        this.success.push(`✅ ${message}`);
    }

    async validateEnvironment() {
        console.log('🔍 Validating Environment Configuration\n');

        // Check .env file exists
        const envPath = path.join(__dirname, '../.env');
        if (!fs.existsSync(envPath)) {
            this.error('.env file not found. Copy .env.example to .env and configure it.');
            return false;
        }
        this.ok('.env file found');

        // Check required environment variables
        const required = [
            'SUI_PRIVATE_KEY',
            'ETH_PRIVATE_KEY',
            'INFURA_PROJECT_ID'
        ];

        const optional = [
            'ONEINCH_API_KEY',
            'HTLC_PACKAGE_ID'
        ];

        for (const key of required) {
            if (!process.env[key]) {
                this.error(`Missing required environment variable: ${key}`);
            } else {
                this.ok(`${key} is set`);
            }
        }

        for (const key of optional) {
            if (!process.env[key]) {
                this.warn(`Optional environment variable not set: ${key}`);
            } else {
                this.ok(`${key} is set`);
            }
        }

        return this.errors.length === 0;
    }

    async validateSuiSetup() {
        console.log('\n🟦 Validating Sui Configuration\n');

        try {
            // Test private key format
            if (!process.env.SUI_PRIVATE_KEY) {
                this.error('SUI_PRIVATE_KEY not set');
                return false;
            }

            let keypair;
            try {
                keypair = this.parsePrivateKey(process.env.SUI_PRIVATE_KEY);
                this.ok('Sui private key format is valid');
            } catch (error) {
                this.error(`Invalid Sui private key format: ${error.message}`);
                return false;
            }

            // Test Sui client connection
            const client = new SuiClient({
                url: process.env.SUI_RPC_URL || getFullnodeUrl('testnet')
            });

            try {
                const chainId = await client.getChainIdentifier();
                this.ok(`Connected to Sui network (Chain ID: ${chainId})`);
            } catch (error) {
                this.error(`Failed to connect to Sui network: ${error.message}`);
                return false;
            }

            // Check balance
            const address = keypair.getPublicKey().toSuiAddress();
            try {
                const balance = await client.getBalance({ owner: address });
                const suiBalance = balance.totalBalance / 1e9;
                
                console.log(`   Address: ${address}`);
                console.log(`   Balance: ${suiBalance} SUI`);
                
                if (suiBalance < 0.1) {
                    this.warn(`Low SUI balance (${suiBalance} SUI). Consider getting more from faucet.`);
                } else {
                    this.ok(`Sufficient SUI balance (${suiBalance} SUI)`);
                }
            } catch (error) {
                this.error(`Failed to check Sui balance: ${error.message}`);
                return false;
            }

            return true;
        } catch (error) {
            this.error(`Sui setup validation failed: ${error.message}`);
            return false;
        }
    }

    async validateEthereumSetup() {
        console.log('\n⚫ Validating Ethereum Configuration\n');

        try {
            // Test private key format
            if (!process.env.ETH_PRIVATE_KEY) {
                this.error('ETH_PRIVATE_KEY not set');
                return false;
            }

            let wallet;
            try {
                const provider = new ethers.JsonRpcProvider(
                    process.env.ETH_RPC_URL || `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
                );
                wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);
                this.ok('Ethereum private key format is valid');
            } catch (error) {
                this.error(`Invalid Ethereum private key format: ${error.message}`);
                return false;
            }

            // Test provider connection
            try {
                const network = await wallet.provider.getNetwork();
                this.ok(`Connected to Ethereum network (Chain ID: ${network.chainId})`);
                
                if (network.chainId !== 11155111n) { // Sepolia chain ID
                    this.warn(`Connected to chain ID ${network.chainId}, expected Sepolia (11155111)`);
                }
            } catch (error) {
                this.error(`Failed to connect to Ethereum network: ${error.message}`);
                return false;
            }

            // Check balance
            try {
                const balance = await wallet.provider.getBalance(wallet.address);
                const ethBalance = parseFloat(ethers.formatEther(balance));
                
                console.log(`   Address: ${wallet.address}`);
                console.log(`   Balance: ${ethBalance} ETH`);
                
                if (ethBalance < 0.01) {
                    this.warn(`Low ETH balance (${ethBalance} ETH). Consider getting more from faucet.`);
                } else {
                    this.ok(`Sufficient ETH balance (${ethBalance} ETH)`);
                }
            } catch (error) {
                this.error(`Failed to check ETH balance: ${error.message}`);
                return false;
            }

            return true;
        } catch (error) {
            this.error(`Ethereum setup validation failed: ${error.message}`);
            return false;
        }
    }

    async validate1inchAPI() {
        console.log('\n🔄 Validating 1inch API Configuration\n');

        if (!process.env.ONEINCH_API_KEY) {
            this.warn('ONEINCH_API_KEY not set. API calls may be rate limited.');
            return true; // Not critical for testing
        }

        try {
            // Test API connection with a simple quote request
            const response = await axios.get('https://api.1inch.dev/swap/v6.0/1/tokens', {
                headers: {
                    'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`
                },
                timeout: 5000
            });

            if (response.status === 200) {
                this.ok('1inch API connection successful');
                return true;
            } else {
                this.warn(`1inch API returned status ${response.status}`);
                return true; // Still allow testing
            }
        } catch (error) {
            if (error.response?.status === 401) {
                this.error('1inch API key is invalid');
            } else {
                this.warn(`1inch API test failed: ${error.message}. Will fallback to test mode.`);
            }
            return true; // API errors don't prevent testing
        }
    }

    async validateHTLCContract() {
        console.log('\n📋 Validating HTLC Contract\n');

        // Check if contract directory exists
        const contractDir = path.join(__dirname, '../docs/htlc_escrow');
        if (!fs.existsSync(contractDir)) {
            this.error(`HTLC contract directory not found: ${contractDir}`);
            return false;
        }
        this.ok('HTLC contract directory found');

        // Check Move.toml
        const moveToml = path.join(contractDir, 'Move.toml');
        if (!fs.existsSync(moveToml)) {
            this.error('Move.toml not found in HTLC directory');
            return false;
        }
        this.ok('Move.toml found');

        // Check source files
        const sourceDir = path.join(contractDir, 'sources');
        const sourceFile = path.join(sourceDir, 'htlc_escrow.move');
        if (!fs.existsSync(sourceFile)) {
            this.error('HTLC source file not found');
            return false;
        }
        this.ok('HTLC source files found');

        // Check if already deployed
        if (process.env.HTLC_PACKAGE_ID) {
            this.ok(`HTLC package ID configured: ${process.env.HTLC_PACKAGE_ID}`);
        } else {
            this.warn('HTLC package not deployed yet. Run `npm run deploy` first.');
        }

        return true;
    }

    displayResults() {
        console.log('\n📊 Validation Results\n');

        if (this.success.length > 0) {
            console.log('✅ Success:');
            this.success.forEach(msg => console.log(`   ${msg}`));
            console.log();
        }

        if (this.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            this.warnings.forEach(msg => console.log(`   ${msg}`));
            console.log();
        }

        if (this.errors.length > 0) {
            console.log('❌ Errors:');
            this.errors.forEach(msg => console.log(`   ${msg}`));
            console.log();
        }

        const canProceed = this.errors.length === 0;

        if (canProceed) {
            console.log('🎉 Setup validation completed successfully!');
            console.log('\n📋 Next Steps:');
            
            if (!process.env.HTLC_PACKAGE_ID) {
                console.log('1. Deploy HTLC contract: npm run deploy');
                console.log('2. Run swap test: npm run swap');
            } else {
                console.log('1. Run swap test: npm run swap');
            }
            
            console.log('3. Monitor transactions on block explorers');
            console.log('4. Check logs with DEBUG=sui-fusion npm run swap');
        } else {
            console.log('❌ Setup validation failed. Please fix the errors above before proceeding.');
            console.log('\n🔧 Common Solutions:');
            console.log('- Copy .env.example to .env and configure it');
            console.log('- Get test funds from faucets');
            console.log('- Check private key formats (hex without 0x prefix)');
            console.log('- Verify API keys are correct');
        }

        return canProceed;
    }

    async generateFaucetLinks() {
        console.log('\n💰 Test Fund Sources:\n');

        if (process.env.SUI_PRIVATE_KEY) {
            try {
                const keypair = this.parsePrivateKey(process.env.SUI_PRIVATE_KEY);
                const suiAddress = keypair.getPublicKey().toSuiAddress();
                
                console.log('🟦 Sui Testnet Faucet:');
                console.log(`   Address: ${suiAddress}`);
                console.log(`   Faucet: curl --location --request POST 'https://faucet.testnet.sui.io/gas' \\`);
                console.log(`           --header 'Content-Type: application/json' \\`);
                console.log(`           --data-raw '{"FixedAmountRequest": {"recipient": "${suiAddress}"}}'`);
                console.log();
            } catch (error) {
                console.log('🟦 Sui Testnet Faucet: Configure SUI_PRIVATE_KEY first');
            }
        }

        if (process.env.ETH_PRIVATE_KEY) {
            try {
                const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY);
                console.log('⚫ Ethereum Sepolia Faucet:');
                console.log(`   Address: ${wallet.address}`);
                console.log(`   Faucet 1: https://sepoliafaucet.com/`);
                console.log(`   Faucet 2: https://www.alchemy.com/faucets/ethereum-sepolia`);
                console.log();
            } catch (error) {
                console.log('⚫ Ethereum Sepolia Faucet: Configure ETH_PRIVATE_KEY first');
            }
        }
    }
}

async function runSetup() {
    console.log('🚀 Sui Fusion+ Cross-Chain Swap Setup Validator\n');

    const validator = new SetupValidator();

    // Run all validations
    const envValid = await validator.validateEnvironment();
    
    if (envValid) {
        await validator.validateSuiSetup();
        await validator.validateEthereumSetup();
        await validator.validate1inchAPI();
        await validator.validateHTLCContract();
    }

    // Display results
    const success = validator.displayResults();

    // Show faucet information
    await validator.generateFaucetLinks();

    process.exit(success ? 0 : 1);
}

// Run setup if called directly
if (require.main === module) {
    runSetup().catch(console.error);
}

module.exports = { SetupValidator, runSetup }; 