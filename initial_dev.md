### Steps to Duplicate the Sui Fusion+ Extension MVP on Your Machine

To duplicate this project on your machine, we'll follow the structure of the updated plan, adapting it into actionable, sequential steps. This means setting up a local development environment, implementing the core components (Sui Move contract for HTLC escrow, integration scripts, and React UI), and preparing for simulation and demo—all while aligning with the hackathon objective of creating an innovative, user-friendly DeFi dApp for intent-based cross-chain swaps. The general objective is to build a minimum viable product (MVP) that extends 1inch Fusion+ to Sui, enabling secure, bridge-less atomic swaps to unlock liquidity and position for hackathon success (e.g., Sui prizes up to $12,000 by emphasizing polished UI demos and innovation). We'll avoid any third-party apps or repositories like Garden being installed or cloned on your laptop; instead, we'll use official Sui tools and npm packages, and I'll provide code snippets (adapted from official-inspired examples) that you can directly copy into your files. For the HTLC contract, we'll base it on official Sui Move concepts (like time-locked coins from Sui Foundation examples) and publicly available patterns for hash locks, without requiring any external installs beyond official ones.

Use your preferred code editor (e.g., VS Code for simplicity, or Cursor as suggested in the plan for AI-assisted coding to speed up development in a time-constrained hackathon). All installations are via official channels like Homebrew (for Sui CLI) or npm (for SDKs). Assume you have basic prerequisites: Node.js (v18+), Rust (for Sui CLI), and Git installed. The timeline is compressed into steps with estimated hours, totaling ~48 workable hours starting July 28, 2025. Each step explains its importance to the objective and highlights relevance using the generated use case (Seamless Intent-Based Cross-Chain Swap dApp, where Alice swaps ETH for SUI via intents, with UI visualization for mass adoption).

#### Step 1: Research and Setup (Estimated: 0-4 Hours)
1. **Install Sui CLI and SDK Officially**:
   - Open your terminal and install Sui CLI via Homebrew (on macOS/Linux): `brew install sui`.
   - For Windows, download from https://docs.sui.io/guides/developer/getting-started/sui-install.
   - Verify installation: `sui --version` (should show latest, e.g., 1.x as of 2025).
   - Install the Sui TypeScript SDK: `npm install -g @mysten/sui` (global for CLI tools, but use locally in projects).

   **Importance**: This establishes the foundational toolchain for building and testing Sui smart contracts and dApps, ensuring compatibility with Sui's object model and fast finality—critical for the MVP's atomic swaps to demonstrate secure DeFi innovations without bridges, aligning with hackathon themes like cross-chain composability.
   
   **Relevance to Use Case**: Enables local testing of HTLC locks on Sui testnet, simulating Alice's fund lock phase where she sees "Locked on Sui: View Tx" in the UI, hiding complexities for intuitive user experience.

2. **Review Key Resources**:
   - Browse https://docs.sui.io/guides/developer/app-examples for official Move examples (e.g., time-locked coins via Clock object).
   - Read the 1inch Fusion+ whitepaper at https://1inch.io/assets/1inch-fusion-plus.pdf for intent-based mechanics (Dutch auctions, resolvers).
   - Get testnet funds: Use Sui testnet faucet at https://faucet.testnet.sui.io/ and Sepolia ETH faucet (e.g., https://sepoliafaucet.com/).

   **Importance**: Grounds the project in official documentation and specs, reducing risks like code errors in the 48-hour window and ensuring the MVP meets hackathon judging criteria for innovation (e.g., Sui-optimized partial fills).

   **Relevance to Use Case**: Prepares for mocking the 1inch API in Alice's intent signing, allowing simulation of resolver bids and atomicity, which visualizes progress bars in the UI for user-centric DeFi.

3. **Set Up GitHub Repo**:
   - Create a new repo on GitHub (e.g., "sui-fusion-plus-mvp").
   - Initialize locally: `git init`, add a README.md with project overview, and commit: `git add . && git commit -m "Initial setup"`.
   - Structure folders: `/contracts` (for Move package), `/scripts` (Node.js integration), `/ui` (React app), `/docs`.

   **Importance**: Organizes the deliverable for easy submission to ETHGlobal, including tx proofs and video, to showcase a complete prototype that positions for prizes via usable demos.

   **Relevance to Use Case**: Sets the stage for documenting Alice's flow (intent to claim/refund), emphasizing UI simplicity for mass adoption like Overflow winners.

