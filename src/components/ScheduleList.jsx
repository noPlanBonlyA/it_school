// src/components/ScheduleList.jsx
import React from 'react';
import '../styles/ScheduleList.css';

export default function ScheduleList({ events }) {
  return (
    <div className="schedule-list-card">
      <h3>Занятия сегодня</h3>
      {events.length === 0 && <p>Нет занятий сегодня</p>}
      {events.map(e => {
        const from = new Date(e.start).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
        const to   = new Date(e.end).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
        return (
          <div className="event-item" key={e.id}>
            <div className="time">{from} – {to}</div>
            <div className="title" style={{ backgroundColor: e.color }}>{e.title}</div>
          </div>
        );
      })}
      <button className="expand-btn" onClick={() => alert('Развернуть')}>Развернуть</button>
    </div>
  );
}
