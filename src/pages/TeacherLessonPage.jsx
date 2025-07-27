// src/pages/TeacherLessonPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import Sidebar                         from '../components/Sidebar';
import Topbar                          from '../components/TopBar';
import TeacherLessonMaterials          from '../components/TeacherLessonMaterials';
import { useAuth }                     from '../contexts/AuthContext';
import { listStudentMaterials, postComment, listComments, getTeacherLessonInfo } from '../services/homeworkService';

export default function TeacherLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [subs, setSubs] = useState([]);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});

  useEffect(() => {
    (async () => {
      try {
        // ИСПРАВЛЕНО: Загружаем информацию об уроке для преподавателя
        const lessonInfo = await getTeacherLessonInfo(courseId, lessonId);
        setLesson({
          ...lessonInfo,
          // Добавляем URL-ы материалов
          teacher_material_url: lessonInfo.teacher_material?.url,
          homework_material_url: lessonInfo.homework?.url
        });
        
        // Загружаем сданные домашние задания
        const mats = await listStudentMaterials(courseId, lessonId);
        setSubs(mats);
        
        // Загружаем комментарии
        const comms = await listComments(courseId, lessonId);
        const byLs = {};
        comms.forEach(c => {
          if (!byLs[c.lesson_student_id]) byLs[c.lesson_student_id] = [];
          byLs[c.lesson_student_id].push(c);
        });
        setComments(byLs);
      } catch (error) {
        console.error('Error loading lesson data:', error);
      }
    })();
  }, [courseId, lessonId]);

  const handleSendComment = async lsId => {
    try {
      const c = await postComment(courseId, lessonId, {
        text: newComment[lsId] || '',
        lesson_student_id: lsId
      });
      setComments(prev => ({
        ...prev,
        [lsId]: [...(prev[lsId]||[]), c]
      }));
      setNewComment(prev => ({ ...prev, [lsId]: '' }));
    } catch (e) {
      console.error(e);
      alert('Ошибка при добавлении комментария');
    }
  };

  const fullName = [user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  return (
    <div className="app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />
      <div className="main-content">
        <Topbar userName={fullName} userRole={user.role} onProfileClick={()=>navigate('/profile')} />

        <div className="lesson-header">
          <button 
            className="btn-back"
            onClick={() => navigate(`/courses/${courseId}/teacher`)}
          >
            ← Вернуться к курсу
          </button>
          <h1>{lesson?.name || 'Урок'}</h1>
        </div>

        {/* Новый компонент для отображения материалов преподавателя */}
        <TeacherLessonMaterials 
          courseId={courseId} 
          lessonId={lessonId} 
        />

        <div className="block">
          <h2>Домашние задания студентов</h2>
          {subs.length === 0 ? (
            <p>Пока никто не сдал ДЗ.</p>
          ) : (
            <ul className="subs-list">
              {subs.map(s => (
                <li key={s.lesson_student_id} className="sub-item">
                  <div>
                    <strong>{s.student.first_name} {s.student.surname}</strong>:
                    <a href={s.homework_url} target="_blank" rel="noreferrer">скачать</a>
                  </div>
                  <div className="comments-block">
                    {(comments[s.lesson_student_id]||[]).map(c => (
                      <div key={c.id} className="comment">
                        <em>{new Date(c.created_at).toLocaleString()}</em>: {c.text}
                      </div>
                    ))}
                    <textarea
                      placeholder="Ваш комментарий"
                      value={newComment[s.lesson_student_id]||''}
                      onChange={e =>
                        setNewComment(prev => ({
                          ...prev,
                          [s.lesson_student_id]: e.target.value
                        }))
                      }
                    />
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleSendComment(s.lesson_student_id)}
                    >
                      Оставить комментарий
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