#### Step 2: Core Contract Development (Estimated: 4-12 Hours)
1. **Create Sui Move Package**:
   - In your editor, navigate to `/contracts` and run: `sui move new htlc-escrow`.
   - Edit `Move.toml` to include dependencies: `[dependencies] Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }`.

   **Importance**: Builds the Sui-side HTLC escrow using Move's secure primitives, enabling atomicity for Fusion+ extensions—key to the objective of innovative DeFi without bridges, reducing risks like hacks in testnet-only MVP.

   **Relevance to Use Case**: Forms the backbone for Alice's swap lock, where funds are escrowed with hash/timelock, allowing UI to display status updates like "Funds Locked" for seamless simulation.

2. **Implement HTLC Escrow Contract**:
   - In `sources/escrow.move`, copy and adapt this code snippet (based on official Sui Clock for timelocks and public HTLC patterns; no third-party installs needed):
     ```move
     module htlc_escrow::escrow {
         use sui::coin::{Self, Coin};
         use sui::object::{Self, UID};
         use sui::tx_context::{Self, TxContext};
         use sui::clock::{Self, Clock};
         use sui::event;
         use sui::hash;

         // Struct for Escrow (adapted from official locked coin examples)
         public struct Escrow<phantom T> has key, store {
             id: UID,
             initiator: address,
             redeemer: address,
             secret_hash: vector<u8>,
             amount: u64,
             coin: Coin<T>,
             timelock: u64,  // Timestamp for refund
         }

         // Events
         public struct Initiated has copy, drop { order_id: vector<u8>, secret_hash: vector<u8>, amount: u64 }
         public struct Redeemed has copy, drop { order_id: vector<u8>, secret: vector<u8> }
         public struct Refunded has copy, drop { order_id: vector<u8> }

         // Deposit function (lock funds)
         public fun deposit<T>(
             initiator: address,
             redeemer: address,
             secret_hash: vector<u8>,
             coin: Coin<T>,
             timelock: u64,
             clock: &Clock,
             ctx: &mut TxContext
         ): Escrow<T> {
             let escrow = Escrow {
                 id: object::new(ctx),
                 initiator,
                 redeemer,
                 secret_hash,
                 amount: coin::value(&coin),
                 coin,
                 timelock,
             };
             event::emit(Initiated { order_id: object::id_bytes(&escrow.id), secret_hash, amount: escrow.amount });
             escrow
         }

         // Withdraw (claim with secret)
         public fun withdraw<T>(
             escrow: &mut Escrow<T>,
             secret: vector<u8>,
             ctx: &mut TxContext
         ) {
             assert!(hash::blake2b256(&secret) == escrow.secret_hash, 1000);  // Hash check
             assert!(tx_context::sender(ctx) == escrow.redeemer, 1001);  // Redeemer only
             let coin = coin::take(&mut escrow.coin, escrow.amount, ctx);
             event::emit(Redeemed { order_id: object::id_bytes(&escrow.id), secret });
             coin::transfer(coin, tx_context::sender(ctx));
         }

         // Refund (after timelock)
         public fun refund<T>(
             escrow: &mut Escrow<T>,
             clock: &Clock,
             ctx: &mut TxContext
         ) {
             assert!(clock::timestamp_ms(clock) > escrow.timelock, 1002);  // Time check
             assert!(tx_context::sender(ctx) == escrow.initiator, 1003);  // Initiator only
             let coin = coin::take(&mut escrow.coin, escrow.amount, ctx);
             event::emit(Refunded { order_id: object::id_bytes(&escrow.id) });
             coin::transfer(coin, tx_context::sender(ctx));
         }
     }
     ```
   - Customize as needed (e.g., add Fusion+ auction params as structs).

   **Importance**: Implements secure escrow with hash/time locks, optimized for Sui objects (e.g., partial fills), meeting 80% MVP requirements for testnet safety and innovation.

   **Relevance to Use Case**: Allows simulating Alice's "Claim" button on secret reveal or "Auto-Refund" on timeout, with tx links in UI for visual onchain activity like SWION winners.

