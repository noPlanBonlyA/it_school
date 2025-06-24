import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import LessonEditor from '../components/LessonEditor';
import { useAuth } from '../contexts/AuthContext';
import { getCourseLessons, deleteLessonWithMaterials } from '../services/lessonService';
import { getCourse } from '../services/courseService';

export default function ManageLessonsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [courseData, lessonsData] = await Promise.all([
        getCourse(courseId),
        getCourseLessons(courseId)
      ]);
      setCourse(courseData);
      setLessons(lessonsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = () => {
    setEditingLesson(null);
    setShowEditor(true);
  };

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setShowEditor(true);
  };

  const handleDeleteLesson = async (lesson) => {
    if (!confirm('Удалить урок? Это действие нельзя отменить.')) return;
    
    try {
      await deleteLessonWithMaterials(courseId, lesson.id, {
        teacher_material_id: lesson.teacher_material_id,
        student_material_id: lesson.student_material_id,
        homework_material_id: lesson.homework_id
      });
      
      await loadData();
      alert('Урок удален');
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Ошибка удаления урока');
    }
  };

  const handleSaveLesson = async () => {
    setShowEditor(false);
    setEditingLesson(null);
    await loadData();
    alert(editingLesson ? 'Урок обновлен' : 'Урок создан');
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="teacherCourses" userRole={user.role} />
        <div className="main-content">
          <Topbar userName={fullName} userRole={user.role} onProfileClick={() => navigate('/profile')} />
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="teacherCourses" userRole={user.role} />
      <div className="main-content">
        <Topbar userName={fullName} userRole={user.role} onProfileClick={() => navigate('/profile')} />

        <div className="course-header">
          <button 
            className="btn-back"
            onClick={() => navigate('/teacher-courses')}
          >
            ← Вернуться к курсам
          </button>
          <h1>{course?.name} - Управление уроками</h1>
        </div>

        {showEditor ? (
          <div className="block">
            <LessonEditor
              courseId={courseId}
              lesson={editingLesson}
              onSave={handleSaveLesson}
              onCancel={() => {
                setShowEditor(false);
                setEditingLesson(null);
              }}
            />
          </div>
        ) : (
          <>
            <div className="block">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Уроки курса</h2>
                <button className="btn-primary" onClick={handleCreateLesson}>
                  Создать урок
                </button>
              </div>

              {lessons.length === 0 ? (
                <p>Уроки не созданы</p>
              ) : (
                <div className="lessons-list">
                  {lessons.map((lesson, index) => (
                    <div key={lesson.id} className="lesson-item">
                      <div className="lesson-info">
                        <h3>{index + 1}. {lesson.name}</h3>
                        <div className="lesson-actions">
                          <button 
                            className="btn-secondary"
                            onClick={() => handleEditLesson(lesson)}
                          >
                            Редактировать
                          </button>
                          <button 
                            className="btn-primary"
                            onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}/teacher`)}
                          >
                            Открыть урок
                          </button>
                          <button 
                            className="btn-danger"
                            onClick={() => handleDeleteLesson(lesson)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}