// src/pages/StudentCoursePage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getCourse, getCourseLessons } from '../services/courseService';
import { getUserScheduleOptimized } from '../services/scheduleService';
import { getCoursesPath, getCoursesTitle } from '../utils/navigationUtils';
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

  // Определяем правильный activeItem в зависимости от роли
  const getSidebarActiveItem = (userRole) => {
    switch (userRole) {
      case 'admin':
      case 'superadmin':
        return 'manageCourses';
      case 'teacher':
        return 'teacherCourses';
      case 'student':
        return 'studentCourses';
      default:
        return 'studentCourses';
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Загружаем курс
        const courseData = await getCourse(courseId);
        setCourse(courseData);
        
        // Загружаем уроки курса
        const lessonsData = await getCourseLessons(courseId);
        
        // ДОБАВЛЕНО: дополнительная проверка типа данных
        console.log('[StudentCoursePage] Lessons data received:', lessonsData);
        console.log('[StudentCoursePage] Lessons data type:', typeof lessonsData);
        console.log('[StudentCoursePage] Is array:', Array.isArray(lessonsData));
        
        // Убеждаемся, что у нас есть массив
        const validLessons = Array.isArray(lessonsData) ? lessonsData : [];
        console.log('[StudentCoursePage] Valid lessons:', validLessons);
        
        setLessons(validLessons);
        
        // Загружаем расписание для проверки доступа к урокам
        const scheduleData = await getUserScheduleOptimized(user);
        setSchedule(scheduleData || []);
        
        console.log('[StudentCourse] Loaded data:', {
          course: courseData,
          lessons: lessonsData,
          schedule: scheduleData
        });
        
      } catch (error) {
        console.error('[StudentCourse] Error loading data:', error);
        setError('Не удалось загрузить данные курса');
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
    // ИСПРАВЛЕНО: Теперь проверяем is_opened из расписания
    return scheduleItem ? scheduleItem.is_opened : false;
  };

  // Получаем статус урока для отображения
  const getLessonStatus = (lessonId) => {
    const scheduleItem = getLessonScheduleInfo(lessonId);
    
    if (!scheduleItem) {
      return { text: 'Не запланирован', class: 'not-scheduled' };
    }
    
    if (!scheduleItem.is_opened) {
      return { text: 'Закрыт преподавателем', class: 'unavailable' };
    }
    
    return { text: 'Доступен', class: 'available' };
  };

  const handleLessonClick = (lessonId) => {
    // Проверяем доступ перед переходом
    if (!isLessonOpened(lessonId)) {
      alert('Урок пока закрыт преподавателем. Дождитесь его открытия.');
      return;
    }
    
    console.log('[StudentCourse] Opening lesson:', lessonId);
    navigate(`/courses/${courseId}/lessons/${lessonId}`);
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem={getSidebarActiveItem(user.role)} userRole={user.role} />
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
        <Sidebar activeItem={getSidebarActiveItem(user.role)} userRole={user.role} />
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
              onClick={() => navigate(getCoursesPath(user.role))} 
              className="btn-back"
            >
              Вернуться к {getCoursesTitle(user.role)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem={getSidebarActiveItem(user.role)} userRole={user.role} />
      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <div className="course-header">
          <button 
            className="btn-back"
            onClick={() => navigate(getCoursesPath(user.role))}
          >
            ← Вернуться к {getCoursesTitle(user.role)}
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
              {Array.isArray(lessons) && lessons.map((lesson, index) => {
                const status = getLessonStatus(lesson.id);
                const isOpen = isLessonOpened(lesson.id);
                
                return (
                  <div 
                    key={lesson.id} 
                    className={`lesson-item ${!isOpen ? 'disabled' : ''}`}
                    onClick={() => handleLessonClick(lesson.id)}
                  >
                    <div className="lesson-left">
                      <div className={`lesson-number ${!isOpen ? 'locked' : ''}`}>
                        {isOpen ? (index + 1) : '🔒'}
                      </div>
                      <div className="lesson-info">
                        <h3 className="lesson-title">{lesson.name}</h3>
                        <div className="lesson-meta">
                          <span className={`lesson-status ${status.class}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="lesson-right">
                      {isOpen ? (
                        <div className="lesson-arrow">→</div>
                      ) : (
                        <div className="lesson-locked">🔒</div>
                      )}
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
