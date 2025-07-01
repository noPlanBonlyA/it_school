// src/pages/StudentLessonPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosInstance';
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
        
        // Загружаем материалы студента
        const studentMaterialsResponse = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-materials`);
        console.log('[StudentLessonPage] Student materials loaded:', studentMaterialsResponse.data);
        
        // Загружаем также информацию об уроке
        const lessonResponse = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
        console.log('[StudentLessonPage] Lesson info loaded:', lessonResponse.data);
        
        if (studentMaterialsResponse.data && lessonResponse.data) {
          // ИСПРАВЛЕНО: Универсальное формирование URL материалов
          let studentMaterialUrl = null;
          let homeworkMaterialUrl = null;
          
          // Материал для студента
          if (studentMaterialsResponse.data.id) {
            studentMaterialUrl = `${window.location.protocol}//${window.location.hostname}:8080/courses/material/${studentMaterialsResponse.data.id}`;
          }
          
          // Домашнее задание  
          if (lessonResponse.data.homework_id) {
            homeworkMaterialUrl = `${window.location.protocol}//${window.location.hostname}:8080/courses/material/${lessonResponse.data.homework_id}`;
          }

          setLesson({
            id: lessonId,
            name: lessonResponse.data.name,
            course_id: courseId,
            // Материалы для студента (могут быть как файлами, так и HTML)
            student_material_url: studentMaterialUrl,
            student_material_name: studentMaterialsResponse.data.name,
            // Домашнее задание (может быть как файлом, так и HTML)
            homework_material_url: homeworkMaterialUrl
          });
          
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

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ') || user.username || 'Пользователь';

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

  // В рендере добавляем универсальное отображение материалов
  const renderMaterial = (materialUrl, materialName, title) => {
    if (!materialUrl) return null;
    
    return (
      <div className="material-section">
        <h3>{title}</h3>
        <div className="material-name">{materialName}</div>
        <div className="material-content">
          <iframe
            src={materialUrl}
            title={title}
            width="100%"
            height="600"
            style={{ border: '1px solid #ddd', borderRadius: '4px' }}
            onError={(e) => {
              // Если iframe не загружается, показываем ссылку для скачивания
              e.target.style.display = 'none';
              const link = e.target.nextElementSibling;
              if (link && link.tagName === 'A') {
                link.style.display = 'block';
              }
            }}
          />
          <a 
            href={materialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ display: 'none', marginTop: '10px' }}
          >
            Открыть материал в новой вкладке
          </a>
        </div>
      </div>
    );
  };

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
            {/* Материалы для студента */}
            {lesson?.student_material_url && (
              <div className="material-section">
                <h2>📖 Материалы урока</h2>
                <div className="material-content">
                  <iframe
                    src={lesson.student_material_url}
                    title="Материалы урока"
                    className="material-iframe"
                    frameBorder="0"
                    style={{
                      width: '100%',
                      minHeight: '500px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                </div>
                <div className="material-actions">
                  <a 
                    href={lesson.student_material_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    🔗 Открыть в новом окне
                  </a>
                </div>
              </div>
            )}

            {/* Домашнее задание */}
            <div className="homework-section">
              <h2>📝 Домашнее задание</h2>
              
              {/* Показываем задание, если есть */}
              {lesson?.homework_material_url && (
                <div className="homework-description">
                  <h3>Задание:</h3>
                  <iframe
                    src={lesson.homework_material_url}
                    title="Домашнее задание"
                    className="homework-iframe"
                    frameBorder="0"
                    style={{
                      width: '100%',
                      minHeight: '300px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}
                  />
                  <div className="material-actions">
                    <a 
                      href={lesson.homework_material_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      🔗 Открыть задание в новом окне
                    </a>
                  </div>
                </div>
              )}

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

              {/* Если нет домашнего задания */}
              {!lesson?.homework_material_url && !submitted && (
                <div className="no-homework">
                  <p>Для этого урока домашнее задание не предусмотрено</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
