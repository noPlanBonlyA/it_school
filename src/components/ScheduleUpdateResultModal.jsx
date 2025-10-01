// src/components/ScheduleUpdateResultModal.jsx

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/ScheduleUpdateResultModal.css';

export default function ScheduleUpdateResultModal({ 
  isOpen, 
  onClose, 
  data 
}) {
  useEffect(() => {
    if (isOpen) {
      // Предотвращаем скролл на фоне при открытом модальном окне
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const isSingleCourse = data.totalCourses === 1;
  const isSuccess = data.successCount > 0;
  const hasErrors = data.failCount > 0;

  const getMainIcon = () => {
    if (isSuccess && !hasErrors) return '✅';
    if (hasErrors && !isSuccess) return '❌';
    return '⚠️';
  };

  const getMainTitle = () => {
    if (isSuccess && !hasErrors) return 'Расписание успешно обновлено!';
    if (hasErrors && !isSuccess) return 'Ошибка обновления расписания';
    return 'Расписание частично обновлено';
  };

  const modalContent = (
    <div className="schedule-modal-overlay" onClick={onClose}>
      <div className="schedule-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="schedule-modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="schedule-modal-header">
          <div className="schedule-modal-icon">{getMainIcon()}</div>
          <h2 className="schedule-modal-title">{getMainTitle()}</h2>
        </div>

        <div className="schedule-modal-body">
          {/* Основная статистика */}
          <div className="schedule-stats-grid">
            <div className="schedule-stat-card primary">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{data.totalLessons}</div>
                <div className="stat-label">Всего уроков</div>
              </div>
            </div>

            <div className="schedule-stat-card success">
              <div className="stat-icon">✨</div>
              <div className="stat-content">
                <div className="stat-value">{data.totalAdded}</div>
                <div className="stat-label">Добавлено новых</div>
              </div>
            </div>

            <div className="schedule-stat-card info">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-value">{data.totalExisting}</div>
                <div className="stat-label">Уже было</div>
              </div>
            </div>
          </div>

          {/* Если несколько курсов */}
          {!isSingleCourse && (
            <div className="schedule-courses-summary">
              <h3 className="summary-title">
                <span className="summary-icon">📚</span>
                Обработано курсов
              </h3>
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-label">Всего:</span>
                  <span className="summary-value">{data.totalCourses}</span>
                </div>
                <div className="summary-item success">
                  <span className="summary-label">Успешно:</span>
                  <span className="summary-value">{data.successCount}</span>
                </div>
                {hasErrors && (
                  <div className="summary-item error">
                    <span className="summary-label">С ошибками:</span>
                    <span className="summary-value">{data.failCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Детальная информация по курсам */}
          {data.results && data.results.length > 0 && (
            <div className="schedule-results-list">
              <h3 className="results-title">
                {isSingleCourse ? 'Детали' : 'Детали по курсам'}
              </h3>
              <div className="results-items">
                {data.results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`result-item ${result.success ? 'success' : 'error'}`}
                  >
                    <div className="result-header">
                      <span className="result-icon">
                        {result.success ? '✅' : '❌'}
                      </span>
                      <span className="result-course-name">{result.course}</span>
                    </div>
                    <div className="result-details">
                      {result.success ? (
                        <>
                          <div className="result-stat">
                            <span className="result-stat-label">Всего уроков:</span>
                            <span className="result-stat-value">{result.total || 0}</span>
                          </div>
                          <div className="result-stat">
                            <span className="result-stat-label">Добавлено:</span>
                            <span className="result-stat-value highlight">{result.added || 0}</span>
                          </div>
                          <div className="result-stat">
                            <span className="result-stat-label">Уже было:</span>
                            <span className="result-stat-value">{result.existing || 0}</span>
                          </div>
                        </>
                      ) : (
                        <div className="result-error-message">
                          {result.error || 'Неизвестная ошибка'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="schedule-modal-footer">
          <button 
            className="schedule-modal-btn primary" 
            onClick={onClose}
          >
            Отлично!
          </button>
        </div>
      </div>
    </div>
  );

  // Рендерим модальное окно в body с помощью Portal
  return createPortal(modalContent, document.body);
}
