// src/components/TeacherCourseProgress.jsx
import React from 'react';
import '../styles/CourseProgressBar.css';

const TeacherCourseProgress = ({ 
  totalLessons = 0,
  completedLessons = 0,
  totalStudents = 0,
  averageProgress = 0,
  compact = false 
}) => {
  const lessonProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  
  const getProgressColor = (value) => {
    if (value >= 80) return '#28a745'; // Зеленый
    if (value >= 60) return '#ffc107'; // Желтый  
    if (value >= 40) return '#fd7e14'; // Оранжевый
    return '#dc3545'; // Красный
  };

  if (compact) {
    return (
      <div className="teacher-progress-compact">
        <div className="progress-stats">
          <span className="stat">👥 {totalStudents} студ.</span>
          <span className="stat">📚 {completedLessons}/{totalLessons} уроков</span>
          <span className="stat" style={{ color: getProgressColor(averageProgress) }}>
            {Math.round(averageProgress)}% средний прогресс
          </span>
        </div>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{ 
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              height: '6px',
              overflow: 'hidden'
            }}
          >
            <div 
              className="progress-fill"
              style={{
                width: `${lessonProgress}%`,
                backgroundColor: getProgressColor(lessonProgress),
                height: '100%',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-course-progress">
      <div className="progress-section">
        <h4>Прогресс курса</h4>
        <div className="progress-grid">
          <div className="progress-item">
            <span className="progress-value">{completedLessons}/{totalLessons}</span>
            <span className="progress-label">Уроков проведено</span>
          </div>
          <div className="progress-item">
            <span className="progress-value">{totalStudents}</span>
            <span className="progress-label">Студентов</span>
          </div>
          <div className="progress-item">
            <span 
              className="progress-value" 
              style={{ color: getProgressColor(averageProgress) }}
            >
              {Math.round(averageProgress)}%
            </span>
            <span className="progress-label">Средний прогресс</span>
          </div>
        </div>
        
        <div className="lesson-progress-bar">
          <div className="progress-header">
            <span>Проведено уроков</span>
            <span>{Math.round(lessonProgress)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${lessonProgress}%`,
                backgroundColor: getProgressColor(lessonProgress)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherCourseProgress;
