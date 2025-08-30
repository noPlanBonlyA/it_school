// src/components/GroupScheduleInfo.jsx
import React, { useState, useEffect } from 'react';
import { 
  WEEKDAY_NAMES, 
  INTERVAL_NAMES,
  loadGroupScheduleSettings 
} from '../services/groupScheduleService';
import api from '../api/axiosInstance';

const GroupScheduleInfo = ({ group, groupId, compact = false }) => {
  const [realSchedule, setRealSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Используем groupId из group, если передан объект group
  const actualGroupId = group?.id || groupId;
  
  // Загружаем реальное расписание группы из API
  useEffect(() => {
    const loadRealSchedule = async () => {
      if (!actualGroupId) {
        setLoading(false);
        return;
      }
      
      try {
        // Получаем lesson-groups для этой группы
        const response = await api.get(`/courses/lesson-group?group_id=${actualGroupId}`);
        const lessonGroups = response.data || [];
        
        if (lessonGroups.length > 0) {
          // Берем первый lesson-group для определения расписания
          const firstLesson = lessonGroups
            .filter(lg => lg.start_datetime)
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))[0];
          
          if (firstLesson) {
            const startDate = new Date(firstLesson.start_datetime);
            const endDate = new Date(firstLesson.end_datetime);
            
            const schedule = {
              dayOfWeek: startDate.getDay(),
              startTime: startDate.toTimeString().slice(0, 5), // HH:MM
              endTime: endDate.toTimeString().slice(0, 5),     // HH:MM
              auditorium: firstLesson.auditorium || ''
            };
            
            setRealSchedule(schedule);
          }
        }
      } catch (error) {
        console.error('Error loading real schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadRealSchedule();
  }, [actualGroupId]);
  
  if (loading) {
    return compact ? (
      <span className="schedule-info-compact loading">
        ⏳ Загрузка расписания...
      </span>
    ) : (
      <div className="schedule-info loading">
        <span className="schedule-status">⏳ Загрузка расписания...</span>
      </div>
    );
  }
  
  // Если есть реальное расписание, показываем его
  if (realSchedule) {
    const dayName = WEEKDAY_NAMES[realSchedule.dayOfWeek];
    
    if (compact) {
      return (
        <span className="schedule-info-compact has-schedule">
          📅 {dayName} {realSchedule.startTime}-{realSchedule.endTime}
          {realSchedule.auditorium && ` (${realSchedule.auditorium})`}
        </span>
      );
    }

    return (
      <div className="schedule-info has-schedule">
        <div className="schedule-main">
          <span className="schedule-day">{dayName}</span>
          <span className="schedule-time">{realSchedule.startTime} - {realSchedule.endTime}</span>
        </div>
        {realSchedule.auditorium && (
          <div className="schedule-auditorium">
            📍 {realSchedule.auditorium}
          </div>
        )}
      </div>
    );
  }
  
  // Fallback: показываем настройки по умолчанию, если есть
  const settings = loadGroupScheduleSettings(actualGroupId);
  
  if (!settings || !settings.dayOfWeek) {
    return compact ? (
      <span className="schedule-info-compact no-schedule">
        📅 Расписание не настроено
      </span>
    ) : (
      <div className="schedule-info no-schedule">
        <span className="schedule-status">📅 Расписание не настроено</span>
        <span className="schedule-hint">Добавьте курс в группу для создания расписания</span>
      </div>
    );
  }

  const dayName = WEEKDAY_NAMES[settings.dayOfWeek];
  const intervalName = INTERVAL_NAMES[settings.interval];

  if (compact) {
    return (
      <span className="schedule-info-compact has-schedule fallback">
        📅 {dayName} {settings.startTime}-{settings.endTime} (план)
      </span>
    );
  }

  return (
    <div className="schedule-info has-schedule fallback">
      <div className="schedule-main">
        <span className="schedule-day">{dayName}</span>
        <span className="schedule-time">{settings.startTime} - {settings.endTime}</span>
        <span className="schedule-interval">{intervalName} (план)</span>
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
