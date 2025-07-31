import React, { memo, useState } from 'react';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { Wallet, LogOut, Copy, ExternalLink, AlertCircle, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import WalletDiagnostics from './WalletDiagnostics';

const WalletConnection = memo(() => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [connectionError, setConnectionError] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleCopyAddress = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      toast.success('Address copied to clipboard!');
    }
  };

  const handleViewExplorer = () => {
    if (currentAccount?.address) {
      window.open(`https://suiscan.xyz/testnet/account/${currentAccount.address}`, '_blank');
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const checkWalletAvailability = () => {
    const hasWallet = window.suiWallet || window.sui || window.martian || window.ethos;
    if (!hasWallet) {
      setConnectionError('No Sui wallet detected. Please install a Sui-compatible wallet.');
      toast.error('No Sui wallet detected. Please install Sui Wallet, Suiet, or Martian Wallet.');
      return false;
    }
    setConnectionError(null);
    return true;
  };

  if (!currentAccount) {
    return (
      <div className="wallet-connection">
        <ConnectButton
          connectText="Connect Wallet"
          className="connect-button"
          onConnectError={(error) => {
            console.error('Connection error:', error);
            setConnectionError(error.message || 'Failed to connect wallet');
            toast.error(error.message || 'Failed to connect wallet');
          }}
          onClick={() => {
            checkWalletAvailability();
          }}
        />
        {connectionError && (
          <div className="connection-error">
            <AlertCircle size={16} />
            <span>{connectionError}</span>
            <button 
              className="troubleshoot-button"
              onClick={() => setShowDiagnostics(true)}
            >
              <Settings size={14} />
              Troubleshoot
            </button>
          </div>
        )}
        {showDiagnostics && (
          <WalletDiagnostics onClose={() => setShowDiagnostics(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="wallet-connection connected">
      <div className="wallet-info">
        <div className="wallet-icon">
          <Wallet size={16} />
        </div>
        <span className="wallet-address">
          {formatAddress(currentAccount.address)}
        </span>
      </div>
      
      <div className="wallet-actions">
        <button
          className="action-button"
          onClick={handleCopyAddress}
          title="Copy address"
        >
          <Copy size={14} />
        </button>
        
        <button
          className="action-button"
          onClick={handleViewExplorer}
          title="View in explorer"
        >
          <ExternalLink size={14} />
        </button>
        
        <button
          className="action-button disconnect"
          onClick={() => disconnect()}
          title="Disconnect wallet"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
});

WalletConnection.displayName = 'WalletConnection';

export default WalletConnection; 