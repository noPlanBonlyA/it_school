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
import { useAuth } from '../contexts/AuthContext';
import { getUserScheduleOptimized } from '../services/scheduleService';

import '../styles/SchedulePage.css';

export default function SchedulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // ───── загрузка расписания ─────
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const scheduleData = await getUserScheduleOptimized(user);
        console.log('[SchedulePage] Schedule loaded:', scheduleData);
        setEvents(scheduleData || []);
      } catch (error) {
        console.error('[SchedulePage] Error loading schedule:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  // ───── подготовка событий для FullCalendar ─────
  const calendarEvents = useMemo(() => events.map(e => ({
    id: e.id,
    title: `${e.lesson_name} (${e.course_name})`,
    start: e.start_datetime || e.start,
    end: e.end_datetime || e.end,
    backgroundColor: e.is_opened ? '#22c55e' : 
                     new Date() < new Date(e.start_datetime || e.start) ? '#f59e0b' : '#ef4444',
    borderColor: e.is_opened ? '#16a34a' : 
                 new Date() < new Date(e.start_datetime || e.start) ? '#d97706' : '#dc2626',
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
  })), [events]);

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
        
        <div className="schedule-page">
          <div className="schedule-layout">
            {/* Виджет ближайших занятий */}
            <div className="widget nearest-lessons">
              <h2>{widgetLabel}</h2>
              <Schedule 
                events={nearestDayEvents} 
                onSelect={setSelectedEvent}
                selectedEvent={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            </div>

            {/* Календарь */}
            <div className="calendar-widget">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                locale="ru"
                height="auto"
                events={calendarEvents}
                eventClick={handleEventClick}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkText="ещё"
                slotMinTime="08:00:00" /* Начинаем показ с 8:00 утра */
                slotMaxTime="22:00:00" /* Заканчиваем в 22:00 */
                scrollTime="08:00:00" /* Автоматическая прокрутка к 8:00 */
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн-Сб
                  startTime: '08:00',
                  endTime: '20:00'
                }}
                allDaySlot={false} /* Убираем строку "Весь день" */
                slotDuration="00:30:00" /* 30-минутные интервалы */
                slotLabelInterval="01:00:00" /* Показываем метки времени каждый час */
                expandRows={true} /* Растягиваем строки */
                nowIndicator={true} /* Показываем текущее время */
                
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
      </div>
    </div>
  );
}
