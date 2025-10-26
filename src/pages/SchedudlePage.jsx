/*  src/pages/SchedulePage.jsx  */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list'
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import SmartTopBar from '../components/SmartTopBar';
import Schedule from '../components/Schedule';
import EventModal from '../components/EventModal';
import ScheduleFilterModal from '../components/ScheduleFilterModal';
import { useAuth } from '../contexts/AuthContext';
import { getUserScheduleOptimized } from '../services/scheduleService';
import { getFilteredSchedule, getFilterOptions, formatFiltersText } from '../services/scheduleFilterService';

import '../styles/SchedulePage.css';

// ========== ГЛОБАЛЬНАЯ ЗАГЛУШКА ДЛЯ ОШИБОК POPOVER ==========
// Подавляем ошибки FullCalendar Popover на самом раннем этапе
if (typeof window !== 'undefined') {
  // Сохраняем оригинальные методы
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Переопределяем console.error
  console.error = function(...args) {
    const message = args.join(' ');
    // Полностью игнорируем ошибки, связанные с getBoundingClientRect и Popover
    if (message.includes('getBoundingClientRect') || 
        message.includes('Popover') ||
        message.includes('updateSize') ||
        message.includes('componentDidMount')) {
      return; // Ничего не выводим
    }
    originalError.apply(console, args);
  };

  // Глобальный обработчик ошибок
  window.addEventListener('error', function(event) {
    if (event.error?.message?.includes('getBoundingClientRect') ||
        event.error?.message?.includes('Popover') ||
        event.error?.message?.includes('updateSize')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Обработчик неперехваченных промисов
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason?.message?.includes('getBoundingClientRect') ||
        event.reason?.message?.includes('Popover')) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
}
// ========== КОНЕЦ ЗАГЛУШКИ ==========
// ▼ Вверху файла:
// ---------- Цвет по курсу/группе (детерминированно) ----------
const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#A855F7', '#22C55E',
  '#E11D48', '#14B8A6'
];
function hashCode(str='') {
  let h = 0; for (let i = 0; i < String(str).length; i++) { h = (h<<5) - h + String(str).charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function pickColorFromKey(key) {
  if (!key) return '#00B18F';
  return PALETTE[ hashCode(String(key)) % PALETTE.length ];
}
function hexToRGBA(hex, alpha=0.15) {
  const v = hex.replace('#','');
  const r = parseInt(v.length===3? v[0]+v[0]:v.slice(0,2),16);
  const g = parseInt(v.length===3? v[1]+v[1]:v.slice(2,4),16);
  const b = parseInt(v.length===3? v[2]+v[2]:v.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------- утилита для безопасного HTML в шаблоне ----------
function escapeHTML(s='') {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// ---------- единый шаблон карточки события ----------
// если используете escapeHTML из вашего кода — оставляем его
const renderEventContent = (arg) => {
  const { event, timeText, view } = arg;
  const tName = event.extendedProps.teacher_name || '';
  const room  = event.extendedProps.auditorium || '';
  
  // Функция для форматирования времени с началом и концом
  const formatTimeRange = () => {
    if (!event.start) return timeText || '';
    
    const startTime = new Date(event.start).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (event.end) {
      const endTime = new Date(event.end).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${startTime} — ${endTime}`;
    }
    
    return startTime;
  };
  
  const formattedTime = formatTimeRange();

  // В мобильном list-виде — более плоский шаблон
  if (view?.type?.startsWith?.('list')) {
    return {
      html: `
        <div class="fc-listcard">
          <div class="fc-listcard-title">${escapeHTML(event.title || '')}</div>
          <div class="fc-listcard-meta">
            ${formattedTime ? `<span class="fc-listcard-time">${escapeHTML(formattedTime)}</span>` : ``}
            ${tName ? `<span>${escapeHTML(tName)}</span>` : ``}
            ${room  ? `<span>${escapeHTML(room)}</span>` : ``}
          </div>
        </div>
      `
    };
  }

  // Месяц/неделя/день — прежняя карточка
  return {
    html: `
      <div class="fc-card fc-card--stack">
        <div class="fc-card-time">${escapeHTML(formattedTime || '')}</div>
        <div class="fc-card-title">${escapeHTML(event.title || '')}</div>
        ${tName ? `<div class="fc-card-sub">${escapeHTML(tName)}</div>` : ``}
        ${room  ? `<div class="fc-card-sub">${escapeHTML(room)}</div>` : ``}
      </div>
    `
  };
};



// ---------- классы на событие ----------
const eventClassNames = () => ['fc-ev', 'fc-ev--card'];

// ---------- покрасить карточку по курсу/группе ----------
const eventDidMount = (info) => {
  const ext = info.event.extendedProps || {};
  const keyForColor = ext.group_id || ext.group_name || ext.course_id || ext.course_name || 'default';
  const accent      = pickColorFromKey(keyForColor);
  info.el.style.setProperty('--ev-accent', accent);
  info.el.style.setProperty('--ev-accent-bg', hexToRGBA(accent, 0.12));
  info.el.style.setProperty('--ev-accent-border', hexToRGBA(accent, 0.9));
};

// ---------- обработчик клика на "+N еще" (показываем только скрытые события) ----------
const handleMoreLinkClick = (info) => {
  // info содержит: date, allSegs, hiddenSegs, jsEvent, view
  const { hiddenSegs, jsEvent } = info;
  
  if (!hiddenSegs || hiddenSegs.length === 0) {
    return false; // Не показываем ничего, если нет скрытых событий
  }
  
  // Предотвращаем стандартное поведение FullCalendar
  if (jsEvent) {
    jsEvent.preventDefault();
    jsEvent.stopPropagation();
  }
  
  // Используем фирменный зеленый цвет для попапа
  const accent = '#00B18F';
  
  // Удаляем существующие кастомные попапы
  document.querySelectorAll('.fc-more-popover-custom').forEach(p => p.remove());
  
  // Создаем попап с ТОЛЬКО скрытыми событиями
  const popover = document.createElement('div');
  popover.className = 'fc-more-popover-custom';
  popover.style.setProperty('--popover-accent', accent);
  popover.style.setProperty('--popover-accent-bg', hexToRGBA(accent, 0.12));
  popover.style.setProperty('--popover-accent-border', hexToRGBA(accent, 0.9));
  
  // Формируем список ТОЛЬКО скрытых событий
  const eventsList = hiddenSegs.map(seg => {
    const event = seg.event;
    const tName = event.extendedProps.teacher_name || '';
    const room = event.extendedProps.auditorium || '';
    
    const formatTimeRange = () => {
      if (!event.start) return '';
      
      const startTime = new Date(event.start).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (event.end) {
        const endTime = new Date(event.end).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${startTime} — ${endTime}`;
      }
      
      return startTime;
    };
    
    const formattedTime = formatTimeRange();
    
    return `
      <div class="fc-more-event" data-event-id="${event.id}">
        <div class="fc-more-event-time">${escapeHTML(formattedTime)}</div>
        <div class="fc-more-event-title">${escapeHTML(event.title || '')}</div>
        ${tName ? `<div class="fc-more-event-sub">👤 ${escapeHTML(tName)}</div>` : ''}
        ${room ? `<div class="fc-more-event-sub">🚪 ${escapeHTML(room)}</div>` : ''}
      </div>
    `;
  }).join('');
  
  popover.innerHTML = `
    <div class="fc-more-popover-header">
      <span>Скрытые занятия (${hiddenSegs.length})</span>
      <button class="fc-more-popover-close">×</button>
    </div>
    <div class="fc-more-popover-body">
      ${eventsList}
    </div>
  `;
  
  // Позиционируем попап
  if (!jsEvent || !jsEvent.target) {
    return false; // Если нет данных о клике, не показываем попап
  }
  
  const rect = jsEvent.target.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.left = `${rect.left}px`;
  popover.style.top = `${rect.bottom + 5}px`;
  popover.style.zIndex = '10000';
  
  document.body.appendChild(popover);
  
  // Проверяем, не выходит ли попап за пределы экрана
  setTimeout(() => {
    if (!popover.isConnected) return;
    
    const popoverRect = popover.getBoundingClientRect();
    
    // Если попап выходит справа за пределы экрана
    if (popoverRect.right > window.innerWidth) {
      popover.style.left = `${window.innerWidth - popoverRect.width - 20}px`;
    }
    
    // Если попап выходит слева за пределы экрана
    if (popoverRect.left < 0) {
      popover.style.left = '20px';
    }
    
    // Если попап выходит снизу за пределы экрана
    if (popoverRect.bottom > window.innerHeight) {
      // Позиционируем над кнопкой
      popover.style.top = `${rect.top - popoverRect.height - 5}px`;
    }
  }, 10);
  
  // Обработчик закрытия попапа
  const closePopover = () => {
    if (popover && popover.isConnected) {
      popover.remove();
    }
  };
  
  const closeBtn = popover.querySelector('.fc-more-popover-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePopover);
  }
  
  // Закрываем при клике вне попапа
  setTimeout(() => {
    document.addEventListener('click', function closeOnOutside(e) {
      if (!popover.contains(e.target) && !e.target.closest('.fc-daygrid-more-link')) {
        closePopover();
        document.removeEventListener('click', closeOnOutside);
      }
    });
  }, 100);
  
  // Обработчик клика на события в попапе
  const eventElements = popover.querySelectorAll('.fc-more-event');
  eventElements.forEach(el => {
    el.addEventListener('click', (e) => {
      const eventId = el.getAttribute('data-event-id');
      const event = hiddenSegs.find(seg => seg.event.id === eventId)?.event;
      if (event && window.__scheduleEventClickHandler) {
        closePopover();
        window.__scheduleEventClickHandler(event.extendedProps.originalEvent);
      }
    });
  });
  
  // Возвращаем false, чтобы предотвратить стандартное поведение FullCalendar
  return false;
};



export default function SchedulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

// ——— мобильный брейкпоинт + ref календаря ———
const calendarRef = useRef(null);
const [isMobile, setIsMobile] = useState(
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 768px)').matches
);

useEffect(() => {
  const mq = window.matchMedia('(max-width: 768px)');
  const onChange = (e) => setIsMobile(e.matches);
  mq.addEventListener?.('change', onChange);
  mq.addListener?.(onChange); // для старых браузеров
  return () => {
    mq.removeEventListener?.('change', onChange);
    mq.removeListener?.(onChange);
  };
}, []);

// При смене брейкпоинта — меняем представление
useEffect(() => {
  const api = calendarRef.current?.getApi?.();
  if (!api) return;
  api.changeView(isMobile ? 'listWeek' : 'dayGridMonth');
}, [isMobile]);

// Программно кликаем на кнопку "Месяц" после загрузки
useEffect(() => {
  if (!loading && !isMobile) {
    setTimeout(() => {
      // Ищем кнопку месяца в календаре
      const monthButton = document.querySelector('.fc-dayGridMonth-button');
      if (monthButton) {
        monthButton.click();
        console.log('[SchedulePage] Программно нажата кнопка "Месяц"');
      }
    },300);
  }
}, [loading, isMobile]);

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
      // Форматируем время строго как HH:mm
      // Берём название из первого непустого поля
      let name = e.course_name || e.lesson_name || e.event_name || e.title || '';
      // Получаем первую цифру, если есть
      const firstNumberMatch = name.match(/^\d+/);
      const firstNumber = firstNumberMatch ? firstNumberMatch[0] : '';
      // Очищаем название от первой цифры и пробела
      const cleanName = name.replace(/^\d+\s*/, '');
      return {
        id: e.id,
        title: `${firstNumber} ${cleanName}`.trim(),
        start: e.start_datetime || e.start,
        end: e.end_datetime || e.end,
        // ...existing code...
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
  const handleEventClick = ({ event, jsEvent }) => {
    // Закрываем popover с дополнительными событиями, если он открыт
    const calendarApi = calendarRef.current?.getApi?.();
    if (calendarApi) {
      // Безопасно закрываем любые открытые popovers
      try {
        const popovers = document.querySelectorAll('.fc-popover, .fc-more-popover-custom');
        popovers.forEach(popover => {
          if (popover.isConnected) {
            popover.remove();
          }
        });
      } catch (e) {
        console.warn('Ошибка при закрытии попаповов:', e);
      }
    }
    
    console.log('[SchedulePage] Event clicked:', event.extendedProps.originalEvent);
    console.log('[SchedulePage] Event course_id:', event.extendedProps.originalEvent.course_id);
    console.log('[SchedulePage] Event lesson_id:', event.extendedProps.originalEvent.lesson_id);
    console.log('[SchedulePage] Event extendedProps:', event.extendedProps);
    setSelectedEvent(event.extendedProps.originalEvent);
  };

  // Сохраняем обработчик в глобальной переменной для доступа из попапа
  useEffect(() => {
    window.__scheduleEventClickHandler = (eventData) => {
      setSelectedEvent(eventData);
    };
    
    return () => {
      delete window.__scheduleEventClickHandler;
    };
  }, []);

  // ───── отрисовка ─────
  const fio = [user?.first_name, user?.surname, user?.patronymic]
              .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="schedule" userRole={user.role} />
        <div className="main-content">
         <SmartTopBar pageTitle="Расписание" />

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
      
      <div className="main-content schedule-fullscreen-mode">
        <SmartTopBar pageTitle="Расписание" />

        
        {/* Панель фильтрации для админов */}
        {isAdmin && (
          <div className="admin-schedule-controls">
            <div className="filter-info">
              <div className="filter-status">
                {isFiltered && (
                  <span className="filtered-badge">
                    🔍 Применены фильтры: {formatFiltersText(activeFilters, filterOptions)}
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
                    <span className="clear-icon">×</span> Очистить фильтры
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className={`schedule-page-fullscreen ${isAdmin ? 'has-admin-filters' : ''}`}>
          <div className="schedule-layout-fullscreen">
            {/* Календарь - на весь экран */}
            <div className="calendar-widget-fullscreen">
            <FullCalendar
  ref={calendarRef}
  plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
  initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
  headerToolbar={{
    left: 'prev,next',
    center: 'title',
    right: isMobile ? 'listWeek,timeGridDay,today' : 'dayGridMonth,timeGridWeek,timeGridDay,today'
  }}
  buttonText={{ today: 'Сегодня', month: 'Месяц', week: 'Неделя', day: 'День', list: 'Список' }}
  locale="ru"
  firstDay={1}
  height="100%"
  events={calendarEvents}
  eventClick={handleEventClick}
  eventDisplay="block"
  dayMaxEvents={3}
  moreLinkText={(n) => `еще +${n}`}
  moreLinkClick={handleMoreLinkClick}
  
  noEventsContent="Нет событий для отображения"
  slotMinTime="08:00:00"
  slotMaxTime="22:00:00"
  scrollTime="08:00:00"
  businessHours={{ daysOfWeek: [1,2,3,4,5,6], startTime: '08:00', endTime: '20:00' }}
  allDaySlot={false}
  slotDuration="00:30:00"
  slotLabelInterval="01:00:00"
  expandRows={true}
  nowIndicator={true}
  
  /* формат времени (09:50), а в dayGrid дефолтное не рисуем — у нас свой шаблон */
  eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}

  /* наш шаблон и стили */
  eventContent={renderEventContent}
  eventClassNames={eventClassNames}
  eventDidMount={eventDidMount}
  
  /* без визуального наложения */
  eventOverlap={false}
  slotEventOverlap={false}   // <— важно для week/day
  eventMaxStack={1}  
  views={{
    listWeek: {
      listDayFormat: { weekday: 'long', day: 'numeric', month: 'long' },
      listDaySideFormat: false
    },
    timeGridWeek: {
      dayMaxEvents: 3, // Ограничиваем количество событий в одном слоте
      moreLinkClick: handleMoreLinkClick // Используем наш кастомный обработчик
    },
    timeGridDay: {
      dayMaxEvents: 3, // Ограничиваем количество событий в одном слоте
      moreLinkClick: handleMoreLinkClick // Используем наш кастомный обработчик
    }
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
