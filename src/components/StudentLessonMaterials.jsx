// src/components/StudentLessonMaterials.jsx

import React, { useState, useEffect } from 'react';
import { getSmartLessonMaterials } from '../services/lessonService';
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

      const lessonData = await getSmartLessonMaterials(courseId, lessonId, 'student');
      setLessonInfo(lessonData);
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

  const renderMaterialCard = (title, materialUrl, additionalMaterialUrl) => {
    if (!materialUrl && !additionalMaterialUrl) return null;

    return (
      <div className="material-card">
        <h4>{title}</h4>

        {materialUrl && (
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
                  Открыть материал в новой вкладке
                </a>
              </div>
            </div>
          </div>
        )}

        {additionalMaterialUrl && (
          <div className="material-section">
            <div className="material-file">
              <h5>{materialUrl ? 'Дополнительные файлы' : 'Файлы'}</h5>
              <div className="file-download">
                <a
                  href={additionalMaterialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-btn"
                >
                  Скачать файлы
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
        <div className="loading-spinner" aria-label="Загрузка" />
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

  const hasAnyMaterials =
    lessonInfo?.student_material?.url ||
    lessonInfo?.student_additional_material?.url ||
    lessonInfo?.homework?.url ||
    lessonInfo?.homework_additional_material?.url;

  const pageTitle = lessonInfo?.name
    ? `Материалы урока: ${lessonInfo.name}`
    : 'Материалы урока';

  return (
    <div className="lesson-materials">
      <div className="student-materials">
        <h3>{pageTitle}</h3>

        {!hasAnyMaterials ? (
          <div className="no-materials-info">
            <p>Материалы к уроку ещё не загружены</p>
            <p>Они появятся здесь, когда преподаватель добавит их</p>
          </div>
        ) : (
          <div className="materials-grid">
            {(lessonInfo?.student_material?.url || lessonInfo?.student_additional_material?.url) &&
              renderMaterialCard(
                'Учебные материалы',
                lessonInfo?.student_material?.url,
                lessonInfo?.student_additional_material?.url
              )}

            {(lessonInfo?.homework?.url || lessonInfo?.homework_additional_material?.url) &&
              renderMaterialCard(
                'Домашнее задание',
                lessonInfo?.homework?.url,
                lessonInfo?.homework_additional_material?.url
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonMaterials;
