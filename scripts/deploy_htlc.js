const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

function parsePrivateKey(privateKey) {
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

async function deployHTLCContract() {
    console.log('🚀 Deploying HTLC Contract to Sui Testnet\n');
    
    try {
        // Validate environment
        if (!process.env.SUI_PRIVATE_KEY) {
            throw new Error('SUI_PRIVATE_KEY not found in environment variables');
        }
        
        // Initialize Sui client
        const client = new SuiClient({
            url: process.env.SUI_RPC_URL || getFullnodeUrl('testnet')
        });
        
        // Handle both suiprivkey... format and raw hex format
        const keypair = parsePrivateKey(process.env.SUI_PRIVATE_KEY);
        
        const address = keypair.getPublicKey().toSuiAddress();
        
        // Check balance
        const balance = await client.getBalance({ owner: address });
        console.log(`📊 Deployer Address: ${address}`);
        console.log(`💰 Balance: ${balance.totalBalance / 1e9} SUI\n`);
        
        if (parseInt(balance.totalBalance) < 100000000) { // 0.1 SUI
            throw new Error('Insufficient balance for deployment. Need at least 0.1 SUI');
        }
        
        // Navigate to contract directory
        const contractDir = path.join(__dirname, '../docs/htlc_escrow');
        
        if (!fs.existsSync(contractDir)) {
            throw new Error(`Contract directory not found: ${contractDir}`);
        }
        
        console.log('🔨 Building Move package...');
        
        // Build the package
        try {
            const buildOutput = execSync('sui move build', {
                cwd: contractDir,
                encoding: 'utf8'
            });
            console.log('✅ Package built successfully');
            if (process.env.DEBUG) {
                console.log(buildOutput);
            }
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            throw error;
        }
        
        console.log('\n📦 Publishing package to testnet...');
        
        // Create a temporary sui client config for this deployment
        const configDir = path.join(contractDir, '.sui');
        const clientConfig = {
            keystore: {
                File: path.join(configDir, 'sui.keystore')
            },
            envs: [{
                alias: 'testnet',
                rpc: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
                ws: null
            }],
            active_env: 'testnet',
            active_address: address
        };
        
        // Ensure config directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Write client config
        fs.writeFileSync(
            path.join(configDir, 'client.yaml'),
            `keystore:
  File: ${path.join(configDir, 'sui.keystore')}
envs:
  - alias: testnet
    rpc: "${process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'}"
    ws: ~
active_env: testnet
active_address: "${address}"
`
        );
        
        // Create keystore file
        const keystoreContent = [
            keypair.getSecretKey()
        ];
        fs.writeFileSync(
            path.join(configDir, 'sui.keystore'),
            JSON.stringify(keystoreContent)
        );
        
        // Publish the package
        try {
            const publishOutput = execSync(`sui client publish --gas-budget ${process.env.GAS_BUDGET || 100000000} --json`, {
                cwd: contractDir,
                encoding: 'utf8'
            });
            
            const publishResult = JSON.parse(publishOutput);
            
            if (publishResult.effects?.status?.status === 'success') {
                // Extract package ID from the publish result
                const packageId = publishResult.objectChanges?.find(
                    change => change.type === 'published'
                )?.packageId;
                
                if (packageId) {
                    console.log('✅ Package published successfully!');
                    console.log(`📦 Package ID: ${packageId}`);
                    console.log(`🔗 Transaction: ${publishResult.digest}`);
                    
                    // Update .env file with package ID
                    const envPath = path.join(__dirname, '../.env');
                    let envContent = '';
                    
                    if (fs.existsSync(envPath)) {
                        envContent = fs.readFileSync(envPath, 'utf8');
                    }
                    
                    // Update or add HTLC_PACKAGE_ID
                    if (envContent.includes('HTLC_PACKAGE_ID=')) {
                        envContent = envContent.replace(
                            /HTLC_PACKAGE_ID=.*/,
                            `HTLC_PACKAGE_ID=${packageId}`
                        );
                    } else {
                        envContent += `\nHTLC_PACKAGE_ID=${packageId}\n`;
                    }
                    
                    fs.writeFileSync(envPath, envContent);
                    console.log('📝 Updated .env file with package ID');
                    
                    // Cleanup temporary files
                    if (fs.existsSync(configDir)) {
                        fs.rmSync(configDir, { recursive: true, force: true });
                    }
                    
                    console.log('\n🎉 Deployment completed successfully!');
                    console.log('ℹ️  You can now run the real swap script with:');
                    console.log('   node real_swap.js');
                    
                    return packageId;
                } else {
                    throw new Error('Package ID not found in publish result');
                }
            } else {
                throw new Error('Publish failed: ' + publishResult.status);
            }
            
        } catch (error) {
            console.error('❌ Publish failed:', error.message);
            if (process.env.DEBUG && error.stdout) {
                console.error('Stdout:', error.stdout);
            }
            if (process.env.DEBUG && error.stderr) {
                console.error('Stderr:', error.stderr);
            }
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run deployment if called directly
if (require.main === module) {
    deployHTLCContract().catch(console.error);
}

module.exports = { deployHTLCContract }; 