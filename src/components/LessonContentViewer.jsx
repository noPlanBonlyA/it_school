// src/components/LessonContentViewer.jsx
import React, { useState, useEffect } from 'react';
import { getLessonWithMaterials } from '../services/lessonService';
import '../styles/LessonContentViewer.css';

const LessonContentViewer = ({ courseId, lessonId, lessonName, onClose }) => {
  const [lessonInfo, setLessonInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLessonContent();
  }, [courseId, lessonId]);

  const loadLessonContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const lessonData = await getLessonWithMaterials(courseId, lessonId);
      setLessonInfo(lessonData);
    } catch (err) {
      console.error('Ошибка при загрузке содержимого урока:', err);
      setError('Не удалось загрузить содержимое урока');
    } finally {
      setLoading(false);
    }
  };

  const renderMaterialSection = (title, materialUrl, additionalMaterialUrl, icon, materialName = "Материал", additionalMaterialName = "Дополнительный материал") => {
    const hasMaterials = materialUrl || additionalMaterialUrl;
    
    return (
      <div className="material-section">
        <div className="material-header">
          <span className="material-icon">{icon}</span>
          <h4>{title}</h4>
        </div>
        
        {hasMaterials ? (
          <div className="material-content">
            {/* Основной материал (текст) */}
            {materialUrl && (
              <div className="material-item">
                <h5>Основной материал:</h5>
                <div className="material-frame">
                  <iframe 
                    src={materialUrl} 
                    title={materialName}
                    className="material-iframe"
                  />
                  <div className="material-actions">
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
              <div className="material-item">
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
            )}
          </div>
        ) : (
          <div className="no-material">
            <p>Материалы пока не добавлены</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="lesson-content-viewer">
        <div className="viewer-header">
          <h3>Загрузка содержимого урока...</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="loading-state">
          <div className="loading-spinner">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lesson-content-viewer">
        <div className="viewer-header">
          <h3>Ошибка загрузки</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="error-state">
          <div className="error-message">{error}</div>
          <button onClick={loadLessonContent} className="retry-btn">
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-content-viewer">
      <div className="viewer-header">
        <div className="lesson-title">
          <h3>{lessonName || lessonInfo?.name || 'Урок'}</h3>
          <p className="lesson-subtitle">Полное содержимое урока</p>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="viewer-content">
        <div className="materials-grid">
          {/* Материалы для преподавателя */}
          {renderMaterialSection(
            "Материалы для преподавателя", 
            lessonInfo?.teacher_material_url, 
            lessonInfo?.teacher_additional_material_url,
            "👨‍🏫",
            "Материалы для преподавателя",
            "Дополнительные материалы для преподавателя"
          )}

          {/* Материалы для студентов */}
          {renderMaterialSection(
            "Материалы для студентов", 
            lessonInfo?.student_material_url, 
            lessonInfo?.student_additional_material_url,
            "📚",
            "Материалы для изучения",
            "Дополнительные материалы для изучения"
          )}

          {/* Домашнее задание */}
          {renderMaterialSection(
            "Домашнее задание", 
            lessonInfo?.homework_material_url, 
            lessonInfo?.homework_additional_material_url,
            "📝",
            "Домашнее задание",
            "Дополнительные материалы к ДЗ"
          )}
        </div>

        {/* Дополнительная информация о уроке */}
        
      </div>
    </div>
  );
};

export default LessonContentViewer;
