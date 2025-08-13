import React from 'react';
import '../styles/BestCoin.css';

export default function BestCoins({ amount = 0, loading = false }) {
  return (
    <div className="bestcoins-container">
      <div className="bestcoins-display">
        <div className="coins-icon">💻</div>
        <div className="coins-amount">
          {loading ? (
            <div className="coins-loading-animation">
              <span className="loading-dots">...</span>
            </div>
          ) : (
            <span className="coins-number">{amount}</span>
          )}
        </div>
        <div className="coins-label">Айтишек</div>
      </div>
    </div>
  );
}
