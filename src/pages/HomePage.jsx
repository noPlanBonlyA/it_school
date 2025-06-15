import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar      from '../components/Sidebar';
import Topbar       from '../components/TopBar';
import userService  from '../services/userService';
import Schedule     from '../components/Schedule';
import BestCoins    from '../components/BestCoin';
import axios        from 'axios';
import { AuthContext } from '../contexts/AuthContext';

import '../styles/HomePage.css';
import '../styles/Schedule.css';
import '../styles/HomeNews.css';

const API_BASE = 'http://localhost:8080/api';

export default function HomePage() {
  const navigate    = useNavigate();
  const { user }    = useContext(AuthContext);          // { id, role, ... } из JWT
  const [fullUser,  setFullUser]  = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [newsList,  setNewsList]  = useState([]);

  /* ---------------- СТАТИЧНОЕ РАСПИСАНИЕ ---------------- */
  const events = [/* ... как у вас ... */];

  /* ---------------- ЗАГРУЗКА ПРОФИЛЯ ---------------- */
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // вместо /users/{id} берём /users/me
    userService.getMe()
      .then(setFullUser)
      .catch(() => {
        alert('Не удалось загрузить профиль');
        navigate('/login');
      });
  }, [user, navigate]);

  /* ---------------- ЗАГРУЗКА НОВОСТЕЙ ---------------- */
  useEffect(() => {
    axios.get(`${API_BASE}/news/`)
      .then(res => {
        // бэкенд может вернуть { objects:[...] } либо массив
        const rawArr = Array.isArray(res.data) ? res.data : (res.data.objects || []);
        const priority = { high:3, medium:2, low:1 };
        const sorted = rawArr.slice().sort((a,b) => {
          const pa = priority[a.status] || 0;
          const pb = priority[b.status] || 0;
          if (pb !== pa) return pb - pa;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setNewsList(sorted);
      })
      .catch(err => console.error('Ошибка загрузки новостей:', err));
  }, []);

  if (!fullUser) return <div className="loading">Загрузка...</div>;

  /* ---------------- ПОДГОТОВКА ДАННЫХ ДЛЯ Schedule ---------------- */
  const calendarEvents = events.map(e => {
    const extra = fullUser.role === 'student'
      ? `(Преп: ${e.teacher})`
      : `(Группа: ${e.group})`;
    return { ...e, title:`${e.baseTitle} [Ауд: ${e.audience}] ${extra}` };
  });

  /* ближайший день */
  const todayMid = new Date().setHours(0,0,0,0);
  const uniqueDays = [...new Set(events.map(e => new Date(e.start).setHours(0,0,0,0)))];
  const nextDay = uniqueDays.filter(d => d >= todayMid).sort()[0];
  const nearestEvents = calendarEvents.filter(e => new Date(e.start).setHours(0,0,0,0) === nextDay);
  const widgetDateLabel = nextDay
    ? new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(nextDay))
    : 'Нет занятий';

  /* ---------------- UI ---------------- */
  return (
    <div className="app-layout">
      <Sidebar activeItem="dashboard" userRole={fullUser.role} />

      <div className="main-content">
        <Topbar
          userName={`${fullUser.first_name} ${fullUser.surname}`}
          userRole={fullUser.role}
          notifications={0}
          onBellClick={() => setNotifOpen(o => !o)}
        />

        <section className="cards">
          {/* Расписание */}
          <div className="card schedule">
            <h3>Расписание на {widgetDateLabel}</h3>
            <Schedule events={nearestEvents} />
          </div>

          {/* Новости */}
          <div className="card news">
            <h3>Новости</h3>
            <div className="news-widgets">
              {newsList.length === 0
                ? <div className="no-news">Нет актуальных новостей</div>
                : newsList.map(item => (
                    <div key={item.id} className="news-widget">
                      <div className="news-title">{item.name}</div>
                      <div className="news-date">
                        {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="news-desc">{item.description}</div>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Бесткоины */}
          <div className="card events">
            <h3>Бесткоины</h3>
            <BestCoins amount={fullUser.points ?? 0} />
          </div>
        </section>
      </div>
    </div>
  );
}
