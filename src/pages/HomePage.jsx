import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import Schedule  from '../components/Schedule';
import BestCoins from '../components/BestCoin';
import NewsModal from '../components/NewsModal';

import { useAuth }          from '../contexts/AuthContext';
import userService          from '../services/userService';
import { getUserScheduleOptimized } from '../services/scheduleService';
import { createNotificationForStudent } from '../services/notificationService';
import { findStudentByUser, debugAllStudents } from '../services/studentService';

import '../styles/HomePage.css';
import '../styles/Schedule.css';
import '../styles/HomeNews.css';

const API = 'http://localhost:8080/api';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullUser,  setFull]     = useState(null);
  const [events,    setEv]       = useState([]);
  const [selEvent,  setSel]      = useState(null);
  const [news,      setNews]     = useState([]);
  const [modalItem, setModalItem]= useState(null);

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
    fetch(`${API}/news/`)
      .then(r => r.json())
      .then(arr => {
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
  const { labelNextDay, dayEvents } = useMemo(() => {
    if (!events.length) {
      return { labelNextDay: 'Нет занятий', dayEvents: [] };
    }
    const days = [...new Set(events.map(e => 
      new Date(e.start).setHours(0,0,0,0)
    ))];
    const today = new Date().setHours(0,0,0,0);
    const nextDay = days.filter(d => d >= today).sort()[0];
    return {
      labelNextDay: new Date(nextDay).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
      }),
      dayEvents: events.filter(e => 
        new Date(e.start).setHours(0,0,0,0) === nextDay
      )
    };
  }, [events]);

  // Прелоадер
  if (!fullUser) return <div className="loading">Загрузка…</div>;
  const fio = [fullUser.first_name, fullUser.surname]
                .filter(Boolean).join(' ');

  // Временная функция для тестирования профиля
  const testProfile = async () => {
    try {
      if (user?.id) {
        const studentProfile = await findStudentByUser(user.id);
        console.log('Student profile test:', studentProfile);
        alert(`Профиль найден: ID ${studentProfile?.id || 'не найден'}`);
      }
    } catch (error) {
      console.error('Profile test error:', error);
      alert(`Ошибка профиля: ${error.message}`);
    }
  };

  const testNotification = async () => {
    try {
      if (user?.id) {
        const studentProfile = await findStudentByUser(user.id);
        if (studentProfile?.id) {
          await createNotificationForStudent(
            studentProfile.id, 
            `Тестовое уведомление ${new Date().toLocaleTimeString()}`
          );
          alert('Уведомление отправлено!');
        } else {
          alert('Профиль студента не найден!');
        }
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Ошибка отправки уведомления');
    }
  };

  // Отладочная функция для проверки всех студентов
  const debugStudents = async () => {
    try {
      const students = await debugAllStudents();
      console.log('All students debug:', students);
      alert(`Найдено студентов: ${students.length}. Смотри консоль для деталей.`);
    } catch (error) {
      console.error('Debug students error:', error);
      alert(`Ошибка отладки: ${error.message}`);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeItem="dashboard" userRole={fullUser.role} />

      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={fullUser.role}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        {/* Временные кнопки для тестирования */}
        {fullUser?.role === 'student' && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 1000
          }}>
            <button 
              onClick={debugStudents}
              style={{
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Отладка студентов
            </button>
            <button 
              onClick={testProfile}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Тест профиля
            </button>
            <button 
              onClick={testNotification}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Тест уведомления
            </button>
          </div>
        )}

        <section className="cards">
          {/* Расписание */}
          <div className="card schedule">
            <h3>Пары на {labelNextDay}</h3>
            <Schedule events={dayEvents} onSelect={e => setSel(e)} />
          </div>

          {/* Новости */}
          <div className="card news">
            <h3>Новости</h3>
            {news.length === 0
              ? <p className="empty-text">Нет актуальных новостей</p>
              : news.map(n => (
                  <div 
                    key={n.id} 
                    className={`news-row ${n.is_pinned ? 'pinned' : ''}`}
                    onClick={() => setModalItem(n)}
                  >
                    {n.image_url && (
                      <img src={n.image_url} alt="" className="news-thumb"/>
                    )}
                    <span className="news-title">{n.name}</span>
                  </div>
                ))
            }
          </div>

          {/* Бесткоины */}
          <div className="card events">
            <h3>Бесткоины</h3>
            <BestCoins amount={fullUser.points ?? 0} />
          </div>
        </section>

        {/* Модалка новости */}
        <NewsModal item={modalItem} onClose={() => setModalItem(null)} />

        {/* Мини-виджет пары */}
        {selEvent && (
          <aside className="event-details">
            <button className="close-btn" onClick={() => setSel(null)}>×</button>
            
            <div className="event-header">
              <h2>{selEvent.lesson_name}</h2>
              <div className={`status-badge ${selEvent.is_opened ? 'opened' : 'closed'}`}>
                {selEvent.is_opened ? '🟢 Открыт' : '🔴 Закрыт'}
              </div>
            </div>

            <div className="event-info">
              <div className="info-item">
                <strong>Курс:</strong> 
                <span>{selEvent.course_name}</span>
              </div>
              
              {selEvent.group_name && (
                <div className="info-item">
                  <strong>Группа:</strong> 
                  <span>👥 {selEvent.group_name}</span>
                </div>
              )}
              
              {selEvent.teacher_name && (
                <div className="info-item">
                  <strong>Преподаватель:</strong> 
                  <span>👩‍🏫 {selEvent.teacher_name}</span>
                </div>
              )}
              
              {selEvent.auditorium && (
                <div className="info-item">
                  <strong>Аудитория:</strong> 
                  <span>📍 {selEvent.auditorium}</span>
                </div>
              )}
              
              <div className="info-item">
                <strong>Время:</strong>
                <span>
                  {new Date(selEvent.start_datetime || selEvent.start).toLocaleString('ru-RU',{
                    day:'2-digit', month:'2-digit', year:'numeric',
                    hour:'2-digit', minute:'2-digit'
                  })}
                  {' - '}
                  {new Date(selEvent.end_datetime || selEvent.end).toLocaleTimeString('ru-RU',{
                    hour:'2-digit', minute:'2-digit'
                  })}
                </span>
              </div>
              
              <div className="info-item">
                <strong>Продолжительность:</strong>
                <span>
                  {(() => {
                    const start = new Date(selEvent.start_datetime || selEvent.start);
                    const end = new Date(selEvent.end_datetime || selEvent.end);
                    const diffMinutes = Math.round((end - start) / (1000 * 60));
                    return `${diffMinutes} минут`;
                  })()}
                </span>
              </div>
            </div>

            {selEvent.description && (
              <div className="event-description">
                <strong>Описание:</strong>
                <p>{selEvent.description}</p>
              </div>
            )}

            {selEvent.is_opened && fullUser.role === 'student' && (
              <div className="event-actions">
                <button 
                  className="btn-primary"
                  onClick={() => {
                    // ИСПРАВЛЕНО: правильная навигация к уроку
                    if (selEvent.lesson_id && selEvent.course_id) {
                      navigate(`/courses/${selEvent.course_id}/lessons/${selEvent.lesson_id}`);
                    } else {
                      alert('Информация об уроке недоступна');
                    }
                  }}
                >
                  Перейти к уроку
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
