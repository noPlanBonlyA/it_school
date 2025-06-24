import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import { getTeacherCourses } from '../services/courseService';
import '../styles/CoursesPage.css';

/**
 * Страница «Мои курсы» для преподавателя.
 * Показывает только курсы, к которым привязан преподаватель
 */
export default function TeacherCoursesPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [myCourses, setMyCourses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  /* ───── загрузка курсов ───── */
  useEffect(() => { (async () => {
    try {
      setLoading(true);
      // Курсы, к которым привязан преподаватель
      const mine = await getTeacherCourses();  // GET /api/courses/teacher
      setMyCourses(mine || []);
      console.log('[TeacherCoursesPage] Loaded courses:', mine);
    } catch (e) {
      console.error('Ошибка загрузки курсов преподавателя:', e);
      setError('Не удалось загрузить ваши курсы. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  })(); }, []);

  /* ───── переходы ───── */
  const openCourse = id => navigate(`/courses/${id}/teacher`);

  /* ФИО в шапке */
  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  /* ───── UI карточка ───── */
  const Card = ({ course }) => {
    const img = course.photo?.url
      ? (course.photo.url.startsWith('http')
          ? course.photo.url
          : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`)
      : '';

    return (
      <div className="course-card" key={course.id} onClick={() => openCourse(course.id)}>
        <div className="course-image-wrapper">
          {img ? <img src={img} alt={course.name} className="course-image" />
               : <div className="course-image placeholder">
                   <span>📚</span>
                 </div>}
        </div>
        <div className="course-body">
          <h2 className="course-title">{course.name}</h2>
          <p className="course-description">{course.description?.substring(0, 100)}...</p>
          <button className="course-button" onClick={(e) => {e.stopPropagation(); openCourse(course.id);}}>
            Открыть курс
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="courses-page app-layout">
        <Sidebar activeItem="teacherCourses" userRole={user.role} />
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

  /* ───── рендер ───── */
  return (
    <div className="courses-page app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onBellClick={() => {}}
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
            <h2 className="section-label">Курсы под вашим управлением</h2>
            <span className="course-count">{myCourses.length} курс(ов)</span>
          </div>
          
          {myCourses.length ? (
            <div className="courses-grid">
              {myCourses.map(c => <Card course={c} key={c.id} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👩‍🏫</div>
              <h3>У вас пока нет привязанных курсов</h3>
              <p>Администратор должен назначить вас преподавателем курса или группы с курсами</p>
            </div>
          )}
        </section>

        <section className="info-section">
          <div className="info-card">
            <h3>Как получить доступ к курсам?</h3>
            <ol>
              <li>Администратор назначает вас преподавателем группы</li>
              <li>К группе привязываются курсы</li>
              <li>Вы получаете доступ к управлению этими курсами</li>
              <li>Можете просматривать материалы и отслеживать прогресс студентов</li>
            </ol>
            <p>
              <strong>Текущий статус:</strong> {myCourses.length > 0 
                ? `Вы ведете ${myCourses.length} курс(ов)` 
                : 'Курсы для преподавания не назначены'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
