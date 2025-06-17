import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import { listStudentCourses } from '../services/courseService';
import '../styles/CourseCard.css';

export default function StudentCoursesPage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [myCourses,   setMyCourses]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ───── загрузка курсов из групп пользователя ───── */
  useEffect(() => { (async () => {
    try {
      setLoading(true);
      // Используем API /courses/student - возвращает только курсы из групп пользователя
      const courses = await listStudentCourses();
      console.log('[StudentCoursesPage] Loaded courses:', courses);
      setMyCourses(courses || []);
    } catch (err) {
      console.error('[StudentCoursesPage] Error loading courses:', err);
      setError('Не удалось загрузить ваши курсы. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  })(); }, []);

  /* ───── helpers ───── */
  const openCourse = id => {
    navigate(`/courses/${id}/student`);
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  const renderCourseCard = (course) => {
    let imageUrl = '';
    if (course.photo?.url) {
      imageUrl = course.photo.url.startsWith('http')
        ? course.photo.url
        : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`;
    }

    return (
      <div 
        key={course.id} 
        className="course-card" 
        onClick={() => openCourse(course.id)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={course.name} />
        ) : (
          <div className="course-placeholder">
            <span>📚</span>
          </div>
        )}
        <div className="meta">
          <h3>{course.name}</h3>
          <p>{course.description?.substring(0, 60)}...</p>
          <div className="course-info-footer">
            {course.author_name && <span className="author">👩‍🏫 {course.author_name}</span>}
            {course.age_category && <span className="age">👥 {course.age_category}</span>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="courses-page app-layout">
        <Sidebar activeItem="studentCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar
            userName={fullName}
            userRole={user.role}
            onProfileClick={() => navigate('/profile')}
          />
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка курсов...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ───── UI ───── */
  return (
    <div className="courses-page app-layout">
      <Sidebar activeItem="studentCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Мои курсы</h1>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <section className="courses-section">
          <div className="section-header">
            <h2 className="section-label">Доступные курсы</h2>
            <span className="course-count">{myCourses.length} курс(ов)</span>
          </div>
          {myCourses.length ? (
            <div className="courses-grid">
              {myCourses.map(course => renderCourseCard(course))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>У вас пока нет доступных курсов</h3>
              <p>Курсы появятся после добавления вас в группу с курсами</p>
            </div>
          )}
        </section>

        <section className="info-section">
          <div className="info-card">
            <h3>Как получить доступ к курсам?</h3>
            <ol>
              <li>Курсы доступны только через группы</li>
              <li>Администратор должен добавить вас в группу</li>
              <li>К группе должен быть привязан курс</li>
              <li>После этого курс появится в вашем списке</li>
            </ol>
            <p>
              <strong>Текущий статус:</strong> {myCourses.length > 0 
                ? `У вас есть доступ к ${myCourses.length} курс(ам)` 
                : 'Доступных курсов нет'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
