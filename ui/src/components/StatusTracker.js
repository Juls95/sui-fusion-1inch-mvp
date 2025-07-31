import React, { memo } from 'react';
import { Check, Clock, AlertCircle, Activity, TrendingUp, Zap } from 'lucide-react';

const StatusTracker = memo(({ 
  steps, 
  currentStep, 
  isActive, 
  metrics, 
  orderId, 
  escrowId 
}) => {
  const getStepIcon = (step, index) => {
    const stepNumber = index + 1;
    
    if (stepNumber < currentStep) {
      return <Check className="step-icon completed" size={16} />;
    } else if (stepNumber === currentStep && isActive) {
      return <Activity className="step-icon active spinning" size={16} />;
    } else if (stepNumber === currentStep && !isActive) {
      return <Check className="step-icon completed" size={16} />;
    } else {
      return <Clock className="step-icon pending" size={16} />;
    }
  };

  const getStepStatus = (index) => {
    const stepNumber = index + 1;
    
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep && isActive) return 'active';
    if (stepNumber === currentStep && !isActive) return 'completed';
    return 'pending';
  };

  return (
    <div className="status-tracker">
      <div className="tracker-header">
        <h3>Swap Progress</h3>
        {isActive && (
          <div className="live-indicator">
            <div className="pulse-dot"></div>
            <span>Live</span>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const stepNumber = index + 1;
          
          return (
            <div key={step.id} className={`progress-step ${status}`}>
              <div className="step-connector">
                {index < steps.length - 1 && (
                  <div className={`connector-line ${stepNumber <= currentStep ? 'completed' : 'pending'}`} />
                )}
              </div>
              
              <div className="step-content">
                <div className="step-marker">
                  {getStepIcon(step, index)}
                  <span className="step-number">{stepNumber}</span>
                </div>
                
                <div className="step-details">
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-description">{step.description}</p>
                  
                  {/* Show additional details for active/completed steps */}
                  {stepNumber <= currentStep && (
                    <div className="step-metadata">
                      {stepNumber === 2 && metrics.bidsReceived > 0 && (
                        <div className="metadata-item">
                          <TrendingUp size={12} />
                          <span>{metrics.bidsReceived} bids received</span>
                        </div>
                      )}
                      
                      {stepNumber === 4 && metrics.partialFills > 0 && (
                        <div className="metadata-item">
                          <Zap size={12} />
                          <span>{metrics.partialFills} partial fills</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Metrics */}
      {currentStep >= 2 && (
        <div className="live-metrics">
          <div className="metrics-header">
            <Activity size={16} />
            <span>Live Metrics</span>
          </div>
          
          <div className="metrics-grid">
            {metrics.bidsReceived > 0 && (
              <div className="metric-card">
                <div className="metric-label">Bids Received</div>
                <div className="metric-value">{metrics.bidsReceived}</div>
                <div className="metric-trend">
                  <TrendingUp size={12} />
                  <span>Competing</span>
                </div>
              </div>
            )}
            
            {metrics.bestRate && (
              <div className="metric-card">
                <div className="metric-label">Best Rate</div>
                <div className="metric-value">{metrics.bestRate}</div>
                <div className="metric-trend">
                  <TrendingUp size={12} />
                  <span>SUI/ETH</span>
                </div>
              </div>
            )}
            
            {metrics.partialFills > 0 && (
              <div className="metric-card">
                <div className="metric-label">Partial Fills</div>
                <div className="metric-value">{metrics.partialFills}</div>
                <div className="metric-trend">
                  <Zap size={12} />
                  <span>Optimized</span>
                </div>
              </div>
            )}
            
            {metrics.gasSaved > 0 && (
              <div className="metric-card">
                <div className="metric-label">Gas Saved</div>
                <div className="metric-value">{metrics.gasSaved}%</div>
                <div className="metric-trend">
                  <Check size={12} />
                  <span>Efficient</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction IDs */}
      {(orderId || escrowId) && (
        <div className="transaction-ids">
          <div className="ids-header">
            <span>Transaction Details</span>
          </div>
          
          {orderId && (
            <div className="id-item">
              <span className="id-label">Order ID:</span>
              <code className="id-value" title={orderId}>
                {orderId.substring(0, 12)}...
              </code>
            </div>
          )}
          
          {escrowId && (
            <div className="id-item">
              <span className="id-label">Escrow ID:</span>
              <code className="id-value" title={escrowId}>
                {escrowId.substring(0, 12)}...
              </code>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="overall-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${(currentStep / steps.length) * 100}%`,
              transition: 'width 0.5s ease-in-out'
            }}
          />
        </div>
        <span className="progress-text">
          {currentStep === steps.length && !isActive 
            ? 'Completed!' 
            : `Step ${currentStep} of ${steps.length}`
          }
        </span>
      </div>
    </div>
  );
});

StatusTracker.displayName = 'StatusTracker';

export default StatusTracker; 