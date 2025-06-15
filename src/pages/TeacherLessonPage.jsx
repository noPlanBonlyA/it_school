import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import { getLessonInfoForTeacher } from '../services/lessonService';

export default function TeacherLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [info, setInfo] = useState(null);   // lesson + urls

  useEffect(() => { (async () => {
    try { setInfo(await getLessonInfoForTeacher(courseId, lessonId)); }
    catch (e) {
      alert('Не удалось загрузить урок');
      console.error(e);
    }
  })(); }, [courseId, lessonId]);

  const fio = [user.first_name, user.surname, user.patronymic]
              .filter(Boolean).join(' ');

  if (!info) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="teacherCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar userName={fio} userRole={user.role} />
          <p>Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-page app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>{info.name}</h1>

        {/* материал преподавателя */}
        {info.teacher_material_url ? (
          <iframe
            src={info.teacher_material_url}
            title="Teacher material"
            width="100%"
            height="800"
            style={{ border: 'none' }}
          />
        ) : (
          <p>Материала преподавателя нет.</p>
        )}

        {/* домашка — ссылка на файл, если есть */}
        {info.homework_material_url && (
          <p style={{ marginTop: 24 }}>
            Домашнее задание:&nbsp;
            <a href={info.homework_material_url} target="_blank" rel="noreferrer">
              скачать
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
