import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';

// Components
import WalletConnection from './components/WalletConnection';
import SwapInterface from './components/SwapInterface';
import TransactionModal from './components/TransactionModal';
import StatusTracker from './components/StatusTracker';

// Network configuration
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Query client for React Query
const queryClient = new QueryClient();

function App() {
  const [swapState, setSwapState] = useState({
    currentStep: 0,
    txHash: null,
    orderId: null,
    escrowId: null,
    isSwapping: false,
    error: null
  });

  const [selectedTokens, setSelectedTokens] = useState({
    from: { symbol: 'SUI', amount: '', balance: '0' },
    to: { symbol: 'ETH', amount: '', balance: '0' }
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [fusionMetrics, setFusionMetrics] = useState({
    bidsReceived: 0,
    partialFills: 0,
    gasSaved: 0,
    bestRate: null
  });

  // Memoized swap steps for performance
  const swapSteps = useMemo(() => [
    { id: 1, title: 'Create Intent', description: 'Setting up Fusion+ order with auction parameters' },
    { id: 2, title: 'Bidding Phase', description: 'Resolvers competing for best rates' },
    { id: 3, title: 'HTLC Lock', description: 'Creating atomic swap escrow on Sui' },
    { id: 4, title: 'Execution', description: 'Processing partial fills and settlements' },
    { id: 5, title: 'Complete', description: 'Swap completed successfully!' }
  ], []);

  // Update swap progress
  const updateSwapProgress = useCallback((step, data = {}) => {
    setSwapState(prev => ({
      ...prev,
      currentStep: step,
      ...data
    }));
  }, []);

  // Handle token selection with debouncing
  const handleTokenChange = useCallback((field, value) => {
    setSelectedTokens(prev => ({
      ...prev,
      [field]: { ...prev[field], ...value }
    }));
  }, []);

  // Start swap process
  const initiateSwap = useCallback(async () => {
    if (!selectedTokens.from.amount || parseFloat(selectedTokens.from.amount) <= 0) {
      setSwapState(prev => ({ ...prev, error: 'Please enter a valid amount' }));
      return;
    }

    setSwapState(prev => ({ ...prev, isSwapping: true, error: null, currentStep: 1 }));
    
    try {
      // Step 1: Create Intent Order
      updateSwapProgress(1);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      const orderId = 'order_' + Math.random().toString(36).substr(2, 9);
      updateSwapProgress(2, { orderId });

      // Step 2: Bidding Phase
      setFusionMetrics(prev => ({ ...prev, bidsReceived: 0 }));
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setFusionMetrics(prev => ({ 
          ...prev, 
          bidsReceived: i,
          bestRate: (1.42 - i * 0.02).toFixed(4)
        }));
      }

      // Step 3: HTLC Creation
      updateSwapProgress(3);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const escrowId = 'escrow_' + Math.random().toString(36).substr(2, 9);
      const txHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      updateSwapProgress(4, { escrowId, txHash });

      // Step 4: Partial Fills
      setFusionMetrics(prev => ({ ...prev, partialFills: 0, gasSaved: 0 }));
      for (let i = 1; i <= 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setFusionMetrics(prev => ({ 
          ...prev, 
          partialFills: i,
          gasSaved: i * 20
        }));
      }

      // Step 5: Complete
      updateSwapProgress(5);
      setSwapState(prev => ({ ...prev, isSwapping: false }));
      setShowTxModal(true);

    } catch (error) {
      setSwapState(prev => ({ 
        ...prev, 
        isSwapping: false, 
        error: error.message,
        currentStep: 0
      }));
    }
  }, [selectedTokens.from.amount, updateSwapProgress]);

  // Reset swap state
  const resetSwap = useCallback(() => {
    setSwapState({
      currentStep: 0,
      txHash: null,
      orderId: null,
      escrowId: null,
      isSwapping: false,
      error: null
    });
    setFusionMetrics({
      bidsReceived: 0,
      partialFills: 0,
      gasSaved: 0,
      bestRate: null
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider 
          autoConnect
          onError={(error) => {
            console.error('Wallet connection error:', error);
          }}
        >
          <div className="App">
            {/* Header */}
            <header className="app-header">
              <div className="header-content">
                <div className="logo-section">
                  <h1>Sui Fusion+</h1>
                  <span className="beta-badge">Beta</span>
                </div>
                <WalletConnection />
              </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
              <div className="swap-container">
                <div className="swap-card">
                  <div className="card-header">
                    <h2>Cross-Chain Intent Swap</h2>
                    <p>Bridge-less atomic swaps with Fusion+ optimization</p>
                  </div>

                  {/* Swap Interface */}
                  <SwapInterface
                    selectedTokens={selectedTokens}
                    onTokenChange={handleTokenChange}
                    onSwap={initiateSwap}
                    isSwapping={swapState.isSwapping}
                    error={swapState.error}
                    disabled={swapState.isSwapping}
                  />

                  {/* Status Tracker */}
                  {(swapState.currentStep > 0 || swapState.isSwapping) && (
                    <StatusTracker
                      steps={swapSteps}
                      currentStep={swapState.currentStep}
                      isActive={swapState.isSwapping}
                      metrics={fusionMetrics}
                      orderId={swapState.orderId}
                      escrowId={swapState.escrowId}
                    />
                  )}

                  {/* Fusion+ Features Display */}
                  {swapState.currentStep >= 2 && (
                    <div className="fusion-metrics">
                      <h3>Fusion+ Optimization</h3>
                      <div className="metrics-grid">
                        <div className="metric-item">
                          <span className="metric-label">Bids Received</span>
                          <span className="metric-value">{fusionMetrics.bidsReceived}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Best Rate</span>
                          <span className="metric-value">{fusionMetrics.bestRate || 'N/A'}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Partial Fills</span>
                          <span className="metric-value">{fusionMetrics.partialFills}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Gas Saved</span>
                          <span className="metric-value">{fusionMetrics.gasSaved}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature Highlights */}
                <div className="features-section">
                  <div className="feature-card">
                    <h3>🎯 Intent-Based Trading</h3>
                    <p>Express your intent, let resolvers compete for the best execution</p>
                  </div>
                  <div className="feature-card">
                    <h3>⚡ Sui Optimizations</h3>
                    <p>Partial fills and atomic swaps leveraging Sui's object model</p>
                  </div>
                  <div className="feature-card">
                    <h3>🔐 Bridge-less Security</h3>
                    <p>HTLC-powered atomic swaps without centralized bridges</p>
                  </div>
                </div>
              </div>
            </main>

            {/* Transaction Success Modal */}
            <TransactionModal
              isOpen={showTxModal}
              onClose={() => setShowTxModal(false)}
              txHash={swapState.txHash}
              orderId={swapState.orderId}
              escrowId={swapState.escrowId}
              fromToken={selectedTokens.from}
              toToken={selectedTokens.to}
              metrics={fusionMetrics}
              onNewSwap={() => {
                setShowTxModal(false);
                resetSwap();
              }}
            />

            {/* Toast Notifications */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1a1a',
                  color: '#ffffff',
                  border: '1px solid #333',
                },
              }}
            />
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
