import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/EventModal.css';

export default function EventModal({ event, onClose, userRole }) {
  const navigate = useNavigate();
  
  if (!event) return null;

  const handleGoToLesson = () => {
    if (event.lesson_id && event.course_id) {
      navigate(`/courses/${event.course_id}/lessons/${event.lesson_id}`);
      onClose();
    } else {
      alert('Информация об уроке недоступна');
    }
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>
        
        <div className="event-modal-content">
          <div className="event-modal-header">
            <h2 className="event-modal-title">{event.lesson_name}</h2>
            <div className={`event-modal-status ${event.is_opened ? 'opened' : 'closed'}`}>
              {event.is_opened ? '🟢 Открыт' : '🔴 Закрыт'}
            </div>
          </div>

          <div className="event-modal-info">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">📚 Курс</div>
                <div className="info-value">{event.course_name}</div>
              </div>
              
              {event.group_name && (
                <div className="info-item">
                  <div className="info-label">👥 Группа</div>
                  <div className="info-value">{event.group_name}</div>
                </div>
              )}
              
              {event.teacher_name && (
                <div className="info-item">
                  <div className="info-label">👩‍🏫 Преподаватель</div>
                  <div className="info-value">{event.teacher_name}</div>
                </div>
              )}
              
              {event.auditorium && (
                <div className="info-item">
                  <div className="info-label">📍 Аудитория</div>
                  <div className="info-value">{event.auditorium}</div>
                </div>
              )}
              
              <div className="info-item">
                <div className="info-label">🕐 Время</div>
                <div className="info-value">
                  {new Date(event.start_datetime || event.start).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                  {' - '}
                  {new Date(event.end_datetime || event.end).toLocaleTimeString('ru-RU', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
              
              <div className="info-item">
                <div className="info-label">⏱️ Длительность</div>
                <div className="info-value">
                  {(() => {
                    const start = new Date(event.start_datetime || event.start);
                    const end = new Date(event.end_datetime || event.end);
                    const diffMinutes = Math.round((end - start) / (1000 * 60));
                    return `${diffMinutes} минут`;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="event-modal-description">
              <h3>📋 Описание</h3>
              <p>{event.description}</p>
            </div>
          )}

          {event.is_opened && userRole === 'student' && (
            <div className="event-modal-actions">
              <button 
                className="event-btn-primary"
                onClick={handleGoToLesson}
              >
                🚀 Перейти к уроку
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
