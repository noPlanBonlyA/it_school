// src/components/RescheduleResultModal.jsx

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/RescheduleResultModal.css';

/**
 * Модальное окно для отображения результатов изменения расписания курса
 */
export default function RescheduleResultModal({ 
  isOpen, 
  onClose, 
  data 
}) {
  useEffect(() => {
    if (isOpen) {
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

  const getMainIcon = () => {
    if (data.success && data.failed === 0) return '✅';
    if (data.failed > 0 && data.updated === 0) return '❌';
    return '⚠️';
  };

  const getMainTitle = () => {
    if (data.success && data.failed === 0) {
      return `Расписание курса "${data.courseName}" успешно изменено!`;
    }
    if (data.failed > 0 && data.updated === 0) {
      return 'Ошибка изменения расписания';
    }
    return 'Расписание частично изменено';
  };

  const modalContent = (
    <div className="reschedule-modal-overlay" onClick={onClose}>
      <div className="reschedule-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="reschedule-modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="reschedule-modal-header">
          <div className="reschedule-modal-icon">{getMainIcon()}</div>
          <h2 className="reschedule-modal-title">{getMainTitle()}</h2>
        </div>

        <div className="reschedule-modal-body">
          {/* Новое расписание */}
          {data.newSchedule && (
            <div className="reschedule-new-schedule">
              <h3 className="schedule-section-title">
                <span className="schedule-section-icon">📅</span>
                Новое расписание
              </h3>
              <div className="schedule-details">
                <div className="schedule-detail-item">
                  <span className="detail-label">День недели:</span>
                  <span className="detail-value">{data.newSchedule.dayOfWeek}</span>
                </div>
                <div className="schedule-detail-item">
                  <span className="detail-label">Время:</span>
                  <span className="detail-value">{data.newSchedule.startTime}</span>
                </div>
                <div className="schedule-detail-item">
                  <span className="detail-label">Продолжительность:</span>
                  <span className="detail-value">{data.newSchedule.durationMinutes} минут</span>
                </div>
                {data.newSchedule.startDate && (
                  <div className="schedule-detail-item">
                    <span className="detail-label">Начать с:</span>
                    <span className="detail-value">{data.newSchedule.startDate}</span>
                  </div>
                )}
                {data.newSchedule.auditorium && (
                  <div className="schedule-detail-item">
                    <span className="detail-label">Аудитория:</span>
                    <span className="detail-value">{data.newSchedule.auditorium}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Статистика */}
          <div className="reschedule-stats-grid">
            <div className="reschedule-stat-card total">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{data.totalLessons}</div>
                <div className="stat-label">Всего занятий</div>
              </div>
            </div>

            <div className="reschedule-stat-card success">
              <div className="stat-icon">✨</div>
              <div className="stat-content">
                <div className="stat-value">{data.updated}</div>
                <div className="stat-label">Обновлено</div>
              </div>
            </div>

            {data.failed > 0 && (
              <div className="reschedule-stat-card error">
                <div className="stat-icon">⚠️</div>
                <div className="stat-content">
                  <div className="stat-value">{data.failed}</div>
                  <div className="stat-label">Ошибок</div>
                </div>
              </div>
            )}
          </div>

          {/* Дополнительная информация при ошибках */}
          {data.failed > 0 && (
            <div className="reschedule-warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <strong>Внимание!</strong>
                <p>Не все занятия были обновлены. Возможно, некоторые занятия уже прошли или имеют конфликты.</p>
              </div>
            </div>
          )}
        </div>

        <div className="reschedule-modal-footer">
          <button 
            className="reschedule-modal-btn primary" 
            onClick={onClose}
          >
            {data.success && data.failed === 0 ? 'Отлично!' : 'Понятно'}
          </button>
        </div>
      </div>
    </div>
  );

  // Рендерим модальное окно в body с помощью Portal
  return createPortal(modalContent, document.body);
}
