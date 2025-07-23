// src/components/CourseProgressBar.jsx
import React from 'react';
import '../styles/CourseProgressBar.css';

const CourseProgressBar = ({ 
  progress = 0, 
  showDetails = false, 
  lessonProgress = null,
  compact = false 
}) => {
  // Ограничиваем прогресс от 0 до 100
  const validProgress = Math.max(0, Math.min(100, progress));

  const getProgressColor = (value) => {
    if (value >= 80) return '#28a745'; // Зеленый
    if (value >= 60) return '#ffc107'; // Желтый  
    if (value >= 40) return '#fd7e14'; // Оранжевый
    return '#dc3545'; // Красный
  };

  const getProgressText = (value) => {
    if (value >= 90) return 'Отлично!';
    if (value >= 70) return 'Хорошо';
    if (value >= 50) return 'Средне';
    if (value >= 20) return 'Начальный';
    return 'Не начат';
  };

  const renderLessonDots = () => {
    if (!lessonProgress || !Array.isArray(lessonProgress)) {
      return null;
    }

    return (
      <div className="lesson-dots">
        {lessonProgress.map((lesson, index) => (
          <div
            key={lesson.id || index}
            className={`lesson-dot ${lesson.is_visited ? 'completed' : 'incomplete'} ${
              lesson.is_excused_absence ? 'excused' : ''
            }`}
            title={`${lesson.lesson_name || `Урок ${index + 1}`}: ${
              lesson.is_visited ? 'Пройден' : 
              lesson.is_excused_absence ? 'Уважительная причина' : 'Не пройден'
            }`}
          >
            {lesson.is_visited ? '✓' : 
             lesson.is_excused_absence ? '⚬' : '○'}
          </div>
        ))}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="course-progress-compact">
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
                width: `${validProgress}%`,
                backgroundColor: getProgressColor(validProgress),
                height: '100%',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <span className="progress-text-compact">
            {validProgress}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="course-progress-container">
      <div className="progress-header">
        <span className="progress-label">Прогресс курса</span>
        <span className="progress-percentage">{validProgress}%</span>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{
              width: `${validProgress}%`,
              backgroundColor: getProgressColor(validProgress)
            }}
          />
        </div>
      </div>
      
      <div className="progress-details">
        <span className="progress-status" style={{ color: getProgressColor(validProgress) }}>
          {getProgressText(validProgress)}
        </span>
      </div>

      {showDetails && renderLessonDots()}
    </div>
  );
};

export default CourseProgressBar;
