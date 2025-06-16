import React, { useState, useEffect } from 'react';
import { useNavigate }  from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import { listStudentCourses } from '../services/courseService';
import '../styles/CoursesPage.css';

export default function StudentCoursesPage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [myCourses,   setMyCourses]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ───── загрузка курсов из групп пользователя ───── */
  useEffect(() => { (async () => {
    try {
      setLoading(true);
      // Используем API /courses/student - возвращает только курсы из групп пользователя
      const studentCourses = await listStudentCourses();
      console.log('[StudentCourses] Available courses:', studentCourses);
      setMyCourses(studentCourses);
    } catch (e) {
      console.error('Ошибка загрузки курсов:', e);
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

  const renderCard = (c) => {
    let img = '';
    if (c.photo?.url) {
      img = c.photo.url.startsWith('http')
        ? c.photo.url
        : `${window.location.protocol}//${window.location.hostname}:8080${c.photo.url}`;
    }

    return (
      <div className="course-card available" key={c.id}>
        <div className="course-image-wrapper">
          {img ? (
            <img src={img} alt={c.name} className="course-image" />
          ) : (
            <div className="course-image placeholder" />
          )}
        </div>

        <div className="course-body">
          <h2 className="course-title">{c.name}</h2>
          <p className="course-description">{c.description}</p>
          <div className="course-meta">
            <span className="course-author">Автор: {c.author_name}</span>
            <span className="course-price">₽{c.price}</span>
          </div>

          <div className="course-status-container">
            <span className="course-available-label">✅ Доступен</span>
            <button className="course-button available" onClick={() => openCourse(c.id)}>
              Открыть курс
            </button>
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
            <div className="loading-spinner"></div>
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
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Мои курсы</h1>

        {/* доступные курсы */}
        <section className="courses-section">
          <div className="section-header">
            <h2 className="section-label">Доступные курсы</h2>
            <span className="course-count">{myCourses.length} курс(ов)</span>
          </div>
          {myCourses.length ? (
            <div className="courses-grid">
              {myCourses.map(c => renderCard(c))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>У вас пока нет доступных курсов</h3>
              <p>Курсы появятся после добавления вас в группу с курсами</p>
            </div>
          )}
        </section>

        {/* информационный блок */}
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
