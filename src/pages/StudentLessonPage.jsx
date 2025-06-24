// src/pages/StudentLessonPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getLessonWithMaterials } from '../services/lessonService';
import { submitHomework, getStudentMaterials } from '../services/homeworkService';
import '../styles/StudentLessonPage.css';

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [text, setText] = useState('');
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
        
        console.log('[StudentLessonPage] Loading lesson:', { courseId, lessonId });
        
        // Загружаем информацию об уроке
        try {
          const lessonData = await getLessonWithMaterials(courseId, lessonId);
          console.log('[StudentLessonPage] Lesson loaded:', lessonData);
          setLesson(lessonData);
        } catch (lessonError) {
          console.error('[StudentLessonPage] Error loading lesson:', lessonError);
          setError('Не удалось загрузить информацию об уроке');
          return;
        }
        
        // Проверяем, отправлял ли студент домашнее задание
        try {
          const materials = await getStudentMaterials(courseId, lessonId);
          console.log('[StudentLessonPage] Student materials:', materials);
          
          if (materials && materials.length > 0) {
            setSubmitted(true);
          }
        } catch (materialsError) {
          console.warn('[StudentLessonPage] Could not check materials:', materialsError);
          // Не блокируем интерфейс если не удалось проверить материалы
        }
        
      } catch (err) {
        console.error('[StudentLessonPage] Error loading lesson:', err);
        setError('Не удалось загрузить информацию об уроке');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, lessonId]);

  const handleSubmit = async () => {
    console.log('[StudentLessonPage] === SUBMIT DEBUG START ===');
    
    // ИСПРАВЛЕНО: Более строгая валидация
    const hasText = text && text.trim().length > 0;
    const hasFile = file && file instanceof File;
    
    console.log('[StudentLessonPage] Validation:', { hasText, hasFile, textValue: text, fileValue: file });
    
    if (!hasText && !hasFile) {
      alert('Введите текст домашнего задания или выберите файл');
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('[StudentLessonPage] Submitting homework with params:', { 
        courseId, 
        lessonId, 
        hasText,
        hasFile,
        textLength: text?.length || 0,
        textPreview: text?.substring(0, 100),
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type
      });
      
      // ВРЕМЕННО: Попробуем отправить только текст для отладки
      const submissionData = {
        text: hasText ? text.trim() : (hasFile ? 'Выполнено (см. прикрепленный файл)' : ''),
        file: hasFile ? file : null
      };
      
      console.log('[StudentLessonPage] Final submission data:', submissionData);
      
      const result = await submitHomework(courseId, lessonId, submissionData);
      
      console.log('[StudentLessonPage] Homework submission result:', result);
      
      setSubmitted(true);
      setText('');
      setFile(null);
      
      // Очищаем input файла
      const fileInput = document.getElementById('homework-file');
      if (fileInput) {
        fileInput.value = '';
      }
      
      alert('Домашнее задание успешно отправлено!');
    } catch (error) {
      console.error('[StudentLessonPage] Error submitting homework:', error);
      
      let errorMessage = 'Ошибка отправки домашнего задания.';
      
      // Более детальная обработка ошибок
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('[StudentLessonPage] Error data structure:', errorData);
        
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            const errorMessages = errorData.detail.map(err => {
              const location = err.loc ? err.loc.join('.') : 'unknown field';
              return `${location}: ${err.msg}`;
            });
            errorMessage = `Ошибки валидации:\n${errorMessages.join('\n')}`;
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('[StudentLessonPage] Final error message:', errorMessage);
      alert(`${errorMessage}\n\nПроверьте консоль разработчика для подробностей.`);
    } finally {
      setSubmitting(false);
      console.log('[StudentLessonPage] === SUBMIT DEBUG END ===');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // ДОБАВЛЕНО: Проверяем размер файла (например, макс 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        alert('Файл слишком большой. Максимальный размер: 10MB');
        e.target.value = ''; // Очищаем input
        return;
      }
      
      console.log('[StudentLessonPage] File selected:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    console.log('[StudentLessonPage] Text changed, length:', newText.length);
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="studentCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar userName={fullName} userRole={user.role} onProfileClick={() => navigate('/profile')} />
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка урока...</p>
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
          <Topbar userName={fullName} userRole={user.role} onProfileClick={() => navigate('/profile')} />
          <div className="error-container">
            <h2>Ошибка</h2>
            <p>{error}</p>
            <button 
              onClick={() => navigate(`/courses/${courseId}/student`)} 
              className="btn-back"
            >
              Вернуться к курсу
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="studentCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar userName={fullName} userRole={user.role} onProfileClick={() => navigate('/profile')} />
          <div className="error-container">
            <h2>Урок не найден</h2>
            <p>Запрашиваемый урок не существует или был удален</p>
            <button 
              onClick={() => navigate(`/courses/${courseId}/student`)} 
              className="btn-back"
            >
              Вернуться к курсу
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
        <Topbar userName={fullName} userRole={user.role} onProfileClick={() => navigate('/profile')} />

        <div className="lesson-header">
          <button 
            className="btn-back"
            onClick={() => navigate(`/courses/${courseId}/student`)}
          >
            ← Вернуться к курсу
          </button>
          <h1>{lesson.name}</h1>
        </div>

        <div className="lesson-content">
          <div className="lesson-info">
            <h2>Информация об уроке</h2>
            <p><strong>Описание:</strong> {lesson.description || 'Нет описания'}</p>
            {lesson.holding_date && (
              <p><strong>Дата проведения:</strong> {new Date(lesson.holding_date).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            )}
          </div>

          <div className="lesson-materials">
            <h2>Учебные материалы</h2>
            <div className="materials-list">
              {lesson.student_material?.url && (
                <div className="material-item">
                  <div className="material-icon">📄</div>
                  <div className="material-info">
                    <h3>Материал для ученика</h3>
                    <a href={lesson.student_material.url} target="_blank" rel="noreferrer">
                      Просмотреть / Скачать
                    </a>
                  </div>
                </div>
              )}
              
              {lesson.homework?.url && (
                <div className="material-item">
                  <div className="material-icon">📝</div>
                  <div className="material-info">
                    <h3>Домашнее задание</h3>
                    <a href={lesson.homework.url} target="_blank" rel="noreferrer">
                      Просмотреть / Скачать
                    </a>
                  </div>
                </div>
              )}
              
              {!lesson.student_material?.url && !lesson.homework?.url && (
                <p>Материалы для этого урока не загружены</p>
              )}
            </div>
          </div>

          <div className="homework-submission">
            <h2>Сдача домашнего задания</h2>
            
            {submitted ? (
              <div className="hw-submitted">
                <div className="submitted-icon">✅</div>
                <h3>Вы уже сдали домашнее задание</h3>
                <p>Преподаватель скоро его проверит</p>
              </div>
            ) : (
              <div className="hw-form">
                <p>Отправьте домашнее задание текстом или файлом:</p>
                
                <div className="submission-options">
                  <div className="submission-option">
                    <h3>Текстовый ответ</h3>
                    <textarea
                      placeholder="Введите ваш ответ здесь..."
                      value={text}
                      onChange={handleTextChange}
                      disabled={submitting}
                      className="text-homework"
                      rows={6}
                    />
                    <small>Количество символов: {text.length}</small>
                  </div>
                  
                  <div className="submission-option">
                    <h3>Или загрузить файл</h3>
                    <div className="file-upload">
                      <input
                        type="file"
                        id="homework-file"
                        onChange={handleFileChange}
                        disabled={submitting}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.zip,.rar"
                      />
                      <label 
                        htmlFor="homework-file" 
                        className={submitting ? "disabled" : ""}
                      >
                        {file ? `📎 ${file.name}` : "📁 Выберите файл"}
                      </label>
                    </div>
                    {file && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                        Размер: {Math.round(file.size / 1024)} KB
                      </div>
                    )}
                  </div>
                </div>
                
                <button 
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={(!text.trim() && !file) || submitting}
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
        </div>
      </div>
    </div>
  );
}
