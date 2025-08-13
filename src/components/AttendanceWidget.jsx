// src/components/AttendanceWidget.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import '../styles/AttendanceWidget.css';

export default function AttendanceWidget({ userId }) {
  const [attendanceData, setAttendanceData] = useState({
    attendanceMap: {},
    stats: {
      totalLessons: 0,
      attendedLessons: 0,
      excusedLessons: 0,
      missedLessons: 0,
      futureLessons: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Загружаем данные о посещаемости
  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userId) {
        console.warn('[AttendanceWidget] No userId provided');
        setError('Не указан ID пользователя');
        return;
      }
      
      console.log('[AttendanceWidget] Loading attendance data for user:', userId);
      const response = await api.get('/courses/student/lesson-student');
      
      console.log('[AttendanceWidget] API Response:', response);
      console.log('[AttendanceWidget] API Response data:', response.data);
      console.log('[AttendanceWidget] API Response status:', response.status);
      
      const lessonStudents = response.data || [];
      
      console.log('[AttendanceWidget] Lesson students array:', lessonStudents);
      console.log('[AttendanceWidget] Array length:', lessonStudents.length);
      
      if (lessonStudents.length === 0) {
        console.log('[AttendanceWidget] No lesson students found - user might not be enrolled in any courses or have no lessons yet');
      }
      
      // Группируем по дате
      const attendanceMap = {};
      let totalLessons = 0;
      let attendedLessons = 0;
      let excusedLessons = 0;
      let missedLessons = 0;
      let futureLessons = 0; // Счетчик будущих уроков
      
      // Получаем текущую дату в локальном времени
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');

      lessonStudents.forEach((ls, index) => {
        console.log(`[AttendanceWidget] Processing lesson student ${index}:`, ls);
        console.log(`[AttendanceWidget] lesson_group:`, ls.lesson_group);
        console.log(`[AttendanceWidget] lesson_group.lesson:`, ls.lesson_group?.lesson);
        console.log(`[AttendanceWidget] lesson_group.lesson.course:`, ls.lesson_group?.lesson?.course);
        
        if (!ls.lesson_group?.start_datetime) {
          console.log(`[AttendanceWidget] Skipping lesson student ${index} - no start_datetime`);
          return;
        }
        
        // Правильно обрабатываем дату с учетом часового пояса
        const lessonDate = new Date(ls.lesson_group.start_datetime);
        const dateStr = lessonDate.getFullYear() + '-' + 
          String(lessonDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(lessonDate.getDate()).padStart(2, '0');
        
        if (!attendanceMap[dateStr]) {
          attendanceMap[dateStr] = [];
        }
        
        // Определяем статус посещаемости на основе булевых полей
        let attendance_status = 'unknown';
        let isFuture = dateStr > todayStr;
        
        if (isFuture) {
          // Для будущих уроков
          attendance_status = 'future';
          futureLessons++;
          console.log(`[AttendanceWidget] Future lesson found: ${dateStr}`);
        } else {
          // Для прошедших уроков - считаем в статистике
          if (ls.is_visited) {
            attendance_status = 'attended';
          } else if (ls.is_excused_absence) {
            attendance_status = 'excused';
          } else {
            attendance_status = 'missed';
          }
          
          totalLessons++;
          if (attendance_status === 'attended') attendedLessons++;
          else if (attendance_status === 'excused') excusedLessons++;
          else if (attendance_status === 'missed') missedLessons++;
        }
        
        attendanceMap[dateStr].push({
          course_name: ls.lesson_group?.lesson?.course?.name || 'Неизвестный курс',
          lesson_name: ls.lesson_group?.lesson?.name || 'Неизвестный урок',
          attendance_status: attendance_status,
          start_datetime: ls.lesson_group.start_datetime,
          is_visited: ls.is_visited,
          is_excused_absence: ls.is_excused_absence,
          is_compensated_skip: ls.is_compensated_skip,
          is_future: isFuture
        });
        
        console.log(`[AttendanceWidget] Added lesson for ${dateStr}:`, {
          course_name: ls.lesson_group?.lesson?.course?.name || 'Неизвестный курс',
          lesson_name: ls.lesson_group?.lesson?.name || 'Неизвестный урок',
          attendance_status,
          is_visited: ls.is_visited,
          is_excused_absence: ls.is_excused_absence,
          is_future: isFuture
        });
      });
      
      console.log('[AttendanceWidget] Processed data:', {
        attendanceMap,
        stats: { totalLessons, attendedLessons, excusedLessons, missedLessons, futureLessons }
      });
      
      setAttendanceData({
        attendanceMap,
        stats: {
          totalLessons,
          attendedLessons,
          excusedLessons,
          missedLessons,
          futureLessons
        }
      });
    } catch (err) {
      console.error('[AttendanceWidget] Error loading data:', err);
      console.error('[AttendanceWidget] Error response:', err.response);
      console.error('[AttendanceWidget] Error status:', err.response?.status);
      console.error('[AttendanceWidget] Error data:', err.response?.data);
      
      let errorMessage = 'Ошибка загрузки данных';
      if (err.response?.status === 401) {
        errorMessage = 'Ошибка авторизации';
      } else if (err.response?.status === 403) {
        errorMessage = 'Нет доступа к данным';
      } else if (err.response?.status === 404) {
        errorMessage = 'Данные не найдены';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadAttendanceData();
    }
  }, [userId]);

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
          <div className="error-message">{error}</div>
          <button className="retry-btn" onClick={loadAttendanceData}>
            Попробовать еще раз
          </button>
        </div>
      </div>
    );
  }

  // Функции для работы с месячным календарем
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Генерируем календарную сетку для текущего месяца
  const generateMonthCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Первый день месяца
    const firstDay = new Date(year, month, 1);
    // Последний день месяца
    const lastDay = new Date(year, month + 1, 0);
    
    // Определяем, с какого дня недели начинается месяц (понедельник = 0)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Конвертируем в формат понедельник=0
    
    const daysInMonth = lastDay.getDate();
    const calendar = [];
    
    // Добавляем дни предыдущего месяца для заполнения первой недели
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateStr = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
      calendar.push({
        date,
        dateStr: dateStr,
        dayData: attendanceData.attendanceMap?.[dateStr] || null,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Добавляем дни текущего месяца
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
      const isToday = dateStr === todayStr;
      
      calendar.push({
        date,
        dateStr,
        dayData: attendanceData.attendanceMap?.[dateStr] || null,
        isCurrentMonth: true,
        isToday
      });
    }
    
    // Добавляем дни следующего месяца для заполнения последней недели
    const remainingDays = 42 - calendar.length; // 6 недель × 7 дней = 42
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateStr = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
      calendar.push({
        date,
        dateStr: dateStr,
        dayData: attendanceData.attendanceMap?.[dateStr] || null,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Разбиваем на недели
    const weeks = [];
    for (let i = 0; i < calendar.length; i += 7) {
      weeks.push(calendar.slice(i, i + 7));
    }
    
    return weeks;
  };

    // Получаем CSS класс для ячейки дня
  const getDayCellClass = (dayData, isCurrentMonth = true, isToday = false) => {
    let baseClass = 'day-cell';
    
    // Добавляем класс для дней не текущего месяца
    if (!isCurrentMonth) {
      baseClass += ' other-month';
    }
    
    // Добавляем класс для сегодняшнего дня
    if (isToday) {
      baseClass += ' today';
    }
    
    // Если нет данных о занятиях
    if (!dayData || dayData.length === 0) {
      baseClass += ' empty';
      return baseClass;
    }
    
    // Проверяем, есть ли будущие уроки
    const futureCount = dayData.filter(lesson => lesson.is_future).length;
    const pastLessons = dayData.filter(lesson => !lesson.is_future);
    
    if (futureCount > 0 && pastLessons.length === 0) {
      // Только будущие уроки
      baseClass += ' future';
    } else if (pastLessons.length > 0) {
      // Есть прошедшие уроки - определяем статус по ним
      const attendedCount = pastLessons.filter(lesson => lesson.is_visited).length;
      const excusedCount = pastLessons.filter(lesson => lesson.is_excused_absence).length;
      const missedCount = pastLessons.filter(lesson => !lesson.is_visited && !lesson.is_excused_absence).length;
      
      // Приоритет: пропуск > уваж. причина > посещение
      if (missedCount > 0) {
        baseClass += ' missed';
      } else if (excusedCount > 0) {
        baseClass += ' excused';
      } else if (attendedCount > 0) {
        baseClass += ' attended';
      }
      
      // Если есть еще и будущие уроки, добавляем соответствующий класс
      if (futureCount > 0) {
        baseClass += ' has-future';
      }
    } else {
      baseClass += ' empty';
    }
    
    // Добавляем интенсивность в зависимости от количества занятий
    const totalLessons = dayData.length;
    const intensity = Math.min(totalLessons, 4);
    if (intensity > 0) {
      baseClass += ` intensity-${intensity}`;
    }
    
    return baseClass;
  };

  // Получаем текст подсказки для дня
  const getTooltipText = (dayData, dateStr) => {
    const date = new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    if (!dayData || dayData.length === 0) {
      return `${date} - нет занятий`;
    }
    
    const pastLessons = dayData.filter(lesson => !lesson.is_future);
    const futureLessons = dayData.filter(lesson => lesson.is_future);
    
    const lessons = [];
    
    // Добавляем прошедшие уроки с их статусом
    pastLessons.forEach(lesson => {
      const status = lesson.attendance_status === 'attended' ? 'присутствовал' :
                    lesson.attendance_status === 'excused' ? 'уважительная причина' :
                    lesson.attendance_status === 'missed' ? 'отсутствовал' : 'неизвестно';
      lessons.push(`${lesson.course_name || 'Занятие'}: ${status}`);
    });
    
    // Добавляем будущие уроки
    futureLessons.forEach(lesson => {
      lessons.push(`${lesson.course_name || 'Занятие'}: запланировано`);
    });
    
    return `${date}\n${lessons.join('\n')}`;
  };

  const getAttendancePercentage = () => {
    const { totalLessons, attendedLessons } = attendanceData.stats || {};
    if (totalLessons === 0) return 0;
    return Math.round((attendedLessons / totalLessons) * 100);
  };

  const stats = attendanceData.stats || {};
  const percentage = getAttendancePercentage();
  const weeks = generateMonthCalendar();

  return (
    <div className="attendance-widget">
      <div className="attendance-header">
        <h3>📊 Календарь посещаемости</h3>
        <div className="attendance-summary">
          <span className="summary-text">
            <strong>{stats.totalLessons || 0}</strong> прошедших занятий
            {stats.futureLessons > 0 && (
              <span className="future-info">
                , <strong>{stats.futureLessons}</strong> впереди
              </span>
            )}
          </span>
        </div>
      </div>
      
      {/* Статистика */}
      <div className="attendance-stats-grid">
        <div className="stat-item">
          <span className="stat-number">{stats.totalLessons || 0}</span>
          <span className="stat-label">прошедших занятий</span>
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
        {stats.futureLessons > 0 && (
          <div className="stat-item future-lessons">
            <span className="stat-number">{stats.futureLessons}</span>
            <span className="stat-label">будущих занятий</span>
          </div>
        )}
      </div>

      {/* Календарь активности по месяцам */}
      <div className="activity-calendar">
        <div className="calendar-container">
          {/* Навигация по месяцам */}
          <div className="month-navigation">
            <button 
              className="nav-button" 
              onClick={goToPreviousMonth}
              title="Предыдущий месяц"
            >
              ←
            </button>
            <h3 className="current-month">
              {currentDate.toLocaleDateString('ru-RU', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h3>
            <button 
              className="nav-button" 
              onClick={goToNextMonth}
              title="Следующий месяц"
            >
              →
            </button>
            <button 
              className="nav-button today-button" 
              onClick={goToCurrentMonth}
              title="Текущий месяц"
            >
              Сегодня
            </button>
          </div>
          
          <div className="calendar-grid">
            {/* Дни недели */}
            <div className="weekdays-header">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="weekday-label">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Календарная сетка */}
            <div className="calendar-weeks">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="calendar-week">
                  {week.map((day, dayIndex) => {
                    const cellClass = getDayCellClass(day.dayData, day.isCurrentMonth, day.isToday);
                    const tooltipText = getTooltipText(day.dayData, day.dateStr);
                    
                    return (
                      <div
                        key={dayIndex}
                        className={cellClass}
                        title={tooltipText}
                      >
                        <span className="day-number">
                          {day.date.getDate()}
                        </span>
                        {day.dayData && day.dayData.length > 0 && (
                          <div className="lesson-indicator">
                            <span className="lesson-count">{day.dayData.length}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
              <div className="day-cell future intensity-1"></div>
              <span>Запланировано</span>
            </div>
            <div className="legend-item">
              <div className="day-cell excused intensity-1"></div>
              <span>Уважительная</span>
            </div>
            <div className="legend-item">
              <div className="day-cell attended intensity-1"></div>
              <span>Присутствовал</span>
            </div>
            <div className="legend-item">
              <div className="day-cell missed intensity-1"></div>
              <span>Пропустил</span>
            </div>
          </div>
          <span className="legend-label">Больше</span>
        </div>
      </div>
    </div>
  );
}
