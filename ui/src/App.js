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

// Hooks and Services
import { useRealSwap } from './hooks/useRealSwap';
import apiService from './services/apiService';

// Network configuration
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Query client for React Query
const queryClient = new QueryClient();

function App() {
  const { 
    isLoading,
    error,
    executeSwap,
    resetSwap
  } = useRealSwap();
  
  const [selectedTokens, setSelectedTokens] = useState({
    from: { symbol: 'SUI', amount: '', balance: '0' },
    to: { symbol: 'ETH', amount: '', balance: '0' }
  });

  // Local swap state for UI management
  const [swapState, setSwapState] = useState({
    isSwapping: false,
    currentStep: 0,
    error: null,
    txHash: null,
    orderId: null,
    escrowId: null,
    actualOutput: null,
    metrics: null,
    realFusion: false
  });

  // Fusion metrics for display
  const [fusionMetrics, setFusionMetrics] = useState({
    bidsReceived: 0,
    bestRate: null,
    partialFills: 0,
    gasSaved: 0
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [backendStatus, setBackendStatus] = useState({
    connected: false,
    contract: { deployed: false },
    loading: true
  });

  // Check backend status on mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const status = await apiService.testConnection();
        setBackendStatus({ ...status, loading: false });
      } catch (error) {
        setBackendStatus({ 
          connected: false, 
          contract: { deployed: false },
          loading: false,
          error: error.message 
        });
      }
    };

    checkBackendStatus();
    // Re-check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Memoized swap steps for performance
  const swapSteps = useMemo(() => [
    { id: 1, title: 'Create Intent', description: 'Setting up Fusion+ order with auction parameters' },
    { id: 2, title: 'Bidding Phase', description: 'Resolvers competing for best rates' },
    { id: 3, title: 'HTLC Lock', description: 'Creating atomic swap escrow on Sui' },
    { id: 4, title: 'Execution', description: 'Processing partial fills and settlements' },
    { id: 5, title: 'Complete', description: 'Swap completed successfully!' }
  ], []);

  // Handle token selection with debouncing
  const handleTokenChange = useCallback((field, value) => {
    setSelectedTokens(prev => ({
      ...prev,
      [field]: { ...prev[field], ...value }
    }));
  }, []);

  // Start real swap process
  const initiateSwap = useCallback(async () => {
    setSwapState(prev => ({ ...prev, isSwapping: true, error: null, currentStep: 1 }));
    
    try {
      // Build swap parameters
      const swapParams = {
        direction: `${selectedTokens.from.symbol}->${selectedTokens.to.symbol}`,
        fromToken: selectedTokens.from.symbol,
        toToken: selectedTokens.to.symbol,
        amount: parseFloat(selectedTokens.from.amount),
        fromAddress: null, // Will be determined by wallet
        toAddress: null, // Will be determined by wallet
        allowPartialFills: true
      };

      const result = await executeSwap(swapParams);
      
      if (result) {
        // Update swap state with real metrics from the result
        setSwapState(prev => ({
          ...prev,
          isSwapping: false,
          currentStep: 5,
          txHash: result.transactions?.escrowCreation || result.txHash,
          orderId: result.orderId,
          escrowId: result.escrowId,
          actualOutput: result.amounts?.output,
          metrics: result.metrics, // Real metrics from 1inch integration
          realFusion: result.metrics?.realFusion || false
        }));
        
        // Update fusion metrics for display
        if (result.metrics) {
          setFusionMetrics(prev => ({
            ...prev,
            bidsReceived: result.metrics.bidsReceived || 0,
            bestRate: result.metrics.actualRate,
            gasSaved: result.metrics.gasSaved || 0
          }));
        }
      }
    } catch (error) {
      setSwapState(prev => ({
        ...prev,
        isSwapping: false,
        error: error.message,
        currentStep: 0
      }));
      console.error('Swap initiation failed:', error);
    }
  }, [selectedTokens, executeSwap]);

  // Handle successful swap completion
  useEffect(() => {
    if (swapState.currentStep === 5 && !swapState.isSwapping) {
      setShowTxModal(true);
    }
  }, [swapState.currentStep, swapState.isSwapping]);

  // Sync loading states with the hook
  useEffect(() => {
    setSwapState(prev => ({
      ...prev,
      isSwapping: isLoading,
      error: error
    }));
  }, [isLoading, error]);

  // Reset function that clears both hook and local state
  const handleResetSwap = useCallback(() => {
    resetSwap();
    setSwapState({
      isSwapping: false,
      currentStep: 0,
      error: null,
      txHash: null,
      orderId: null,
      escrowId: null,
      actualOutput: null,
      metrics: null,
      realFusion: false
    });
    setFusionMetrics({
      bidsReceived: 0,
      bestRate: null,
      partialFills: 0,
      gasSaved: 0
    });
  }, [resetSwap]);

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
                  <div className="backend-status">
                    {backendStatus.loading ? (
                      <span className="status-indicator loading">🔄 Connecting...</span>
                    ) : backendStatus.connected ? (
                      <span className="status-indicator connected">
                        🟢 Backend Connected
                        {!backendStatus.contract.deployed && (
                          <span className="contract-warning">⚠️ Contract not deployed</span>
                        )}
                      </span>
                    ) : (
                      <span className="status-indicator disconnected">🔴 Backend Disconnected</span>
                    )}
                  </div>
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
              toToken={{
                ...selectedTokens.to,
                receivedAmount: swapState.actualOutput || selectedTokens.to.amount
              }}
              metrics={{
                ...fusionMetrics,
                ...swapState.metrics, // Include real metrics from swap result
                realFusion: swapState.realFusion || false
              }}
              onNewSwap={() => {
                setShowTxModal(false);
                handleResetSwap();
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
