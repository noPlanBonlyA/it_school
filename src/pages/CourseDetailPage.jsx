import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import '../styles/CourseDetailPage.css';

import { getCourse, getCourseLessons, createLessonWithMaterials, updateLessonWithMaterials, deleteLessonWithMaterials, getLessonWithMaterials } from '../services/lessonService';

import { getAllGroups } from '../services/groupService';
import LessonEditor from '../components/LessonEditor';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ───── данные курса ───── */
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // ───── форма ───── */
  const [lessonName, setLessonName] = useState('');
  const [teacherMaterialName, setTeacherMaterialName] = useState('');
  const [teacherMaterialText, setTeacherMaterialText] = useState('');
  const [studentMaterialName, setStudentMaterialName] = useState('');
  const [studentMaterialText, setStudentMaterialText] = useState('');
  const [homeworkMaterialName, setHomeworkMaterialName] = useState('');
  const [homeworkMaterialText, setHomeworkMaterialText] = useState('');
  const [lessonDateTime, setLessonDateTime] = useState('');
  const [creating, setCreating] = useState(false);

  // ───── редактирование ───── */
  const [showLessonEditor, setShowLessonEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editLessonName, setEditLessonName] = useState('');
  const [editLessonDateTime, setEditLessonDateTime] = useState('');
  const [updating, setUpdating] = useState(false);

  const fullName = `${user.first_name || ''} ${user.surname || ''}`.trim() || user.username || 'Пользователь';

  // ───── helpers ───── */
  const reloadLessons = useCallback(async () => {
    try {
      const lessonsData = await getCourseLessons(courseId);
      
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
      const lessonsWithDates = lessonsData.map(lesson => {
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
      setLoading(true);
      setCourse(await getCourse(courseId));
      await reloadLessons();
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, reloadLessons]);

  useEffect(() => { loadEverything(); }, [loadEverything]);

  // ───── МОДАЛЬНОЕ ОКНО для продвинутого создания урока ───── */
  const handleOpenLessonEditor = async () => {
    setEditingLesson(null);
    setShowLessonEditor(true);
  };

  const handleEditLesson = async (lesson) => {
    try {
      setLoading(true);
      console.log('[CourseDetailPage] Loading lesson for editing:', lesson.id);
      
      const lessonData = await getLessonWithMaterials(courseId, lesson.id);
      setEditingLesson(lessonData);
      setShowLessonEditor(true);
    } catch (error) {
      console.error('[CourseDetailPage] Error loading lesson:', error);
      alert('Ошибка загрузки урока для редактирования');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLessonFromEditor = async () => {
    setShowLessonEditor(false);
    setEditingLesson(null);
    await reloadLessons(); // Перезагружаем данные курса
  };

  const handleCancelLessonEdit = () => {
    setShowLessonEditor(false);
    setEditingLesson(null);
  };

  // ───── БЫСТРОЕ создание урока + lesson-groups ───── */
  const createLessonData = () => ({
    name: lessonName,
    teacher_material_name: teacherMaterialName || 'Материал для преподавателя',
    teacher_material_text: teacherMaterialText || '<p>Материал не добавлен</p>',
    student_material_name: studentMaterialName || 'Учебный материал',
    student_material_text: studentMaterialText || '<p>Материал не добавлен</p>',
    homework_material_name: homeworkMaterialName || 'Домашнее задание',
    homework_material_text: homeworkMaterialText || '<p>Домашнее задание не добавлено</p>'
  });

  const updateLessonData = () => ({
    name: editLessonName,
    teacher_material_name: '',
    teacher_material_text: '',
    student_material_name: '',
    student_material_text: '',
    homework_material_name: '',
    homework_material_text: '',
    id: editingLesson.id,
    teacher_material_id: editingLesson.teacher_material_id,
    student_material_id: editingLesson.student_material_id,
    homework_material_id: editingLesson.homework_id
  });

  const handleQuickCreateLesson = async () => {
    if (!lessonName.trim()) {
      alert('Введите название урока.');
      return;
    }

    try {
      setCreating(true);
      console.log('[CourseDetail] Creating lesson with materials...');
      
      const lessonData = createLessonData();
      console.log('[CourseDetail] Lesson data:', lessonData);

      const lesson = await createLessonWithMaterials(courseId, lessonData);
      console.log('[CourseDetail] Lesson created:', lesson);

      // ДОБАВЛЕНО: Автоматически добавляем урок во ВСЕ группы этого курса
      if (lessonDateTime) {
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
      } else {
        alert('✅ Урок успешно создан! Установите дату проведения для добавления в расписание групп.');
      }

      // Очищаем формы
      setLessonName(''); 
      setLessonDateTime('');
      setTeacherMaterialName('');
      setTeacherMaterialText(''); 
      setStudentMaterialName('');
      setStudentMaterialText(''); 
      setHomeworkMaterialName('');
      setHomeworkMaterialText('');

      await reloadLessons();
    } catch (e) {
      console.error(e);
      alert('❌ Не удалось создать урок: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setCreating(false);
    }
  };

  // ───── редактирование урока ───── */
  const startEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setEditLessonName(lesson.name);
    // Преобразуем ISO дату в формат для datetime-local
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

  const handleSaveEditedLesson = async () => {
    if (!editLessonName.trim()) {
      alert('Введите название урока');
      return;
    }

    try {
      setUpdating(true);
      
      // ИСПРАВЛЕНО: Обновляем урок с пустыми материалами (только название)
      await updateLessonWithMaterials(courseId, editingLesson.id, updateLessonData());

      // Обновляем даты через schedule API
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
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setEditingLesson(null);
    setEditLessonName('');
    setEditLessonDateTime('');
  };

  // ───── удаление урока ───── */
  const handleDeleteLesson = async (lessonToDelete) => {
    if (!window.confirm('Удалить этот урок?')) return;
    try {
      await deleteLessonWithMaterials(courseId, lessonToDelete.id, {
        teacher_material_id: lessonToDelete.teacher_material_id,
        student_material_id: lessonToDelete.student_material_id,
        homework_material_id: lessonToDelete.homework_id
      });
      await reloadLessons();
      alert('✅ Урок успешно удален!');
    } catch (e) {
      console.error(e);
      alert('❌ Не удалось удалить урок');
    }
  };

  // ───── UI ───── */
  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="courses" userRole={user.role} />
        <div className="main-content">
          <Topbar userName={fullName} userRole={user.role} onProfileClick={() => navigate('/profile')} />
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка данных курса...</p>
          </div>
        </div>
      </div>
    );
  }

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
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <div className="course-actions">
                  <button 
                    className="btn-primary"
                    onClick={handleOpenLessonEditor}
                  >
                    📝 Создать урок с файлами
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => navigate(`/courses/${courseId}/lessons/manage`)}
                  >
                    ⚙️ Управление уроками
                  </button>
                </div>
              )}
            </div>

            {/* ───── форма быстрого создания ───── */}
            {(user.role === 'admin' || user.role === 'superadmin') && (
              <div className="block">
                <h2>⚡ Быстрое создание урока</h2>

                <div className="user-form form-grid">
                  <div className="field">
                    <label>Название урока *</label>
                    <input
                      value={lessonName}
                      onChange={e => setLessonName(e.target.value)}
                      placeholder="Введите название урока"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Дата и время проведения</label>
                    <input
                      type="datetime-local"
                      value={lessonDateTime}
                      onChange={e => setLessonDateTime(e.target.value)}
                    />
                  </div>

                  {/* Материал преподавателя */}
                  <div className="field" style={{gridColumn:'1 / -1'}}>
                    <h4>Материал для преподавателя</h4>
                    <label>Название материала</label>
                    <input
                      value={teacherMaterialName}
                      onChange={e => setTeacherMaterialName(e.target.value)}
                      placeholder="Например: Конспект урока"
                    />
                    <label>Содержимое (HTML)</label>
                    <textarea
                      rows={4}
                      value={teacherMaterialText}
                      onChange={e => setTeacherMaterialText(e.target.value)}
                      placeholder="<h1>Заголовок</h1><p>Текст материала...</p>"
                    />
                  </div>

                  {/* Материал студента */}
                  <div className="field" style={{gridColumn:'1 / -1'}}>
                    <h4>Учебный материал</h4>
                    <label>Название материала</label>
                    <input
                      value={studentMaterialName}
                      onChange={e => setStudentMaterialName(e.target.value)}
                      placeholder="Например: Теория и примеры"
                    />
                    <label>Содержимое (HTML)</label>
                    <textarea
                      rows={4}
                      value={studentMaterialText}
                      onChange={e => setStudentMaterialText(e.target.value)}
                      placeholder="<h1>Заголовок</h1><p>Учебный материал...</p>"
                    />
                  </div>

                  {/* Домашнее задание */}
                  <div className="field" style={{gridColumn:'1 / -1'}}>
                    <h4>Домашнее задание</h4>
                    <label>Название задания</label>
                    <input
                      value={homeworkMaterialName}
                      onChange={e => setHomeworkMaterialName(e.target.value)}
                      placeholder="Например: Практическое задание"
                    />
                    <label>Содержимое задания (HTML)</label>
                    <textarea
                      rows={4}
                      value={homeworkMaterialText}
                      onChange={e => setHomeworkMaterialText(e.target.value)}
                      placeholder="<h1>Задание</h1><p>Описание задания...</p>"
                    />
                  </div>

                  <div className="buttons" style={{ gridColumn:'1 / -1' }}>
                    <button 
                      className="btn-primary" 
                      onClick={handleQuickCreateLesson}
                      disabled={creating}
                    >
                      {creating ? 'Создание...' : '⚡ Быстро создать урок'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ───── модальное окно редактирования ───── */}
            {showLessonEditor && (
              <div className="modal-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '800px',
                  width: '90%',
                  maxHeight: '90vh',
                  overflow: 'auto'
                }}>
                  <LessonEditor
                    courseId={courseId}
                    lesson={editingLesson}
                    onSave={handleSaveLessonFromEditor}
                    onCancel={handleCancelLessonEdit}
                  />
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
                            onClick={() => handleDeleteLesson(l)}
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
