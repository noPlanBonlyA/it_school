import React, { useState, useEffect } from 'react';
import { useNavigate }  from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import {
  getAllCourses,
  listStudentCourses
} from '../services/courseService';
import '../styles/CoursesPage.css';

/* список курсов для ученика */
export default function StudentCoursesPage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [myCourses,   setMyCourses]   = useState([]);  // только те, что привязаны к студенту
  const [otherCourses,setOtherCourses]= useState([]);  // все остальные (read-only)

  /* ───── загрузка ───── */
  useEffect(() => { (async () => {
    try {
      const mine = await listStudentCourses();            // → Array<Course>
      const all  = (await getAllCourses(100, 0)).objects || [];

      const mineIds = new Set(mine.map(c => c.id));

      setMyCourses(mine);
      setOtherCourses(all.filter(c => !mineIds.has(c.id)));
    } catch (e) {
      console.error('Ошибка загрузки курсов:', e);
    }
  })(); }, []);

  /* ───── helpers ───── */
  const openCourse = id => {
    if (myCourses.some(c => c.id === id)) {
      navigate(`/courses/${id}/student`);
    }
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  const renderCard = (c, locked = false) => {
    let img = '';
    if (c.photo?.url) {
      img = c.photo.url.startsWith('http')
        ? c.photo.url
        : `${window.location.protocol}//${window.location.hostname}:8080${c.photo.url}`;
    }

    return (
      <div className={`course-card ${locked ? 'locked' : ''}`} key={c.id}>
        <div className="course-image-wrapper">
          {img ? (
            <img src={img} alt={c.name} className="course-image" />
          ) : (
            <div className="course-image placeholder" />
          )}
        </div>

        <div className="course-body">
          <h2 className="course-title">{c.name}</h2>

          {locked ? (
            <span className="course-locked-label">Недоступно</span>
          ) : (
            <button className="course-button" onClick={() => openCourse(c.id)}>
              Открыть
            </button>
          )}

        </div>
      </div>
    );
  };

  /* ───── UI ───── */
  return (
    <div className="courses-page app-layout">
      <Sidebar activeItem="studentCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          notifications={0}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Курсы</h1>

        {/* мои курсы */}
        <h2 className="section-label">Мои курсы</h2>
        {myCourses.length ? (
          <div className="courses-grid">
            {myCourses.map(c => renderCard(c))}
          </div>
        ) : (
          <p>У вас пока нет доступных курсов.</p>
        )}

        {/* остальные */}
        {otherCourses.length > 0 && (
          <>
            <h2 className="section-label">Другие курсы</h2>
            <div className="courses-grid">
              {otherCourses.map(c => renderCard(c, true))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
