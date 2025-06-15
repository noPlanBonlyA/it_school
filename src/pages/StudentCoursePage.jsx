import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import { listLessons, getCourse } from '../services/lessonService';

export default function StudentCoursePage() {
  const { courseId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [course,  setCourse]  = useState(null);
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    (async () => {
      const c = await getCourse(courseId);
      setCourse(c);
      const l = await listLessons(courseId);
      setLessons(l.objects || []);
    })();
  }, [courseId]);

  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  return (
    <div className="app-layout">
      <Sidebar activeItem="studentCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>{course ? course.name : 'Курс'}</h1>

        {lessons.length === 0 ? (
          <p>Занятий пока нет.</p>
        ) : (
          <ul>
            {lessons.map(l => (
              <li key={l.id}>
                <button onClick={() => navigate(`/courses/${courseId}/lessons/${l.id}`)}>
                  {l.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
