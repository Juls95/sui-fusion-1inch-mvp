import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { ArrowDown, Settings, RefreshCw, Zap, TrendingUp } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import toast from 'react-hot-toast';

// Base token definitions
const BASE_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', icon: '🟦', balance: '2.45' },
  { symbol: 'SUI', name: 'Sui', icon: '🔵', balance: '0.00' },
  { symbol: 'USDC', name: 'USD Coin', icon: '💵', balance: '150.30' },
  { symbol: 'USDT', name: 'Tether', icon: '💰', balance: '75.20' }
];

const SwapInterface = memo(({ 
  selectedTokens, 
  onTokenChange, 
  onSwap, 
  isSwapping, 
  error, 
  disabled 
}) => {
  const currentAccount = useCurrentAccount();
  const [slippage, setSlippage] = useState('0.5');
  const [partialFills, setPartialFills] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [tokens, setTokens] = useState(BASE_TOKENS);
  const [balanceToastShown, setBalanceToastShown] = useState(false);

  // Fetch SUI balance
  const { data: suiBalance, isLoading: balanceLoading, refetch: refetchBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: currentAccount?.address,
      coinType: '0x2::sui::SUI',
    },
    {
      enabled: !!currentAccount?.address,
      refetchInterval: 10000, // Refetch every 10 seconds
      retry: 3,
      onError: (error) => {
        console.error('Balance fetch error:', error);
        toast.error('Failed to fetch SUI balance');
      }
    }
  );

  // Update tokens with real SUI balance
  useEffect(() => {
    if (suiBalance) {
      const balanceInSui = (parseInt(suiBalance.totalBalance) / 1_000_000_000).toFixed(4);
      const updatedTokens = BASE_TOKENS.map(token => 
        token.symbol === 'SUI' 
          ? { ...token, balance: balanceInSui }
          : token
      );
      setTokens(updatedTokens);
      
      // Update the selected tokens if SUI is currently selected
      if (selectedTokens.from.symbol === 'SUI') {
        onTokenChange('from', { balance: balanceInSui });
      }
      if (selectedTokens.to.symbol === 'SUI') {
        onTokenChange('to', { balance: balanceInSui });
      }
      
      // Show success toast when balance is first loaded
      if (parseFloat(balanceInSui) > 0 && !balanceToastShown) {
        toast.success(`SUI balance loaded: ${balanceInSui} SUI`);
        setBalanceToastShown(true);
      }
    }
  }, [suiBalance, selectedTokens.from.symbol, selectedTokens.to.symbol, onTokenChange, balanceToastShown]);

  // Reset toast flag when account changes
  useEffect(() => {
    setBalanceToastShown(false);
  }, [currentAccount?.address]);

  // Estimated output calculation using real 1inch quotes
  const [estimatedOutput, setEstimatedOutput] = useState('0.00');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // Add function to get real-time quote (moved before useEffect)
  const getRealTimeQuote = useCallback(async (fromToken, toToken, amount) => {
    if (!amount || amount <= 0) return null;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromToken: fromToken,
          toToken: toToken,
          amount: amount.toString()
        })
      });
      
      if (response.ok) {
        const quote = await response.json();
        return quote.estimatedOutput;
      }
    } catch (error) {
      console.error('Error fetching real-time quote:', error);
    }
    
    return null;
  }, []);

  // Fetch real-time quote when inputs change
  useEffect(() => {
    const fetchQuote = async () => {
      const inputAmount = parseFloat(selectedTokens.from.amount) || 0;
      if (inputAmount <= 0) {
        setEstimatedOutput('0.00');
        return;
      }

      setIsLoadingQuote(true);
      try {
        const quote = await getRealTimeQuote(
          selectedTokens.from.symbol,
          selectedTokens.to.symbol,
          inputAmount
        );
        
        if (quote) {
          setEstimatedOutput(quote);
        } else {
          setEstimatedOutput('Error');
        }
      } catch (error) {
        console.error('Quote fetch error:', error);
        setEstimatedOutput('Error');
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 500); // Debounce API calls
    return () => clearTimeout(debounceTimer);
  }, [selectedTokens.from.amount, selectedTokens.from.symbol, selectedTokens.to.symbol, getRealTimeQuote]);

  const handleAmountChange = useCallback(
    (value) => {
      // Allow numeric input with decimal point, prevent multiple decimals
      let numericValue = value.replace(/[^0-9.]/g, '');
      
      // Prevent multiple decimal points
      const decimalCount = (numericValue.match(/\./g) || []).length;
      if (decimalCount > 1) {
        numericValue = numericValue.substring(0, numericValue.lastIndexOf('.'));
      }
      
      // Update token amount
      onTokenChange('from', { amount: numericValue });
    },
    [onTokenChange]
  );

  const handleTokenSelect = useCallback(
    (field, token) => {
      onTokenChange(field, { 
        symbol: token.symbol, 
        name: token.name,
        balance: token.balance 
      });
    },
    [onTokenChange]
  );

  const handleSwapTokens = useCallback(() => {
    const fromToken = selectedTokens.from;
    const toToken = selectedTokens.to;
    
    onTokenChange('from', { 
      symbol: toToken.symbol, 
      name: toToken.name,
      balance: toToken.balance,
      amount: ''
    });
    onTokenChange('to', { 
      symbol: fromToken.symbol, 
      name: fromToken.name,
      balance: fromToken.balance
    });
    
    toast.success('Tokens swapped!');
  }, [selectedTokens, onTokenChange]);

  const handleMaxAmount = useCallback(() => {
    const maxAmount = selectedTokens.from.balance;
    onTokenChange('from', { amount: maxAmount });
    toast.success('Max amount selected');
  }, [selectedTokens.from.balance, onTokenChange]);

  const isValidAmount = useMemo(() => {
    const amount = parseFloat(selectedTokens.from.amount);
    const balance = parseFloat(selectedTokens.from.balance);
    return amount > 0 && amount <= balance;
  }, [selectedTokens.from.amount, selectedTokens.from.balance]);

  const TokenSelector = memo(({ field, token, onSelect, label }) => (
    <div className="token-selector">
      <label className="token-label">{label}</label>
      <div className="token-input-container">
        <div className="token-dropdown">
          <select
            value={token.symbol}
            onChange={(e) => {
              const selectedToken = tokens.find(t => t.symbol === e.target.value);
              onSelect(field, selectedToken);
            }}
            disabled={disabled}
            className="token-select"
          >
            {tokens.map(t => (
              <option key={t.symbol} value={t.symbol}>
                {t.icon} {t.symbol}
              </option>
            ))}
          </select>
        </div>
        
        {field === 'from' ? (
          <div className="amount-input-container">
            <input
              type="text"
              value={token.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              disabled={disabled}
              className="amount-input"
            />
            <button
              className="max-button"
              onClick={handleMaxAmount}
              disabled={disabled}
              type="button"
            >
              MAX
            </button>
          </div>
        ) : (
          <div className="amount-display">
            <span className="estimated-amount">
              {isLoadingQuote ? (
                <span className="loading-quote">
                  <div className="spinner-small"></div>
                  Loading...
                </span>
              ) : (
                estimatedOutput
              )}
            </span>
            <span className="estimated-label">
              {isLoadingQuote ? 'Getting quote...' : 'Estimated'}
            </span>
          </div>
        )}
      </div>
      
      <div className="token-balance">
        Balance: {balanceLoading && token.symbol === 'SUI' ? (
          <span className="balance-loading">Loading...</span>
        ) : (
          `${token.balance} ${token.symbol}`
        )}
        {token.symbol === 'SUI' && (
          <button 
            className="refresh-balance-btn"
            onClick={() => refetchBalance()}
            disabled={balanceLoading}
            title="Refresh balance"
          >
            <RefreshCw size={12} className={balanceLoading ? 'spin' : ''} />
          </button>
        )}
      </div>
    </div>
  ));

  if (!currentAccount) {
    return (
      <div className="swap-interface">
        <div className="connect-prompt">
          <div className="prompt-icon">🔗</div>
          <h3>Connect Your Wallet</h3>
          <p>Connect your wallet to start trading with SuniFi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swap-interface">
      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h4>Transaction Settings</h4>
            <button 
              className="close-settings"
              onClick={() => setShowSettings(false)}
            >
              ×
            </button>
          </div>
          
          <div className="setting-item">
            <label>Slippage Tolerance</label>
            <div className="slippage-options">
              {['0.1', '0.5', '1.0'].map(value => (
                <button
                  key={value}
                  className={`slippage-button ${slippage === value ? 'active' : ''}`}
                  onClick={() => setSlippage(value)}
                >
                  {value}%
                </button>
              ))}
              <input
                type="text"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="slippage-input"
                placeholder="Custom"
              />
            </div>
          </div>
          
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={partialFills}
                onChange={(e) => setPartialFills(e.target.checked)}
              />
              <span className="checkmark"></span>
              Enable Partial Fills
              <div className="setting-description">
                Allow your order to be filled in multiple transactions for better rates
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Main Swap Interface */}
      <div className="swap-inputs">
        <TokenSelector
          field="from"
          token={selectedTokens.from}
          onSelect={handleTokenSelect}
          label="From"
        />
        
        <div className="swap-arrow-container">
          <button
            className="swap-arrow-button"
            onClick={handleSwapTokens}
            disabled={disabled}
            type="button"
          >
            <ArrowDown size={20} />
          </button>
        </div>
        
        <TokenSelector
          field="to"
          token={selectedTokens.to}
          onSelect={handleTokenSelect}
          label="To"
        />
      </div>

      {/* SuniFi Features */}
      <div className="fusion-features">
        <div className="feature-item">
          <Zap className="feature-icon" size={16} />
          <span>Partial Fills {partialFills ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="feature-item">
          <TrendingUp className="feature-icon" size={16} />
          <span>Dutch Auction Pricing</span>
        </div>
        <div className="feature-item">
          <RefreshCw className="feature-icon" size={16} />
          <span>Auto-Resolver Selection</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="swap-actions">
        <button
          className="settings-button"
          onClick={() => setShowSettings(!showSettings)}
          disabled={disabled}
          type="button"
        >
          <Settings size={16} />
        </button>
        
        <button
          className={`swap-button ${isSwapping ? 'swapping' : ''}`}
          onClick={onSwap}
          disabled={disabled || !isValidAmount || !selectedTokens.from.amount}
          type="button"
        >
          {isSwapping ? (
            <>
              <RefreshCw className="spin" size={16} />
              Processing Swap...
            </>
          ) : (
            'Start SuniFi Swap'
          )}
        </button>
      </div>

      {/* Swap Details */}
      {selectedTokens.from.amount && (
        <div className="swap-details">
          <div className="detail-row">
            <span>Expected Output:</span>
            <span className="highlight">{estimatedOutput} {selectedTokens.to.symbol}</span>
          </div>
          <div className="detail-row">
            <span>Slippage Tolerance:</span>
            <span>{slippage}%</span>
          </div>
          <div className="detail-row">
            <span>Network Fee:</span>
            <span>~0.001 SUI</span>
          </div>
          <div className="detail-row">
            <span>Estimated Time:</span>
            <span>~2 minutes</span>
          </div>
        </div>
      )}
    </div>
  );
});

SwapInterface.displayName = 'SwapInterface';

export default SwapInterface; 