import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import { useAuth } from '../contexts/AuthContext';

import { listStudentCourses, getAllCourses } from '../services/courseService';
import '../styles/CourseCard.css';

export default function StudentCoursesPage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [myCourses,      setMyCourses]      = useState([]);
  const [otherCourses,   setOtherCourses]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  /* ───── загрузка курсов ───── */
  useEffect(() => { (async () => {
    try {
      setLoading(true);
      
      // 1. Загружаем доступные курсы студента
      const availableCourses = await listStudentCourses();
      const availableIds = new Set(availableCourses.map(c => c.id));
      setMyCourses(availableCourses || []);
      
      // 2. Загружаем все курсы и фильтруем недоступные
      const allCoursesResponse = await getAllCourses(100, 0);
      const allCourses = allCoursesResponse.objects || [];
      const unavailableCourses = allCourses.filter(c => !availableIds.has(c.id));
      setOtherCourses(unavailableCourses);
      
      console.log('[StudentCoursesPage] Available courses:', availableCourses);
      console.log('[StudentCoursesPage] Other courses:', unavailableCourses);
    } catch (err) {
      console.error('[StudentCoursesPage] Error loading courses:', err);
      setError('Не удалось загрузить курсы. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  })(); }, []);

  /* ───── helpers ───── */
  const openCourse = id => {
    navigate(`/courses/${id}/student`);
  };

  const openDisabled = () => {
    alert('У вас нет доступа к этому курсу. Обратитесь к администратору для добавления в группу.');
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  const renderCourseCard = (course, disabled = false) => {
    let imageUrl = '';
    if (course.photo?.url) {
      imageUrl = course.photo.url.startsWith('http')
        ? course.photo.url
        : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`;
    }

    return (
      <div 
        key={course.id} 
        className={`course-card ${disabled ? 'disabled' : ''}`}
        onClick={disabled ? openDisabled : () => openCourse(course.id)}
        style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
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
            {disabled && <span className="status" style={{color: '#dc3545'}}>🔒 Недоступно</span>}
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
          <SmartTopBar pageTitle="Мои курсы" />
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
        <SmartTopBar pageTitle="Мои курсы" />

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Доступные курсы */}
        <section className="courses-section">
          <div className="section-header">
            <h2 className="section-label">Мои доступные курсы</h2>
            <span className="course-count">{myCourses.length} курс(ов)</span>
          </div>
          {myCourses.length ? (
            <div className="courses-grid">
              {myCourses.map(course => renderCourseCard(course, false))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>У вас пока нет доступных курсов</h3>
              <p>Курсы появятся после добавления вас в группу с курсами</p>
            </div>
          )}
        </section>

        {/* Недоступные курсы */}
        <section className="courses-section" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <h2 className="section-label">Другие курсы</h2>
            <span className="course-count">{otherCourses.length} курс(ов)</span>
          </div>
          {otherCourses.length ? (
            <div className="courses-grid">
              {otherCourses.map(course => renderCourseCard(course, true))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>Вы имеете доступ ко всем курсам!</h3>
              <p>Все доступные курсы отображены в разделе выше</p>
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
              <li>После этого курс появится в разделе "Мои доступные курсы"</li>
            </ol>
            <p>
              <strong>Текущий статус:</strong> {myCourses.length > 0 
                ? `У вас есть доступ к ${myCourses.length} из ${myCourses.length + otherCourses.length} курс(ам)` 
                : `Нет доступных курсов из ${otherCourses.length} всего`}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
