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

  // URL'ы
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
    null,

  // ИМЕНА (вот они)
  student_material_name:
    lessonData.student_material?.name ||
    lessonData.student_material_name ||
    lessonData.materials?.student_name ||
    null,
  student_additional_material_name:
    lessonData.student_additional_material?.name ||
    lessonData.student_additional_material_name ||
    lessonData.materials?.student_additional_name ||
    null,
  // на всякий — для блока ДЗ (если захочешь показать):
  homework_material_name:
    lessonData.homework?.name ||
    lessonData.homework_material_name ||
    lessonData.materials?.homework_name ||
    null,
  homework_additional_material_name:
    lessonData.homework_additional_material?.name ||
    lessonData.homework_additional_material_name ||
    lessonData.materials?.homework_additional_name ||
    null,
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
          {/* Кнопка назад */}
          <div className="back-button-container">
            <button 
              onClick={() => navigate(`/courses/${courseId}/student`)}
              className="back-button"
            >
              ← Назад к курсу
            </button>
          </div>

          {/* Заголовок урока с новым дизайном */}
          <div className="lesson-title-section">
            <h1 className="lesson-title" style={{ fontSize: '36px' }}>{lesson?.name || 'Урок'}</h1>
          </div>

          {/* Содержимое урока */}
          <div className="lesson-content">
            
            {/* Материалы урока - новый дизайн */}
            <div className="materials-section">
              <div className="materials-header">
                <h2 className="materials-title" style={{ fontSize: '28px' }}>📚 Материалы урока</h2>
              </div>
              
              {/* Основные материалы урока в одном айфрейме */}
            {lesson?.student_material_url ? (
  <div className="main-material-container">
    {lesson?.student_material_name && (
      <div className="material-name" style={{fontSize:'28px'}}>
        📄 {lesson.student_material_name}
      </div>
    )}
    <div className="material-iframe-wrapper">
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 10 
      }}>
        <button
          onClick={() => {
            const url = lesson.student_material_url;
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Материалы урока</title>
                  <style>
                    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                    iframe { width: 100%; height: 100%; border: none; }
                  </style>
                </head>
                <body>
                  <iframe src="${url}" title="Материалы урока"></iframe>
                </body>
                </html>
              `);
              newWindow.document.close();
            }
          }}
          style={{
            background: 'rgba(0, 177, 143, 0.9)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(3, 131, 106, 1)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0, 177, 143, 0.9)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          🔗 Открыть в новом окне
        </button>
      </div>
      <iframe 
        src={lesson.student_material_url} 
        title="Материалы урока"
        className="main-material-iframe"
        style={{ 
          userSelect: 'none', 
          pointerEvents: 'auto',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onSelectStart={(e) => e.preventDefault()}
      />
    </div>
  </div>
              ) : (
                <div className="no-materials-message">
                  <div className="no-materials-icon">📋</div>
                  <h3>Материалы урока пока не добавлены</h3>
                  <p>Обратитесь к преподавателю за дополнительной информацией</p>
                </div>
              )}
              
              {/* Overlay для блокировки копирования из основных материалов */}
              {lesson?.student_material_url && (
                <div 
                  className="iframe-protection-overlay"
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={(e) => {
                    if (e.button === 2) { // Правый клик
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: lesson?.student_material_name ? '90px' : '50px',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    zIndex: 5,
                    cursor: 'default'
                  }}
                />
              )}
              
              {/* Кнопка скачивания дополнительных материалов по центру */}
              {lesson?.student_additional_material_url && (
  <div className="additional-materials-container">
    {lesson?.student_additional_material_name && (
      <div className="material-name" style={{ marginBottom: '10px', fontSize: '22px', fontWeight: '500' }}>
        📎 {lesson.student_additional_material_name}
      </div>
    )}
    <a 
      href={lesson.student_additional_material_url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="download-additional-btn"
    >
      📥 Скачать дополнительные материалы
    </a>
  </div>
)}
              
              {/* Overlay для блокировки копирования из ДЗ iframe */}
              {lesson?.homework_material_url && (
                <div 
                  className="iframe-protection-overlay"
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={(e) => {
                    if (e.button === 2) { // Правый клик
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: lesson?.homework_material_name ? '90px' : '50px',
                    left: '0',
                    right: '0',
                    bottom: lesson?.homework_additional_material_url ? '80px' : '0',
                    zIndex: 5,
                    cursor: 'default'
                  }}
                />
              )}
            </div>
            
            {/* Блок домашнего задания - новый дизайн */}
            <div className="homework-section">
              <div className="homework-header">
                <h2 className="homework-title" style={{ fontSize: '28px' }}>📋 Домашнее задание</h2>
              </div>
              
              {/* Материалы домашнего задания в едином блоке */}
              {(lesson?.homework_material_url || lesson?.homework_additional_material_url) ? (
  <div className="homework-material-container">
    {/* ОСНОВНОЙ МАТЕРИАЛ ДЗ */}
    {lesson?.homework_material_url && (
      <div className="homework-main-content">
        {lesson?.homework_material_name && (
          <div className="material-name" style={{fontSize:'28px'}}>📝 {lesson.homework_material_name}</div>
        )}
        <div className="homework-iframe-wrapper">
          <div style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            zIndex: 10 
          }}>
            <button
              onClick={() => {
                const url = lesson.homework_material_url;
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                  newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Домашнее задание</title>
                      <style>
                        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                        iframe { width: 100%; height: 100%; border: none; }
                      </style>
                    </head>
                    <body>
                      <iframe src="${url}" title="Домашнее задание"></iframe>
                    </body>
                    </html>
                  `);
                  newWindow.document.close();
                }
              }}
              style={{
                background: 'rgba(255, 193, 7, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 149, 0, 1)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 193, 7, 0.9)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              🔗 Открыть в новом окне
            </button>
          </div>
          <iframe
            src={lesson.homework_material_url}
            title="Домашнее задание"
            className="homework-material-iframe"
            style={{ 
              userSelect: 'none', 
              pointerEvents: 'auto',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            onSelectStart={(e) => e.preventDefault()}
          />
        </div>
      </div>
    )}

    {/* ДОП. МАТЕРИАЛ ДЗ */}
    {lesson?.homework_additional_material_url && (
      <div className="homework-additional-container">
        {lesson?.homework_additional_material_name && (
          <div className="material-name" style={{ marginBottom: '10px', fontSize: '22px', fontWeight: '500' }}>
            📎 {lesson.homework_additional_material_name}
          </div>
        )}
        <a
          href={lesson.homework_additional_material_url}
          target="_blank"
          rel="noopener noreferrer"
          className="download-homework-additional-btn"
        >
          📥 Скачать дополнительные материалы
        </a>
        {/* если хочешь именно встраивать, а не скачивать — замени <a> на iframe-обёртку как выше */}
        {/* 
        <div className="homework-iframe-wrapper">
          <iframe
            src={lesson.homework_additional_material_url}
            title="Доп. материалы к ДЗ"
            className="homework-material-iframe"
          />
        </div> 
        */}
      </div>
    )}
  </div>
) : (
  <div className="no-homework-message">
    <div className="no-homework-icon">📝</div>
    <h3>Домашнее задание будет добавлено позже</h3>
    <p>Следите за обновлениями от преподавателя</p>
  </div>
)}

              
              {/* Раздел сдачи домашнего задания */}
              <div className="homework-submission-section">
                <h3 className="submission-title">✍️ Сдача домашнего задания</h3>
              
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
                        // Сбрасываем статус домашнего задания, чтобы показать форму
                        setHomeworkStatus(prevStatus => ({
                          ...prevStatus,
                          submitted: false,
                          graded: false,
                          grade: null,
                          coins: null
                        }));
                      }}
                    >
                      📤 Отправить еще раз
                    </button>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
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
                      width: 'auto',
                      padding: '12px 32px',
                      display: 'block',
                      marginLeft: 'auto',
                      marginRight: 'auto'
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
    </div>
  );
}
