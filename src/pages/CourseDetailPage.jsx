import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import {
  getCourse,
  listLessons,
  createLesson
} from '../services/lessonService';

import {
  createMaterialFromText,
  createMaterialFromFile
} from '../services/materialService';

/* ───────────────────────────────────────────────────────── */

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  /* ---------- данные курса ---------- */
  const [course,  setCourse]  = useState(null);
  const [lessons, setLessons] = useState([]);

  /* ---------- форма создания урока ---------- */
  const [lessonName,   setLessonName]   = useState('');
  const [holdingDate,  setHoldingDate]  = useState('');          // yyyy-MM-ddThh:mm

  const [teacherText,  setTeacherText]  = useState('');
  const [studentText,  setStudentText]  = useState('');
  const [homeworkText, setHomeworkText] = useState('');

  const [teacherFile,  setTeacherFile]  = useState(null);
  const [studentFile,  setStudentFile]  = useState(null);
  const [homeworkFile, setHomeworkFile] = useState(null);

  /* ---------- helpers ---------- */
  const reloadLessons = useCallback(async () => {
    const l = await listLessons(courseId, 100, 0);
    /* отсортируем по дате, если она есть */
    const arr = (l.objects || []).sort((a, b) =>
      (a.holding_date || '').localeCompare(b.holding_date || '')
    );
    setLessons(arr);
  }, [courseId]);

  const loadEverything = useCallback(async () => {
    const c = await getCourse(courseId);
    setCourse(c);
    await reloadLessons();
  }, [courseId, reloadLessons]);

  useEffect(() => { loadEverything(); }, [loadEverything]);

  /* ---------- создание урока ---------- */
  const handleCreateLesson = async () => {
    if (!lessonName.trim() || !holdingDate) {
      alert('Заполните тему и дату занятия.');
      return;
    }

    try {
      const tMat = teacherFile
        ? await createMaterialFromFile('Teacher', teacherFile)
        : await createMaterialFromText('Teacher', teacherText);

      const sMat = studentFile
        ? await createMaterialFromFile('Student', studentFile)
        : await createMaterialFromText('Student', studentText);

      const hMat = homeworkFile
        ? await createMaterialFromFile('Homework', homeworkFile)
        : await createMaterialFromText('Homework', homeworkText);

      await createLesson(courseId, {
        name: lessonName,
        holding_date: new Date(holdingDate).toISOString(),   // <── дата
        teacher_material_id: tMat.id,
        student_material_id: sMat.id,
        homework_id:         hMat.id
      });

      /* очистка формы */
      setLessonName('');
      setHoldingDate('');
      setTeacherText(''); setStudentText(''); setHomeworkText('');
      setTeacherFile(null); setStudentFile(null); setHomeworkFile(null);

      await reloadLessons();
    } catch (e) {
      alert('Не удалось создать урок');
      console.error(e);
    }
  };

  /* ---------- UI ---------- */
  const fullName = [user.first_name, user.surname, user.patronymic]
                     .filter(Boolean).join(' ');

  return (
    <div className="app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        {course ? (
          <>
            <h1>{course.name}</h1>

            {/* ───── форма создания урока ───── */}
            <div className="block">
              <h2>Добавить урок</h2>

              <div className="user-form form-grid">
                {/* тема */}
                <div className="field">
                  <label>Тема</label>
                  <input
                    value={lessonName}
                    onChange={e => setLessonName(e.target.value)}
                  />
                </div>

                {/* дата / время занятия */}
                <div className="field">
                  <label>Дата и время</label>
                  <input
                    type="datetime-local"
                    value={holdingDate}
                    onChange={e => setHoldingDate(e.target.value)}
                  />
                </div>

                {/* материалы */}
                {[
                  {
                    key: 't', label: 'Материал преподавателя',
                    text: teacherText,  setText:  setTeacherText,
                    file: teacherFile,  setFile:  setTeacherFile
                  },
                  {
                    key: 's', label: 'Материал ученика',
                    text: studentText, setText:  setStudentText,
                    file: studentFile, setFile:  setStudentFile
                  },
                  {
                    key: 'h', label: 'Домашнее задание',
                    text: homeworkText, setText: setHomeworkText,
                    file: homeworkFile, setFile: setHomeworkFile
                  }
                ].map(({ key, label, text, setText, file, setFile }) => (
                  <div key={key} className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>{label}</label>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      disabled={file !== null}
                    />
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"
                      onChange={e => setFile(e.target.files[0] || null)}
                      disabled={text.trim().length > 0}
                    />
                  </div>
                ))}

                <div className="buttons" style={{ gridColumn: '1 / -1' }}>
                  <button className="btn-primary" onClick={handleCreateLesson}>
                    Создать урок
                  </button>
                </div>
              </div>
            </div>

            {/* ───── список уроков ───── */}
            {lessons.length > 0 && (
              <div className="block">
                <h2>Уроки</h2>
                <ul>
                  {lessons.map(l => (
                    <li key={l.id}>
                      {l.name} —{' '}
                      {l.holding_date
                        ? new Date(l.holding_date)
                            .toLocaleString(undefined, {
                              day: '2-digit', month: '2-digit',
                              year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })
                        : 'дата не назначена'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p>Загрузка…</p>
        )}
      </div>
    </div>
  );
}
