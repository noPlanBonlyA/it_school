// src/components/StudentLessonMaterials.jsx

import React, { useState, useEffect } from 'react';
import { getLessonWithMaterials } from '../services/lessonService';
import '../styles/LessonMaterials.css';

const StudentLessonMaterials = ({ courseId, lessonId }) => {
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

      // Используем lessons-with-materials эндпоинт который содержит ВСЕ материалы
      const lessonData = await getLessonWithMaterials(courseId, lessonId);
      setLessonInfo(lessonData);
    } catch (err) {
      console.error('Ошибка при загрузке материалов урока:', err);
      setError('Не удалось загрузить материалы урока');
    } finally {
      setLoading(false);
    }
  };

  const renderMaterialCard = (title, materialUrl, additionalMaterialUrl, materialName = "Материал", additionalMaterialName = "Дополнительный материал") => {
    if (!materialUrl && !additionalMaterialUrl) {
      return (
        <div className="material-card empty">
          <h4>{title}</h4>
          <p className="no-material">Материалы не добавлены</p>
        </div>
      );
    }

    return (
      <div className="material-card">
        <h4>{title}</h4>
        
        {/* Основной материал (текст) */}
        {materialUrl && (
          <div className="material-section">
            <div className="material-text">
              <h5>Основной материал:</h5>
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
              <h5>Дополнительный материал:</h5>
              <div className="file-download">
                <a 
                  href={additionalMaterialUrl} 
                  download
                  className="download-btn"
                >
                  📁 Скачать {additionalMaterialName}
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

  return (
    <div className="lesson-materials">
      <div className="student-materials">
        <h3>Материалы урока</h3>
        <div className="materials-grid">
          {renderMaterialCard(
            "Материалы для изучения", 
            lessonInfo?.student_material_url, 
            lessonInfo?.student_additional_material_url,
            "Материалы для изучения",
            "Дополнительные материалы для изучения"
          )}
          {renderMaterialCard(
            "Домашнее задание", 
            lessonInfo?.homework_material_url, 
            lessonInfo?.homework_additional_material_url,
            "Домашнее задание",
            "Дополнительные материалы к ДЗ"
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentLessonMaterials;
