import React, { memo } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  TrendingUp, 
  Zap, 
  Clock,
  ArrowRight,
  Share
} from 'lucide-react';
import toast from 'react-hot-toast';

const TransactionModal = memo(({ 
  isOpen, 
  onClose, 
  txHash, 
  orderId, 
  escrowId, 
  fromToken, 
  toToken, 
  metrics,
  onNewSwap 
}) => {
  if (!isOpen) return null;

  const handleCopyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      toast.success('Transaction hash copied!');
    }
  };

  const handleCopyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      toast.success('Order ID copied!');
    }
  };

  const handleViewOnExplorer = () => {
    if (txHash) {
      window.open(`https://suiscan.xyz/testnet/tx/${txHash}`, '_blank');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Sui Fusion+ Swap Completed!',
      text: `Just completed a cross-chain swap: ${fromToken.amount} ${fromToken.symbol} → ${toToken.symbol} using Sui Fusion+`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleString();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="transaction-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="success-indicator">
            <CheckCircle className="success-icon" size={24} />
            <div className="success-content">
              <h2>Swap Completed!</h2>
              <p>Your cross-chain swap was successful</p>
            </div>
          </div>
          
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Swap Summary */}
        <div className="swap-summary">
          <div className="summary-header">
            <h3>Swap Summary</h3>
            <span className="timestamp">{formatTime()}</span>
          </div>
          
          <div className="swap-flow">
            <div className="token-info from">
              <div className="token-amount">{fromToken.amount}</div>
              <div className="token-symbol">{fromToken.symbol}</div>
              <div className="token-name">{fromToken.name}</div>
            </div>
            
            <div className="swap-arrow">
              <ArrowRight size={20} />
            </div>
            
            <div className="token-info to">
              <div className="token-amount">
                {toToken.receivedAmount || 'Calculating...'}
              </div>
              <div className="token-symbol">{toToken.symbol}</div>
              <div className="token-name">{toToken.name}</div>
            </div>
          </div>
        </div>

        {/* Fusion+ Metrics */}
        <div className="fusion-results">
          <h3>Fusion+ Optimization Results</h3>
          
          <div className="results-grid">
            <div className="result-item">
              <div className="result-icon">
                <TrendingUp size={16} />
              </div>
              <div className="result-content">
                <div className="result-label">Best Rate Achieved</div>
                <div className="result-value">
                  {metrics.actualRate || 'Market Rate'} {fromToken.symbol}/{toToken.symbol}
                </div>
              </div>
            </div>
            
            <div className="result-item">
              <div className="result-icon">
                <Zap size={16} />
              </div>
              <div className="result-content">
                <div className="result-label">Gas Optimization</div>
                <div className="result-value">
                  {metrics.gasSaved ? `${metrics.gasSaved}% Saved` : 'Optimized'}
                </div>
              </div>
            </div>
            
            <div className="result-item">
              <div className="result-icon">
                <Clock size={16} />
              </div>
              <div className="result-content">
                <div className="result-label">Execution Time</div>
                <div className="result-value">
                  {metrics.executionTime || 'Real-time'}
                </div>
              </div>
            </div>
            
            <div className="result-item">
              <div className="result-icon">
                <CheckCircle size={16} />
              </div>
              <div className="result-content">
                <div className="result-label">Security</div>
                <div className="result-value">
                  {metrics.realFusion ? 'Real 1inch' : 'Bridge-less'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="transaction-details">
          <h3>Transaction Details</h3>
          
          <div className="detail-rows">
            {txHash && (
              <div className="detail-row">
                <span className="detail-label">Transaction Hash:</span>
                <div className="detail-value-container">
                  <code className="detail-value">{txHash.substring(0, 20)}...</code>
                  <div className="detail-actions">
                    <button 
                      className="detail-action-btn"
                      onClick={handleCopyTxHash}
                      title="Copy transaction hash"
                    >
                      <Copy size={14} />
                    </button>
                    <button 
                      className="detail-action-btn"
                      onClick={handleViewOnExplorer}
                      title="View on explorer"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {orderId && (
              <div className="detail-row">
                <span className="detail-label">Order ID:</span>
                <div className="detail-value-container">
                  <code className="detail-value">{orderId}</code>
                  <div className="detail-actions">
                    <button 
                      className="detail-action-btn"
                      onClick={handleCopyOrderId}
                      title="Copy order ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {escrowId && (
              <div className="detail-row">
                <span className="detail-label">Escrow ID:</span>
                <div className="detail-value-container">
                  <code className="detail-value">{escrowId}</code>
                  <div className="detail-actions">
                    <button 
                      className="detail-action-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(escrowId);
                        toast.success('Escrow ID copied!');
                      }}
                      title="Copy escrow ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value">Sui Testnet</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Protocol:</span>
              <span className="detail-value">Fusion+ HTLC</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Total Bids:</span>
              <span className="detail-value">
                {metrics.bidsReceived || (metrics.realFusion ? 'Live Bidding' : 'Demo')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <button className="action-button secondary" onClick={handleShare}>
            <Share size={16} />
            Share Success
          </button>
          
          <button className="action-button secondary" onClick={handleViewOnExplorer}>
            <ExternalLink size={16} />
            View Transaction
          </button>
          
          <button className="action-button primary" onClick={onNewSwap}>
            <Zap size={16} />
            New Swap
          </button>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-note">
            <CheckCircle size={14} />
            <span>Swap completed successfully with atomic guarantees</span>
          </div>
        </div>
      </div>
    </div>
  );
});

TransactionModal.displayName = 'TransactionModal';

export default TransactionModal; 