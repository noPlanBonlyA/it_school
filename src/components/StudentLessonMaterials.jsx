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

      // Используем умную функцию, которая сама выбирает подходящий эндпоинт
      const lessonData = await getSmartLessonMaterials(courseId, lessonId, user?.role || 'student');
      console.log('[StudentLessonMaterials] Materials loaded:', lessonData);
      
      setLessonInfo(lessonData);
    } catch (err) {
      console.error('Ошибка при загрузке материалов урока:', err);
      
      if (err.response?.status === 403) {
        setError('У вас нет доступа к материалам этого урока. Возможно, урок ещё не открыт для вашей группы.');
      } else if (err.response?.status === 404) {
        setError('Урок не найден. Возможно, он был удален или ещё не создан.');
      } else {
        setError('Не удалось загрузить материалы урока. Проверьте подключение к интернету.');
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
      <div className="material-card">
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
        <h3>Материалы урока: {lessonInfo?.name || 'Без названия'}</h3>
        
        {!lessonInfo?.student_material_url && !lessonInfo?.student_additional_material_url && 
         !lessonInfo?.homework_material_url && !lessonInfo?.homework_additional_material_url ? (
          <div className="no-materials-info">
            {lessonInfo?._isStudentEndpoint ? (
              <>
                <p>📋 Урок "{lessonInfo?.name}" найден, но материалы ещё не загружены.</p>
                <p>Материалы появятся здесь, когда преподаватель их добавит.</p>
              </>
            ) : (
              <>
                <p>📋 Материалы для урока "{lessonInfo?.name}" пока не добавлены.</p>
                <p>Обратитесь к преподавателю за дополнительной информацией.</p>
              </>
            )}
          </div>
        ) : (
          <div className="materials-grid">
            {/* Основной учебный материал (HTML/текст) */}
            {lessonInfo?.student_material_url && renderMaterialCard(
              "Учебный материал", 
              lessonInfo.student_material_url, 
              null,
              lessonInfo?.student_material?.name || "Учебный материал",
              null
            )}
            
            {/* Дополнительный файл к учебному материалу */}
            {lessonInfo?.student_additional_material_url && renderMaterialCard(
              "Дополнительные материалы", 
              null, 
              lessonInfo.student_additional_material_url,
              null,
              lessonInfo?.student_additional_material?.name || "Дополнительные материалы"
            )}
            
            {/* Домашнее задание (HTML/текст) */}
            {lessonInfo?.homework_material_url && renderMaterialCard(
              "Домашнее задание", 
              lessonInfo.homework_material_url, 
              null,
              lessonInfo?.homework?.name || "Домашнее задание",
              null
            )}
            
            {/* Дополнительный файл к домашнему заданию */}
            {lessonInfo?.homework_additional_material_url && renderMaterialCard(
              "Дополнительные материалы к ДЗ", 
              null, 
              lessonInfo.homework_additional_material_url,
              null,
              lessonInfo?.homework_additional_material?.name || "Дополнительные материалы к ДЗ"
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonMaterials;
