import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getTop10WithCurrentUser } from '../services/ratingService';
import '../styles/RatingPage.css';

export default function RatingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ratingData, setRatingData] = useState({
    top10: [],
    currentUser: {
      position: null,
      data: null,
      isInTop10: false
    },
    totalStudents: 0,
    hasFullAccess: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [previousRating, setPreviousRating] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const loadRating = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[RatingPage] Loading rating data...');
      
      const data = await getTop10WithCurrentUser(user.id);
      
      console.log('[RatingPage] Received rating data:', data);
      
      // Сохраняем предыдущее состояние для сравнения изменений
      setRatingData(prevData => {
        setPreviousRating(prevData);
        return data;
      });
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('[RatingPage] Error loading rating:', error);
      setError(error.message || 'Не удалось загрузить рейтинг студентов');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadRating();
    
    // Автообновление каждые 30 секунд (если включено)
    let interval;
    if (autoUpdate) {
      interval = setInterval(() => {
        loadRating();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoUpdate, loadRating]);

  // Отслеживаем изменение размера окна для переключения мобильный/десктоп
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Определяем позицию текущего студента
  const getCurrentStudentPosition = () => { // eslint-disable-line no-unused-vars
    return ratingData.currentUser.position;
  };

  // Форматируем имя: инициалы на мобильных, полное имя на десктопе
  const formatName = (firstName, surname, username = null) => {
    if (isMobile) {
      // На мобильных показываем инициалы (И. Ф.)
      const firstInitial = firstName?.[0] ? `${firstName[0].toUpperCase()}.` : '';
      const lastInitial = surname?.[0] ? ` ${surname[0].toUpperCase()}.` : '';
      return firstInitial + lastInitial || username || '?';
    } else {
      // На десктопе показываем полное имя и фамилию
      return [firstName, surname].filter(Boolean).join(' ') || username || 'Неизвестный студент';
    }
  };

  // Проверяем, является ли студент текущим пользователем
  const isCurrentUser = (student) => {
    return user.role === 'student' && (
      student.user_id === user.id || student.user?.id === user.id
    );
  };

  // Определяем изменение позиции студента
  const getPositionChange = (student, currentPosition) => {
    if (!previousRating || previousRating.top10.length === 0) return null;
    
    const previousPosition = previousRating.top10.findIndex(prev => 
      (prev.user_id === student.user_id || prev.user?.id === student.user?.id)
    ) + 1;
    
    if (previousPosition === 0) return 'new'; // новый студент в топе
    if (previousPosition === currentPosition) return null; // позиция не изменилась
    if (previousPosition > currentPosition) return 'up'; // поднялся
    return 'down'; // опустился
  };

  // Получаем медаль для топ-3
  const getMedal = (position) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  // Получаем класс для позиции
  const getPositionClass = (position) => {
    if (position <= 3) return `top-${position}`;
    return 'regular';
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <div className="rating-page-background"></div>
        <Sidebar activeItem="rating" userRole={user.role} />
        <div className="main-content">
          <SmartTopBar pageTitle="Рейтинг" />

          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка рейтинга...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <div className="rating-page-background"></div>
        <Sidebar activeItem="rating" userRole={user.role} />
        <div className="main-content">
          <SmartTopBar pageTitle="Рейтинг" />

          <div className="error-container">
            <h2>Ошибка</h2>
            <p>{error}</p>
            <button onClick={loadRating} className="btn-primary">
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="rating-page-background"></div>
      <Sidebar activeItem="rating" userRole={user.role} />
      
      <div className="main-content">
        <SmartTopBar pageTitle="Рейтинг" />


        <div className="rating-container">
          <div className="rating-header">
            <div className="header-top">
              <h1>🏆 Рейтинг студентов</h1>
              <div className="header-controls">
                <button 
                  onClick={loadRating} 
                  className="btn-refresh"
                  disabled={loading}
                  title="Обновить рейтинг"
                >
                  {loading ? '🔄' : '🔄'}
                </button>
                <button 
                  onClick={() => setAutoUpdate(!autoUpdate)}
                  className={`btn-auto-update ${autoUpdate ? 'active' : ''}`}
                  title={autoUpdate ? 'Отключить автообновление' : 'Включить автообновление'}
                >
                  {autoUpdate ? '⏸️' : '▶️'}
                </button>
              </div>
            </div>
            <p className="rating-description">
              Топ студентов по количеству заработанных бесткоинов
            </p>
            
            {lastUpdated && (
              <p className="last-updated">
                Последнее обновление: {lastUpdated.toLocaleTimeString('ru-RU')}
                {autoUpdate && <span className="auto-update-indicator"> • Автообновление включено</span>}
              </p>
            )}
            
            {user.role === 'student' && ratingData.currentUser.position && (
              <div className="current-position">
                <span className="position-badge">
                  Ваша позиция: #{ratingData.currentUser.position}
                  {ratingData.currentUser.isInTop10 ? ' 🏆' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="rating-stats">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-number">{ratingData.totalStudents}</div>
                <div className="stat-label">Всего</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <div className="stat-number">
                  {ratingData.top10.reduce((sum, student) => sum + (student.points || 0), 0)}
                </div>
                <div className="stat-label">Монет в топ-10</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-number">
                  {ratingData.top10.length > 0 ? Math.round(ratingData.top10.reduce((sum, student) => sum + (student.points || 0), 0) / ratingData.top10.length) : 0}
                </div>
                <div className="stat-label">Средний балл</div>
              </div>
            </div>
            
            {ratingData.top10.length > 0 && (
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-info">
                  <div className="stat-number">{ratingData.top10[0]?.points || 0}</div>
                  <div className="stat-label">Лидер</div>
                </div>
              </div>
            )}
          </div>

          <div className="rating-table-container">
            {ratingData.top10.length === 0 ? (
              <div className="empty-rating">
                <div className="empty-icon">📊</div>
                <h3>Рейтинг пока пуст</h3>
                <p>Студенты появятся в рейтинге после получения первых монет за выполнение заданий и посещение занятий</p>
                <button onClick={loadRating} className="btn-primary">
                  Обновить рейтинг
                </button>
              </div>
            ) : (
              <div className="rating-content">
                {/* Топ-10 рейтинг */}
                <div className="rating-section">
                  <h2 className="section-title">🏆 Топ-10 лидеров</h2>
                  <div className="rating-table">
                    <div className="table-header">
                      <div className="header-rank">Место</div>
                      <div className="header-student">Студент</div>
                      <div className="header-points">Монеты</div>
                    </div>

                    <div className="table-body">
                      {ratingData.top10.map((student, index) => {
                        const position = index + 1;
                        const medal = getMedal(position);
                        const isCurrentStudent = isCurrentUser(student);
                        const positionChange = getPositionChange(student, position);

                        return (
                          <div 
                            key={student.id || student.user_id || index} 
                            className={`table-row ${getPositionClass(position)} ${isCurrentStudent ? 'current-user' : ''}`}
                          >
                            <div className="rank-cell">
                              <div className="rank-content">
                                {medal && <span className="medal">{medal}</span>}
                                <span className="rank-number">#{position}</span>
                                {positionChange && (
                                  <span className={`position-change ${positionChange}`}>
                                    {positionChange === 'up' ? '↗️' : positionChange === 'down' ? '↘️' : '🆕'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="student-cell">
                              <div className="student-info">
                                <div className="student-avatar">
                                  <span className="avatar-text">
                                    {student.user?.first_name?.[0] || student.user?.username?.[0] || '?'}
                                  </span>
                                </div>
                                <div className="student-details">
                                  <div className="student-name">
                                    {formatName(student.user?.first_name, student.user?.surname, student.user?.username)}
                                  </div>
                                </div>
                                {isCurrentStudent && (
                                  <div className="current-user-badge">Вы!</div>
                                )}
                              </div>
                            </div>

                            <div className="points-cell">
                              <div className="points-content">
                                <span className="points-number">{student.points > 9999 ? '9999+' : (student.points || 0)}</span>
                                <span className="points-icon">💻</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Позиция текущего пользователя если он не в топ-10 */}
                {user.role === 'student' && ratingData.currentUser.data && !ratingData.currentUser.isInTop10 && (
                  <div className="rating-section current-user-section">
                    <h3 className="section-title">📍 Ваша позиция</h3>
                    <div className="rating-table">
                      <div className="table-body">
                        <div className="table-row current-user highlight">
                          <div className="rank-cell">
                            <div className="rank-content">
                              <span className="rank-number">#{ratingData.currentUser.position}</span>
                            </div>
                          </div>

                          <div className="student-cell">
                            <div className="student-info">
                              <div className="student-avatar">
                                <span className="avatar-text">
                                  {ratingData.currentUser.data.user?.first_name?.[0] || user.first_name?.[0] || '?'}
                                </span>
                              </div>
                              <div className="student-details">
                                <div className="student-name">
                                  {formatName(
                                    ratingData.currentUser.data.user?.first_name || user.first_name,
                                    ratingData.currentUser.data.user?.surname || user.surname
                                  ) || 'Вы'}
                                </div>
                              </div>
                              <div className="current-user-badge">Вы!</div>
                            </div>
                          </div>

                          <div className="points-cell">
                            <div className="points-content">
                              <span className="points-number">{ratingData.currentUser.data.points > 9999 ? '9999+' : (ratingData.currentUser.data.points || 0)}</span>
                              <span className="points-icon">💻</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="position-info">
                      <p>
                        {ratingData.currentUser.position <= ratingData.totalStudents ? (
                          <>До топ-10 осталось {ratingData.top10[9]?.points - (ratingData.currentUser.data.points || 0)} монет</>
                        ) : (
                          <>Начните зарабатывать монеты, чтобы попасть в рейтинг!</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Информация о доступе к данным */}
                {!ratingData.hasFullAccess && (
                  <div className="access-notice">
                    <span className="notice-badge">Ограниченные данные</span>
                    <p>Показан демонстрационный рейтинг. Для полного рейтинга требуются дополнительные права.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rating-footer">
            <div className="info-card">
              <div className="info-card-header">
                <h3>Как заработать бесткоины?</h3>
                <p className="info-card-subtitle">Выполняйте задания и получайте награды за активность</p>
              </div>
              <div className="info-card-body">
                <div className="basic-tasks">
                  <div className="section-subtitle">🎯 Основные задания</div>
                  <div className="tasks-grid">
                    <div className="task-card">
                      <span className="task-icon">📚</span>
                      <div className="task-title">Посещение занятий</div>
                      <div className="task-description">Получайте новые знания вместе с группой, не пропуская занятий</div>
                      <div className="task-reward">+5 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">✍️</span>
                      <div className="task-title">Домашние задания</div>
                      <div className="task-description">Выполняйте домашние задания качественно и в срок</div>
                      <div className="task-reward">+5 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">🙋</span>
                      <div className="task-title">Активность на уроках</div>
                      <div className="task-description">Проявляй свои навыки на занятиях, помогай друзьям и зарабатывай еще больше!</div>
                      <div className="task-reward">+5 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">👀</span>
                      <div className="task-title">Разминка для глаз</div>
                      <div className="task-description">Покажи самые крутые упражнения своим друзьям на перемене</div>
                      <div className="task-reward">+5 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">🎓</span>
                      <div className="task-title">Получи Сертификат</div>
                      <div className="task-description">Освой 9 модулей, получи сертификат об окончании учебного года</div>
                      <div className="task-reward">+200 💻</div>
                    </div>
                  </div>
                </div>
                
                <div className="bonus-tasks">
                  <div className="section-subtitle">🌟 Бонусные задания</div>
                  <div className="tasks-grid">
                    <div className="task-card">
                      <span className="task-icon">🎂</span>
                      <div className="task-title">С днем рождения!</div>
                      <div className="task-description">Мы поздравляем тебя с праздником и рады, что ты его с нами разделяешь и хотим сделать тебе подарок</div>
                      <div className="task-reward">+100 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">📱</span>
                      <div className="task-title">Подпишись на все наши социальные сети</div>
                      <div className="task-description">Следи за нами и получай дополнительные бонусы</div>
                      <div className="task-reward">+5 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">👥</span>
                      <div className="task-title">Приведи друга</div>
                      <div className="task-description">Учиться вместе веселее! Приводи друга и получай айтишки</div>
                      <div className="task-reward">+20 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">🎥</span>
                      <div className="task-title">Снимай видео про Айтишкино</div>
                      <div className="task-description">Сними и выложи видео про нашу школу в любую социальную сеть</div>
                      <div className="task-reward">+5 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">🎭</span>
                      <div className="task-title">Участвуй вне учебной деятельности</div>
                      <div className="task-description">Ходи с нами на экскурсии, посещай музее и многое другое</div>
                      <div className="task-reward">+5 💻</div>
                    </div>
                    <div className="task-card">
                      <span className="task-icon">⭐</span>
                      <div className="task-title">Отзыв на картах</div>
                      <div className="task-description">Оставь отзыв на Яндекс.Картах о нашей школе и покажи его менеджеру</div>
                      <div className="task-reward">+15 💻</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}