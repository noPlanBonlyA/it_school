/*  src/pages/SchedulePage.jsx  */
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar      from '../components/Sidebar';
import Topbar       from '../components/TopBar';
import ScheduleList from '../components/ScheduleList';

import FullCalendar      from '@fullcalendar/react';
import timeGridPlugin    from '@fullcalendar/timegrid';
import dayGridPlugin     from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { useAuth }         from '../contexts/AuthContext';
import { getUserSchedule } from '../services/scheduleService';

import '../styles/SchedulePage.css';

export default function SchedulePage() {
  const navigate                   = useNavigate();
  const { user }                   = useAuth();
  const [events, setEvents]        = useState([]);           
  const [selectedEvent, setSelectedEvent] = useState(null); 
  const [loading, setLoading]      = useState(true);

  // ───── загрузка расписания ─────
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    (async () => {
      try {
        setLoading(true);
        const schedule = await getUserSchedule(user);
        console.log('[Schedule] Loaded events:', schedule);
        setEvents(schedule || []);
      } catch (error) {
        console.error('[Schedule] Error loading schedule:', error);
        alert('Не удалось загрузить расписание');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  // ───── подготовка событий для FullCalendar ─────
  const calendarEvents = useMemo(() => events.map(e => {
    const startDate = new Date(e.holding_date || e.start);
    const endDate = new Date(startDate.getTime() + (90 * 60 * 1000)); // +90 минут
    
    // Определяем цвет в зависимости от статуса
    let backgroundColor = '#6c757d'; // серый по умолчанию
    if (e.is_opened) {
      backgroundColor = '#28a745'; // зеленый для открытых
    } else if (new Date() < startDate) {
      backgroundColor = '#ffc107'; // желтый для будущих
    }
    
    return {
      id             : e.id,
      start          : startDate.toISOString(),
      end            : endDate.toISOString(),
      title          : user.role === 'student'
        ? e.lesson_name
        : `${e.lesson_name} (${e.group_name || 'группа'})`,
      backgroundColor: backgroundColor,
      borderColor    : 'transparent',
      textColor      : '#ffffff',
      extendedProps  : {
        course_name: e.course_name,
        group_name: e.group_name,
        teacher_name: e.teacher_name,
        is_opened: e.is_opened,
        description: e.description
      }
    };
  }), [events, user.role]);

  // ───── ближайший день ─────
  const nearestDayISO = useMemo(() => {
    if (!events.length) return null;
    const todayMid = new Date().setHours(0,0,0,0);
    const days = Array.from(new Set(
      events.map(e => new Date(e.holding_date || e.start).setHours(0,0,0,0))
    )).filter(d => d >= todayMid).sort();
    
    return days.length ? new Date(days[0]) : null;
  }, [events]);

  const nearestDayEvents = useMemo(() => {
    if (!nearestDayISO) return [];
    return events.filter(ev => {
      const eventDate = new Date(ev.holding_date || ev.start);
      return eventDate.setHours(0,0,0,0) === nearestDayISO.getTime();
    }).sort((a, b) => {
      const timeA = new Date(a.holding_date || a.start);
      const timeB = new Date(b.holding_date || b.start);
      return timeA - timeB;
    });
  }, [events, nearestDayISO]);

  const widgetLabel = nearestDayISO
    ? nearestDayISO.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})
    : 'Нет занятий';

  // ───── при клике на событие открываем мини-виджет ─────
  const handleEventClick = ({ event }) => {
    const found = events.find(e => e.id === event.id);
    setSelectedEvent(found || null);
  };

  // ───── отрисовка ─────
  const fio = [ user?.first_name, user?.surname, user?.patronymic ]
              .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout schedule-page">
        <Sidebar activeItem="schedule" userRole={user?.role} />
        <div className="main-content">
          <Topbar
            userName={fio}
            userRole={user?.role}
            onProfileClick={() => navigate('/profile')}
          />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Загрузка расписания...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout schedule-page">
      <Sidebar activeItem="schedule" userRole={user?.role} />

      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={user?.role}
          onProfileClick={() => navigate('/profile')}
        />

        <div className="schedule-header">
          <h1 className="page-title">Расписание</h1>
          <div className="schedule-stats">
            <div className="stat-item">
              <span className="stat-number">{events.length}</span>
              <span className="stat-label">Всего занятий</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{events.filter(e => e.is_opened).length}</span>
              <span className="stat-label">Открыто</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{nearestDayEvents.length}</span>
              <span className="stat-label">Сегодня</span>
            </div>
          </div>
        </div>

        <div className="schedule-layout">
          {/* левая колонка — список ближайшего дня */}
          <div className="schedule-sidebar">
            <div className="widget-card">
              <div className="widget-header">
                <h3>Занятия на {widgetLabel}</h3>
                <span className="widget-count">{nearestDayEvents.length}</span>
              </div>
              <div className="widget-content">
                <ScheduleList events={nearestDayEvents} />
              </div>
            </div>

            {/* Легенда */}
            <div className="legend-card">
              <h4>Статусы занятий</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-color opened"></div>
                  <span>Открыто для изучения</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color scheduled"></div>
                  <span>Запланировано</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color closed"></div>
                  <span>Закрыто</span>
                </div>
              </div>
            </div>
          </div>

          {/* правая колонка — календарь */}
          <div className="schedule-main">
            <div className="calendar-container">
              <FullCalendar
                plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,today,next',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                /* ОБНОВЛЕНО: расширили время с 7:00 до 23:00 */
                slotMinTime="07:00:00"
                slotMaxTime="23:00:00"
                slotDuration="00:30:00"
                /* ДОБАВЛЕНО: больше интервалов на час для удобства */
                slotLabelInterval="01:00:00"
                /* ДОБАВЛЕНО: формат времени 24-часовой */
                slotLabelFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
                allDaySlot={false}
                events={calendarEvents}
                eventClick={handleEventClick}
                height="auto"
                locale="ru"
                firstDay={1}
                weekends={true}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkClick="popover"
                /* ДОБАВЛЕНО: настройки для улучшения отображения */
                nowIndicator={true}
                scrollTime="07:00:00"
                expandRows={true}
                eventDidMount={(info) => {
                  // Добавляем тултип
                  info.el.setAttribute('title', 
                    `${info.event.title}\n${info.event.extendedProps.course_name || ''}`
                  );
                }}
              />
            </div>
          </div>
        </div>

        {/* мини-виджет с деталями выбранного урока */}
        {selectedEvent && (
          <div className="event-details-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="event-details" onClick={e => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => setSelectedEvent(null)}
              >×</button>

              <div className="event-header">
                <h2>{selectedEvent.lesson_name}</h2>
                <div className={`status-badge ${selectedEvent.is_opened ? 'opened' : 'closed'}`}>
                  {selectedEvent.is_opened ? '🟢 Открыт' : '🔴 Закрыт'}
                </div>
              </div>

              <div className="event-info">
                <div className="info-item">
                  <strong>Курс:</strong> 
                  <span>{selectedEvent.course_name}</span>
                </div>
                <div className="info-item">
                  <strong>Группа:</strong> 
                  <span>{selectedEvent.group_name || '—'}</span>
                </div>
                <div className="info-item">
                  <strong>Преподаватель:</strong> 
                  <span>{selectedEvent.teacher_name || '—'}</span>
                </div>
                <div className="info-item">
                  <strong>Дата и время:</strong>
                  <span>
                    {new Date(selectedEvent.holding_date || selectedEvent.start).toLocaleString('ru-RU',{
                      day:'2-digit', month:'2-digit', year:'numeric',
                      hour:'2-digit', minute:'2-digit'
                    })}
                  </span>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="event-description">
                  <strong>Описание:</strong>
                  <p>{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.is_opened && user.role === 'student' && (
                <div className="event-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      // Здесь можно добавить переход к уроку
                      console.log('Открыть урок:', selectedEvent);
                    }}
                  >
                    Перейти к уроку
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
