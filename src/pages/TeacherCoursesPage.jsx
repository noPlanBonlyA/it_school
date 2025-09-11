import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import CourseImage from '../components/CourseImage';
import { useAuth } from '../contexts/AuthContext';

import { getTeacherCourses } from '../services/courseService';
import '../styles/CourseCard.css';
import '../styles/CourseImageStyles.css';
import '../styles/MobileImageFixes.css';

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

  /* ───── UI карточка ───── */
  const renderCourseCard = (course) => {
    // Обрабатываем age_category как массив или строку
    const ageCategory = Array.isArray(course.age_category) 
      ? course.age_category.join(', ') 
      : course.age_category;

    return (
      <div 
        key={course.id} 
        className="course-card"
        onClick={() => openCourse(course.id)}
      >
        <CourseImage
          src={course.photo?.url}
          alt={course.name}
          className="course-card-image"
          placeholder="📚"
        />
        <div className="meta">
          <h3>{course.name}</h3>
          <p>{course.description?.substring(0, 60)}...</p>
          
          <div className="course-info-footer">
            {course.author_name && <span className="author">👩‍🏫 {course.author_name}</span>}
            {ageCategory && <span className="age">👥 {ageCategory}</span>}
            <span className="status">🎓 Преподаю</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="courses-page app-layout">
        <Sidebar activeItem="teacherCourses" userRole={user.role} />
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

  /* ───── рендер ───── */
  return (
    <div className="courses-page app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />

      <div className="main-content">
        <SmartTopBar pageTitle="Мои курсы" />

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
              {myCourses.map(course => renderCourseCard(course))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👩‍🏫</div>
              <h3>У вас пока нет привязанных курсов</h3>
              <p>Администратор должен назначить вас преподавателем курса или группы с курсами</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
