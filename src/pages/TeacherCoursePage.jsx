import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import CourseImage from '../components/CourseImage';
import { useAuth } from '../contexts/AuthContext';
import { getCourse } from '../services/courseService';
import { getCourseLessons } from '../services/lessonService';
import '../styles/CourseDetailPage.css';
import '../styles/CourseImageStyles.css';
import '../styles/MobileImageFixes.css';
import '../styles/TeacherCoursePage.css'; // Добавляем новые стили

export default function TeacherCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // ДОБАВЛЕНО: состояние для ошибок

  /* ───── загрузка ───── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Загружаем курс
        let courseData = null;
        try {
          courseData = await getCourse(courseId);
          setCourse(courseData);
          console.log('[TeacherCoursePage] Course loaded successfully:', courseData);
        } catch (courseError) {
          console.error('[TeacherCoursePage] Error loading course:', courseError);
          setError('Ошибка загрузки данных курса');
          return;
        }
        
        // Загружаем уроки
        try {
          const lessonsData = await getCourseLessons(courseId);
          
          // ДОБАВЛЕНО: дополнительная проверка типа данных
          console.log('[TeacherCoursePage] Lessons data received:', lessonsData);
          console.log('[TeacherCoursePage] Lessons data type:', typeof lessonsData);
          console.log('[TeacherCoursePage] Is array:', Array.isArray(lessonsData));
          
          // Убеждаемся, что у нас есть массив
          const validLessons = Array.isArray(lessonsData) ? lessonsData : [];
          console.log('[TeacherCoursePage] Valid lessons:', validLessons);
          
          setLessons(validLessons);
        } catch (lessonsError) {
          console.error('[TeacherCoursePage] Error loading lessons:', lessonsError);
          // Не прерываем загрузку при ошибке уроков, просто оставляем пустой массив
          setLessons([]);
        }
        
      } catch (error) {
        console.error('[TeacherCoursePage] Unexpected error during loading:', error);
        setError('Ошибка загрузки данных курса');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const fio = [user.first_name, user.surname, user.patronymic].filter(Boolean).join(' ');

  /* ───── Вспомогательные функции ───── */
  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' в ' + date.toLocaleTimeString().slice(0, 5);
  };

  const getStatusBadge = (lesson) => {
    // Здесь можно добавить логику определения статуса урока
    // Например, на основе даты проведения или других параметров
    const today = new Date();
    const lessonDate = lesson.holding_date ? new Date(lesson.holding_date) : null;
    
    if (!lessonDate) return { text: 'Не назначен', class: 'not-scheduled' };
    if (lessonDate > today) return { text: 'Предстоит', class: 'upcoming' };
    return { text: 'Проведен', class: 'completed' };
  };

  /* ───── Создание урока ───── */
  // Удалено: функция создания урока

  /* ───── Тестирование API ───── */
  // Удалено: функция тестирования API

  // ДОБАВЛЕНО: обработка ошибок в render
  if (error) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="teacherCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar userName={fio} userRole={user.role} onProfileClick={() => navigate('/profile')} />
          <div className="error-container">
            <h2>Ошибка</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Перезагрузить</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────── UI ───────────────── */
  return (
    <div className="app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        {loading ? (
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка данных курса...</p>
          </div>
        ) : (
          <>
            <div className="course-header">
              <div className="course-header-top">
                <button 
                  className="btn-back"
                  onClick={() => navigate('/teacher-courses')}
                >
                  ← Вернуться к моим курсам
                </button>
              </div>
              
              {course && (
                <div className="course-main-info">
                  {course.photo?.url && (
                    <CourseImage
                      src={course.photo.url}
                      alt={course.name}
                      className="course-detail-image"
                      placeholder="📚"
                    />
                  )}
                  
                  <div className="course-content">
                    <h1 className="course-title">{course.name}</h1>
                    <p className="course-description">{course.description}</p>
                    <div className="course-meta">
                      <span className="course-author">👩‍🏫 {course.author_name || 'Не указан'}</span>
                      {course.age_category && (
                        <span className="course-category">👥 {course.age_category}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lessons-section">
              <div className="lessons-header">
                <h2>Уроки курса</h2>
                {lessons.length > 0 && (
                  <span className="lessons-count">{lessons.length} уроков</span>
                )}
              </div>

              {lessons.length === 0 ? (
                <div className="no-lessons">
                  <div className="empty-icon">📚</div>
                  <h3>В этом курсе пока нет уроков</h3>
                  <p>Уроки появятся после добавления их администратором</p>
                </div>
              ) : (
                <div className="lessons-list">
                  {Array.isArray(lessons) && lessons.map((lesson, index) => {
                    const status = getStatusBadge(lesson);
                    
                    return (
                      <div
                        key={lesson.id}
                        className="lesson-card"
                        onClick={() => navigate(`/courses/${courseId}/teacher/lessons/${lesson.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="lesson-number">
                          {index + 1}
                        </div>
                        
                        <div className="lesson-content">
                          <div className="lesson-header">
                            <h3 className="lesson-title">{lesson.name}</h3>
                          </div>
                          
                          <div className="lesson-meta">
                            <span className={`lesson-status ${status.class}`}>
                              {status.text}
                            </span>
                            
                            {lesson.holding_date && (
                              <span className="lesson-date">
                                � {formatDate(lesson.holding_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
