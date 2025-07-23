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
  const [expandedNews, setExpandedNews] = useState(new Set()); // Для отслеживания развернутых новостей
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

  // Получаем количество монет в зависимости от роли
  const getCoinsAmount = () => {
    if (user?.role === 'student') {
      if (coinsLoading) return '...';
      return studentData?.points ?? 0;
    }
    // Для преподавателей и админов монеты не отображаются
    return fullUser?.points ?? 0;
  };

  // Функция для разворачивания/сворачивания новостей
  const toggleNewsExpansion = (newsId, event) => {
    event.stopPropagation();
    setExpandedNews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(newsId)) {
        newSet.delete(newsId);
      } else {
        newSet.add(newsId);
      }
      return newSet;
    });
  };

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

  // Тест загрузки монет
  const testCoinsReload = async () => {
    try {
      setCoinsLoading(true);
      const response = await api.get('/students/me');
      console.log('Coins reload test:', response.data);
      setStudentData(response.data);
      alert(`Монеты обновлены: ${response.data.points}`);
    } catch (error) {
      console.error('Coins reload error:', error);
      alert(`Ошибка обновления монет: ${error.message}`);
    } finally {
      setCoinsLoading(false);
    }
  };

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

        {/* Временные кнопки для тестирования */}
        {fullUser?.role === 'student' && (
          <div className="debug-buttons">
            <button 
              onClick={debugStudents}
              className="debug-btn purple"
            >
              Отладка студентов
            </button>
            <button 
              onClick={testProfile}
              className="debug-btn success"
            >
              Тест профиля
            </button>
            <button 
              onClick={testNotification}
              className="debug-btn info"
            >
              Тест уведомления
            </button>
            <button 
              onClick={testCoinsReload}
              className="debug-btn warning"
            >
              Обновить монеты
            </button>
          </div>
        )}

        <section className="cards">
          {/* Расписание - всегда первое */}
          <div 
            className="card schedule clickable-card" 
            onClick={() => navigate('/schedule')}
            title="Перейти к полному расписанию"
          >
            <h3>
              Пары на {labelNextDay}
              <span className="card-nav-icon" title="Перейти к полному расписанию">📅</span>
            </h3>
            <Schedule events={dayEvents} onSelect={e => {
              // Если кликнули на то же событие - закрываем виджет
              if (selEvent && selEvent.id === e.id) {
                setSel(null);
              } else {
                setSel(e);
              }
            }} onCardClick={(event) => {
              // Останавливаем всплытие события, чтобы не сработал клик по карточке
              event.stopPropagation();
            }} />
            
            {/* Мини-виджет пары - теперь внутри карточки расписания */}
            {selEvent && (
              <div className="event-details">
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
              </div>
            )}
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
                        className={`news-row ${n.is_pinned ? 'pinned' : ''} ${expandedNews.has(n.id) ? 'expanded' : ''} ${!n.image_url ? 'no-image' : ''}`}
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
                          
                          {/* Описание (показывается только при разворачивании) */}
                          {n.description && (
                            <div className="news-description">
                              {n.description.split('\n').map((paragraph, index) => (
                                paragraph.trim() && (
                                  <p key={index} style={{ margin: '0 0 12px 0' }}>
                                    {paragraph}
                                  </p>
                                )
                              ))}
                            </div>
                          )}
                          
                          {/* Кнопка разворачивания */}
                          <div className="news-expand-btn">
                            {expandedNews.has(n.id) ? (
                              <>
                                <span>▲</span>
                                <span>Свернуть</span>
                              </>
                            ) : (
                              <>
                                <span>▼</span>
                                <span>Подробнее</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>

          {/* Бесткоины - третье на мобильных */}
          <div 
            className="card coins clickable-card" 
            onClick={() => navigate('/rating')}
            title="Перейти к рейтингу студентов"
          >
            <div className="bestcoins-header">
              <h3>
                Бесткоины
                <span className="card-nav-icon" title="Перейти к рейтингу студентов">🏆</span>
              </h3>
              {user?.role === 'student' && (
                <div className="coins-info">
                  {coinsLoading ? (
                    <span className="coins-loading">Загрузка...</span>
                  ) : (
                    <div className="coins-details">
                      <span className="coins-source">Данные из: /students/me</span>
                      <span className="coins-updated">
                        Обновлено: {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <BestCoins 
              amount={getCoinsAmount()} 
              loading={user?.role === 'student' ? coinsLoading : false}
            />
          </div>
        </section>

        {/* Модалка новости */}
        <NewsModal item={modalItem} onClose={() => setModalItem(null)} />
      </div>
    </div>
  );
}
