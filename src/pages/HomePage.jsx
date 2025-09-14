import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import Schedule  from '../components/Schedule';
import BestCoins from '../components/BestCoin';
import NewsModal from '../components/NewsModal';
import EventModal from '../components/EventModal';

import { useAuth }          from '../contexts/AuthContext';
import userService          from '../services/userService';
import { getUserScheduleOptimized } from '../services/scheduleService';
import { findStudentByUser } from '../services/studentService';
import api from '../api/axiosInstance';

import '../styles/HomePage.css';
import '../styles/Schedule.css';
import '../styles/HomeNews.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullUser,     setFull]        = useState(null);
  const [studentData,  setStudentData] = useState(null);
  const [events,       setEv]          = useState([]);
  const [selEvent,     setSel]         = useState(null);
  const [news,         setNews]        = useState([]);
  const [modalItem,    setModalItem]   = useState(null);
  const [coinsLoading, setCoinsLoading] = useState(true);

  // Загрузка профиля
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    userService.getMe()
      .then(setFull)
      .catch(() => navigate('/login', { replace: true }));
  }, [user, navigate]);

  // Загрузка данных студента с монетами
  useEffect(() => {
    if (!user || user.role !== 'student') {
      setCoinsLoading(false);
      return;
    }

    const loadStudentData = async () => {
      try {
        setCoinsLoading(true);
        console.log('[HomePage] Loading student data for coins...');
        
        // Используем эндпоинт /students/me для получения данных с монетами
        const response = await api.get('/students/me');
        console.log('[HomePage] Student data response:', response.data);
        
        setStudentData(response.data);
      } catch (error) {
        console.error('[HomePage] Error loading student data:', error);
        
        // Fallback: пробуем найти студента через findStudentByUser
        try {
          const fallbackData = await findStudentByUser(user.id);
          console.log('[HomePage] Fallback student data:', fallbackData);
          setStudentData(fallbackData);
        } catch (fallbackError) {
          console.error('[HomePage] Fallback also failed:', fallbackError);
          // Устанавливаем данные по умолчанию
          setStudentData({ points: 0 });
        }
      } finally {
        setCoinsLoading(false);
      }
    };

    loadStudentData();
  }, [user]);

  // Загрузка расписания
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setEv(await getUserScheduleOptimized(user));
      } catch {
        console.error('schedule fetch error');
      }
    })();
  }, [user]);

  // Загрузка и сортировка новостей
  useEffect(() => {
    api.get('/news/')
      .then(response => {
        const arr = response.data;
        const list = Array.isArray(arr) ? arr : (arr.objects || []);
        // добавляем image_url, если есть
        const mapped = list.map(n => ({
          ...n,
          image_url: n.photo?.url || null
        }));
        // сортируем: закреплённые вверх по дате, потом остальные
        mapped.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setNews(mapped);
      })
      .catch(console.error);
  }, []);

  // Вычисляем ближайший учебный день
  const { scheduleTitle, dayEvents } = useMemo(() => {
    if (!events.length) {
      return { scheduleTitle: 'Тут будут пары', dayEvents: [] };
    }
    const days = [...new Set(events.map(e => 
      new Date(e.start).setHours(0,0,0,0)
    ))];
    const today = new Date().setHours(0,0,0,0);
    const nextDay = days.filter(d => d >= today).sort()[0];
    const nextDayFormatted = new Date(nextDay).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    return {
      scheduleTitle: `Пары на ${nextDayFormatted}`,
      dayEvents: events.filter(e => 
        new Date(e.start).setHours(0,0,0,0) === nextDay
      )
    };
  }, [events]);

  // Получаем количество монет в зависимости от роли
  const getCoinsAmount = () => {
    if (user?.role === 'student') {
      if (coinsLoading) return '...';
      return studentData?.points ?? 0;
    }
    // Для преподавателей и админов монеты не отображаются
    return fullUser?.points ?? 0;
  };

  // Функция для разворачивания/сворачивания новостей - теперь открывает модальное окно
  const toggleNewsExpansion = (newsId, event) => {
    event.stopPropagation();
    const newsItem = news.find(n => n.id === newsId);
    if (newsItem) {
      setModalItem(newsItem);
    }
  };

  // Прелоадер
  if (!fullUser) return <div className="loading">Загрузка…</div>;
  const fio = [fullUser.first_name, fullUser.surname]
                .filter(Boolean).join(' ');

  return (
    <div className="app-layout">
      <Sidebar activeItem="dashboard" userRole={fullUser.role} />

      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={fullUser.role}
          pageTitle="Главная"
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />



        <section className="cards">
          {/* Расписание - всегда первое */}
          <div className="card schedule">
            <div className="card-header">
              <h3>{scheduleTitle}</h3>
              <button 
                className="btn-details"
                onClick={() => navigate('/schedule')}
                title="Перейти к полному расписанию"
              >
                Подробнее
              </button>
            </div>
            <Schedule events={dayEvents} onSelect={e => {
              // Открываем модальное окно события
              setSel(e);
            }} onCardClick={(event) => {
              // Останавливаем всплытие события, чтобы не сработал клик по карточке
              event.stopPropagation();
            }} />
          </div>

          {/* Новости - второе на мобильных */}
          <div className="card news">
            <h3>Новости</h3>
            <div className="news-list">
              <div className="news-scroll-container">
                {news.length === 0
                  ? <p className="empty-text">Нет актуальных новостей</p>
                  : news.map(n => (
                      <div 
                        key={n.id} 
                        className={`news-row ${n.is_pinned ? 'pinned' : ''} ${!n.image_url ? 'no-image' : ''}`}
                        onClick={(event) => toggleNewsExpansion(n.id, event)}
                      >
                        {/* Изображение новости - только если есть */}
                        {n.image_url && (
                          <img src={n.image_url} alt={n.name} className="news-thumb"/>
                        )}
                        
                        {/* Контент новости */}
                        <div className="news-content">
                          <h4 className="news-title">{n.name}</h4>
                          <div className="news-date">
                            {new Date(n.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                          
                          {/* Кнопка открытия модального окна */}
                          <div className="news-expand-btn">
                            <span>📰</span>
                            <span>Читать</span>
                          </div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>

          {/* Айтишки - третье на мобильных */}
          <div className="card coins">
            <div className="card-header">
              <h3>Айтишки</h3>
              <button 
                className="btn-details"
                onClick={() => navigate('/rating')}
                title="Перейти к рейтингу студентов"
              >
                Подробнее
              </button>
            </div>

            <BestCoins 
              amount={getCoinsAmount()} 
              loading={user?.role === 'student' ? coinsLoading : false}
            />
          </div>

        </section>

        {/* Модальные окна */}
        <NewsModal item={modalItem} onClose={() => setModalItem(null)} />
        <EventModal 
          event={selEvent} 
          onClose={() => setSel(null)} 
          userRole={fullUser.role}
        />
      </div>
    </div>
  );
}
