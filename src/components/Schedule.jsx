/*  src/components/Schedule.jsx
    Упрощённый список занятий     */

import React from 'react';
import '../styles/Schedule.css';

export default function Schedule({ events, onSelect }) {
  if (!events || events.length === 0) {
    return (
      <div className="schedule-empty">
        <div className="empty-icon">📅</div>
        <p>На этот день занятий нет</p>
        <span className="empty-subtitle">Отдыхайте или повторяйте материал</span>
      </div>
    );
  }

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getTimeUntil = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const lessonTime = new Date(dateString);
    const diffMs = lessonTime - now;
    
    if (diffMs < 0) return 'Прошло';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `через ${diffHours}ч ${diffMinutes}м`;
    } else if (diffMinutes > 0) {
      return `через ${diffMinutes}м`;
    } else {
      return 'сейчас';
    }
  };

  const getStatusClass = (event) => {
    if (event.is_opened) return 'opened';
    const now = new Date();
    const lessonTime = new Date(event.start_datetime || event.start);
    return now < lessonTime ? 'scheduled' : 'closed';
  };

  const getStatusText = (event) => {
    if (event.is_opened) return 'Открыт';
    const now = new Date();
    const lessonTime = new Date(event.start_datetime || event.start);
    return now < lessonTime ? 'Запланирован' : 'Закрыт';
  };

  return (
    <div className="schedule-container">
      {events.map((event, index) => (
        <div 
          key={event.id || index} 
          className={`schedule-item ${getStatusClass(event)}`}
          onClick={() => onSelect(event)}
        >
          <div className="schedule-time-block">
            <div className="schedule-date">
              {formatDate(event.start_datetime || event.start)}
            </div>
            <div className="schedule-time">
              {formatTime(event.start_datetime || event.start)}
            </div>
            <div className="schedule-countdown">
              {getTimeUntil(event.start_datetime || event.start)}
            </div>
          </div>
          
          <div className="schedule-content">
            <div className="schedule-lesson-name">
              {event.lesson_name}
            </div>
            <div className="schedule-course-name">
              {event.course_name}
            </div>
            {event.group_name && (
              <div className="schedule-group">
                👥 {event.group_name}
              </div>
            )}
            {event.teacher_name && (
              <div className="schedule-teacher">
                👩‍🏫 {event.teacher_name}
              </div>
            )}
            {event.auditorium && (
              <div className="schedule-auditorium">
                📍 {event.auditorium}
              </div>
            )}
          </div>
          
          <div className="schedule-status">
            <div className={`status-indicator ${getStatusClass(event)}`}>
              {event.is_opened ? '🟢' : new Date() < new Date(event.start_datetime || event.start) ? '🟡' : '🔴'}
            </div>
            <div className="status-text">
              {getStatusText(event)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
