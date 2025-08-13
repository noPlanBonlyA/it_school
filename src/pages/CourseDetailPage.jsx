import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getCoursesPath, getCoursesTitle } from '../utils/navigationUtils';
import '../styles/CourseDetailPage.css';

import { getCourse, getCourseLessons, deleteLessonWithMaterials, getLessonWithMaterials, updateLessonWithMaterials } from '../services/lessonService';

import LessonEditor from '../components/LessonEditor';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ───── данные курса ───── */
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // ───── редактирование ───── */
  const [showLessonEditor, setShowLessonEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editLessonName, setEditLessonName] = useState('');
  const [editLessonDateTime, setEditLessonDateTime] = useState('');
  const [updating, setUpdating] = useState(false);

  const fullName = `${user.first_name || ''} ${user.surname || ''}`.trim() || user.username || 'Пользователь';

  // Определяем правильный activeItem в зависимости от роли
  const getSidebarActiveItem = (userRole) => {
    switch (userRole) {
      case 'admin':
      case 'superadmin':
        return 'manageCourses';
      case 'teacher':
        return 'teacherCourses';
      case 'student':
        return 'courses';
      default:
        return 'courses';
    }
  };

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
        const scheduleData = await scheduleResponse.json();
        console.log('[CourseDetail] Schedule response:', scheduleData);
        
        // ИСПРАВЛЕНО: Извлекаем массив lessons из ответа API
        if (scheduleData && Array.isArray(scheduleData.lessons)) {
          lessonGroups = scheduleData.lessons;
        } else if (Array.isArray(scheduleData)) {
          // На случай, если API вернет прямой массив
          lessonGroups = scheduleData;
        } else {
          console.warn('[CourseDetail] Unexpected schedule data format:', scheduleData);
          lessonGroups = [];
        }
      }
      
      console.log('[CourseDetail] Lesson groups:', lessonGroups);
      console.log('[CourseDetail] Lesson groups type:', typeof lessonGroups);
      console.log('[CourseDetail] Is array:', Array.isArray(lessonGroups));
      
      // Обогащаем уроки с их датами из lesson-groups
      const lessonsWithDates = Array.isArray(lessonsData) 
        ? lessonsData.map(lesson => {
            const lessonGroup = Array.isArray(lessonGroups) 
              ? lessonGroups.find(lg => lg.lesson_id === lesson.id)
              : null;
            return {
              ...lesson,
              holding_date: lessonGroup?.start_datetime || lessonGroup?.holding_date || null
            };
          })
        : []; // Защищаем lessonsData.map
      
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
      
      // Обновляем урок с пустыми материалами (только название)
      const updateData = {
        name: editLessonName,
        teacher_material_name: '',
        teacher_material_text: '',
        student_material_name: '',
        student_material_text: '',
        homework_material_name: '',
        homework_material_text: '',
        id: editingLesson.id,
        teacher_material_id: editingLesson.teacher_material_id,
        student_material_id: editingLesson.student_material_id
      };
      
      await updateLessonWithMaterials(courseId, editingLesson.id, updateData);

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
          console.log('[CourseDetail] Schedule data for lesson update:', scheduleData);
          
          // ИСПРАВЛЕНО: Обработка различных форматов ответа API
          let scheduleArray = [];
          if (scheduleData && Array.isArray(scheduleData.lessons)) {
            scheduleArray = scheduleData.lessons;
          } else if (Array.isArray(scheduleData)) {
            scheduleArray = scheduleData;
          } else {
            console.warn('[CourseDetail] Unexpected schedule data format for lesson update:', scheduleData);
          }
          
          const lessonGroups = Array.isArray(scheduleArray) 
            ? scheduleArray.filter(item => item.lesson_id === editingLesson.id)
            : [];
          
          console.log('[CourseDetail] Found lesson groups for update:', lessonGroups);
          
          // Обновляем дату во всех lesson-groups этого урока
          if (Array.isArray(lessonGroups) && lessonGroups.length > 0) {
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
          } // Закрытие if (Array.isArray(lessonGroups) && lessonGroups.length > 0)
        } // Закрытие if (scheduleResponse.ok)
      } // Закрытие if (editLessonDateTime)

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
        student_material_id: lessonToDelete.student_material_id
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
        <Sidebar activeItem={getSidebarActiveItem(user.role)} userRole={user.role} />
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
      <Sidebar activeItem={getSidebarActiveItem(user.role)} userRole={user.role} />
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
                onClick={() => navigate(getCoursesPath(user.role))}
              >
                ← Вернуться к {getCoursesTitle(user.role)}
              </button>
              
              <div className="course-overview">
                <div className="course-info">
                  <h1>{course.name}</h1>
                  {course.description && (
                    <p className="course-description">{course.description}</p>
                  )}
                  <div className="course-meta">
                    {course.author_name && (
                      <span className="course-author">👨‍🏫 {course.author_name}</span>
                    )}
                    {course.age_category && (
                      <span className="course-category">🎯 {course.age_category}</span>
                    )}
                  </div>
                </div>
                
                {course.photo?.url && (
                  <div className="course-image">
                    <img 
                      src={course.photo.url.startsWith('http') 
                        ? course.photo.url 
                        : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`
                      } 
                      alt={course.name} 
                    />
                  </div>
                )}
              </div>
              
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <div className="course-actions">
                  <button 
                    className="btn-primary"
                    onClick={handleOpenLessonEditor}
                  >
                    📝 Создать урок с файлами
                  </button>
                </div>
              )}
            </div>



            {/* ───── модальное окно быстрого редактирования ───── */}
            {editingLesson && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>Редактирование урока</h3>
                    <button className="modal-close" onClick={cancelEdit}>×</button>
                  </div>
                  
                  <div className="modal-body">
                    <div className="field">
                      <label>Название урока</label>
                      <input
                        value={editLessonName}
                        onChange={e => setEditLessonName(e.target.value)}
                        placeholder="Введите название урока"
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
                  </div>
                  
                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={cancelEdit}>
                      Отмена
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={handleSaveEditedLesson}
                      disabled={updating}
                    >
                      {updating ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* ───── модальное окно создания урока ───── */}
            {showLessonEditor && (
              <div className="modal-overlay">
                <div className="modal-content-large">
                  <div className="modal-header">
                    <h3>{editingLesson ? 'Редактирование урока' : 'Создание урока с файлами'}</h3>
                    <button className="modal-close" onClick={handleCancelLessonEdit}>×</button>
                  </div>
                  <div className="modal-body">
                    <LessonEditor
                      courseId={courseId}
                      lesson={editingLesson}
                      onSave={handleSaveLessonFromEditor}
                      onCancel={handleCancelLessonEdit}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ───── список уроков ───── */}
            <div className="lessons-section">
              <div className="lessons-header">
                <h2>Уроки курса</h2>
                <div className="lessons-count">
                {Array.isArray(lessons) ? lessons.length : 0} {(Array.isArray(lessons) ? lessons.length : 0) === 1 ? 'урок' : (Array.isArray(lessons) ? lessons.length : 0) < 5 ? 'урока' : 'уроков'}
              </div>
            </div>
            
            {Array.isArray(lessons) && lessons.length > 0 ? (
              <div className="lessons-grid">
                {lessons.map((lesson, index) => (
                    <div key={lesson.id} className="lesson-card">
                      <div className="lesson-number">
                        {index + 1}
                      </div>
                      <div className="lesson-content">
                        <div className="lesson-header">
                          <h3 className="lesson-title">{lesson.name}</h3>
                          <div className="lesson-actions">
                            {(user.role === 'admin' || user.role === 'superadmin') && (
                              <>
                                <button
                                  className="btn-icon btn-edit"
                                  onClick={() => handleEditLesson(lesson)}
                                  title="Редактировать урок"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn-icon btn-quick-edit"
                                  onClick={() => startEditLesson(lesson)}
                                  title="Быстрое редактирование"
                                >
                                  📝
                                </button>
                                <button
                                  className="btn-icon btn-danger"
                                  onClick={() => handleDeleteLesson(lesson)}
                                  title="Удалить урок"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="lesson-meta">
                          <div className="lesson-date">
                            <span className="meta-label">📅</span>
                            <span className="meta-value">
                              {lesson.holding_date
                                ? new Date(lesson.holding_date).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Дата не назначена'}
                            </span>
                          </div>
                          
                          <div className="lesson-materials">
                            <span className="meta-label">📚</span>
                            <span className="meta-value">
                              {lesson.teacher_material_id ? 'Материал преподавателя' : ''}
                              {lesson.student_material_id ? (lesson.teacher_material_id ? ' • ' : '') + 'Учебный материал' : ''}
                              {!lesson.teacher_material_id && !lesson.student_material_id && 'Материалы не добавлены'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-lessons">
                  <div className="empty-icon">📚</div>
                  <h3>В этом курсе пока нет уроков</h3>
                  <p>Создайте первый урок, используя кнопку "Создать урок с файлами"</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p>Загрузка курса...</p>
        )}
      </div>
    </div>
  );
}
