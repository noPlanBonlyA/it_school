/*  src/pages/SchedulePage.jsx  */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import Schedule from '../components/Schedule';
import EventModal from '../components/EventModal';
import ScheduleFilterModal from '../components/ScheduleFilterModal';
import { useAuth } from '../contexts/AuthContext';
import { getUserScheduleOptimized } from '../services/scheduleService';
import { getFilteredSchedule, getFilterOptions, formatFiltersText } from '../services/scheduleFilterService';

import '../styles/SchedulePage.css';

export default function SchedulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Состояния для фильтрации (только для админов)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [isFiltered, setIsFiltered] = useState(false);

  // Проверяем, является ли пользователь админом
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // ───── загрузка опций для фильтров ─────
  useEffect(() => {
    if (!isAdmin) return;

    const loadFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
      } catch (error) {
        console.error('[SchedulePage] Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, [isAdmin]);

  // ───── загрузка расписания ─────
  const loadSchedule = async (filters = {}) => {
    try {
      setLoading(true);
      
      let scheduleData;
      if (isAdmin && Object.keys(filters).length > 0) {
        // Для админов с фильтрами - используем фильтрованное расписание
        scheduleData = await getFilteredSchedule(filters);
        setIsFiltered(true);
      } else {
        // Обычное расписание для всех или админов без фильтров
        scheduleData = await getUserScheduleOptimized(user);
        setIsFiltered(false);
      }
      
      console.log('[SchedulePage] Schedule loaded:', scheduleData);
      setEvents(scheduleData || []);
    } catch (error) {
      console.error('[SchedulePage] Error loading schedule:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadSchedule(activeFilters);
  }, [user, navigate, activeFilters]);

  // ───── обработка фильтров ─────
  const handleFilterApply = (filters) => {
    console.log('[SchedulePage] Applying filters:', filters);
    setActiveFilters(filters);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  // ───── подготовка событий для FullCalendar ─────
  const calendarEvents = useMemo(() => events.map(e => {
    // Форматируем время
    const startTime = new Date(e.start_datetime || e.start).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return {
      id: e.id,
      title: `${startTime} ${e.course_name}`, // Показываем только время и название курса
      start: e.start_datetime || e.start,
      end: e.end_datetime || e.end,
      // Обновленные прозрачные цвета для красивого отображения
      backgroundColor: e.is_opened 
        ? 'rgba(0, 177, 143, 0.85)' 
        : new Date() < new Date(e.start_datetime || e.start) 
          ? 'rgba(255, 193, 7, 0.85)' 
          : 'rgba(239, 68, 68, 0.85)',
      borderColor: e.is_opened 
        ? 'rgba(3, 131, 106, 0.9)' 
        : new Date() < new Date(e.start_datetime || e.start) 
          ? 'rgba(211, 158, 0, 0.9)' 
          : 'rgba(220, 38, 38, 0.9)',
      extendedProps: {
        originalEvent: e,
        lesson_name: e.lesson_name,
        course_name: e.course_name,
        group_name: e.group_name,
        teacher_name: e.teacher_name,
        auditorium: e.auditorium,
        is_opened: e.is_opened,
        course_id: e.course_id,
        lesson_id: e.lesson_id
      }
    };
  }), [events]);

  // ───── ближайший день ─────
  const nearestDayISO = useMemo(() => {
    if (!events.length) return null;
    
    const today = new Date();
    today.setHours(8, 0, 0, 0); // Начинаем поиск с 8:00 утра, а не с 00:00
    
    const upcomingEvents = events
      .filter(e => new Date(e.start_datetime || e.start) >= today)
      .sort((a, b) => new Date(a.start_datetime || a.start) - new Date(b.start_datetime || b.start));
    
    return upcomingEvents.length > 0 
      ? new Date(upcomingEvents[0].start_datetime || upcomingEvents[0].start)
      : new Date();
  }, [events]);

  const nearestDayEvents = useMemo(() => {
    if (!nearestDayISO) return [];
    
    const targetDate = nearestDayISO.toDateString();
    return events.filter(e => {
      const eventDate = new Date(e.start_datetime || e.start).toDateString();
      return eventDate === targetDate;
    });
  }, [events, nearestDayISO]);

  const widgetLabel = nearestDayISO
    ? nearestDayISO.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Нет занятий';

  // ───── при клике на событие открываем мини-виджет ─────
  const handleEventClick = ({ event }) => {
    console.log('[SchedulePage] Event clicked:', event.extendedProps.originalEvent);
    console.log('[SchedulePage] Event course_id:', event.extendedProps.originalEvent.course_id);
    console.log('[SchedulePage] Event lesson_id:', event.extendedProps.originalEvent.lesson_id);
    console.log('[SchedulePage] Event extendedProps:', event.extendedProps);
    setSelectedEvent(event.extendedProps.originalEvent);
  };

  // ───── отрисовка ─────
  const fio = [user?.first_name, user?.surname, user?.patronymic]
              .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="schedule" userRole={user.role} />
        <div className="main-content">
          <Topbar userName={fio} userRole={user.role} onProfileClick={() => navigate('/profile')} />
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка расписания...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="schedule" userRole={user.role} />
      
      <div className="main-content">
        <Topbar userName={fio} userRole={user.role} pageTitle="Расписание" onProfileClick={() => navigate('/profile')} />
        
        {/* Панель фильтрации для админов */}
        {isAdmin && (
          <div className="admin-schedule-controls">
            <div className="filter-info">
              <div className="filter-status">
                {isFiltered ? (
                  <span className="filtered-badge">
                    🔍 Применены фильтры: {formatFiltersText(activeFilters, filterOptions)}
                  </span>
                ) : (
                  <span className="all-items-badge">
                    📋 Показаны все записи расписания
                  </span>
                )}
              </div>
              <div className="filter-controls">
                <button 
                  className="btn btn-filter" 
                  onClick={() => setShowFilterModal(true)}
                >
                  🔍 Фильтрация
                </button>
                {isFiltered && (
                  <button 
                    className="btn btn-clear" 
                    onClick={handleClearFilters}
                  >
                    ✖️ Очистить фильтры
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="schedule-page">
          <div className="schedule-layout">
            {/* Календарь - теперь на всю ширину */}
            <div className="calendar-widget full-width">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                locale="ru"
                height="calc(100vh - 250px)" /* Фиксированная высота для лучшего отображения */
                events={calendarEvents}
                eventClick={handleEventClick}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkText="ещё"
                slotMinTime="08:00:00"
                slotMaxTime="22:00:00"
                scrollTime="08:00:00"
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн-Сб
                  startTime: '08:00',
                  endTime: '20:00'
                }}
                allDaySlot={false}
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"
                expandRows={true}
                nowIndicator={true}
                
                /* Настройки формата времени */
                slotLabelFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
              />
            </div>
          </div>
        </div>

        {/* Модальное окно фильтрации для админов */}
        {isAdmin && (
          <ScheduleFilterModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            onFilterApply={handleFilterApply}
            currentFilters={activeFilters}
          />
        )}

        {/* Модальное окно детальной информации о событии */}
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          userRole={user?.role}
        />
      </div>
    </div>
  );
}
