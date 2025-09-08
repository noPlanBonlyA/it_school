import React from 'react';
import '../styles/CourseCard.css';

export default function CourseCard({ course, onOpen }) {
  // Обрабатываем age_category как массив или строку
  let ageCategory;
  
  if (Array.isArray(course.age_category)) {
    // Если массив, обрабатываем каждый элемент
    ageCategory = course.age_category.map(cat => {
      // Маппинг старых значений
      if (cat === 'All' || cat === 'ALL') return 'Все возрасты';
      if (cat === 'SixPlus') return '5-7 лет';
      if (cat === 'TwelvePlus') return '12-14 лет';
      if (cat === '5-7') return '5-7 лет';
      if (cat === '8-10') return '8-10 лет';
      if (cat === '12-14') return '12-14 лет';
      return cat;
    }).join(', ');
  } else {
    // Если строка, также обрабатываем старые значения
    if (course.age_category === 'All' || course.age_category === 'ALL') {
      ageCategory = 'Все возрасты';
    } else if (course.age_category === 'SixPlus') {
      ageCategory = '5-7 лет';
    } else if (course.age_category === 'TwelvePlus') {
      ageCategory = '12-14 лет';
    } else if (course.age_category === '5-7') {
      ageCategory = '5-7 лет';
    } else if (course.age_category === '8-10') {
      ageCategory = '8-10 лет';
    } else if (course.age_category === '12-14') {
      ageCategory = '12-14 лет';
    } else {
      ageCategory = course.age_category || 'Без категории';
    }
  }

  // Правильно обрабатываем URL фотографии
  const getImageUrl = () => {
    if (!course.photo?.url) {
      return null; // Возвращаем null если нет фото
    }
    
    const imageUrl = course.photo.url.startsWith('http') 
      ? course.photo.url 
      : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`;
    
    return imageUrl;
  };

  // Обрезаем описание если оно слишком длинное
  const getDescription = () => {
    if (!course.description) return 'Описание курса отсутствует';
    
    if (course.description.length > 100) {
      return course.description.substring(0, 100) + '...';
    }
    
    return course.description;
  };

  return (
    <div className="course-card" onClick={() => onOpen(course.id)}>
      <div className="course-image-container">
        {getImageUrl() ? (
          <img
            src={getImageUrl()}
            alt={course.name}
            className="course-image"
            onError={(e) => {
              console.error('Image failed to load:', getImageUrl());
              // При ошибке загрузки скрываем изображение и показываем placeholder
              e.target.style.display = 'none';
              const placeholder = e.target.parentNode.querySelector('.course-placeholder');
              if (placeholder) {
                placeholder.style.display = 'flex';
              } else {
                e.target.parentNode.insertAdjacentHTML('beforeend', 
                  '<div class="course-placeholder"><span>📚</span></div>'
                );
              }
            }}
          />
        ) : null}
        
        {!getImageUrl() && (
          <div className="course-placeholder">
            <span>📚</span>
          </div>
        )}
      </div>
      
      <div className="meta">
        <h3>{course.name || 'Без названия'}</h3>
        <p>{getDescription()}</p>
        <div className="course-info-footer">
          <span className="age">👥 {ageCategory}</span>
          {course.author_name && (
            <span className="author">✏️ {course.author_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}
