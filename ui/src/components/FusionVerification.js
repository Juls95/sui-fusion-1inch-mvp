import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import apiService from '../services/apiService';

const FusionVerification = ({ orderHash, isVisible = false }) => {
    const [verificationData, setVerificationData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchVerification = async () => {
        if (!orderHash) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await apiService.request(`/fusion/verify/${orderHash}`);
            setVerificationData(response.data);
        } catch (err) {
            setError(err.message);
            console.error('Verification error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isVisible && orderHash) {
            fetchVerification();
        }
    }, [orderHash, isVisible]);

    if (!isVisible) return null;

    if (loading) {
        return (
            <div className="fusion-verification loading">
                <div className="verification-header">
                    <RefreshCw className="spin" size={16} />
                    <span>Verifying Fusion+ Order...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fusion-verification error">
                <div className="verification-header">
                    <AlertCircle size={16} />
                    <span>Verification Failed</span>
                </div>
                <p className="error-message">{error}</p>
                <button onClick={fetchVerification} className="retry-button">
                    Retry Verification
                </button>
            </div>
        );
    }

    if (!verificationData) return null;

    const { verified, localData, apiData, explorerUrl, verificationUrl } = verificationData;

    return (
        <div className={`fusion-verification ${verified ? 'verified' : 'unverified'}`}>
            {/* Verification Status */}
            <div className="verification-header">
                {verified ? (
                    <>
                        <CheckCircle className="success-icon" size={16} />
                        <span className="status-text">✅ Real 1inch Fusion+ Order Verified</span>
                    </>
                ) : (
                    <>
                        <AlertCircle className="warning-icon" size={16} />
                        <span className="status-text">⚠️ Demo Mode (No Real Fusion+ Order)</span>
                    </>
                )}
            </div>

            {/* Order Details */}
            {verified && localData && (
                <div className="order-details">
                    <h4>🔗 Cross-Chain Mapping</h4>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <span className="label">Original Swap:</span>
                            <span className="value">{localData.originalFromToken} → {localData.originalToToken}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">ETH-side Swap:</span>
                            <span className="value">{localData.ethSrcToken ? `${localData.ethSrcToken.slice(0,6)}...` : 'N/A'} → {localData.ethDstToken ? `${localData.ethDstToken.slice(0,6)}...` : 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">SUI Amount:</span>
                            <span className="value">{localData.originalAmount} SUI</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">ETH Equivalent:</span>
                            <span className="value">{localData.ethAmount} ETH</span>
                        </div>
                    </div>
                    
                    {localData.apiWorking && (
                        <div className="api-success-notice">
                            <div className="success-badge">
                                <span>🎉 1inch Fusion+ API Integration Working!</span>
                            </div>
                            <p className="success-message">
                                The 1inch Fusion+ API successfully validated your order. 
                                {localData.realFusionAttempted && " Real API calls were made and responded correctly."}
                                {" "}For live trading, ensure your Ethereum wallet has sufficient balance and token approvals.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* API Status */}
            {apiData && (
                <div className="api-status">
                    <h4>📊 1inch API Response</h4>
                    <div className="status-grid">
                        <div className="status-item">
                            <span className="label">Order Status:</span>
                            <span className={`status-badge ${apiData.status}`}>{apiData.status}</span>
                        </div>
                        {apiData.fills && apiData.fills.length > 0 && (
                            <div className="status-item">
                                <span className="label">Fills:</span>
                                <span className="value">{apiData.fills.length} fill(s)</span>
                            </div>
                        )}
                        {apiData.resolvers && apiData.resolvers.length > 0 && (
                            <div className="status-item">
                                <span className="label">Resolvers:</span>
                                <span className="value">{apiData.resolvers.length} resolver(s)</span>
                            </div>
                        )}
                        {apiData.remainingAmount && (
                            <div className="status-item">
                                <span className="label">Remaining:</span>
                                <span className="value">{apiData.remainingAmount}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Raw API Response */}
                    <div className="api-response-section">
                        <details>
                            <summary>📝 Full API Response</summary>
                            <div className="api-response-content">
                                <pre className="api-response-json">
                                    {JSON.stringify(apiData, null, 2)}
                                </pre>
                            </div>
                        </details>
                    </div>
                </div>
            )}

            {/* API Error Information */}
            {verificationData.apiError && (
                <div className="api-error">
                    <h4>⚠️ API Connection Status</h4>
                    <div className="error-content">
                        <p>API verification unavailable: {verificationData.apiError}</p>
                        <div className="error-help">
                            <strong>To enable live 1inch API integration:</strong>
                            <ol>
                                <li>Get API key from <a href="https://portal.1inch.dev/" target="_blank" rel="noopener noreferrer">1inch Developer Portal</a></li>
                                <li>Add <code>ONEINCH_API_KEY=your_key</code> to your .env file</li>
                                <li>Restart the API server</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* Network Information */}
            {verificationData.networkInfo && (
                <div className="network-info">
                    <h4>🌐 Network Information</h4>
                    <div className="network-details">
                        <div className="network-item">
                            <span className="label">Network:</span>
                            <span className="value">{verificationData.networkInfo.name}</span>
                        </div>
                        <div className="network-item">
                            <span className="label">Chain ID:</span>
                            <span className="value">{verificationData.networkInfo.chainId}</span>
                        </div>
                        <div className="network-item">
                            <span className="label">Real API:</span>
                            <span className={`value ${verificationData.networkInfo.hasRealAPI ? 'enabled' : 'disabled'}`}>
                                {verificationData.networkInfo.hasRealAPI ? '✅ Enabled' : '⚠️ Demo Mode'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Links */}
            <div className="verification-links">
                <h4>🔍 Verification Links</h4>
                <div className="links-grid">
                    {explorerUrl && (
                        <div className="verification-link-container">
                            <a 
                                href={explorerUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="verification-link"
                                onClick={(e) => {
                                    if (verificationData.localData?.demoNote) {
                                        e.preventDefault();
                                        alert('Demo Transaction: This is a test transaction hash for demonstration purposes. It may not exist on the actual blockchain.');
                                    }
                                }}
                            >
                                <ExternalLink size={14} />
                                View on Explorer
                                {verificationData.localData?.demoNote && (
                                    <span className="demo-badge">DEMO</span>
                                )}
                            </a>
                            {verificationData.localData?.demoNote && (
                                <div className="demo-note">
                                    ⚠️ Demo transaction - hash may not exist on blockchain
                                </div>
                            )}
                        </div>
                    )}
                    {verificationUrl && (
                        <div className="verification-link-container">
                            <a 
                                href={verificationUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="verification-link"
                            >
                                <ExternalLink size={14} />
                                1inch API Data
                                {verificationData.networkInfo?.hasRealAPI ? (
                                    <span className="live-badge">LIVE</span>
                                ) : (
                                    <span className="demo-badge">DEMO</span>
                                )}
                            </a>
                            {!verificationData.networkInfo?.hasRealAPI && (
                                <div className="demo-note">
                                    💡 Add ONEINCH_API_KEY for live API verification
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Technical Details */}
            {verified && (
                <div className="technical-details">
                    <details>
                        <summary>🔧 Technical Details</summary>
                        <div className="tech-content">
                            <div className="tech-item">
                                <strong>Order Hash:</strong>
                                <code>{orderHash}</code>
                            </div>
                            {localData?.timestamp && (
                                <div className="tech-item">
                                    <strong>Created:</strong>
                                    <code>{new Date(localData.timestamp).toLocaleString()}</code>
                                </div>
                            )}
                            <div className="tech-item">
                                <strong>Verification:</strong>
                                <code>{verificationData.timestamp}</code>
                            </div>
                        </div>
                    </details>
                </div>
            )}

            {/* Refresh Button */}
            <div className="verification-actions">
                <button onClick={fetchVerification} className="refresh-verification">
                    <RefreshCw size={14} />
                    Refresh Verification
                </button>
            </div>
        </div>
    );
};

export default FusionVerification; 