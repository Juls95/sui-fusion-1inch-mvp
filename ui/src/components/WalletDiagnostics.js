import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

const WalletDiagnostics = ({ onClose }) => {
  const [diagnostics, setDiagnostics] = useState({
    suiWallet: false,
    suietWallet: false,
    martianWallet: false,
    ethosWallet: false,
    browserSupported: false,
    httpsEnabled: false
  });

  const checkDiagnostics = () => {
    setDiagnostics({
      suiWallet: !!window.suiWallet,
      suietWallet: !!window.sui,
      martianWallet: !!window.martian,
      ethosWallet: !!window.ethos,
      browserSupported: !!window.crypto && !!window.crypto.subtle,
      httpsEnabled: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    });
  };

  useEffect(() => {
    checkDiagnostics();
  }, []);

  const walletLinks = {
    sui: 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
    suiet: 'https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd',
    martian: 'https://chrome.google.com/webstore/detail/martian-aptos-wallet/efbglgofoippbgcjepnhiblaibcnclgk'
  };

  const DiagnosticItem = ({ label, status, description, link }) => (
    <div className="diagnostic-item">
      <div className="diagnostic-status">
        {status ? (
          <CheckCircle size={16} className="status-success" />
        ) : (
          <AlertCircle size={16} className="status-error" />
        )}
        <span className={status ? 'status-success' : 'status-error'}>
          {label}
        </span>
      </div>
      <p className="diagnostic-description">{description}</p>
      {link && !status && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="diagnostic-link">
          Install <ExternalLink size={12} />
        </a>
      )}
    </div>
  );

  const hasAnyWallet = diagnostics.suiWallet || diagnostics.suietWallet || 
                       diagnostics.martianWallet || diagnostics.ethosWallet;

  return (
    <div className="diagnostics-overlay">
      <div className="diagnostics-modal">
        <div className="diagnostics-header">
          <h3>Wallet Connection Diagnostics</h3>
          <button 
            className="diagnostics-close" 
            onClick={onClose}
            aria-label="Close diagnostics"
          >
            ×
          </button>
        </div>

        <div className="diagnostics-content">
          <div className="diagnostics-summary">
            {hasAnyWallet ? (
              <div className="summary-success">
                <CheckCircle size={20} />
                <span>Wallet detected! Try connecting again.</span>
              </div>
            ) : (
              <div className="summary-error">
                <AlertCircle size={20} />
                <span>No Sui wallets detected. Install one of the wallets below.</span>
              </div>
            )}
          </div>

          <div className="diagnostics-list">
            <DiagnosticItem
              label="Sui Wallet (Official)"
              status={diagnostics.suiWallet}
              description="The official Sui wallet browser extension"
              link={walletLinks.sui}
            />
            <DiagnosticItem
              label="Suiet Wallet"
              status={diagnostics.suietWallet}
              description="Popular community Sui wallet"
              link={walletLinks.suiet}
            />
            <DiagnosticItem
              label="Martian Wallet"
              status={diagnostics.martianWallet}
              description="Multi-chain wallet with Sui support"
              link={walletLinks.martian}
            />
            <DiagnosticItem
              label="HTTPS/Security"
              status={diagnostics.httpsEnabled}
              description="Secure connection required for wallet access"
            />
            <DiagnosticItem
              label="Browser Compatibility"
              status={diagnostics.browserSupported}
              description="Modern browser with crypto support"
            />
          </div>

          <div className="diagnostics-actions">
            <button 
              className="refresh-button"
              onClick={checkDiagnostics}
            >
              <RefreshCw size={14} />
              Refresh Check
            </button>
          </div>

          <div className="diagnostics-help">
            <h4>Troubleshooting Steps:</h4>
            <ol>
              <li>Install a Sui-compatible wallet from the links above</li>
              <li>Refresh this page after installation</li>
              <li>Make sure your wallet is unlocked</li>
              <li>Check that your wallet is set to Sui Testnet</li>
              <li>Try disabling other wallet extensions temporarily</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDiagnostics; 