// src/pages/TeacherLessonPage.jsx
import React from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import Sidebar                         from '../components/Sidebar';
import Topbar                          from '../components/TopBar';
import TeacherLessonMaterials          from '../components/TeacherLessonMaterials';
import { useAuth }                     from '../contexts/AuthContext';

export default function TeacherLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fullName = [user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  return (
    <div className="app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />
      <div className="main-content">
        <Topbar userName={fullName} userRole={user.role} onProfileClick={()=>navigate('/profile')} />

        <div className="lesson-header">
          <button 
            className="btn-back"
            onClick={() => navigate(`/courses/${courseId}/teacher`)}
          >
            ← Вернуться к курсу
          </button>
          <h1>Урок</h1>
        </div>

        {/* Новый компонент для отображения материалов преподавателя */}
        <TeacherLessonMaterials 
          courseId={courseId} 
          lessonId={lessonId} 
        />
      </div>
    </div>
  );
}
