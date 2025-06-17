import React from 'react';
import PropTypes from 'prop-types';
import '../styles/ScheduleList.css';

export default function ScheduleList({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="schedule-list-empty">
        <p>На этот день занятий нет</p>
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

  const formatDuration = (start, end) => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMinutes = Math.round((endDate - startDate) / (1000 * 60));
    return `${diffMinutes} мин`;
  };

  return (
    <div className="schedule-list">
      {events.map((event, index) => (
        <div key={event.id || index} className="schedule-item">
          <div className="schedule-time">
            <div className="time-main">
              {formatTime(event.start_datetime)}
            </div>
            <div className="time-end">
              до {formatTime(event.end_datetime)}
            </div>
            <div className="time-duration">
              {formatDuration(event.start_datetime, event.end_datetime)}
            </div>
          </div>
          
          <div className="schedule-content">
            <div className="schedule-title">
              {event.lesson_name}
            </div>
            <div className="schedule-course">
              {event.course_name}
            </div>
            {event.group_name && (
              <div className="schedule-group">
                Группа: {event.group_name}
              </div>
            )}
            {event.teacher_name && (
              <div className="schedule-teacher">
                Преподаватель: {event.teacher_name}
              </div>
            )}
            {event.auditorium && (
              <div className="schedule-auditorium">
                📍 {event.auditorium}
              </div>
            )}
          </div>
          
          <div className="schedule-status">
            <div className={`status-indicator ${event.is_opened ? 'opened' : 'closed'}`}>
              {event.is_opened ? '🟢' : '🔴'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

ScheduleList.propTypes = {
  events: PropTypes.array
};
