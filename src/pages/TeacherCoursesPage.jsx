import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import { getTeacherCourses, getAllCourses } from '../services/courseService';
import '../styles/CoursesPage.css';

/**
 * Страница «Мои курсы» для преподавателя.
 * ▸ верхняя сетка — «Доступные мне» (из GET /api/courses/teacher)
 * ▸ нижняя сетка — «Другие курсы» (все, кроме доступных)
 */
export default function TeacherCoursesPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [myCourses,     setMyCourses]     = useState([]);
  const [otherCourses,  setOtherCourses]  = useState([]);

  /* ───── загрузка курсов ───── */
  useEffect(() => { (async () => {
    try {
      /* 1. курсы, к которым привязан преподаватель */
      const mine = await getTeacherCourses();          // GET /api/courses/teacher
      const myIds = new Set(mine.map(c => c.id));
      setMyCourses(mine);

      /* 2. весь каталог (для списка «прочие» – чтобы отобразить серым) */
      const all = (await getAllCourses(100, 0)).objects || [];
      setOtherCourses(all.filter(c => !myIds.has(c.id)));
    } catch (e) {
      console.error('Ошибка загрузки курсов преподавателя:', e);
    }
  })(); }, []);

  /* ───── переходы ───── */
  const openCourse   = id => navigate(`/courses/${id}/teacher`);
  const openDisabled = () => alert('У вас нет доступа к этому курсу');

  /* ФИО в шапке */
  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  /* ───── UI карточка ───── */
  const Card = ({ course, disabled = false }) => {
    const img = course.photo?.url
      ? (course.photo.url.startsWith('http')
          ? course.photo.url
          : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`)
      : '';

    return (
      <div className={`course-card ${disabled ? 'disabled' : ''}`} key={course.id}>
        <div className="course-image-wrapper">
          {img ? <img src={img} alt={course.name} className="course-image" />
               : <div className="course-image placeholder" />}
        </div>
        <div className="course-body">
          <h2 className="course-title">{course.name}</h2>
          <button
            className="course-button"
            onClick={disabled ? openDisabled : () => openCourse(course.id)}
            disabled={disabled}
          >
            {disabled ? 'Недоступно' : 'Открыть'}
          </button>
        </div>
      </div>
    );
  };

  /* ───── рендер ───── */
  return (
    <div className="courses-page app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          notifications={0}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Курсы преподавателя</h1>

        {/* доступные */}
        <h2 style={{ marginTop: 24 }}>Мои курсы</h2>
        <div className="courses-grid">
          {myCourses.length
            ? myCourses.map(c => <Card course={c} />)
            : <p>Пока нет привязанных курсов.</p>}
        </div>

        {/* остальные */}
        <h2 style={{ marginTop: 32 }}>Другие курсы (просмотр недоступен)</h2>
        <div className="courses-grid">
          {otherCourses.map(c => <Card course={c} disabled />)}
        </div>
      </div>
    </div>
  );
}
