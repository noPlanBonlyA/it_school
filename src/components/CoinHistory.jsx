// src/components/CoinHistory.jsx

import React, { useState, useEffect } from 'react';
import { 
  getPointsHistory, 
  getStudentPointsHistory,
  REASON_LABELS, 
  getReasonIcon 
} from '../services/coinHistoryService';
import '../styles/CoinHistory.css';

const CoinHistory = ({ studentId = null, compact = false }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const itemsPerPage = compact ? 5 : 10;

  useEffect(() => {
    console.log('[CoinHistory] Component mounted with studentId:', studentId);
    loadHistory();
  }, [currentPage, studentId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: itemsPerPage,
        offset: currentPage * itemsPerPage
      };

      console.log('[CoinHistory] Loading history for studentId:', studentId);
      console.log('[CoinHistory] Request params:', params);

      // Используем правильный метод в зависимости от того, есть ли studentId
      const response = studentId 
        ? await getStudentPointsHistory(studentId, params)
        : await getPointsHistory(params);
      
      console.log('[CoinHistory] Response:', response);
      console.log('[CoinHistory] Objects array:', response.objects);
      console.log('[CoinHistory] Objects length:', response.objects?.length);
      
      setHistory(response.objects || []);
      setTotalCount(response.meta?.total_count || response.count || 0);
      setHasMore((currentPage + 1) * itemsPerPage < (response.meta?.total_count || response.count || 0));
    } catch (err) {
      console.error('Ошибка при загрузке истории поинтов:', err);
      setError('Не удалось загрузить историю монет');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(0);
    loadHistory();
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Сегодня, ' + date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 2) {
      return 'Вчера, ' + date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays <= 7) {
      return `${diffDays - 1} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const getPointsChangeClass = (points) => {
    if (points > 0) return 'positive';
    if (points < 0) return 'negative';
    return 'neutral';
  };

  const formatPointsChange = (points) => {
    if (points > 0) {
      return `+${points}`;
    }
    return points.toString();
  };

  if (loading && history.length === 0) {
    return (
      <div className="coin-history">
        <div className="loading-indicator">
          <div className="spinner"></div>
          Загрузка истории монет...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coin-history">
        <div className="error-state">
          <div className="error-state-icon">❌</div>
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button className="refresh-btn" onClick={handleRefresh}>
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="coin-history">
      <div className="coin-history-header">
        <h3 className="coin-history-title">
          <span className="coin-icon"></span>
          История монет
        </h3>
        <div className="history-controls">
          <button 
            className="refresh-btn" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Обновление...
              </>
            ) : (
              <>
                🔄 Обновить
              </>
            )}
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>История пуста</h3>
          <p>Пока нет записей о получении или трате монет</p>
        </div>
      ) : (
        <>
          <ul className="history-list">
            {history.map((item) => (
              <li key={item.id} className="history-item">
                <div className="item-left">
                   <div className={`points-change ${getPointsChangeClass(item.changed_points)}`}>
                    <span className="points-icon">💻</span>
                    {formatPointsChange(item.changed_points)}
                  </div>
                  <div className="item-info">
                    <h4 className="reason-label">
                      {REASON_LABELS[item.reason] || item.reason}
                    </h4>
                    {item.description && (
                      <p className="item-description">{item.description}</p>
                    )}
                    <div className="item-date">
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                </div>
                <div className="item-right">
                 
                </div>
              </li>
            ))}
          </ul>

          {!compact && totalCount > itemsPerPage && (
            <div className="pagination">
              <button 
                className="pagination-btn" 
                onClick={handlePrevPage}
                disabled={currentPage === 0 || loading}
              >
                ← Назад
              </button>
              
              <span className="pagination-info">
                {currentPage * itemsPerPage + 1}-{Math.min((currentPage + 1) * itemsPerPage, totalCount)} из {totalCount}
              </span>
              
              <button 
                className="pagination-btn" 
                onClick={handleNextPage}
                disabled={!hasMore || loading}
              >
                Вперед →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CoinHistory;
