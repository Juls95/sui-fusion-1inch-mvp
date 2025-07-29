import React, { useState } from 'react';
import { WalletKitProvider, ConnectButton, useWalletKit } from '@mysten/dapp-kit';
import './App.css';

// Swap Form Component
function SwapForm({ onSwap }) {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('SUI');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSwap = async () => {
    if (!amount || amount <= 0) return;
    
    setIsLoading(true);
    try {
      await onSwap({
        fromToken,
        toToken,
        amount: parseFloat(amount),
      });
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="swap-form">
      <h2>Cross-Chain Swap</h2>
      <div className="form-group">
        <label>From:</label>
        <div className="token-input">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={isLoading}
          />
          <select
            value={fromToken}
            onChange={(e) => setFromToken(e.target.value)}
            disabled={isLoading}
          >
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
      </div>
      
      <div className="swap-arrow">↓</div>
      
      <div className="form-group">
        <label>To:</label>
        <div className="token-input">
          <input
            type="number"
            value={amount ? (amount * 1.5).toFixed(2) : ''}
            placeholder="0.0"
            disabled
          />
          <select
            value={toToken}
            onChange={(e) => setToToken(e.target.value)}
            disabled={isLoading}
          >
            <option value="SUI">SUI</option>
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
      </div>
      
      <button
        className="swap-button"
        onClick={handleSwap}
        disabled={!amount || isLoading}
      >
        {isLoading ? 'Processing...' : 'Swap'}
      </button>
    </div>
  );
}

// Status Tracker Component
function StatusTracker({ swapStatus }) {
  const steps = [
    { id: 'intent', label: 'Create Intent', status: swapStatus.intent },
    { id: 'escrow', label: 'Lock Funds', status: swapStatus.escrow },
    { id: 'swap', label: 'Execute Swap', status: swapStatus.swap },
    { id: 'claim', label: 'Claim Funds', status: swapStatus.claim },
  ];

  return (
    <div className="status-tracker">
      <h3>Swap Progress</h3>
      <div className="steps">
        {steps.map((step, index) => (
          <div key={step.id} className={`step ${step.status}`}>
            <div className="step-number">{index + 1}</div>
            <div className="step-label">{step.label}</div>
            <div className="step-status">
              {step.status === 'completed' && '✅'}
              {step.status === 'pending' && '⏳'}
              {step.status === 'error' && '❌'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Transaction History Component
function TransactionHistory({ transactions }) {
  return (
    <div className="transaction-history">
      <h3>Recent Transactions</h3>
      <div className="transactions">
        {transactions.map((tx, index) => (
          <div key={index} className="transaction">
            <div className="tx-type">{tx.type}</div>
            <div className="tx-hash">{tx.hash}</div>
            <div className="tx-status">{tx.status}</div>
            <div className="tx-time">{tx.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App Component
function AppContent() {
  const { currentAccount } = useWalletKit();
  const [swapStatus, setSwapStatus] = useState({
    intent: 'pending',
    escrow: 'pending',
    swap: 'pending',
    claim: 'pending',
  });
  const [transactions, setTransactions] = useState([]);

  const handleSwap = async (swapDetails) => {
    // Simulate the swap process
    console.log('Starting swap:', swapDetails);
    
    // Step 1: Create Intent
    setSwapStatus(prev => ({ ...prev, intent: 'pending' }));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSwapStatus(prev => ({ ...prev, intent: 'completed' }));
    
    // Add transaction
    setTransactions(prev => [...prev, {
      type: 'Intent Created',
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      status: 'Success',
      time: new Date().toLocaleTimeString(),
    }]);
    
    // Step 2: Lock Funds
    setSwapStatus(prev => ({ ...prev, escrow: 'pending' }));
    await new Promise(resolve => setTimeout(resolve, 3000));
    setSwapStatus(prev => ({ ...prev, escrow: 'completed' }));
    
    setTransactions(prev => [...prev, {
      type: 'HTLC Escrow',
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      status: 'Success',
      time: new Date().toLocaleTimeString(),
    }]);
    
    // Step 3: Execute Swap
    setSwapStatus(prev => ({ ...prev, swap: 'pending' }));
    await new Promise(resolve => setTimeout(resolve, 2500));
    setSwapStatus(prev => ({ ...prev, swap: 'completed' }));
    
    setTransactions(prev => [...prev, {
      type: 'Cross-Chain Swap',
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      status: 'Success',
      time: new Date().toLocaleTimeString(),
    }]);
    
    // Step 4: Claim Funds
    setSwapStatus(prev => ({ ...prev, claim: 'pending' }));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSwapStatus(prev => ({ ...prev, claim: 'completed' }));
    
    setTransactions(prev => [...prev, {
      type: 'Funds Claimed',
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      status: 'Success',
      time: new Date().toLocaleTimeString(),
    }]);
    
    console.log('Swap completed successfully!');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Sui Fusion+ Extension</h1>
        <p>Cross-Chain Atomic Swaps without Bridges</p>
        <ConnectButton />
      </header>
      
      <main className="App-main">
        {currentAccount ? (
          <div className="dashboard">
            <div className="dashboard-left">
              <SwapForm onSwap={handleSwap} />
            </div>
            <div className="dashboard-right">
              <StatusTracker swapStatus={swapStatus} />
              <TransactionHistory transactions={transactions} />
            </div>
          </div>
        ) : (
          <div className="connect-prompt">
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to start swapping across chains</p>
            <ConnectButton />
          </div>
        )}
      </main>
      
      <footer className="App-footer">
        <p>Powered by Sui + 1inch Fusion+ | No Bridges Required</p>
      </footer>
    </div>
  );
}

// App wrapper with WalletKit provider
function App() {
  return (
    <WalletKitProvider>
      <AppContent />
    </WalletKitProvider>
  );
}

export default App;
