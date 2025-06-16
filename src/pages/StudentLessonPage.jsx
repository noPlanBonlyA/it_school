// src/pages/StudentLessonPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import Sidebar                         from '../components/Sidebar';
import Topbar                          from '../components/TopBar';
import { useAuth }                     from '../contexts/AuthContext';
import { getLessonWithMaterials }      from '../services/lessonService';
import { submitHomework, getStudentMaterials } from '../services/homeworkService';

export default function StudentLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [text, setText]     = useState('');
  const [file, setFile]     = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      setLesson(await getLessonWithMaterials(courseId, lessonId));
      const mats = await getStudentMaterials(courseId, lessonId);
      if (mats.length) setSubmitted(true);
    })();
  }, [courseId, lessonId]);

  const handleSubmit = async () => {
    if (!text.trim() && !file) {
      alert('Введите текст или выберите файл');
      return;
    }
    try {
      await submitHomework(courseId, lessonId, { text, file });
      setSubmitted(true);
      alert('Домашнее задание отправлено');
    } catch (e) {
      console.error(e);
      alert('Ошибка отправки');
    }
  };

  if (!lesson) return <div>Загрузка…</div>;
  const fullName = [user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  return (
    <div className="app-layout">
      <Sidebar activeItem="studentCourses" userRole={user.role} />
      <div className="main-content">
        <Topbar userName={fullName} userRole={user.role} onProfileClick={()=>navigate('/profile')} />

        <h1>{lesson.name}</h1>
        <p><strong>Описание:</strong> {lesson.description || 'Нет описания'}</p>
        <p><strong>Материалы:</strong></p>
        <ul>
          <li>Для учителя: <a href={lesson.teacher_material.url} target="_blank" rel="noreferrer">скачать</a></li>
          <li>Для ученика: <a href={lesson.student_material.url} target="_blank" rel="noreferrer">скачать</a></li>
          <li>Домашнее задание: <a href={lesson.homework.url} target="_blank" rel="noreferrer">скачать</a></li>
        </ul>

        {submitted ? (
          <div className="hw-submitted">Вы уже сдали ДЗ ✓</div>
        ) : (
          <div className="hw-form">
            <h2>Сдать домашнее задание</h2>
            <textarea
              placeholder="Текст домашнего задания..."
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={!!file}
            />
            <input
              type="file"
              onChange={e => setFile(e.target.files[0] || null)}
              disabled={!!text.trim()}
            />
            <button className="btn-primary" onClick={handleSubmit}>
              Отправить ДЗ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
