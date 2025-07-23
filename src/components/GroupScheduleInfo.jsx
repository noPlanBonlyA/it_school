// src/components/GroupScheduleInfo.jsx
import React from 'react';
import { 
  WEEKDAY_NAMES, 
  INTERVAL_NAMES,
  loadGroupScheduleSettings 
} from '../services/groupScheduleService';

const GroupScheduleInfo = ({ groupId, compact = false }) => {
  const settings = loadGroupScheduleSettings(groupId);
  
  if (!settings || !settings.dayOfWeek) {
    return compact ? (
      <span className="schedule-info-compact no-schedule">
        📅 Расписание не настроено
      </span>
    ) : (
      <div className="schedule-info no-schedule">
        <span className="schedule-status">📅 Автоматическое расписание не настроено</span>
        <span className="schedule-hint">Настройте расписание при добавлении курса</span>
      </div>
    );
  }

  const dayName = WEEKDAY_NAMES[settings.dayOfWeek];
  const intervalName = INTERVAL_NAMES[settings.interval];

  if (compact) {
    return (
      <span className="schedule-info-compact has-schedule">
        📅 {dayName} {settings.startTime}-{settings.endTime} ({intervalName})
      </span>
    );
  }

  return (
    <div className="schedule-info has-schedule">
      <div className="schedule-main">
        <span className="schedule-day">{dayName}</span>
        <span className="schedule-time">{settings.startTime} - {settings.endTime}</span>
        <span className="schedule-interval">{intervalName}</span>
      </div>
      {settings.auditorium && (
        <div className="schedule-auditorium">
          📍 {settings.auditorium}
        </div>
      )}
    </div>
  );
};

export default GroupScheduleInfo;
