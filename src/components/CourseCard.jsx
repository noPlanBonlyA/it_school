import React from 'react';
import '../styles/CourseCard.css';

export default function CourseCard({ course, onOpen }) {
  // Обрабатываем age_category как массив или строку
  let ageCategory;
  
  if (Array.isArray(course.age_category)) {
    // Если массив, обрабатываем каждый элемент
    ageCategory = course.age_category.map(cat => {
      // Маппинг старых значений
      if (cat === 'All') return 'Все возрасты';
      if (cat === 'SixPlus') return '5-7';
      if (cat === 'TwelvePlus') return '12-14';
      return cat;
    }).join(', ');
  } else {
    // Если строка, также обрабатываем старые значения
    if (course.age_category === 'All') {
      ageCategory = 'Все возрасты';
    } else if (course.age_category === 'SixPlus') {
      ageCategory = '5-7';
    } else if (course.age_category === 'TwelvePlus') {
      ageCategory = '12-14';
    } else {
      ageCategory = course.age_category;
    }
  }

  // Правильно обрабатываем URL фотографии
  const getImageUrl = () => {
    console.log('Course photo data:', course.photo); // Отладка
    
    if (!course.photo?.url) {
      return null; // Возвращаем null если нет фото
    }
    
    const imageUrl = course.photo.url.startsWith('http') 
      ? course.photo.url 
      : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`;
    
    console.log('Final image URL:', imageUrl); // Отладка
    return imageUrl;
  };

  return (
    <div className="course-card" onClick={() => onOpen(course.id)}>
      {getImageUrl() ? (
        <img
          src={getImageUrl()}
          alt={course.name}
          onLoad={() => {
            console.log('Image loaded successfully:', getImageUrl());
          }}
          onError={(e) => {
            console.error('Image failed to load:', getImageUrl());
            // Скрываем изображение при ошибке загрузки
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div className="course-placeholder">
          <span>📚</span>
        </div>
      )}
      <div className="meta">
        <h3>{course.name}</h3>
        <p>{ageCategory || 'Без категории'}</p>
      </div>
    </div>
  );
}
