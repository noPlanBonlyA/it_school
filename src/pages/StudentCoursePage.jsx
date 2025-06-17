// src/pages/StudentCoursePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getCourse } from '../services/courseService';
import { getCourseLessons } from '../services/courseService';
import { getUserSchedule } from '../services/scheduleService';
import '../styles/CourseDetailPage.css';

export default function StudentCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[StudentCourse] Loading course data for courseId:', courseId);
        
        // УПРОЩЕНО: Просто загружаем курс без проверки доступа
        try {
          const courseData = await getCourse(courseId);
          setCourse(courseData);
          console.log('[StudentCourse] Course loaded successfully:', courseData);
        } catch (courseError) {
          console.error('[StudentCourse] Error loading course:', courseError);
          setError('Не удалось загрузить курс. Попробуйте позже.');
          return;
        }
        
        // Загружаем уроки курса
        try {
          const lessonsData = await getCourseLessons(courseId);
          setLessons(lessonsData || []);
          console.log('[StudentCourse] Lessons loaded:', lessonsData?.length || 0);
        } catch (lessonsError) {
          console.error('[StudentCourse] Error loading lessons:', lessonsError);
          setLessons([]);
        }
        
        // Загружаем расписание для получения дат и статусов уроков
        try {
          const scheduleData = await getUserSchedule(user);
          setSchedule(scheduleData || []);
          console.log('[StudentCourse] Schedule loaded:', scheduleData?.length || 0);
        } catch (scheduleError) {
          console.error('[StudentCourse] Error loading schedule:', scheduleError);
          setSchedule([]);
        }
        
      } catch (error) {
        console.error('[StudentCourse] Critical error loading course data:', error);
        setError('Произошла ошибка при загрузке данных курса. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, user]);

  // Получаем информацию о расписании урока
  const getLessonScheduleInfo = (lessonId) => {
    return schedule.find(item => item.lesson_id === lessonId);
  };

  // Проверяем, открыт ли урок для изучения
  const isLessonOpened = (lessonId) => {
    const scheduleItem = getLessonScheduleInfo(lessonId);
    // По умолчанию считаем урок открытым
    return scheduleItem ? scheduleItem.is_opened : true;
  };

  // Получаем статус урока для отображения
  const getLessonStatus = (lessonId) => {
    const scheduleItem = getLessonScheduleInfo(lessonId);
    
    if (!scheduleItem) return { text: 'Доступен', class: 'available' };
    if (!scheduleItem.is_opened) return { text: 'Закрыт', class: 'closed' };
    if (scheduleItem.is_completed) return { text: 'Завершен', class: 'completed' };
    
    return { text: 'Доступен', class: 'available' };
  };

  const handleLessonClick = (lessonId) => {
    console.log('[StudentCourse] Opening lesson:', lessonId);
    navigate(`/courses/${courseId}/lessons/${lessonId}`);
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
            <div className="loader"></div>
            <p>Загрузка курса...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="studentCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar
            userName={fullName}
            userRole={user.role}
            onProfileClick={() => navigate('/profile')}
          />
          <div className="access-denied">
            <h2>Ошибка загрузки</h2>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/courses')} 
              className="btn-back"
            >
              Вернуться к курсам
            </button>
          </div>
        </div>
      </div>
    );
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

        <div className="course-header">
          <button 
            className="btn-back"
            onClick={() => navigate('/courses')}
          >
            ← Вернуться к курсам
          </button>
          
          {course && (
            <>
              <div className="course-info">
                <h1>{course.name}</h1>
                <p className="course-description">{course.description}</p>
                <div className="course-meta">
                  <span className="course-author">Автор: {course.author_name || 'Не указан'}</span>
                  {course.age_category && (
                    <span className="course-category">Категория: {course.age_category}</span>
                  )}
                </div>
              </div>
              
              {course.photo?.url && (
                <div className="course-image">
                  <img 
                    src={course.photo.url.startsWith('http') 
                      ? course.photo.url 
                      : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`
                    } 
                    alt={course.name} 
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="lessons-section">
          <h2>Уроки курса</h2>
          
          {lessons.length === 0 ? (
            <div className="no-lessons">
              <div className="empty-icon">📚</div>
              <h3>В этом курсе пока нет уроков</h3>
              <p>Уроки появятся после добавления их преподавателем</p>
            </div>
          ) : (
            <div className="lessons-list">
              {lessons.map((lesson, index) => {
                const status = getLessonStatus(lesson.id);
                const isOpen = isLessonOpened(lesson.id);
                
                return (
                  <div 
                    key={lesson.id} 
                    className="lesson-item"
                    onClick={() => handleLessonClick(lesson.id)}
                  >
                    <div className="lesson-left">
                      <div className="lesson-number">
                        {index + 1}
                      </div>
                      <div className="lesson-info">
                        <h3 className="lesson-title">{lesson.name}</h3>
                        {lesson.description && (
                          <p className="lesson-description">{lesson.description}</p>
                        )}
                        <div className="lesson-meta">
                          <span className={`lesson-status ${status.class}`}>
                            {status.text}
                          </span>
                          {lesson.holding_date && (
                            <span className="lesson-date">
                              {new Date(lesson.holding_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="lesson-right">
                      <div className="lesson-arrow">→</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
