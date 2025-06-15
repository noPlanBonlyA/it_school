// src/pages/SchedulePage.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar      from '../components/Sidebar';
import Topbar       from '../components/TopBar';
import ScheduleList from '../components/ScheduleList';

import FullCalendar      from '@fullcalendar/react';
import timeGridPlugin    from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { AuthContext } from '../contexts/AuthContext';
import userService     from '../services/userService';

import '../styles/SchedulePage.css';

export default function SchedulePage() {
  const navigate    = useNavigate();
  const { user }    = useContext(AuthContext);
  const [fullUser,  setFullUser]  = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // Пример уведомлений
  const [notifications] = useState([
    { id: 1, title: 'Лекция по React',             time: '05 июня 2025, 09:00' },
    { id: 2, title: 'Практика по Node.js',          time: '05 июня 2025, 11:00' },
    { id: 3, title: 'Домашнее задание ML проверка',  time: '06 июня 2025, 14:00' },
  ]);

  // Исходный массив событий
  const [events] = useState([
    // Понедельник, 2 июня 2025
    {
      id: '1',
      baseTitle: 'Лекция: React',
      start: '2025-06-02T09:00:00',
      end:   '2025-06-02T10:30:00',
      color: '#FFCEF8',
      audience: '101',
      teacher: 'Иванов И.И.',
      group: 'A'
    },
    {
      id: '2',
      baseTitle: 'Практика: React',
      start: '2025-06-02T11:00:00',
      end:   '2025-06-02T12:30:00',
      color: '#CECEFF',
      audience: '102',
      teacher: 'Иванов И.И.',
      group: 'A'
    },
    // Вторник, 3 июня 2025
    {
      id: '3',
      baseTitle: 'Лекция: Node.js',
      start: '2025-06-03T10:00:00',
      end:   '2025-06-03T11:30:00',
      color: '#FFCEF8',
      audience: '103',
      teacher: 'Петров П.П.',
      group: 'B'
    },
    {
      id: '4',
      baseTitle: 'Практика: Node.js',
      start: '2025-06-03T12:00:00',
      end:   '2025-06-03T13:30:00',
      color: '#CECEFF',
      audience: '103',
      teacher: 'Петров П.П.',
      group: 'B'
    },
    // Среда, 4 июня 2025
    {
      id: '5',
      baseTitle: 'Лекция: Docker',
      start: '2025-06-04T14:00:00',
      end:   '2025-06-04T15:30:00',
      color: '#FFCEF8',
      audience: '201',
      teacher: 'Сидоров С.С.',
      group: 'C'
    },
    {
      id: '6',
      baseTitle: 'Практика: Docker',
      start: '2025-06-04T16:00:00',
      end:   '2025-06-04T17:30:00',
      color: '#CECEFF',
      audience: '201',
      teacher: 'Сидоров С.С.',
      group: 'C'
    },
    // Четверг, 5 июня 2025
    {
      id: '7',
      baseTitle: 'Лекция: ML',
      start: '2025-06-05T11:00:00',
      end:   '2025-06-05T12:30:00',
      color: '#FFCEF8',
      audience: '202',
      teacher: 'Новиков Н.Н.',
      group: 'D'
    },
    {
      id: '8',
      baseTitle: 'Практика: ML',
      start: '2025-06-05T13:00:00',
      end:   '2025-06-05T14:30:00',
      color: '#CECEFF',
      audience: '202',
      teacher: 'Новиков Н.Н.',
      group: 'D'
    },
    // Пятница, 6 июня 2025
    {
      id: '9',
      baseTitle: 'Лекция: Python',
      start: '2025-06-06T09:00:00',
      end:   '2025-06-06T10:30:00',
      color: '#FFCEF8',
      audience: '301',
      teacher: 'Кузнецов К.К.',
      group: 'E'
    },
    {
      id: '10',
      baseTitle: 'Практика: Python',
      start: '2025-06-06T11:00:00',
      end:   '2025-06-06T12:30:00',
      color: '#CECEFF',
      audience: '301',
      teacher: 'Кузнецов К.К.',
      group: 'E'
    },
    // Суббота, 7 июня 2025
    {
      id: '11',
      baseTitle: 'Лекция: DevOps',
      start: '2025-06-07T10:00:00',
      end:   '2025-06-07T11:30:00',
      color: '#FFCEF8',
      audience: '302',
      teacher: 'Фролов Ф.Ф.',
      group: 'F'
    },
    {
      id: '12',
      baseTitle: 'Практика: DevOps',
      start: '2025-06-07T12:00:00',
      end:   '2025-06-07T13:30:00',
      color: '#CECEFF',
      audience: '302',
      teacher: 'Фролов Ф.Ф.',
      group: 'F'
    },
  ]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    userService.getById(user.id)
      .then(setFullUser)
      .catch(() => alert('Не удалось загрузить профиль'));
  }, [user, navigate]);

  if (!fullUser) return <div className="loading">Загрузка...</div>;

  // Сформируем события для календаря
  const calendarEvents = events.map(e => {
    const extraInfo = fullUser.role === 'student'
      ? `(Преп: ${e.teacher})`
      : `(Группа: ${e.group})`;

    return {
      id: e.id,
      title: `${e.baseTitle} [Ауд: ${e.audience}] ${extraInfo}`,
      start: e.start,
      end:   e.end,
      color: e.color
    };
  });

  // Определяем ближайший день с занятиями (сегодня или следующий)
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const eventDates = Array.from(new Set(
    events.map(e => {
      const d = new Date(e.start);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    })
  ));

  const futureDates = eventDates.filter(dt => dt >= todayMid);
  const nearestDateTime = futureDates.length > 0
    ? Math.min(...futureDates)
    : null;

  // События на ближайший день
  const nearestDayEvents = nearestDateTime !== null
    ? calendarEvents.filter(e => {
        const d = new Date(e.start);
        const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return dMid === nearestDateTime;
      })
    : [];

  // Метка даты для виджета
  let widgetDateLabel = 'Нет занятий';
  if (nearestDateTime !== null) {
    const dateObj = new Date(nearestDateTime);
    widgetDateLabel = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(dateObj);
  }

  return (
    <div className="app-layout schedule-page">
      <Sidebar activeItem="schedule" userRole={fullUser.role} />

      <div className="main-content">
        {/* Topbar без отступов */}
        <Topbar
          userName={`${fullUser.first_name} ${fullUser.surname}`}
          userRole={fullUser.role}
          notifications={notifications.length}
          onBellClick={() => setNotifOpen(o => !o)}
          onProfileClick={() => navigate('/profile')}
        />

        {/* Весь остальной контент с отступами */}
        <div className="content-area">
          {notifOpen && (
            <div className="notif-dropdown">
              <h4>Уведомления</h4>
              <ul>
                {notifications.map(n => (
                  <li key={n.id}>
                    <strong>{n.title}</strong>
                    <div className="time">{n.time}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="page-title">Расписание на неделю</h2>

          <div className="schedule-grid">
            <div className="left-column">
              <div className="widget-header">
                <h3>Пары на {widgetDateLabel}</h3>
              </div>
              <ScheduleList events={nearestDayEvents} />
            </div>

            <div className="right-column">
              <FullCalendar
                plugins={[ timeGridPlugin, interactionPlugin ]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left:   'prev,today,next',
                  center: 'title',
                  right:  ''
                }}
                allDaySlot={false}
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                events={calendarEvents}
                height="auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
