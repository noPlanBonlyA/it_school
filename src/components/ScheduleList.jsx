import React from 'react';
import PropTypes from 'prop-types';
import '../styles/ScheduleList.css';      // если ещё нет – создайте небольшой css

export default function ScheduleList({ events = [] }) {
  if (!events.length) {
    return <p className="empty-text">Занятий нет</p>;
  }

  return (
    <ul className="schedule-list">
      {events
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .map(ev => {
          const t0 = new Date(ev.start).toLocaleTimeString('ru-RU', {
            hour: '2-digit', minute: '2-digit'
          });
          const t1 = new Date(ev.end).toLocaleTimeString('ru-RU', {
            hour: '2-digit', minute: '2-digit'
          });
          return (
            <li key={ev.id} className="schedule-list-item">
              <span className="time">{t0}-{t1}</span>
              <span className="title">{ev.title}</span>
            </li>
          );
        })}
    </ul>
  );
}

ScheduleList.propTypes = {
  events: PropTypes.array
};
