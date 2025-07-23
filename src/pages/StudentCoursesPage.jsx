import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import CourseProgressBar from '../components/CourseProgressBar';
import { useAuth } from '../contexts/AuthContext';

import { listStudentCourses, getAllCoursesFiltered, getStudentLessonProgress } from '../services/courseService';
import '../styles/CourseCard.css';

export default function StudentCoursesPage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [myCourses,      setMyCourses]      = useState([]);
  const [otherCourses,   setOtherCourses]   = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  /* ───── загрузка курсов ───── */
  useEffect(() => { (async () => {
    try {
      setLoading(true);
      
      // 1. Загружаем доступные курсы студента с прогрессом
      const availableCourses = await listStudentCourses();
      const availableIds = new Set(availableCourses.map(c => c.id));
      setMyCourses(availableCourses || []);
      
      // 2. Загружаем детальный прогресс по урокам
      const lessonProgressData = await getStudentLessonProgress();
      setLessonProgress(lessonProgressData || []);
      
      // 3. Загружаем все курсы с фильтрацией по возрасту студента
      const allCoursesResponse = await getAllCoursesFiltered(user, 100, 0);
      const allCourses = allCoursesResponse.objects || [];
      const unavailableCourses = allCourses.filter(c => !availableIds.has(c.id));
      setOtherCourses(unavailableCourses);
      
      console.log('[StudentCoursesPage] Available courses:', availableCourses);
      console.log('[StudentCoursesPage] Lesson progress:', lessonProgressData);
      console.log('[StudentCoursesPage] Age-filtered other courses:', unavailableCourses);
    } catch (err) {
      console.error('[StudentCoursesPage] Error loading courses:', err);
      setError('Не удалось загрузить курсы. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  })(); }, [user]);

  /* ───── helpers ───── */
  const openCourse = id => {
    navigate(`/courses/${id}/student`);
  };

  const openDisabled = () => {
    alert('У вас нет доступа к этому курсу. Обратитесь к администратору для добавления в группу.');
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  const renderCourseCard = (course, disabled = false) => {
    // Обрабатываем age_category как массив или строку
    const ageCategory = Array.isArray(course.age_category) 
      ? course.age_category.join(', ') 
      : course.age_category;

    let imageUrl = '';
    if (course.photo?.url) {
      imageUrl = course.photo.url.startsWith('http')
        ? course.photo.url
        : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`;
    }

    // Получаем прогресс по урокам для этого курса
    const courseProgress = course.progress || 0;
    const courseLessons = lessonProgress.filter(lesson => {
      // Находим уроки этого курса через lesson_group
      return lesson.lesson_group && lesson.lesson_group.lesson && 
             lesson.lesson_group.lesson.course_id === course.id;
    });

    return (
      <div 
        key={course.id} 
        className={`course-card ${disabled ? 'disabled' : ''}`}
        onClick={disabled ? openDisabled : () => openCourse(course.id)}
        style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={course.name} />
        ) : (
          <div className="course-placeholder">
            <span>📚</span>
          </div>
        )}
        <div className="meta">
          <h3>{course.name}</h3>
          <p>{course.description?.substring(0, 60)}...</p>
          
          {/* Показываем прогресс только для доступных курсов */}
          {!disabled && (
            <CourseProgressBar 
              progress={courseProgress}
              lessonProgress={courseLessons}
              showDetails={courseLessons.length > 0}
              compact={true}
            />
          )}
          
          <div className="course-info-footer">
            {course.author_name && <span className="author">👩‍🏫 {course.author_name}</span>}
            {ageCategory && <span className="age">👥 {ageCategory}</span>}
            {disabled && <span className="status" style={{color: '#dc3545'}}>🔒 Недоступно</span>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="courses-page app-layout">
        <Sidebar activeItem="studentCourses" userRole={user.role} />
        <div className="main-content">
          <SmartTopBar pageTitle="Мои курсы" />
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка курсов...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ───── UI ───── */
  return (
    <div className="courses-page app-layout">
      <Sidebar activeItem="studentCourses" userRole={user.role} />

      <div className="main-content">
        <SmartTopBar pageTitle="Мои курсы" />

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Доступные курсы */}
        <section className="courses-section">
          <div className="section-header">
            <h2 className="section-label">Мои доступные курсы</h2>
            <span className="course-count">{myCourses.length} курс(ов)</span>
          </div>
          {myCourses.length ? (
            <div className="courses-grid">
              {myCourses.map(course => renderCourseCard(course, false))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>У вас пока нет доступных курсов</h3>
              <p>Курсы появятся после добавления вас в группу с курсами</p>
            </div>
          )}
        </section>

        {/* Недоступные курсы */}
        <section className="courses-section" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <h2 className="section-label">Другие курсы</h2>
            <span className="course-count">{otherCourses.length} курс(ов)</span>
          </div>
          
          {/* Информация о возрастной фильтрации */}
          {user.birth_date && (
            <div className="age-filter-info" style={{
              background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f9ff 100%)',
              border: '1px solid #2196f3',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#1565c0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎂</span>
                <span>
                  Курсы подобраны с учетом вашего возраста ({(() => {
                    const today = new Date();
                    const birth = new Date(user.birth_date);
                    let age = today.getFullYear() - birth.getFullYear();
                    const monthDiff = today.getMonth() - birth.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                      age--;
                    }
                    return age;
                  })()} лет)
                </span>
              </div>
            </div>
          )}
          {otherCourses.length ? (
            <div className="courses-grid">
              {otherCourses.map(course => renderCourseCard(course, true))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>Вы имеете доступ ко всем курсам!</h3>
              <p>Все доступные курсы отображены в разделе выше</p>
            </div>
          )}
        </section>

        <section className="info-section">
          <div className="info-card">
            <h3>📚 Как работает система курсов?</h3>
            <div style={{ marginBottom: '16px' }}>
              <h4>🔐 Доступ к курсам:</h4>
              <ol>
                <li>Курсы доступны только через группы</li>
                <li>Администратор должен добавить вас в группу</li>
                <li>К группе должен быть привязан курс</li>
                <li>После этого курс появится в разделе "Мои доступные курсы"</li>
              </ol>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <h4>🎂 Возрастная фильтрация:</h4>
              <ul>
                <li>Курсы автоматически фильтруются по вашему возрасту</li>
                <li>Показываются только подходящие вам курсы</li>
                <li>Это помогает найти материалы нужного уровня сложности</li>
              </ul>
            </div>
            
            <p>
              <strong>Текущий статус:</strong> {myCourses.length > 0 
                ? `У вас есть доступ к ${myCourses.length} из ${myCourses.length + otherCourses.length} курс(ов)` 
                : `Нет доступных курсов из ${otherCourses.length} подходящих курсов`}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
