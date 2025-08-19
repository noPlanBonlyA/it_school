import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getCourse } from '../services/courseService';
import { getCourseLessons } from '../services/lessonService';
import '../styles/CourseDetailPage.css';
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
            <div className="teacher-course-header">
              <div className="course-title-section">
                <h1>{course ? course.name : 'Курс'}</h1>
                {course?.description && (
                  <p className="course-description">{course.description}</p>
                )}
              </div>
            </div>

            <div className="teacher-lessons-container">
              <div className="section-header">
                <h2 className="section-title">Уроки курса</h2>
                <span className="lessons-count">{lessons.length} урок(ов)</span>
              </div>

              {lessons.length === 0 ? (
                <div className="empty-lessons">
                  <div className="empty-icon">📚</div>
                  <h3>В этом курсе пока нет уроков</h3>
                  <p>В данном курсе уроки еще не созданы</p>
                </div>
              ) : (
                <div className="lessons-grid">
                  {Array.isArray(lessons) && lessons.map(lesson => {
                    const status = getStatusBadge(lesson);
                    
                    return (
                      <div
                        key={lesson.id}
                        className="teacher-lesson-card"
                      >
                        <div className="lesson-card-header">
                          <span className={`status-badge ${status.class}`}>
                            {status.text}
                          </span>
                          <span className="lesson-number">Урок {lessons.indexOf(lesson) + 1}</span>
                        </div>
                        
                        <div className="lesson-card-body">
                          <h3 className="lesson-title">{lesson.name}</h3>
                          {lesson.description && (
                            <p className="lesson-desc">{lesson.description.length > 100 
                              ? `${lesson.description.substring(0, 100)}...` 
                              : lesson.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="lesson-card-footer">
                          <div className="lesson-meta">
                            {lesson.holding_date && (
                              <span className="lesson-date">
                                <i className="date-icon">📅</i> {formatDate(lesson.holding_date)}
                              </span>
                            )}
                            
                            <div className="lesson-stats">
                              <span className="materials-count" title="Материалы">
                                <i className="materials-icon">📄</i> {lesson.materials_count || 0}
                              </span>
                              
                              <span className="homework-count" title="Домашние работы">
                                <i className="homework-icon">📝</i> {lesson.homework_count || 0}
                              </span>
                            </div>
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
