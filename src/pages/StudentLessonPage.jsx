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
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Загружаем информацию об уроке
        const lessonData = await getLessonWithMaterials(courseId, lessonId);
        setLesson(lessonData);
        
        // Проверяем, отправлял ли студент домашнее задание
        const mats = await getStudentMaterials(courseId, lessonId);
        if (mats.length) setSubmitted(true);
        
      } catch (err) {
        console.error('[StudentLessonPage] Error loading lesson:', err);
        setError('Не удалось загрузить информацию об уроке');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, lessonId]);

  const handleSubmit = async () => {
    if (!text.trim() && !file) {
      alert('Введите текст или выберите файл');
      return;
    }
    try {
      await submitHomework(courseId, lessonId, { text, file });
      setSubmitted(true);
      alert('Домашнее задание отправлено');
    } catch (e) {
      console.error(e);
      alert('Ошибка отправки');
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
            <p><strong>Описание:</strong> {lesson.description || 'Нет описания'}</p>
            {lesson.holding_date && (
              <p><strong>Дата проведения:</strong> {new Date(lesson.holding_date).toLocaleDateString()}</p>
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
                <p>Выберите один из способов сдачи домашнего задания:</p>
                
                <div className="submission-options">
                  <div className="submission-option">
                    <h3>Текстовый ответ</h3>
                    <textarea
                      placeholder="Введите ваш ответ здесь..."
                      value={text}
                      onChange={e => setText(e.target.value)}
                      disabled={!!file}
                      className="text-homework"
                    />
                  </div>
                  
                  <div className="submission-option">
                    <h3>Загрузить файл</h3>
                    <div className="file-upload">
                      <input
                        type="file"
                        id="homework-file"
                        onChange={e => setFile(e.target.files[0] || null)}
                        disabled={!!text.trim()}
                      />
                      <label htmlFor="homework-file" className={!!text.trim() ? "disabled" : ""}>
                        {file ? file.name : "Выберите файл"}
                      </label>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={!text.trim() && !file}
                >
                  Отправить домашнее задание
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
