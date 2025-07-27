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

  return (
    <div className="course-card" onClick={() => onOpen(course.id)}>
      <img
        src={course.photo?.url || '/placeholder_course.png'}
        alt={course.name}
      />
      <div className="meta">
        <h3>{course.name}</h3>
        <p>{ageCategory || 'Без категории'}</p>
        <p>{course.price ? `${course.price} ₽` : 'Бесплатно'}</p>
      </div>
    </div>
  );
}
