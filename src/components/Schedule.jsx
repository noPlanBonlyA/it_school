// src/components/Schedule.jsx
import React from 'react';
import '../styles/Schedule.css';

export default function Schedule({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="schedule-list">
        <div className="schedule-item empty">Пар нет</div>
      </div>
    );
  }

  return (
    <div className="schedule-list">
      {events.map(evt => (
        <div key={evt.id} className="schedule-item">
          {/* Цветная полоска слева */}
          <div
            className="color-bar"
            style={{ backgroundColor: evt.color }}
          ></div>

          {/* Основная часть карточки */}
          <div className="schedule-content">
            <div className="schedule-title">{evt.title}</div>
            <div className="schedule-time">
              {new Date(evt.start).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}{' '}
              –{' '}
              {new Date(evt.end).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* Аудитория справа (необязательно, если хотите) */}
          <div className="schedule-audience">Ауд: {evt.audience}</div>
        </div>
      ))}
    </div>
  );
}