3. **Test Contract Locally**:
   - Run `sui move test` in the package directory.
   - Fix bugs using editor features (e.g., AI in Cursor if using).

   **Importance**: Ensures contract reliability before deployment, saving time for UI polish—crucial for demo quality in hackathons.

   **Relevance to Use Case**: Verifies edges like successful swaps/refunds, enabling realistic Alice simulations with progress trackers.

#### Step 3: Integration and Testing (Estimated: 12-20 Hours)
1. **Deploy to Testnet**:
   - Publish: `sui client publish --gas-budget 100000000` (use testnet env: `sui client switch --env testnet`).

   **Importance**: Moves from local to onchain, providing real tx hashes for proofs in submission, enhancing credibility for prizes.

   **Relevance to Use Case**: Deploys HTLC for Alice's bidirectional swap, integrating mocked ETH side for end-to-end simulation.

2. **Write Integration Scripts**:
   - In `/scripts`, create `swap.js` using Node.js:
     - Install deps: `npm init -y && npm install @mysten/sui ethers`.
     - Script to mock 1inch API, initiate lock, reveal secret (use ethers.js for ETH mock on Sepolia).

   **Importance**: Automates flows for bidirectional swaps, meeting core MVP for secure testnet interactions.

   **Relevance to Use Case**: Scripts simulate Alice's intent-to-claim flow, including resolver bids, for UI integration.

3. **Test Edges**:
   - Run scripts for success/refund; log tx hashes.

   **Importance**: Covers risks like timeouts, ensuring robust prototype.

   **Relevance to Use Case**: Tests partial fills if added, improving UX for Alice's split swaps.

#### Step 4: Stretch Features and UI Development (Estimated: 20-28 Hours)
1. **Add Stretch Features**:
   - Update contract for partial fills (e.g., split Coin in withdraw).

   **Importance**: Adds novelty (Sui optimizations), boosting innovation scores.

   **Relevance to Use Case**: Enables better rates in Alice's swap, visualized in UI forms.

2. **Build React UI**:
   - In `/ui`: `npx create-react-app . && npm install @mysten/dapp-kit`.
   - Implement components: Wallet connect (WalletKit), swap form, status trackers (use dApp Kit modals).
   - Run `npm start` for local demo.

   **Importance**: Creates polished UI for mass adoption, key to hackathon wins like RaidenX's trading interfaces.

   **Relevance to Use Case**: Simulates Alice's full flow—connect wallet, sign intent, view progress, claim—with animations for professional look.

#### Step 5: Demo and Polish (Estimated: 28-36 Hours)
1. **Record Video**:
   - Use built-in screen recorder or free tool like QuickTime (avoid third-party if possible; plan suggests OBS but skip if avoiding).
   - Demo UI: Alice's swap from intent to claim.

   **Importance**: Provides 5-7 min walkthrough for submission, highlighting use case novelty.

   **Relevance to Use Case**: Shows intuitive buttons hiding HTLCs, mirroring Overflow for dynamic experiences.

2. **Write Docs**:
   - Update README with setup, use case, tx proofs.

   **Importance**: Explains onchain proofs, aiding judges' evaluation.

   **Relevance to Use Case**: Details simulation aspects like testnet faucets for realistic demos.

#### Step 6: Debug and Optimize (Estimated: 36-44 Hours)
1. **Fix Bugs**:
   - Test UI disconnects, optimize gas in contract.

   **Importance**: Ensures smooth demo, meeting 80% requirements.

   **Relevance to Use Case**: Polishes real-time updates for Alice's status.

#### Step 7: Submission Prep (Estimated: 44-48 Hours)
1. **Finalize and Submit**:
   - Commit all; add video link.
   - Submit to ETHGlobal with README pitch.

   **Importance**: Completes deliverable for deadline, positioning for top prizes via UI innovation.

   **Relevance to Use Case**: Highlights cross-chain DeFi with simple UI, tailored to Sui ideas for mass adoption.