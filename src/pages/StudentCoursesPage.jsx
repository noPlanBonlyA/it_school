import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import CourseProgressBar from '../components/CourseProgressBar';
import CourseImage from '../components/CourseImage';
import { useAuth } from '../contexts/AuthContext';
import { listStudentCourses, getAllCoursesFiltered, getStudentLessonProgress } from '../services/courseService';
import '../styles/CourseCard.css';
import '../styles/CourseImageStyles.css';
import '../styles/MobileImageFixes.css';

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
    alert('💬 Хотите записаться на этот курс? Обратитесь к администратору или преподавателю для добавления в группу.');
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
                    .filter(Boolean).join(' ');

  const renderCourseCard = (course, disabled = false) => {
    // Обрабатываем age_category как массив или строку
    const ageCategory = Array.isArray(course.age_category) 
      ? course.age_category.join(', ') 
      : course.age_category;

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
        <CourseImage
          src={course.photo?.url}
          alt={course.name}
          className="course-card-image"
          placeholder="📚"
        />
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
            {disabled && <span className="status">🔒 Запись</span>}
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

        {/* Недоступные курсы - только если есть */}
        {otherCourses.length > 0 && (
          <section className="courses-section other-courses">
            <div className="section-header">
              <h2 className="section-label">Доступные для записи</h2>
              <span className="course-count">{otherCourses.length} курсов</span>
            </div>
            
            <div className="courses-grid">
              {otherCourses.map(course => renderCourseCard(course, true))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
