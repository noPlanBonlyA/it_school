// src/components/ConfirmRescheduleModal.jsx

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/ConfirmRescheduleModal.css';

/**
 * Модальное окно для подтверждения изменения расписания
 */
export default function ConfirmRescheduleModal({ 
  isOpen, 
  onClose, 
  onConfirm,
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

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modalContent = (
    <div className="confirm-reschedule-overlay" onClick={onClose}>
      <div className="confirm-reschedule-container" onClick={(e) => e.stopPropagation()}>
        <button className="confirm-reschedule-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="confirm-reschedule-header">
          <div className="confirm-reschedule-icon">🔄</div>
          <h2 className="confirm-reschedule-title">
            Изменить расписание всех занятий курса "{data.courseName}"?
          </h2>
        </div>

        <div className="confirm-reschedule-body">
          {/* Новое расписание */}
          <div className="confirm-new-schedule">
            <h3 className="confirm-section-title">
              <span className="confirm-section-icon">📅</span>
              Новое расписание
            </h3>
            <div className="confirm-schedule-grid">
              <div className="confirm-schedule-item">
                <span className="confirm-item-label">День недели:</span>
                <span className="confirm-item-value">{data.dayOfWeek}</span>
              </div>
              <div className="confirm-schedule-item">
                <span className="confirm-item-label">Время:</span>
                <span className="confirm-item-value">{data.startTime}</span>
              </div>
              <div className="confirm-schedule-item">
                <span className="confirm-item-label">Продолжительность:</span>
                <span className="confirm-item-value">{data.durationMinutes} минут</span>
              </div>
              <div className="confirm-schedule-item">
                <span className="confirm-item-label">Начать с:</span>
                <span className="confirm-item-value">{data.startDate}</span>
              </div>
              {data.auditorium && (
                <div className="confirm-schedule-item">
                  <span className="confirm-item-label">Аудитория:</span>
                  <span className="confirm-item-value">{data.auditorium}</span>
                </div>
              )}
            </div>
          </div>

          {/* Статистика */}
          <div className="confirm-stats-box">
            <div className="confirm-stat-icon">📊</div>
            <div className="confirm-stat-text">
              Будет изменено <strong>{data.totalLessons}</strong> занятий
            </div>
          </div>

          {/* Предупреждение */}
          <div className="confirm-warning-box">
            <div className="confirm-warning-icon">⚠️</div>
            <div className="confirm-warning-text">
              Это действие изменит время и дату всех будущих занятий курса. 
              Убедитесь, что новое расписание не конфликтует с другими занятиями.
            </div>
          </div>
        </div>

        <div className="confirm-reschedule-footer">
          <button 
            className="confirm-reschedule-btn secondary" 
            onClick={onClose}
          >
            Отмена
          </button>
          <button 
            className="confirm-reschedule-btn primary" 
            onClick={handleConfirm}
          >
            Изменить расписание
          </button>
        </div>
      </div>
    </div>
  );

  // Рендерим модальное окно в body с помощью Portal
  return createPortal(modalContent, document.body);
}
