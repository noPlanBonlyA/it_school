// src/pages/StudentCoursePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getCourse } from '../services/courseService';
import { getCourseLessons } from '../services/courseService';
import { checkStudentCourseAccess } from '../services/courseService';
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
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Проверка доступа
        console.log('[StudentCourse] Checking access to course:', courseId);
        const accessGranted = await checkStudentCourseAccess(courseId);
        
        if (!accessGranted) {
          console.log('[StudentCourse] Access denied to course:', courseId);
          setError('У вас нет доступа к этому курсу. Обратитесь к администратору для добавления в соответствующую группу.');
          setHasAccess(false);
          return;
        }
        
        setHasAccess(true);
        console.log('[StudentCourse] Access granted to course:', courseId);
        
        // Загружаем информацию о курсе
        const courseData = await getCourse(courseId);
        setCourse(courseData);
        
        // Загружаем ВСЕ уроки курса (поскольку доступ к курсу уже проверен)
        const lessonsData = await getCourseLessons(courseId);
        setLessons(lessonsData || []);
        
        // Загружаем расписание для получения дат и статусов уроков
        const scheduleData = await getUserSchedule(user);
        setSchedule(scheduleData || []);
        
        console.log('[StudentCourse] Course loaded:', courseData);
        console.log('[StudentCourse] Lessons loaded:', lessonsData?.length || 0);
        console.log('[StudentCourse] Schedule loaded:', scheduleData?.length || 0);
      } catch (error) {
        console.error('[StudentCourse] Error loading course data:', error);
        setError('Произошла ошибка при загрузке данных курса. Пожалуйста, попробуйте позже.');
        setHasAccess(false);
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
    
    if (!scheduleItem) return { text: 'Не назначен', class: 'unavailable' };
    if (!scheduleItem.is_opened) return { text: 'Закрыт', class: 'closed' };
    if (scheduleItem.is_completed) return { text: 'Завершен', class: 'completed' };
    
    return { text: 'Доступен', class: 'available' };
  };

  const handleLessonClick = (lessonId) => {
    // Проверяем доступность урока перед переходом
    if (isLessonOpened(lessonId)) {
      navigate(`/courses/${courseId}/lessons/${lessonId}`);
    } else {
      alert('Этот урок пока закрыт для изучения');
    }
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

  if (!hasAccess) {
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
            <h2>Доступ ограничен</h2>
            <p>{error || 'У вас нет доступа к этому курсу.'}</p>
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
                    className={`lesson-item ${isOpen ? '' : 'disabled'}`}
                    onClick={isOpen ? () => handleLessonClick(lesson.id) : undefined}
                  >
                    <div className="lesson-left">
                      <div className={`lesson-number ${isOpen ? '' : 'locked'}`}>
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
                      {isOpen && (
                        <div className="lesson-arrow">→</div>
                      )}
                      {!isOpen && (
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
