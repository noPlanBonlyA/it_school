import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import LessonEditor from '../components/LessonEditor';
import '../styles/CreateLessonPage.css';

export default function CreateLessonPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Проверка прав доступа
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Только преподаватели, администраторы и супер-администраторы могут создавать уроки
    if (!['teacher', 'admin', 'superadmin'].includes(user.role)) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const handleSave = (createdLesson) => {
    // После успешного создания урока возвращаемся на страницу курса
    navigate(`/courses/${courseId}`);
  };

  const handleCancel = () => {
    // При отмене возвращаемся на страницу курса
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="app-layout">
      <Sidebar activeItem="courses" userRole={user?.role} />
      <div className="main-content">
        <SmartTopBar pageTitle="Создание урока" />
        
        <div className="create-lesson-page">
          {/* Мобильный заголовок с кнопкой назад */}
          <div className="mobile-header">
            <button 
              className="back-button"
              onClick={handleCancel}
            >
              <span className="back-icon">←</span>
              <span className="back-text">Назад</span>
            </button>
            <h1>Создать урок</h1>
          </div>

          {/* Десктопный заголовок */}
          <div className="desktop-header">
            <div className="header-info">
              <h1>Создание нового урока</h1>
              <p>Заполните информацию о новом уроке для курса</p>
            </div>
            <button 
              className="btn-secondary back-to-course"
              onClick={handleCancel}
            >
              ← К курсу
            </button>
          </div>

          <div className="create-lesson-content">
            <div className="lesson-editor-container">
              <LessonEditor
                courseId={courseId}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
