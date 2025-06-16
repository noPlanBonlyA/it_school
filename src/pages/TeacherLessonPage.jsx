// src/pages/TeacherLessonPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import Sidebar                         from '../components/Sidebar';
import Topbar                          from '../components/TopBar';
import { useAuth }                     from '../contexts/AuthContext';
import {
  listStudentMaterials,
  postComment,
  listComments
} from '../services/homeworkService';

export default function TeacherLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subs, setSubs]       = useState([]); // { student, material_id, url }
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});

  useEffect(() => {
    (async () => {
      const mats = await listStudentMaterials(courseId, lessonId);
      setSubs(mats);
      const comms = await listComments(courseId, lessonId);
      // сгруппируем по lesson_student_id
      const byLs = {};
      comms.forEach(c => {
        if (!byLs[c.lesson_student_id]) byLs[c.lesson_student_id] = [];
        byLs[c.lesson_student_id].push(c);
      });
      setComments(byLs);
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

        <h1>Домашние задания студентов</h1>
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
  );
}
