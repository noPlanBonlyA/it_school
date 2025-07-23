// src/pages/StudentLessonPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosInstance';
import { getStudentMaterials } from '../services/homeworkService';
import '../styles/StudentLessonPage.css';

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [file, setFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[StudentLessonPage] Loading lesson materials for:', { courseId, lessonId });
        
        let lessonData = null;
        
        // Пытаемся загрузить через сервис (предпочтительный способ)
        try {
          console.log('[StudentLessonPage] Trying getStudentMaterials service...');
          lessonData = await getStudentMaterials(courseId, lessonId);
          console.log('[StudentLessonPage] Service response:', lessonData);
        } catch (serviceError) {
          console.log('[StudentLessonPage] Service failed, trying direct API...');
          
          // Fallback: пытаемся загрузить напрямую через API
          try {
            const studentMaterialsResponse = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-materials`);
            lessonData = studentMaterialsResponse.data;
            console.log('[StudentLessonPage] Direct API response:', lessonData);
          } catch (directApiError) {
            console.log('[StudentLessonPage] Direct API failed, trying alternative endpoint...');
            
            // Второй fallback: альтернативный endpoint
            const alternativeResponse = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
            lessonData = alternativeResponse.data;
            console.log('[StudentLessonPage] Alternative API response:', lessonData);
          }
        }
        
        console.log('[StudentLessonPage] Raw API Response structure:', JSON.stringify(lessonData, null, 2));
        
        if (lessonData) {
          const lessonObject = {
            id: lessonId,
            name: lessonData.name || lessonData.lesson_name || lessonData.title || 'Урок',
            course_id: courseId,
            // Различные возможные форматы URL-ов материалов
            student_material_url: 
              lessonData.student_material?.url || 
              lessonData.student_material_url || 
              lessonData.materials?.student_url ||
              lessonData.student_materials ||
              null,
            homework_material_url: 
              lessonData.homework?.url || 
              lessonData.homework_material_url || 
              lessonData.homework?.file_url ||
              lessonData.homework_url ||
              lessonData.materials?.homework_url ||
              null
          };
          
          console.log('[StudentLessonPage] Final lesson object:', lessonObject);
          console.log('[StudentLessonPage] Material URLs found:', {
            student_material_url: lessonObject.student_material_url,
            homework_material_url: lessonObject.homework_material_url
          });
          setLesson(lessonObject);
          
        } else {
          setError('Материалы урока не найдены');
        }
        
      } catch (error) {
        console.error('[StudentLessonPage] Error loading lesson:', error);
        setError('Ошибка загрузки урока: ' + (error.response?.data?.detail || error.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, lessonId]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Проверяем размер файла (максимум 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('Выберите файл для отправки');
      return;
    }

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('homework_file', file);
      formData.append('homework_data', JSON.stringify({
        name: file.name,
        lesson_student_id: lessonId // или другой ID, если нужен
      }));

      console.log('[StudentLessonPage] Submitting homework:', {
        fileName: file.name,
        fileSize: file.size,
        courseId,
        lessonId
      });

      // ИСПРАВЛЕНО: Используем правильный эндпоинт для отправки ДЗ
      const response = await api.post(
        `/courses/${courseId}/lessons/${lessonId}/homework`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('[StudentLessonPage] Homework submitted successfully:', response.data);
      
      setSubmitted(true);
      setFile(null);
      alert('Домашнее задание успешно отправлено!');
      
    } catch (error) {
      console.error('[StudentLessonPage] Error submitting homework:', error);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Неизвестная ошибка';
      
      alert('Ошибка отправки домашнего задания: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = [user.first_name, user.surname, user.patronymic].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="courses" userRole={user?.role} />
        <div className="main-content">
          <Topbar 
            userName={fullName}
            userRole={user?.role}
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
        <Sidebar activeItem="courses" userRole={user?.role} />
        <div className="main-content">
          <Topbar 
            userName={fullName}
            userRole={user?.role}
          />
          <div className="content-area">
            <div className="error-container">
              <h2>Ошибка загрузки</h2>
              <p>{error}</p>
              <button 
                onClick={() => navigate(`/courses/${courseId}/student`)}
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
      <Sidebar activeItem="courses" userRole={user?.role} />
      
      <div className="main-content">
        <Topbar 
          userName={fullName}
          userRole={user?.role}
        />
        
        <div className="content-area student-lesson-page">
          {/* Хлебные крошки */}
          <div className="breadcrumb">
            <button 
              onClick={() => navigate('/courses')}
              className="breadcrumb-link"
            >
              Курсы
            </button>
            <span className="breadcrumb-separator">›</span>
            <button 
              onClick={() => navigate(`/courses/${courseId}/student`)}
              className="breadcrumb-link"
            >
              Курс
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{lesson?.name || 'Урок'}</span>
          </div>

          {/* Заголовок урока */}
          <div className="lesson-header">
            <h1>{lesson?.name || 'Урок'}</h1>
            <div className="lesson-meta">
              <span className="lesson-status">
                📚 Материалы урока
              </span>
            </div>
          </div>

          {/* Содержимое урока */}
          <div className="lesson-content">
            
            {/* Debug панель (только в development) */}
            {process.env.NODE_ENV === 'development' && lesson && (
              <div className="debug-panel">
                <details>
                  <summary>🔧 Debug Info (dev only)</summary>
                  <pre>{JSON.stringify(lesson, null, 2)}</pre>
                  <p><strong>Student Material URL:</strong> {lesson.student_material_url || 'Не найден'}</p>
                  <p><strong>Homework Material URL:</strong> {lesson.homework_material_url || 'Не найден'}</p>
                </details>
              </div>
            )}
            
            {/* Материалы для студента - простое отображение как у преподавателя */}
            {lesson?.student_material_url ? (
              <div className="block material-block">
                <h2>Материалы урока</h2>
                <div className="material-content">
                  <iframe
                    src={lesson.student_material_url}
                    title="Материалы урока"
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <a 
                  href={lesson.student_material_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="open-external-link"
                >
                  🔗 Открыть в новом окне
                </a>
              </div>
            ) : (
              <div className="block no-materials">
                <h2>Материалы урока</h2>
                <p className="no-content-message">
                  К этому уроку пока не добавлены материалы для изучения.
                </p>
              </div>
            )}

            {/* Домашнее задание - простое отображение как у преподавателя */}
            {lesson?.homework_material_url ? (
              <div className="block homework-block">
                <h2>Домашнее задание</h2>
                <div className="material-content">
                  <iframe
                    src={lesson.homework_material_url}
                    title="Домашнее задание"
                    style={{
                      width: '100%',
                      minHeight: '300px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <a 
                  href={lesson.homework_material_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="open-external-link"
                >
                  🔗 Открыть в новом окне
                </a>
              </div>
            ) : (
              <div className="block no-homework">
                <h2>Домашнее задание</h2>
                <p className="no-content-message">
                  К этому уроку не задано домашнее задание.
                </p>
              </div>
            )}

            {/* Форма отправки домашнего задания - показываем только если есть ДЗ */}
            {lesson?.homework_material_url && (
              <div className="block">
                <h2>Сдача домашнего задания</h2>
                
                {/* Форма отправки домашнего задания */}
                {submitted ? (
                  <div className="hw-submitted">
                    <div className="submitted-icon">✅</div>
                    <h3>Вы уже сдали домашнее задание</h3>
                    <p>Преподаватель скоро его проверит</p>
                  </div>
                ) : (
                  <div className="hw-form">
                    <p>Загрузите файл с выполненным домашним заданием:</p>
                    
                    <div className="submission-options">
                      <div className="submission-option">
                        <h3>Загрузить файл</h3>
                        <div className="file-upload">
                          <input
                            type="file"
                            id="homework-file"
                            onChange={handleFileChange}
                            disabled={submitting}
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.zip,.rar"
                            required
                          />
                          <label 
                            htmlFor="homework-file" 
                            className={submitting ? "disabled" : ""}
                          >
                            {file ? `📎 ${file.name}` : "📁 Выберите файл"}
                          </label>
                        </div>
                        {file && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Размер: {Math.round(file.size / 1024)} KB
                            </div>
                            <button 
                              type="button" 
                              onClick={() => { setFile(null); }}
                              style={{ 
                                marginTop: '5px', 
                                padding: '5px 10px', 
                                fontSize: '12px',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Удалить файл
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      className="btn-primary"
                      onClick={handleSubmit}
                      disabled={!file || submitting}
                      style={{
                        marginTop: '20px',
                        width: '100%',
                        padding: '12px'
                      }}
                    >
                      {submitting ? 'Отправка...' : 'Отправить домашнее задание'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
