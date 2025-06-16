// src/pages/StudentCoursePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import Sidebar                         from '../components/Sidebar';
import Topbar                          from '../components/TopBar';
import { useAuth }                     from '../contexts/AuthContext';
import { getCourse, listLessons }      from '../services/lessonService';
import { checkStudentCourseAccess }    from '../services/courseService';
import { getUserSchedule }             from '../services/scheduleService';

export default function StudentCoursePage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [course,  setCourse]  = useState(null);
  const [lessons, setLessons] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // ИСПРАВЛЕНО: Строгая проверка доступа через отдельный API
        console.log('[StudentCourse] Checking access to course:', courseId);
        const accessGranted = await checkStudentCourseAccess(courseId);
        
        if (!accessGranted) {
          console.log('[StudentCourse] Access denied to course:', courseId);
          alert('У вас нет доступа к этому курсу. Обратитесь к администратору для добавления в соответствующую группу.');
          navigate('/student-courses');
          return;
        }
        
        setHasAccess(true);
        console.log('[StudentCourse] Access granted to course:', courseId);
        
        // Загружаем информацию о курсе
        const c = await getCourse(courseId);
        setCourse(c);
        
        // Загружаем ВСЕ уроки курса (поскольку доступ к курсу уже проверен)
        const l = await listLessons(courseId, 100, 0);
        setLessons(l.objects || []);
        
        // Загружаем расписание для получения дат и статусов уроков
        const s = await getUserSchedule(user);
        setSchedule(s || []);
        
        console.log('[StudentCourse] Course loaded:', c);
        console.log('[StudentCourse] Lessons loaded:', l.objects?.length || 0);
        console.log('[StudentCourse] Schedule loaded:', s?.length || 0);
      } catch (error) {
        console.error('Error loading course data:', error);
        alert('Ошибка загрузки курса: ' + (error.message || 'Неизвестная ошибка'));
        navigate('/student-courses');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, user, navigate]);

  // Получаем информацию о расписании урока
  const getLessonScheduleInfo = (lessonId) => {
    return schedule.find(item => item.lesson_id === lessonId);
  };

  // Проверяем, открыт ли урок для изучения
  const isLessonOpened = (lessonId) => {
    const scheduleItem = getLessonScheduleInfo(lessonId);
    return scheduleItem?.is_opened || false;
  };

  // Получаем статус урока для отображения
  const getLessonStatus = (lessonId) => {
    const scheduleItem = getLessonScheduleInfo(lessonId);
    if (!scheduleItem) return 'scheduled'; // урок есть, но не в расписании
    if (!scheduleItem.is_opened) return 'closed';
    return 'opened';
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="studentCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar 
            userName={fullName} 
            userRole={user.role} 
            onProfileClick={() => navigate('/profile')} 
          />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Проверка доступа к курсу...</p>
          </div>
        </div>
      </div>
    );
  }

  // Если нет доступа, этот компонент не должен отображаться
  // (пользователь уже перенаправлен)
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="studentCourses" userRole={user.role} />
      
      <div className="main-content">
        <Topbar 
          userName={fullName} 
          userRole={user.role} 
          onProfileClick={() => navigate('/profile')} 
        />

        {/* Заголовок курса */}
        <div className="course-header">
          <div className="course-info">
            <button 
              className="back-button"
              onClick={() => navigate('/student-courses')}
            >
              ← Назад к курсам
            </button>
            <h1>{course ? course.name : 'Загрузка курса...'}</h1>
            {course?.description && (
              <p className="course-description">{course.description}</p>
            )}
          </div>
        </div>
        
        {!course ? (
          <p>Загрузка информации о курсе...</p>
        ) : lessons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>В этом курсе пока нет занятий</h3>
            <p>Занятия появятся, когда преподаватель их добавит</p>
          </div>
        ) : (
          <div className="lessons-section">
            <div className="section-header">
              <h2>Все занятия курса</h2>
              <div className="lessons-stats">
                <span className="stat">
                  Всего: {lessons.length}
                </span>
                <span className="stat scheduled">
                  В расписании: {lessons.filter(l => getLessonScheduleInfo(l.id)).length}
                </span>
                <span className="stat opened">
                  Открыто: {lessons.filter(l => isLessonOpened(l.id)).length}
                </span>
              </div>
            </div>
            
            <ul className="lessons-list">
              {lessons.map((l, index) => {
                const scheduleItem = getLessonScheduleInfo(l.id);
                const status = getLessonStatus(l.id);
                
                return (
                  <li key={l.id} className={`lesson-item ${status}`}>
                    <div className="lesson-number">
                      {status === 'opened' ? '✓' : index + 1}
                    </div>
                    
                    <div className="lesson-info">
                      <h3 className="lesson-title">{l.name}</h3>
                      
                      <div className="lesson-meta">
                        {scheduleItem?.holding_date ? (
                          <div className="lesson-date">
                            <span className="date-label">Дата проведения:</span>
                            <time className="date-value">
                              {new Date(scheduleItem.holding_date).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </time>
                          </div>
                        ) : (
                          <div className="lesson-date">
                            <span className="date-label">Статус:</span>
                            <span className="date-value no-date">не добавлен в расписание</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="lesson-actions">
                      {status === 'scheduled' ? (
                        <div className="lesson-status-badge scheduled">
                          <span className="status-icon">📅</span>
                          <span>Не в расписании</span>
                        </div>
                      ) : status === 'closed' ? (
                        <div className="lesson-status-badge closed">
                          <span className="status-icon">⏰</span>
                          <span>Закрыто</span>
                        </div>
                      ) : (
                        <button
                          className="lesson-button opened"
                          onClick={() => navigate(`/courses/${courseId}/lessons/${l.id}`)}
                        >
                          <span className="button-icon">▶</span>
                          Открыть урок
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Информационный блок */}
        <div className="info-section">
          <div className="info-card">
            <h3>Как проходят занятия?</h3>
            <ul>
              <li><strong>Доступ к курсу</strong> - только через группы, к которым вы добавлены</li>
              <li><strong>Все уроки видны сразу</strong> - вы можете планировать обучение</li>
              <li><strong>Расписание</strong> - преподаватель назначает даты проведения</li>
              <li><strong>Доступ к материалам</strong> - открывается после начала урока</li>
              <li><strong>Выполнение заданий</strong> - доступно в назначенное время</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
