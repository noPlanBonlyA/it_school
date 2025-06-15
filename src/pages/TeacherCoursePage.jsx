import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import { getCourse }   from '../services/courseService';
import { listLessons } from '../services/lessonService';

export default function TeacherCoursePage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [course , setCourse ] = useState(null);
  const [lessons, setLessons] = useState([]);

  /* ───── загрузка ───── */
  useEffect(() => { (async () => {
    try {
      setCourse(await getCourse(courseId));

      const l = await listLessons(courseId);
      setLessons(l.objects || []);
    } catch (e) {
      alert('Не удалось загрузить курс');
      console.error(e);
    }
  })(); }, [courseId]);

  const fio = [user.first_name, user.surname, user.patronymic].filter(Boolean).join(' ');

  /* ───────────────── UI ───────────────── */
  return (
    <div className="app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>{course ? course.name : 'Курс'}</h1>

        <button
          className="btn-secondary"
          style={{ marginBottom: 24 }}
          onClick={() => navigate(`/courses/${courseId}`)}   /* CourseDetailPage */
        >
          Управление курсом
        </button>

        {lessons.length === 0 ? (
          <p>Занятий пока нет.</p>
        ) : (
          <ul>
            {lessons.map(l => (
              <li key={l.id}>
                <button
                  onClick={() =>
                    navigate(`/courses/${courseId}/teacher/lessons/${l.id}`)
                  }
                >
                  {l.name}{' '}
                  {l.holding_date &&
                    `— ${new Date(l.holding_date).toLocaleString()}`}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
