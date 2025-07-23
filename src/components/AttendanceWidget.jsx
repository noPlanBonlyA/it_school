// src/components/AttendanceWidget.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosInstance';
import '../styles/AttendanceWidget.css';

export default function AttendanceWidget() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === 'student') {
      loadAttendanceData();
    }
  }, [user]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Получаем данные о посещаемости студента через специальный эндпоинт
      const response = await api.get('/courses/student/lesson-student');

      const lessons = response.data || [];
      
      // Создаем карту посещаемости по датам
      const attendanceMap = {};
      let totalLessons = 0;
      let attendedLessons = 0;
      let excusedLessons = 0;
      
      lessons.forEach(lesson => {
        const date = lesson.lesson_group?.start_datetime;
        if (date) {
          const dateStr = new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
          
          if (!attendanceMap[dateStr]) {
            attendanceMap[dateStr] = [];
          }
          
          attendanceMap[dateStr].push({
            lessonName: lesson.lesson_group?.lesson?.name || 'Урок',
            courseName: lesson.lesson_group?.lesson?.course?.name || 'Курс',
            isVisited: lesson.is_visited,
            isExcused: lesson.is_excused_absence,
            gradeForVisit: lesson.grade_for_visit,
            coinsForVisit: lesson.coins_for_visit,
            time: new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          });
          
          totalLessons++;
          if (lesson.is_visited) attendedLessons++;
          if (lesson.is_excused_absence && !lesson.is_visited) excusedLessons++;
        }
      });

      setAttendanceData({
        attendanceMap,
        stats: {
          totalLessons,
          attendedLessons,
          excusedLessons,
          missedLessons: totalLessons - attendedLessons - excusedLessons
        }
      });
    } catch (error) {
      console.error('[AttendanceWidget] Error loading attendance:', error);
      setError('Ошибка загрузки данных о посещаемости');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Генерируем календарную сетку за последний год
  const generateCalendarGrid = () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const weeks = [];
    const currentDate = new Date(oneYearAgo);
    
    // Начинаем с понедельника недели
    const dayOfWeek = currentDate.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentDate.setDate(currentDate.getDate() - daysToSubtract);
    
    while (currentDate <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = attendanceData.attendanceMap?.[dateStr] || null;
        
        week.push({
          date: new Date(currentDate),
          dateStr,
          dayData,
          isToday: dateStr === today.toISOString().split('T')[0]
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  // Определяем цвет ячейки
  const getCellClass = (dayData) => {
    if (!dayData) return 'day-cell empty';
    
    const hasVisited = dayData.some(lesson => lesson.isVisited);
    const hasExcused = dayData.some(lesson => lesson.isExcused && !lesson.isVisited);
    const hasMissed = dayData.some(lesson => !lesson.isVisited && !lesson.isExcused);
    
    if (hasVisited) return 'day-cell attended';
    if (hasExcused) return 'day-cell excused';
    if (hasMissed) return 'day-cell missed';
    
    return 'day-cell empty';
  };

  // Получаем статистику для дня
  const getDayTooltip = (day) => {
    if (!day.dayData) return `${day.date.toLocaleDateString('ru-RU')}\nНет занятий`;
    
    const lessons = day.dayData;
    const visitedCount = lessons.filter(l => l.isVisited).length;
    const excusedCount = lessons.filter(l => l.isExcused && !l.isVisited).length;
    const missedCount = lessons.filter(l => !l.isVisited && !l.isExcused).length;
    
    let tooltip = `${day.date.toLocaleDateString('ru-RU')}\n`;
    tooltip += `Занятий: ${lessons.length}\n`;
    if (visitedCount > 0) tooltip += `✅ Посещено: ${visitedCount}\n`;
    if (excusedCount > 0) tooltip += `⚠️ Уважительно: ${excusedCount}\n`;
    if (missedCount > 0) tooltip += `❌ Пропущено: ${missedCount}\n`;
    
    lessons.forEach(lesson => {
      tooltip += `\n${lesson.time} - ${lesson.lessonName}`;
      if (lesson.isVisited && lesson.gradeForVisit > 0) {
        tooltip += ` (Оценка: ${lesson.gradeForVisit})`;
      }
      if (lesson.isVisited && lesson.coinsForVisit > 0) {
        tooltip += ` (+${lesson.coinsForVisit} монет)`;
      }
    });
    
    return tooltip;
  };

  const getAttendancePercentage = () => {
    const { totalLessons, attendedLessons } = attendanceData.stats || {};
    if (totalLessons === 0) return 0;
    return Math.round((attendedLessons / totalLessons) * 100);
  };

  if (loading) {
    return (
      <div className="attendance-widget">
        <h3>📊 Посещаемость</h3>
        <div className="loading-container">
          <div className="loader"></div>
          <p>Загрузка данных о посещаемости...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-widget">
        <h3>📊 Посещаемость</h3>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadAttendanceData} className="retry-btn">
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  if (attendanceData.length === 0) {
    return (
      <div className="attendance-widget">
        <h3>📊 Посещаемость</h3>
        <div className="empty-state">
          <p>Данные о посещаемости отсутствуют</p>
          <span className="empty-subtitle">Возможно, вы еще не записаны на курсы</span>
        </div>
      </div>
    );
  }

  const stats = attendanceData.stats || {};
  const percentage = getAttendancePercentage();
  const calendarWeeks = generateCalendarGrid();
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  return (
    <div className="attendance-widget">
      <h3>📊 Посещаемость за последний год</h3>
      
      {/* Статистика */}
      <div className="attendance-stats-grid">
        <div className="stat-item">
          <span className="stat-number">{stats.totalLessons || 0}</span>
          <span className="stat-label">всего занятий</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.attendedLessons || 0}</span>
          <span className="stat-label">посещено</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.excusedLessons || 0}</span>
          <span className="stat-label">уважительно</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{percentage}%</span>
          <span className="stat-label">процент посещения</span>
        </div>
      </div>

      {/* Календарь активности */}
      <div className="activity-calendar">
        <div className="calendar-header">
          <div className="months-row">
            {monthNames.map((month, index) => (
              <span key={index} className="month-label">{month}</span>
            ))}
          </div>
        </div>
        
        <div className="calendar-grid">
          <div className="weekdays">
            <span></span>
            <span>Пн</span>
            <span></span>
            <span>Ср</span>
            <span></span>
            <span>Пт</span>
            <span></span>
          </div>
          
          <div className="weeks-container">
            {calendarWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="week-row">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`${getCellClass(day.dayData)} ${day.isToday ? 'today' : ''}`}
                    title={getDayTooltip(day)}
                    data-date={day.dateStr}
                  >
                    {day.dayData && (
                      <span className="day-indicator">
                        {day.dayData.length > 1 && (
                          <span className="lesson-count">{day.dayData.length}</span>
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Легенда */}
        <div className="calendar-legend">
          <span className="legend-label">Меньше</span>
          <div className="legend-colors">
            <div className="legend-item">
              <div className="day-cell empty"></div>
              <span>Нет занятий</span>
            </div>
            <div className="legend-item">
              <div className="day-cell excused"></div>
              <span>Уважительная</span>
            </div>
            <div className="legend-item">
              <div className="day-cell attended"></div>
              <span>Присутствовал</span>
            </div>
            <div className="legend-item">
              <div className="day-cell missed"></div>
              <span>Пропустил</span>
            </div>
          </div>
          <span className="legend-label">Больше</span>
        </div>
      </div>
    </div>
  );
}
