import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import {
  getLesson,
  getStudentLessonMaterial
} from '../services/lessonService';

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson,   setLesson]   = useState(null);
  const [material, setMaterial] = useState(null);   // { type:'html'|'file', html|url }

  /* ───── загрузка ───── */
  useEffect(() => { (async () => {
    try {
      const l  = await getLesson(courseId, lessonId);             // **403-safe**
      setLesson(l);

      const m  = await getStudentLessonMaterial(courseId, lessonId);
      setMaterial(m);
    } catch (e) {
      alert('Не удалось загрузить урок');
      console.error(e);
    }
  })(); }, [courseId, lessonId]);

  const fio = [user.first_name, user.surname, user.patronymic].filter(Boolean).join(' ');

  return (
    <div className="lesson-page app-layout">
      <Sidebar activeItem="studentCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>{lesson ? lesson.name : 'Загрузка…'}</h1>

        {!material ? (
          <p>Материал загружается…</p>
        ) : material.type === 'html' ? (
          <div
            className="lesson-content"
            dangerouslySetInnerHTML={{ __html: material.html }}
          />
        ) : (
          <iframe
            className="lesson-iframe"
            src={material.url}
            title={material.name}
            width="100%"
            height="800"
            style={{ border: 'none' }}
          />
        )}
      </div>
    </div>
  );
}
