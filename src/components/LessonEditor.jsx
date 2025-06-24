import React, { useState } from 'react';
import { createLessonWithMaterials, updateLessonWithMaterials } from '../services/lessonService';

export default function LessonEditor({ courseId, lesson = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: lesson?.name || '',
    teacher_material_name: lesson?.teacher_material?.name || '',
    teacher_material_text: '',
    student_material_name: lesson?.student_material?.name || '',
    student_material_text: '',
    homework_material_name: lesson?.homework?.name || '',
    homework_material_text: '',
    // Для обновления нужны ID материалов
    ...(lesson && {
      id: lesson.id,
      teacher_material_id: lesson.teacher_material_id,
      student_material_id: lesson.student_material_id,
      homework_material_id: lesson.homework_id
    })
  });
  
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Название урока обязательно');
      return;
    }
    
    try {
      setLoading(true);
      
      if (lesson) {
        // Обновление существующего урока
        await updateLessonWithMaterials(courseId, lesson.id, formData);
      } else {
        // Создание нового урока
        await createLessonWithMaterials(courseId, formData);
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Ошибка сохранения урока');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lesson-editor">
      <h3>{lesson ? 'Редактировать урок' : 'Создать урок'}</h3>
      
      <form onSubmit={handleSubmit} className="user-form form-grid">
        {/* Название урока */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Название урока *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>

        {/* Материал для преподавателя */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <h4>Материал для преподавателя</h4>
          <label>Название материала</label>
          <input
            type="text"
            value={formData.teacher_material_name}
            onChange={(e) => handleChange('teacher_material_name', e.target.value)}
            placeholder="Например: Конспект урока по React"
          />
          <label>Содержимое (HTML)</label>
          <textarea
            rows={6}
            value={formData.teacher_material_text}
            onChange={(e) => handleChange('teacher_material_text', e.target.value)}
            placeholder="HTML-контент материала..."
          />
        </div>

        {/* Материал для студента */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <h4>Материал для студента</h4>
          <label>Название материала</label>
          <input
            type="text"
            value={formData.student_material_name}
            onChange={(e) => handleChange('student_material_name', e.target.value)}
            placeholder="Например: Учебные материалы по React"
          />
          <label>Содержимое (HTML)</label>
          <textarea
            rows={6}
            value={formData.student_material_text}
            onChange={(e) => handleChange('student_material_text', e.target.value)}
            placeholder="HTML-контент материала..."
          />
        </div>

        {/* Домашнее задание */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <h4>Домашнее задание</h4>
          <label>Название задания</label>
          <input
            type="text"
            value={formData.homework_material_name}
            onChange={(e) => handleChange('homework_material_name', e.target.value)}
            placeholder="Например: Создание React компонента"
          />
          <label>Содержимое задания (HTML)</label>
          <textarea
            rows={6}
            value={formData.homework_material_text}
            onChange={(e) => handleChange('homework_material_text', e.target.value)}
            placeholder="HTML-контент домашнего задания..."
          />
        </div>

        {/* Кнопки */}
        <div className="buttons" style={{ gridColumn: '1 / -1' }}>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : (lesson ? 'Обновить' : 'Создать')}
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}