// src/components/StudentLessonMaterials.jsx

import React, { useState, useEffect } from 'react';
import { getSmartLessonMaterials } from '../services/lessonService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LessonMaterials.css';

const StudentLessonMaterials = ({ courseId, lessonId }) => {
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

      const lessonData = await getSmartLessonMaterials(courseId, lessonId, 'student');
      
      // Адаптируем структуру данных
      if (lessonData && (!lessonData.student_material_url && !lessonData.homework_material_url)) {
        setLessonInfo({
          ...lessonData,
          student_material_url: null,
          student_additional_material_url: null,
          homework_material_url: null
        });
      } else {
        setLessonInfo(lessonData);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('У вас нет доступа к материалам этого урока.');
      } else if (err.response?.status === 404) {
        setError('Урок не найден.');
      } else {
        setError('Не удалось загрузить материалы урока.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMaterialCard = (title, materialUrl, icon = "📚") => {
    if (!materialUrl) {
      return null;
    }

    return (
      <div className="material-card">
        <h4>{icon} {title}</h4>
        
        <div className="material-section">
          <div className="material-text">
            <div className="material-content">
              <iframe 
                src={materialUrl} 
                title={title}
                className="material-iframe"
              />
              <a 
                href={materialUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="material-link"
              >
                📖 Открыть в новой вкладке
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="lesson-materials loading">
        <div className="loading-spinner">Загрузка материалов...</div>
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

  const hasAnyMaterials = lessonInfo?.student_material_url || 
                         lessonInfo?.student_additional_material_url ||
                         lessonInfo?.homework_material_url;

  return (
    <div className="lesson-materials">
      <div className="student-materials">
        <h3>📚 Материалы урока: {lessonInfo?.name || 'Без названия'}</h3>
        
        {!hasAnyMaterials ? (
          <div className="no-materials-info">
            <p>📋 Материалы к уроку ещё не загружены</p>
            <p>Они появятся здесь, когда преподаватель добавит их</p>
          </div>
        ) : (
          <div className="materials-grid">
            {/* Учебные материалы для студентов */}
            {lessonInfo?.student_material_url && 
              renderMaterialCard(
                "Учебные материалы", 
                lessonInfo?.student_material_url,
                "📖"
              )
            }
            
            {/* Дополнительные учебные материалы */}
            {lessonInfo?.student_additional_material_url && 
              renderMaterialCard(
                "Дополнительные материалы", 
                lessonInfo?.student_additional_material_url,
                "📎"
              )
            }
            
            {/* Домашнее задание - только основное ДЗ */}
            {lessonInfo?.homework_material_url && 
              renderMaterialCard(
                "Домашнее задание", 
                lessonInfo?.homework_material_url,
                "📝"
              )
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonMaterials;
