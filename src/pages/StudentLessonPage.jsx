// src/pages/StudentLessonPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosInstance';
import { getStudentMaterials, getStudentLessonInfo } from '../services/homeworkService';
import { getLessonInfoForStudent } from '../services/lessonService';
import '../styles/StudentLessonPage.css';

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [file, setFile] = useState(null);
  const [studentComment, setStudentComment] = useState(''); // Комментарий студента
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [homeworkStatus, setHomeworkStatus] = useState(null); // Статус ДЗ от сервера

  useEffect(() => {
    loadLessonAndHomeworkStatus();
  }, [courseId, lessonId]);

  const loadLessonAndHomeworkStatus = async () => {
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
          student_additional_material_url: 
            lessonData.student_additional_material?.url || 
            lessonData.student_additional_material_url || 
            lessonData.materials?.student_additional_url ||
            null,
          homework_material_url: 
            lessonData.homework?.url || 
            lessonData.homework_material_url || 
            lessonData.homework?.file_url ||
            lessonData.homework_url ||
            lessonData.materials?.homework_url ||
            null,
          homework_additional_material_url: 
            lessonData.homework_additional_material?.url || 
            lessonData.homework_additional_material_url || 
            lessonData.materials?.homework_additional_url ||
            null
        };
        
        console.log('[StudentLessonPage] Final lesson object:', lessonObject);
        console.log('[StudentLessonPage] Material URLs found:', {
          student_material_url: lessonObject.student_material_url,
          student_additional_material_url: lessonObject.student_additional_material_url,
          homework_material_url: lessonObject.homework_material_url,
          homework_additional_material_url: lessonObject.homework_additional_material_url
        });
        setLesson(lessonObject);
        
      } else {
        setError('Материалы урока не найдены');
      }
      
      // Проверяем статус домашнего задания
      try {
        console.log('[StudentLessonPage] Checking homework status...');
        const homeworkData = await getStudentLessonInfo(courseId, lessonId);
        console.log('[StudentLessonPage] Homework status response:', homeworkData);
        
        if (homeworkData) {
          console.log('[StudentLessonPage] Found homework data:', {
            is_sent_homework: homeworkData.is_sent_homework,
            is_graded_homework: homeworkData.is_graded_homework,
            grade_for_homework: homeworkData.grade_for_homework,
            coins_for_homework: homeworkData.coins_for_homework
          });
          
          // Устанавливаем полный статус домашнего задания
          setHomeworkStatus({
            submitted: Boolean(homeworkData.is_sent_homework),
            graded: Boolean(homeworkData.is_graded_homework),
            grade: homeworkData.grade_for_homework || null,
            coins: homeworkData.coins_for_homework || null,
            lesson_student_id: homeworkData.id || null
          });
          
          // Если ДЗ уже отправлено, обновляем состояние
          if (homeworkData.is_sent_homework) {
            console.log('[StudentLessonPage] Homework already submitted, setting submitted to true');
            setSubmitted(true);
          } else {
            console.log('[StudentLessonPage] Homework not submitted yet');
            setSubmitted(false);
          }
        } else {
          console.log('[StudentLessonPage] No homework data found, assuming not submitted');
          setSubmitted(false);
          setHomeworkStatus({
            submitted: false,
            graded: false,
            grade: null,
            coins: null,
            lesson_student_id: null
          });
        }
      } catch (homeworkError) {
        console.log('[StudentLessonPage] Could not load homework status:', homeworkError);
        // Если нет данных, считаем что ДЗ не отправлено
        setSubmitted(false);
        setHomeworkStatus({
          submitted: false,
          graded: false,
          grade: null,
          coins: null,
          lesson_student_id: null
        });
      }
      
    } catch (error) {
      console.error('[StudentLessonPage] Error loading lesson:', error);
      setError('Ошибка загрузки урока: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

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
        text: studentComment.trim() || '', // Добавляем комментарий студента
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
      setStudentComment(''); // Очищаем комментарий после отправки
      
      // Обновляем статус домашнего задания
      setHomeworkStatus(prevStatus => ({
        submitted: true,
        graded: false, // Новое ДЗ еще не проверено
        grade: null,
        coins: null,
        lesson_student_id: prevStatus?.lesson_student_id || null
      }));
      
      // Перезагружаем статус домашнего задания с сервера для актуализации
      try {
        console.log('[StudentLessonPage] Refreshing homework status from server...');
        const refreshedHomeworkData = await getStudentLessonInfo(courseId, lessonId);
        if (refreshedHomeworkData) {
          console.log('[StudentLessonPage] Refreshed homework status from server:', refreshedHomeworkData);
          setHomeworkStatus({
            submitted: Boolean(refreshedHomeworkData.is_sent_homework),
            graded: Boolean(refreshedHomeworkData.is_graded_homework),
            grade: refreshedHomeworkData.grade_for_homework || null,
            coins: refreshedHomeworkData.coins_for_homework || null,
            lesson_student_id: refreshedHomeworkData.id || null
          });
        }
      } catch (refreshError) {
        console.log('[StudentLessonPage] Could not refresh homework status:', refreshError);
      }
      
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
            
            {/* Материалы урока */}
            <div className="lesson-materials">
              <h3>Материалы урока</h3>
              
              {/* Основные материалы урока */}
              {lesson?.student_material_url ? (
                <div className="material-card">
                  <h4>📚 Учебный материал</h4>
                  <div className="material-content">
                    <iframe 
                      src={lesson.student_material_url} 
                      title="Учебный материал"
                      style={{
                        width: '100%',
                        height: '400px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginBottom: '10px'
                      }}
                    />
                    <a 
                      href={lesson.student_material_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      📄 Открыть в новой вкладке
                    </a>
                  </div>
                </div>
              ) : null}

              {/* Дополнительные материалы урока */}
              {lesson?.student_additional_material_url ? (
                <div className="material-card" style={{ marginTop: '20px' }}>
                  <h4>📎 Дополнительные материалы урока</h4>
                  <div className="material-content">
                    <a 
                      href={lesson.student_additional_material_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '12px 20px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        marginBottom: '10px'
                      }}
                    >
                      📥 Скачать дополнительные материалы
                    </a>
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                      Дополнительные файлы и ресурсы для изучения урока
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Если нет ни основных, ни дополнительных материалов */}
              {!lesson?.student_material_url && !lesson?.student_additional_material_url && (
                <div className="no-materials">
                  <p>📋 Материалы для этого урока пока не добавлены.</p>
                  <p>Обратитесь к преподавателю за дополнительной информацией.</p>
                </div>
              )}
            </div>
            
            {/* Debug панель (только в development) */}
            {process.env.NODE_ENV === 'development' && lesson && (
              <div className="debug-panel">
                <details>
                  <summary>🔧 Debug Info (dev only)</summary>
                  <pre>{JSON.stringify(lesson, null, 2)}</pre>
                  <p><strong>Student Material URL:</strong> {lesson.student_material_url || 'Не найден'}</p>
                  <p><strong>Student Additional Material URL:</strong> {lesson.student_additional_material_url || 'Не найден'}</p>
                  <p><strong>Homework Material URL:</strong> {lesson.homework_material_url || 'Не найден'}</p>
                  <p><strong>Homework Additional Material URL:</strong> {lesson.homework_additional_material_url || 'Не найден'}</p>
                </details>
              </div>
            )}

            {/* Блок домашнего задания */}
            <div className="block">
              <h2>Домашнее задание</h2>
              
              {/* Показываем материал ДЗ если есть */}
              {lesson?.homework_material_url && (
                <div className="homework-material" style={{ marginBottom: '20px' }}>
                  <h3>📝 Задание:</h3>
                  <div className="material-card">
                    <div className="material-content">
                      <iframe 
                        src={lesson.homework_material_url} 
                        title="Домашнее задание"
                        style={{
                          width: '100%',
                          height: '300px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          marginBottom: '10px'
                        }}
                      />
                      <a 
                        href={lesson.homework_material_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        📄 Открыть задание в новой вкладке
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Дополнительные материалы ДЗ */}
              {lesson?.homework_additional_material_url && (
                <div className="homework-additional-material" style={{ marginBottom: '20px' }}>
                  <h3>📎 Дополнительные материалы к домашнему заданию:</h3>
                  <div className="material-card">
                    <div className="material-content">
                      <a 
                        href={lesson.homework_additional_material_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '12px 20px',
                          backgroundColor: '#fd7e14',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginBottom: '10px'
                        }}
                      >
                        📥 Скачать дополнительные материалы к ДЗ
                      </a>
                      <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                        Дополнительные файлы, шаблоны или ресурсы для выполнения домашнего задания
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <h3>Сдача домашнего задания</h3>
              
              {/* Отладочная информация (только в development) */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '10px', 
                  backgroundColor: '#f8f9fa', 
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <strong>Debug Info:</strong><br/>
                  submitted: {submitted.toString()}<br/>
                  homeworkStatus: {JSON.stringify(homeworkStatus, null, 2)}
                </div>
              )}
              
              {/* Форма отправки домашнего задания */}
              {submitted || (homeworkStatus && homeworkStatus.submitted) ? (
                <div className="hw-submitted">
                  <div className="submitted-icon">✅</div>
                  <h3>Домашнее задание уже отправлено</h3>
                  <p>Преподаватель скоро его проверит</p>
                  
                  {/* Показываем статус проверки если есть */}
                  {homeworkStatus && homeworkStatus.graded && (
                    <div className="homework-grade-info">
                      <p><strong>Оценка:</strong> {homeworkStatus.grade}/5</p>
                      {homeworkStatus.coins > 0 && (
                        <p><strong>Получено монет:</strong> {homeworkStatus.coins}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Кнопка "Отправить еще раз" */}
                  <div className="resubmit-section" style={{ marginTop: '20px' }}>
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        console.log('[StudentLessonPage] User clicked "Submit again"');
                        setSubmitted(false);
                        setFile(null);
                        setStudentComment(''); // Очищаем комментарий при повторной отправке
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      📤 Отправить еще раз
                    </button>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Вы можете отправить новую версию домашнего задания
                    </p>
                  </div>
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
                            onClick={() => { 
                              setFile(null); 
                              setStudentComment(''); // Очищаем комментарий при удалении файла
                            }}
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
                  
                  {/* Поле для комментария студента */}
                  <div className="student-comment-section" style={{ marginTop: '20px' }}>
                    <h3>Комментарий к домашнему заданию (необязательно)</h3>
                    <textarea
                      value={studentComment}
                      onChange={(e) => setStudentComment(e.target.value)}
                      placeholder="Напишите комментарий к вашему домашнему заданию (например, вопросы, пояснения или что хотели бы подчеркнуть)..."
                      disabled={submitting}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                      maxLength={500}
                    />
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      marginTop: '5px',
                      textAlign: 'right'
                    }}>
                      {studentComment.length}/500 символов
                    </div>
                    {studentComment.trim() && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '8px', 
                        backgroundColor: '#f8f9fa', 
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <strong>Ваш комментарий будет виден преподавателю:</strong><br/>
                        "{studentComment.trim()}"
                      </div>
                    )}
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
                    {submitting 
                      ? 'Отправка...' 
                      : studentComment.trim() 
                        ? 'Отправить домашнее задание с комментарием'
                        : 'Отправить домашнее задание'
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
