import React from 'react';
import '../styles/CourseCard.css';

export default function CourseCard({ course, onOpen }) {
  return (
    <div className="course-card" onClick={() => onOpen(course.id)}>
      <img
        src={course.photo?.url || '/placeholder_course.png'}
        alt={course.name}
      />
      <div className="meta">
        <h3>{course.name}</h3>
        <p>{course.age_category || 'Без категории'}</p>
        <p>{course.price ? `${course.price} ₽` : 'Бесплатно'}</p>
      </div>
    </div>
  );
}
