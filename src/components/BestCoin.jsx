import React from 'react';
import '../styles/BestCoin.css';

export default function BestCoins({ amount = 0, loading = false }) {
  return (
    <div className="bestcoins-container">
      <div className="bestcoins-display">
        <div className="coins-icon">🪙</div>
        <div className="coins-amount">
          {loading ? (
            <div className="coins-loading-animation">
              <span className="loading-dots">...</span>
            </div>
          ) : (
            <span className="coins-number">{amount}</span>
          )}
        </div>
        <div className="coins-label">Бесткоинов</div>
      </div>
      
      <div className="coins-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: loading ? '0%' : `${Math.min((amount / 100) * 100, 100)}%` 
            }}
          ></div>
        </div>
        <div className="progress-text">
          {loading ? 'Загрузка...' : `${amount} из ∞`}
        </div>
      </div>

      <div className="coins-actions">
        <div className="action-hint">
          <span className="hint-icon">💡</span>
          <span className="hint-text">
            {loading 
              ? 'Обновляем данные...'
              : amount === 0 
                ? 'Посещайте занятия, чтобы заработать монеты!'
                : 'Продолжайте в том же духе!'
            }
          </span>
        </div>
      </div>
    </div>
  );
}
