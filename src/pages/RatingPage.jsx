import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getAllStudents, getCurrentUserRating } from '../services/ratingService';
import '../styles/RatingPage.css';

export default function RatingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    loadRating();
  }, []);

  const loadRating = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[RatingPage] Loading students rating...');
      
      let studentsData = await getAllStudents();
      
      // Проверяем, получили ли мы реальные данные или mock
      const hasMockData = studentsData.some(student => 
        student.user?.first_name === 'Александр' && student.user?.surname === 'Петров'
      );
      
      if (hasMockData) {
        setUseMockData(true);
        console.log('[RatingPage] Using mock data');
      } else {
        console.log('[RatingPage] Using real API data');
      }
      
      // Если текущий пользователь - студент, убеждаемся что он есть в списке
      if (user.role === 'student' && !hasMockData) {
        const currentUserExists = studentsData.some(student => 
          student.user_id === user.id || student.user?.id === user.id
        );
        
        if (!currentUserExists) {
          try {
            const currentUserData = await getCurrentUserRating();
            if (currentUserData) {
              studentsData.push({
                ...currentUserData,
                user: {
                  id: user.id,
                  first_name: user.first_name,
                  surname: user.surname,
                  email: user.email,
                  role: 'student'
                }
              });
            }
          } catch (error) {
            console.log('[RatingPage] Could not load current user data, adding with 0 points');
            studentsData.push({
              id: user.id,
              user_id: user.id,
              points: 0,
              user: {
                id: user.id,
                first_name: user.first_name,
                surname: user.surname,
                email: user.email,
                role: 'student'
              }
            });
          }
        }
      }
      
      // Сортируем по количеству монет (убывание)
      const sortedStudents = studentsData.sort((a, b) => (b.points || 0) - (a.points || 0));
      
      console.log('[RatingPage] Final sorted students:', sortedStudents);
      setStudents(sortedStudents);
      
    } catch (error) {
      console.error('[RatingPage] Error loading rating:', error);
      setError('Не удалось загрузить рейтинг студентов');
    } finally {
      setLoading(false);
    }
  };

  // Определяем позицию текущего студента
  const getCurrentStudentPosition = () => {
    if (user.role !== 'student') return null;
    
    const position = students.findIndex(student => 
      student.user_id === user.id || student.user?.id === user.id
    );
    return position !== -1 ? position + 1 : null;
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

  // Проверяем, является ли студент текущим пользователем
  const isCurrentUser = (student) => {
    return user.role === 'student' && (
      student.user_id === user.id || student.user?.id === user.id
    );
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="rating" userRole={user.role} />
        <div className="main-content">
          <Topbar
            userName={fullName}
            userRole={user.role}
            onProfileClick={() => navigate('/profile')}
          />
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
        <Sidebar activeItem="rating" userRole={user.role} />
        <div className="main-content">
          <Topbar
            userName={fullName}
            userRole={user.role}
            onProfileClick={() => navigate('/profile')}
          />
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

  const currentPosition = getCurrentStudentPosition();

  return (
    <div className="app-layout">
      <Sidebar activeItem="rating" userRole={user.role} />
      
      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <div className="rating-container">
          <div className="rating-header">
            <h1>🏆 Рейтинг студентов</h1>
            <p className="rating-description">
              Топ студентов по количеству заработанных бесткоинов
            </p>
            
            {useMockData && (
              <div className="demo-notice">
                <span className="demo-badge">Демо данные</span>
                <p>Показаны демонстрационные данные для примера</p>
              </div>
            )}
            
            {user.role === 'student' && currentPosition && (
              <div className="current-position">
                <span className="position-badge">
                  Ваша позиция: #{currentPosition}
                </span>
              </div>
            )}
          </div>

          <div className="rating-stats">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-number">{students.length}</div>
                <div className="stat-label">Всего студентов</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <div className="stat-number">
                  {students.reduce((sum, student) => sum + (student.points || 0), 0)}
                </div>
                <div className="stat-label">Всего монет</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-number">
                  {students.length > 0 ? Math.round(students.reduce((sum, student) => sum + (student.points || 0), 0) / students.length) : 0}
                </div>
                <div className="stat-label">Средний балл</div>
              </div>
            </div>
          </div>

          <div className="rating-table-container">
            {students.length === 0 ? (
              <div className="empty-rating">
                <div className="empty-icon">📊</div>
                <h3>Пока нет данных для рейтинга</h3>
                <p>Студенты появятся в рейтинге после получения первых монет</p>
              </div>
            ) : (
              <div className="rating-table">
                <div className="table-header">
                  <div className="header-rank">Место</div>
                  <div className="header-student">Студент</div>
                  <div className="header-points">Монеты</div>
                  <div className="header-progress">Прогресс</div>
                </div>

                <div className="table-body">
                  {students.map((student, index) => {
                    const position = index + 1;
                    const medal = getMedal(position);
                    const isCurrentStudent = isCurrentUser(student);
                    const maxPoints = students[0]?.points || 1;
                    const progressPercent = Math.round(((student.points || 0) / maxPoints) * 100);

                    return (
                      <div 
                        key={student.id || student.user_id || index} 
                        className={`table-row ${getPositionClass(position)} ${isCurrentStudent ? 'current-user' : ''}`}
                      >
                        <div className="rank-cell">
                          <div className="rank-content">
                            {medal && <span className="medal">{medal}</span>}
                            <span className="rank-number">#{position}</span>
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
                                {[student.user?.first_name, student.user?.surname]
                                  .filter(Boolean).join(' ') || student.user?.username || 'Неизвестный студент'}
                              </div>
                              <div className="student-email">
                                {student.user?.email || 'Почта не указана'}
                              </div>
                            </div>
                            {isCurrentStudent && (
                              <div className="current-user-badge">Это вы!</div>
                            )}
                          </div>
                        </div>

                        <div className="points-cell">
                          <div className="points-content">
                            <span className="points-number">{student.points || 0}</span>
                            <span className="points-icon">🪙</span>
                          </div>
                        </div>

                        <div className="progress-cell">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{progressPercent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rating-footer">
            <div className="info-card">
              <h3>💡 Как заработать монеты?</h3>
              <ul>
                <li>Посещайте занятия вовремя</li>
                <li>Выполняйте домашние задания</li>
                <li>Активно участвуйте в уроках</li>
                <li>Помогайте одногруппникам</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}