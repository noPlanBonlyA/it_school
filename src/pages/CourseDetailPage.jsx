import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import '../styles/CourseDetailPage.css';

import {
  getCourse,
  listLessons,
  createLesson,
  updateLesson,
  deleteLesson
} from '../services/lessonService';

import {
  createMaterialFromText,
  createMaterialFromFile
} from '../services/materialService';

import {
  getAllGroups,
} from '../services/groupService';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ───── данные курса ───── */
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);

  // ───── форма ───── */
  const [lessonName, setLessonName] = useState('');
  const [teacherText, setTeacherText] = useState('');
  const [studentText, setStudentText] = useState('');
  const [homeworkText, setHomeworkText] = useState('');
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [homeworkFile, setHomeworkFile] = useState(null);
  const [lessonDateTime, setLessonDateTime] = useState('');

  // ───── редактирование ───── */
  const [editingLesson, setEditingLesson] = useState(null);
  const [editLessonName, setEditLessonName] = useState('');
  const [editLessonDateTime, setEditLessonDateTime] = useState('');

  const fullName = `${user.first_name || ''} ${user.surname || ''}`.trim() || user.username || 'Пользователь';

  // ───── helpers ───── */
  const reloadLessons = useCallback(async () => {
    try {
      const l = await listLessons(courseId, 100, 0);
      const lessons = l.objects || [];
      
      // Получаем lesson-groups для этих уроков, чтобы показать даты
      const scheduleResponse = await fetch('http://localhost:8080/api/schedule/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let lessonGroups = [];
      if (scheduleResponse.ok) {
        lessonGroups = await scheduleResponse.json();
      }
      
      // Обогащаем уроки с их датами из lesson-groups
      const lessonsWithDates = lessons.map(lesson => {
        const lessonGroup = lessonGroups.find(lg => lg.lesson_id === lesson.id);
        return {
          ...lesson,
          holding_date: lessonGroup?.holding_date || null
        };
      });
      
      // Сортируем по дате
      const sorted = lessonsWithDates.sort((a, b) => {
        const dateA = a.holding_date || '';
        const dateB = b.holding_date || '';
        return dateA.localeCompare(dateB);
      });
      
      console.log('[CourseDetail] Loaded lessons:', sorted);
      setLessons(sorted);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setLessons([]);
    }
  }, [courseId]);

  const loadEverything = useCallback(async () => {
    try {
      setCourse(await getCourse(courseId));
      await reloadLessons();
    } catch (error) {
      console.error('Error loading course data:', error);
    }
  }, [courseId, reloadLessons]);

  useEffect(() => { loadEverything(); }, [loadEverything]);

  // ───── создание урока + lesson-groups ───── */
  const handleCreateLesson = async () => {
    if (!lessonName.trim() || !lessonDateTime) {
      alert('Заполните тему и дату занятия.');
      return;
    }

    try {
      console.log('[CourseDetail] Creating lesson with datetime:', lessonDateTime);
      
      // Создаем материалы
      const tMat = teacherFile
        ? await createMaterialFromFile('Teacher', teacherFile)
        : await createMaterialFromText('Teacher', teacherText);

      const sMat = studentFile
        ? await createMaterialFromFile('Student', studentFile)
        : await createMaterialFromText('Student', studentText);

      const hMat = homeworkFile
        ? await createMaterialFromFile('Homework', homeworkFile)
        : await createMaterialFromText('Homework', homeworkText);

      // Создаем урок
      const lesson = await createLesson(courseId, {
        name: lessonName,
        teacher_material_id: tMat.id,
        student_material_id: sMat.id,
        homework_id: hMat.id
      });

      console.log('[CourseDetail] Lesson created:', lesson);

      // ДОБАВЛЕНО: Автоматически добавляем урок во ВСЕ группы этого курса ───── */
      
      // Получаем ВСЕ группы
      const allGroupsResponse = await getAllGroups(100, 0);
      const allGroups = allGroupsResponse.objects || [];
      
      // Получаем полную информацию о группах (включая курсы)
      const groupsWithCourses = await Promise.all(
        allGroups.map(async g => {
          try {
            const response = await fetch(`http://localhost:8080/api/groups/${g.id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            return response.ok ? await response.json() : null;
          } catch (error) {
            console.error('[CourseDetail] Error fetching group:', error);
            return null;
          }
        })
      );

      // Находим группы, которые содержат наш курс
      const targetGroups = groupsWithCourses.filter(
        g => g && (g.courses || []).some(c => c.id === parseInt(courseId))
      );

      console.log(`[CourseDetail] Found ${targetGroups.length} groups with this course:`, 
        targetGroups.map(g => g.name));

      if (targetGroups.length === 0) {
        alert('⚠️ Внимание: Урок создан, но не назначен ни одной группе!\nДобавьте курс к группам, чтобы студенты увидели урок в расписании.');
      } else {
        // Создаем lesson-groups для всех найденных групп
        const isoDate = new Date(lessonDateTime).toISOString();
        console.log('[CourseDetail] Adding lesson to', targetGroups.length, 'groups...');

        const results = await Promise.allSettled(
          targetGroups.map(async g => {
            try {
              const lessonGroupData = {
                lesson_id: lesson.id,
                group_id: g.id,
                holding_date: isoDate,
                is_opened: false
              };
              
              const response = await fetch('http://localhost:8080/api/courses/lesson-group', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(lessonGroupData)
              });

              if (response.ok) {
                console.log(`[CourseDetail] ✅ Урок добавлен в группу "${g.name}"`);
                return { success: true, groupName: g.name };
              } else if (response.status === 409) {
                console.log(`[CourseDetail] ⚠️ Урок уже существует в группе "${g.name}"`);
                return { success: true, groupName: g.name, exists: true };
              } else {
                throw new Error(`HTTP ${response.status}`);
              }
            } catch (e) {
              console.error(`[CourseDetail] ❌ Ошибка добавления в группу "${g.name}":`, e);
              return { success: false, groupName: g.name, error: e.message };
            }
          })
        );

        // Анализируем результат
        const successful = results.filter(r => r.value?.success).length;
        const failed = results.filter(r => !r.value?.success).length;
        
        if (failed === 0) {
          alert(`✅ Урок успешно создан и добавлен в ${successful} групп(ы)!`);
        } else {
          alert(`⚠️ Урок создан. Добавлен в ${successful} групп(ы), ошибки: ${failed}`);
        }
      }

      // Очищаем формы
      setLessonName(''); 
      setLessonDateTime('');
      setTeacherText(''); 
      setStudentText(''); 
      setHomeworkText('');
      setTeacherFile(null); 
      setStudentFile(null); 
      setHomeworkFile(null);

      await reloadLessons();
    } catch (e) {
      console.error(e);
      alert('❌ Не удалось создать урок: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  // ───── редактирование урока ───── */
  const startEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setEditLessonName(lesson.name);
    // Преобразуем ISO дату в формат для datetime-local */
    if (lesson.holding_date) {
      const date = new Date(lesson.holding_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setEditLessonDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditLessonDateTime('');
    }
  };

  const handleSaveLesson = async () => {
    if (!editLessonName.trim()) {
      alert('Введите название урока');
      return;
    }

    try {
      // Обновляем название урока
      await updateLesson(courseId, editingLesson.id, {
        name: editLessonName,
        teacher_material_id: editingLesson.teacher_material_id,
        student_material_id: editingLesson.student_material_id,
        homework_id: editingLesson.homework_id
      });

      // ДОБАВЛЕНО: Обновляем даты через правильный API
      if (editLessonDateTime) {
        const isoDate = new Date(editLessonDateTime).toISOString();
        
        // Получаем lesson-groups для этого урока через schedule API
        const scheduleResponse = await fetch('http://localhost:8080/api/schedule/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          const lessonGroups = scheduleData.filter(
            item => item.lesson_id === editingLesson.id
          );
          
          // Обновляем дату во всех lesson-groups этого урока
          await Promise.all(lessonGroups.map(async lessonGroup => {
            try {
              const response = await fetch(`http://localhost:8080/api/courses/lesson-group/${lessonGroup.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  lesson_id: editingLesson.id,
                  group_id: lessonGroup.group_id,
                  holding_date: isoDate,
                  is_opened: lessonGroup.is_opened
                })
              });
              
              if (response.ok) {
                console.log('[CourseDetail] ✅ Updated lesson-group:', lessonGroup.id);
              }
            } catch (e) {
              console.error('Error updating lesson-group:', e);
            }
          }));
        }
      }

      setEditingLesson(null);
      setEditLessonName('');
      setEditLessonDateTime('');
      
      await reloadLessons();
      alert('✅ Урок успешно обновлен!');
    } catch (e) {
      console.error(e);
      alert('❌ Не удалось обновить урок: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const cancelEdit = () => {
    setEditingLesson(null);
    setEditLessonName('');
    setEditLessonDateTime('');
  };

  // ───── удаление урока ───── */
  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Удалить этот урок?')) return;
    try {
      await deleteLesson(courseId, id);
      await reloadLessons();
      alert('✅ Урок успешно удален!');
    } catch (e) {
      console.error(e);
      alert('❌ Не удалось удалить урок');
    }
  };

  // ───── UI ───── */
  return (
    <div className="app-layout">
      <Sidebar activeItem="courses" userRole={user.role} />
      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />
        
        {course ? (
          <>
            <div className="course-header">
              <button 
                className="btn-back"
                onClick={() => navigate('/courses')}
              >
                ← Вернуться к курсам
              </button>
              <h1>{course.name}</h1>
            </div>

            {/* ───── форма создания ───── */}
            {(user.role === 'admin' || user.role === 'superadmin') && (
              <div className="block">
                <h2>Добавить урок</h2>

                <div className="user-form form-grid">
                  <div className="field">
                    <label>Тема урока</label>
                    <input
                      value={lessonName}
                      onChange={e => setLessonName(e.target.value)}
                      placeholder="Введите тему урока"
                    />
                  </div>

                  <div className="field">
                    <label>Дата и время проведения урока</label>
                    <input
                      type="datetime-local"
                      value={lessonDateTime}
                      onChange={e => setLessonDateTime(e.target.value)}
                    />
                  </div>

                  {[
                    {
                      key:'t', label:'Материал преподавателя',
                      text:teacherText, setText:setTeacherText,
                      file:teacherFile, setFile:setTeacherFile
                    },
                    {
                      key:'s', label:'Материал ученика',
                      text:studentText, setText:setStudentText,
                      file:studentFile, setFile:setStudentFile
                    },
                    {
                      key:'h', label:'Домашнее задание',
                      text:homeworkText, setText:setHomeworkText,
                      file:homeworkFile, setFile:setHomeworkFile
                    }
                  ].map(({key,label,text,setText,file,setFile}) => (
                    <div key={key} className="field" style={{gridColumn:'1 / -1'}}>
                      <label>{label}</label>
                      <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        disabled={file !== null}
                        placeholder={`Введите ${label.toLowerCase()} или загрузите файл`}
                      />
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"
                        onChange={e => setFile(e.target.files[0] || null)}
                        disabled={text.trim().length > 0}
                      />
                      {file && <p>Выбранный файл: {file.name}</p>}
                    </div>
                  ))}

                  <div className="buttons" style={{ gridColumn:'1 / -1' }}>
                    <button className="btn-primary" onClick={handleCreateLesson}>
                      Создать урок
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ───── модальное окно редактирования ───── */}
            {editingLesson && (
              <div className="modal-overlay" onClick={cancelEdit}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h3>Редактировать урок</h3>
                  
                  <div className="field">
                    <label>Название урока</label>
                    <input
                      value={editLessonName}
                      onChange={e => setEditLessonName(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Дата и время проведения</label>
                    <input
                      type="datetime-local"
                      value={editLessonDateTime}
                      onChange={e => setEditLessonDateTime(e.target.value)}
                    />
                  </div>

                  <div className="buttons">
                    <button className="btn-primary" onClick={handleSaveLesson}>
                      Сохранить
                    </button>
                    <button className="btn-secondary" onClick={cancelEdit}>
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ───── список уроков ───── */}
            {lessons.length > 0 ? (
              <div className="block">
                <h2>Уроки курса ({lessons.length})</h2>
                <ul className="lessons-list">
                  {lessons.map((l, index) => (
                    <li key={l.id} className="lesson-item">
                      <div className="lesson-info">
                        <strong>#{index + 1}. {l.name}</strong>
                        <br />
                        <small>
                          Дата проведения: {l.holding_date
                            ? new Date(l.holding_date).toLocaleString('ru-RU',{
                                day:'2-digit',month:'2-digit',year:'numeric',
                                hour:'2-digit',minute:'2-digit'
                              })
                            : 'не назначена'}
                        </small>
                      </div>
                      
                      <div className="lesson-actions">
                        {(user.role === 'admin' || user.role === 'superadmin') && (
                          <button
                            className="btn-mini btn-edit"
                            onClick={() => startEditLesson(l)}
                          >
                            Изменить
                          </button>
                        )}
                        {(user.role === 'admin' || user.role === 'superadmin') && (
                          <button
                            className="btn-mini btn-danger"
                            onClick={() => handleDeleteLesson(l.id)}
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="empty-text">Уроков пока нет</p>
            )}
          </>
        ) : (
          <p>Загрузка курса...</p>
        )}
      </div>
    </div>
  );
}
