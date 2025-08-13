// src/components/TeacherLessonMaterials.jsx

import React, { useState, useEffect } from 'react';
import { getLessonInfoForTeacher } from '../services/lessonService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LessonMaterials.css';

const TeacherLessonMaterials = ({ courseId, lessonId }) => {
  const { user } = useAuth();
  const [lessonInfo, setLessonInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMaterials();
  }, [courseId, lessonId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[TeacherLessonMaterials] Loading materials for course:', courseId, 'lesson:', lessonId);
      
      // Используем эндпоинт teacher-info для получения информации об уроке
      const lessonData = await getLessonInfoForTeacher(courseId, lessonId);
      console.log('[TeacherLessonMaterials] Materials loaded:', lessonData);
      
      setLessonInfo(lessonData);
    } catch (err) {
      console.error('Ошибка при загрузке материалов урока для учителя:', err);
      
      if (err.response?.status === 403) {
        setError('У вас нет доступа к этому уроку. Убедитесь, что вы являетесь преподавателем данного курса.');
      } else if (err.response?.status === 404) {
        setError('Урок не найден. Возможно, он был удален или ещё не создан.');
      } else {
        setError('Не удалось загрузить информацию об уроке. Проверьте подключение к интернету.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMaterialCard = (title, materialUrl, additionalMaterialUrl, materialName = "Материал", additionalMaterialName = "Дополнительный материал") => {
    if (!materialUrl && !additionalMaterialUrl) {
      return null; // Не отображаем пустые карточки
    }

    return (
      <div className="material-card teacher-card">
        <h4>{title}</h4>
        
        {/* Основной материал (текст/HTML) */}
        {materialUrl && (
          <div className="material-section">
            <div className="material-text">
              <h5>Материал:</h5>
              <div className="material-content">
                <iframe 
                  src={materialUrl} 
                  title={materialName}
                  className="material-iframe"
                />
                <a 
                  href={materialUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="material-link"
                >
                  📄 Открыть {materialName}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Дополнительный материал (файл) */}
        {additionalMaterialUrl && (
          <div className="material-section">
            <div className="material-file">
              <h5>{materialUrl ? 'Дополнительный файл:' : 'Файл:'}</h5>
              <div className="file-download">
                <a 
                  href={additionalMaterialUrl} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-btn"
                >
                  📁 Открыть {additionalMaterialName}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="lesson-materials loading">
        <div className="loading-spinner">Загрузка информации об уроке...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lesson-materials error">
        <div className="error-message">{error}</div>
        <button onClick={loadMaterials} className="retry-btn">
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div className="lesson-materials teacher-view">
      <div className="teacher-materials">
        <h3>Урок: {lessonInfo?.name || 'Без названия'}</h3>
        
        {/* Информация об уроке */}
        <div className="lesson-info">
          <div className="lesson-meta">
            <p><strong>ID урока:</strong> {lessonInfo?.id}</p>
            <p><strong>ID курса:</strong> {lessonInfo?.course_id}</p>
          </div>
        </div>

        {/* Проверяем наличие материалов */}
        {!lessonInfo?.homework?.url && 
         !lessonInfo?.homework_additional_material?.url && 
         !lessonInfo?.teacher_material?.url && 
         !lessonInfo?.teacher_additional_material?.url ? (
          <div className="no-materials-info">
            <p>📋 Материалы для урока "{lessonInfo?.name}" пока не добавлены.</p>
            <p>Вы можете добавить материалы через панель управления курсом.</p>
          </div>
        ) : (
          <div className="materials-grid">
            {/* Домашнее задание */}
            {(lessonInfo?.homework?.url || lessonInfo?.homework_additional_material?.url) && 
              renderMaterialCard(
                "Домашнее задание", 
                lessonInfo?.homework?.url, 
                lessonInfo?.homework_additional_material?.url,
                lessonInfo?.homework?.name || "Домашнее задание",
                lessonInfo?.homework_additional_material?.name || "Дополнительные материалы к ДЗ"
              )
            }
            
            {/* Материалы для учителя */}
            {(lessonInfo?.teacher_material?.url || lessonInfo?.teacher_additional_material?.url) && 
              renderMaterialCard(
                "Материалы для учителя", 
                lessonInfo?.teacher_material?.url, 
                lessonInfo?.teacher_additional_material?.url,
                lessonInfo?.teacher_material?.name || "Материалы для учителя",
                lessonInfo?.teacher_additional_material?.name || "Дополнительные материалы для учителя"
              )
            }
          </div>
        )}

        {/* Дополнительная информация для учителя */}
        <div className="teacher-notes">
          <h4>Заметки для учителя</h4>
          <div className="notes-content">
            <p>Этот урок содержит следующие компоненты:</p>
            <ul>
              <li>Домашнее задание: {lessonInfo?.homework ? '✅ Добавлено' : '❌ Не добавлено'}</li>
              <li>Дополнительные материалы к ДЗ: {lessonInfo?.homework_additional_material ? '✅ Добавлены' : '❌ Не добавлены'}</li>
              <li>Материалы для учителя: {lessonInfo?.teacher_material ? '✅ Добавлены' : '❌ Не добавлены'}</li>
              <li>Дополнительные материалы для учителя: {lessonInfo?.teacher_additional_material ? '✅ Добавлены' : '❌ Не добавлены'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLessonMaterials;
