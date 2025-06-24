// src/pages/StudentLessonPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import '../styles/StudentLessonPage.css';

import { getStudentMaterials, submitHomework } from '../services/homeworkService';

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
        
        console.log('[StudentLessonPage] Loading lesson materials:', { courseId, lessonId });
        
        // ИСПРАВЛЕНО: Загружаем материалы через правильный endpoint
        try {
          const materialsResponse = await getStudentMaterials(courseId, lessonId);
          console.log('[StudentLessonPage] Materials loaded:', materialsResponse);
          
          // Устанавливаем данные урока из материалов
          setLesson({
            id: materialsResponse.id,
            name: materialsResponse.name,
            // Пока что ставим заглушки для URL-ов, они будут из других endpoints
            student_material_url: null,
            homework_material_url: null
          });
        } catch (materialsError) {
          console.error('[StudentLessonPage] Error loading materials:', materialsError);
          setError('Не удалось загрузить материалы урока');
          return;
        }
        
        // Проверяем, отправлял ли студент домашнее задание
        // Это проверим через lesson-student endpoint
        try {
          // Получаем расписание для этого урока
          const scheduleResponse = await fetch('http://localhost:8080/api/schedule/', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (scheduleResponse.ok) {
            const schedule = await scheduleResponse.json();
            const lessonGroups = schedule.filter(item => item.lesson_id === lessonId);
            
            // Для каждой группы проверяем lesson-students
            for (const lessonGroup of lessonGroups) {
              try {
                const response = await fetch(`http://localhost:8080/api/courses/lesson-student?lesson_group_id=${lessonGroup.id}`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                });
                
                if (response.ok) {
                  const lessonStudents = await response.json();
                  const currentStudent = lessonStudents.find(ls => ls.student.user_id === user.id);
                  
                  if (currentStudent && currentStudent.is_sent_homework) {
                    setSubmitted(true);
                    break;
                  }
                }
              } catch (error) {
                console.warn('[StudentLessonPage] Could not check lesson students:', error);
              }
            }
          }
        } catch (error) {
          console.warn('[StudentLessonPage] Could not check homework status:', error);
        }
        
      } catch (err) {
        console.error('[StudentLessonPage] Error loading lesson:', err);
        setError('Не удалось загрузить информацию об уроке');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, lessonId, user.id]);

  const handleSubmit = async () => {
    console.log('[StudentLessonPage] === SUBMIT DEBUG START ===');
    
    // ИСПРАВЛЕНО: Только файл обязателен
    const hasFile = file && file instanceof File;
    
    console.log('[StudentLessonPage] Validation:', { hasFile, fileValue: file });
    
    if (!hasFile) {
      alert('Выберите файл для отправки домашнего задания');
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('[StudentLessonPage] Submitting homework with params:', { 
        courseId, 
        lessonId, 
        hasFile,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type
      });
      
      // ИСПРАВЛЕНО: Формируем FormData согласно API
      const formData = new FormData();
      
      // homework_data с именем файла (согласно API документации)
      formData.append('homework_data', JSON.stringify({
        name: file.name
      }));
      
      // Файл как homework_file (согласно API)
      formData.append('homework_file', file);
      
      console.log('[StudentLessonPage] FormData prepared:', {
        homework_data: JSON.stringify({ name: file.name }),
        homework_file_name: file.name
      });
      
      // Отправляем через правильный endpoint
      const result = await submitHomework(courseId, lessonId, formData);
      
      console.log('[StudentLessonPage] Homework submission result:', result);
      
      setSubmitted(true);
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
            <p><strong>Урок:</strong> {lesson.name}</p>
            <p><em>Материалы загружаются через API endpoints</em></p>
          </div>

          <div className="lesson-materials">
            <h2>Учебные материалы</h2>
            <div className="materials-list">
              {/* ВРЕМЕННО: Показываем что материалы будут загружены через API */}
              <div className="material-item">
                <div className="material-icon">📄</div>
                <div className="material-info">
                  <h3>Материалы урока</h3>
                  <p>Материалы будут загружены через endpoint /student-materials</p>
                </div>
              </div>
              
              <div className="material-item">
                <div className="material-icon">📝</div>
                <div className="material-info">
                  <h3>Домашнее задание</h3>
                  <p>Задание будет загружено через endpoint /student-materials</p>
                </div>
              </div>
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
                            const fileInput = document.getElementById('homework-file');
                            if (fileInput) fileInput.value = '';
                          }}
                          style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px' }}
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
        </div>
      </div>
    </div>
  );
}
