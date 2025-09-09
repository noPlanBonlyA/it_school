import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import { getCoursesPath, getCoursesTitle } from '../utils/navigationUtils';
import '../styles/CourseDetailPage.css';

import { getCourse, getCourseLessons, deleteLessonWithMaterials, getLessonWithMaterials, updateLessonWithMaterials } from '../services/lessonService';

import LessonEditor from '../components/LessonEditor';
import MaterialUploader from '../components/MaterialUploader';
import LessonContentViewer from '../components/LessonContentViewer';

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
  
  // ───── просмотр содержимого урока ───── */
  const [viewingLesson, setViewingLesson] = useState(null);
  
  // ───── изменения материалов ───── */
  const [materialChanges, setMaterialChanges] = useState({});

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
      const courseData = await getCourse(courseId);
      console.log('[CourseDetailPage] Course data loaded:', courseData);
      console.log('[CourseDetailPage] Course photo:', courseData.photo);
      setCourse(courseData);
      await reloadLessons();
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, reloadLessons]);

  useEffect(() => { loadEverything(); }, [loadEverything]);

  // ───── МОДАЛЬНОЕ ОКНО для продвинутого создания урока ───── */
  const handleOpenLessonEditor = () => {
    // Переходим на страницу создания урока
    navigate(`/courses/${courseId}/lessons/create`);
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

  // ───── обработчик изменения материалов ───── */
  const handleMaterialChange = (materialType, materialData) => {
    setMaterialChanges(prev => ({
      ...prev,
      [materialType]: materialData
    }));
  };

  // ───── редактирование урока ───── */
  const startEditLesson = async (lesson) => {
    try {
      setLoading(true);
      console.log('[CourseDetailPage] Loading lesson materials for quick edit:', lesson.id);
      
      // Загружаем полные данные урока с материалами
      const lessonWithMaterials = await getLessonWithMaterials(courseId, lesson.id);
      
      setEditingLesson(lessonWithMaterials);
      setEditLessonName(lessonWithMaterials.name);
      
      // Преобразуем ISO дату в формат для datetime-local
      if (lessonWithMaterials.holding_date) {
        const date = new Date(lessonWithMaterials.holding_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setEditLessonDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setEditLessonDateTime('');
      }
    } catch (error) {
      console.error('[CourseDetailPage] Error loading lesson materials for quick edit:', error);
      // Fallback - используем базовые данные урока
      setEditingLesson(lesson);
      setEditLessonName(lesson.name);
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
    } finally {
      setLoading(false);
    }
  };

  // ───── просмотр содержимого урока ───── */
  const viewLessonContent = (lesson) => {
    setViewingLesson(lesson);
  };

  const closeContentViewer = () => {
    setViewingLesson(null);
  };

  const handleSaveEditedLesson = async () => {
    if (!editLessonName.trim()) {
      alert('Введите название урока');
      return;
    }

    try {
      setUpdating(true);
      
      // Подготавливаем данные для обновления
      const formData = new FormData();
      
      // Базовые данные урока
      const lessonData = {
        name: editLessonName,
        teacher_material_name: editingLesson.teacher_material_name || '',
        teacher_material_text: editingLesson.teacher_material_text || '',
        student_material_name: editingLesson.student_material_name || '',
        student_material_text: editingLesson.student_material_text || '',
        homework_material_name: editingLesson.homework_material_name || '',
        homework_material_text: editingLesson.homework_material_text || '',
        id: editingLesson.id,
        teacher_material_id: editingLesson.teacher_material_id,
        student_material_id: editingLesson.student_material_id
      };

      // Применяем изменения материалов
      Object.keys(materialChanges).forEach(materialType => {
        const change = materialChanges[materialType];
        if (change.type === 'text') {
          lessonData[`${materialType}_material_text`] = change.text;
          lessonData[`${materialType}_material_name`] = change.name;
        } else if (change.type === 'file') {
          // Для файлов нужно использовать FormData
          formData.append(`${materialType}_additional_material_file`, change.file);
          lessonData[`${materialType}_material_name`] = change.name;
        }
      });

      formData.append('data', JSON.stringify(lessonData));
      
      // Используем API для обновления урока с материалами
      await updateLessonWithMaterials(courseId, editingLesson.id, formData);

      setEditingLesson(null);
      setEditLessonName('');
      setEditLessonDateTime('');
      setMaterialChanges({});
      
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
    setMaterialChanges({});
    setViewingLesson(null);
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
              <div className="course-header-top">
                {/* Кнопка вернуться слева */}
                <button 
                  className="btn-back"
                  onClick={() => navigate(getCoursesPath(user.role))}
                >
                  ← Вернуться к {getCoursesTitle(user.role)}
                </button>
              </div>

              <div className="course-main-info">
                {course.photo?.url ? (
                  <div className="course-image">
                    <img 
                      src={course.photo.url.startsWith('http') 
                        ? course.photo.url 
                        : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`
                      } 
                      alt={course.name}
                      onLoad={() => console.log('[CourseDetailPage] Image loaded successfully:', course.photo.url)}
                      onError={(e) => {
                        console.error('[CourseDetailPage] Image failed to load:', course.photo.url);
                        console.error('[CourseDetailPage] Image error event:', e);
                        // Попробуем другие варианты URL
                        const img = e.target;
                        if (!img.dataset.retried) {
                          img.dataset.retried = 'true';
                          // Попробуем без протокола
                          if (course.photo.url.startsWith('/')) {
                            img.src = `http://localhost:8080${course.photo.url}`;
                          }
                        } else {
                          // Если и второй раз не загрузилось, показываем placeholder
                          img.style.display = 'none';
                          const placeholder = document.createElement('div');
                          placeholder.className = 'course-image-placeholder';
                          placeholder.innerHTML = '📚 Изображение недоступно';
                          img.parentElement.appendChild(placeholder);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="course-image">
                    <div className="course-image-placeholder">📚</div>
                  </div>
                )}

                <div className="course-content">
                  <h1 className="course-title">{course.name}</h1>
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
              </div>
              
              {/* Кнопка для мобильной версии */}
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <button 
                  className="btn-primary btn-create-lesson-mobile"
                  onClick={handleOpenLessonEditor}
                >
                  📝 Создать урок с файлами
                </button>
              )}
            </div>



            {/* ───── модальное окно быстрого редактирования ───── */}
            {editingLesson && (
              <div className="modal-overlay">
                <div className="modal-content-large">
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

                    {/* Управление материалами урока */}
                    <div className="lesson-materials-editor">
                      <h4>Материалы урока:</h4>
                      
                      <MaterialUploader
                        materialType="teacher"
                        currentMaterial={{
                          name: editingLesson.teacher_material_name,
                          text: editingLesson.teacher_material_text
                        }}
                        onMaterialChange={handleMaterialChange}
                        icon="📚"
                        title="Материал преподавателя"
                      />

                      <MaterialUploader
                        materialType="student"
                        currentMaterial={{
                          name: editingLesson.student_material_name,
                          text: editingLesson.student_material_text
                        }}
                        onMaterialChange={handleMaterialChange}
                        icon="�"
                        title="Учебный материал"
                      />

                      <MaterialUploader
                        materialType="homework"
                        currentMaterial={{
                          name: editingLesson.homework_material_name,
                          text: editingLesson.homework_material_text
                        }}
                        onMaterialChange={handleMaterialChange}
                        icon="📝"
                        title="Домашнее задание"
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

            {/* ───── модальное окно просмотра содержимого урока ───── */}
            {viewingLesson && (
              <div className="modal-overlay">
                <div className="modal-content-large">
                  <LessonContentViewer
                    courseId={courseId}
                    lessonId={viewingLesson.id}
                    lessonName={viewingLesson.name}
                    onClose={closeContentViewer}
                  />
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
                                  className="btn-text btn-edit"
                                  onClick={() => handleEditLesson(lesson)}
                                  title="Редактировать урок"
                                >
                                  Редактировать
                                </button>
                                <button
                                  className="btn-text btn-view-content"
                                  onClick={() => viewLessonContent(lesson)}
                                  title="Посмотреть содержимое урока"
                                >
                                  Содержимое
                                </button>
                                <button
                                  className="btn-text btn-danger"
                                  onClick={() => handleDeleteLesson(lesson)}
                                  title="Удалить урок"
                                >
                                  Удалить
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="lesson-meta">
                          {lesson.holding_date && (
                            <div className="lesson-date">
                              <span className="meta-label">📅</span>
                              <span className="meta-value">
                                {new Date(lesson.holding_date).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          
                          {(lesson.teacher_material_id || lesson.student_material_id) && (
                            <div className="lesson-materials">
                              <span className="meta-label">📚</span>
                              <span className="meta-value">
                                {(() => {
                                  const materials = [];
                                  if (lesson.teacher_material_id) materials.push('Материал преподавателя');
                                  if (lesson.student_material_id) materials.push('Учебный материал');
                                  return materials.join(' • ');
                                })()}
                              </span>
                            </div>
                          )}
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
