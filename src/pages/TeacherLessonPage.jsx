// src/pages/TeacherLessonPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getLessonInfoForTeacher } from '../services/lessonService';
import '../styles/StudentLessonPage.css';

export default function TeacherLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLessonData();
  }, [courseId, lessonId]);

  const loadLessonData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[TeacherLessonPage] Loading lesson data for:', { courseId, lessonId });
      
      const lessonData = await getLessonInfoForTeacher(courseId, lessonId);
      console.log('[TeacherLessonPage] Lesson data loaded:', lessonData);
      
      if (lessonData) {
        const lessonObject = {
          id: lessonId,
          name: lessonData.name || lessonData.lesson_name || lessonData.title || 'Урок',
          course_id: courseId,
          // Материалы для студентов
          student_material_url: lessonData.student_material?.url || null,
          student_additional_material_url: lessonData.student_additional_material?.url || null,
          // Материалы домашнего задания
          homework_material_url: lessonData.homework?.url || null,
          homework_additional_material_url: lessonData.homework_additional_material?.url || null,
          // Материалы для учителя
          teacher_material_url: lessonData.teacher_material?.url || null,
          teacher_additional_material_url: lessonData.teacher_additional_material?.url || null,
          // Дополнительная информация
          lesson_info: lessonData
        };
        
        console.log('[TeacherLessonPage] Final lesson object:', lessonObject);
        setLesson(lessonObject);
      } else {
        setError('Материалы урока не найдены');
      }
      
    } catch (error) {
      console.error('[TeacherLessonPage] Error loading lesson:', error);
      if (error.response?.status === 403) {
        setError('У вас нет доступа к этому уроку. Убедитесь, что вы являетесь преподавателем данного курса.');
      } else if (error.response?.status === 404) {
        setError('Урок не найден. Возможно, он был удален или ещё не создан.');
      } else {
        setError('Ошибка загрузки урока: ' + (error.response?.data?.detail || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const fullName = [user.first_name, user.surname, user.patronymic].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="teacherCourses" userRole={user?.role} />
        <div className="main-content">
          <Topbar 
            userName={fullName}
            userRole={user?.role}
            onProfileClick={() => navigate('/profile')}
          />
          <div className="content-area">
            <div className="loading-container">
              <div className="loader"></div>
              <p>Загрузка урока...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="teacherCourses" userRole={user?.role} />
        <div className="main-content">
          <Topbar 
            userName={fullName}
            userRole={user?.role}
            onProfileClick={() => navigate('/profile')}
          />
          <div className="content-area">
            <div className="error-container">
              <h2>Ошибка загрузки</h2>
              <p>{error}</p>
              <button 
                onClick={() => navigate(`/courses/${courseId}/teacher`)}
                className="btn-primary"
              >
                Вернуться к курсу
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user?.role} />
      
      <div className="main-content">
        <Topbar 
          userName={fullName}
          userRole={user?.role}
          onProfileClick={() => navigate('/profile')}
        />
        
        <div className="content-area student-lesson-page">
          {/* Кнопка назад */}
          <div className="back-button-container">
            <button 
              onClick={() => navigate(`/courses/${courseId}/teacher`)}
              className="back-button"
            >
              ← Назад к курсу
            </button>
          </div>

          {/* Заголовок урока с новым дизайном */}
          <div className="lesson-title-section">
            <h1 className="lesson-title">{lesson?.name || 'Урок'} (Преподаватель)</h1>
          </div>

          {/* Содержимое урока */}
          <div className="lesson-content">
            
            {/* Материалы для учителя */}
            {(lesson?.teacher_material_url || lesson?.teacher_additional_material_url) && (
              <div className="materials-section">
                <div className="materials-header">
                  <h2 className="materials-title">🎓 Материалы для преподавателя</h2>
                </div>
                
                {/* Основные материалы для учителя */}
                {lesson?.teacher_material_url ? (
                  <div className="main-material-container">
                    <div className="material-iframe-wrapper">
                      <iframe 
                        src={lesson.teacher_material_url} 
                        title="Материалы для преподавателя"
                        className="main-material-iframe"
                      />
                    </div>
                  </div>
                ) : null}
                
                {/* Кнопка скачивания дополнительных материалов для учителя */}
                {lesson?.teacher_additional_material_url && (
                  <div className="additional-materials-container">
                    <a 
                      href={lesson.teacher_additional_material_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="download-additional-btn"
                    >
                      � Скачать дополнительные материалы для преподавателя
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Блок домашнего задания */}
            <div className="homework-section">
              <div className="homework-header">
                <h2 className="homework-title">📋 Домашнее задание для студентов</h2>
              </div>
              
              {/* Материалы домашнего задания */}
              {(lesson?.homework_material_url || lesson?.homework_additional_material_url) ? (
                <div className="homework-material-container">
                  {/* Основное задание */}
                  {lesson?.homework_material_url && (
                    <div className="homework-main-content">
                      <div className="homework-iframe-wrapper">
                        <iframe 
                          src={lesson.homework_material_url} 
                          title="Домашнее задание"
                          className="homework-material-iframe"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Дополнительные материалы по центру */}
                  {lesson?.homework_additional_material_url && (
                    <div className="homework-additional-container">
                      <a 
                        href={lesson.homework_additional_material_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="download-homework-additional-btn"
                      >
                        � Скачать дополнительные материалы к заданию
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-homework-message">
                  <div className="no-homework-icon">📝</div>
                  <h3>Домашнее задание будет добавлено позже</h3>
                  <p>Добавьте задание через панель управления курсом</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
