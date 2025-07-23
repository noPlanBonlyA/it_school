// src/components/CourseGroupsViewer.jsx
import React, { useState, useEffect } from 'react';
import { getGroupsByCourse, autoAddLessonToAllCourseGroups } from '../services/groupScheduleService';
import api from '../api/axiosInstance';
import '../styles/CourseGroupsViewer.css';

const CourseGroupsViewer = ({ courseId, courseName, newLessonId, onAutoAdd }) => {
  const [groups, setGroups] = useState([]);
  const [groupsDetails, setGroupsDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoAdding, setAutoAdding] = useState(false);
  const [autoAddResults, setAutoAddResults] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Загружаем группы курса при монтировании
  useEffect(() => {
    if (courseId) {
      loadCourseGroups();
    }
  }, [courseId]);

  const loadCourseGroups = async () => {
    setLoading(true);
    try {
      // Получаем ID групп
      const groupIds = await getGroupsByCourse(courseId);
      setGroups(groupIds);
      
      // Загружаем детали групп
      if (groupIds.length > 0) {
        const groupDetails = await Promise.all(
          groupIds.map(async (groupId) => {
            try {
              const response = await api.get(`/groups/${groupId}`);
              return response.data;
            } catch (error) {
              console.error(`Error loading group ${groupId}:`, error);
              return { 
                id: groupId, 
                name: `Группа ${groupId}`, 
                error: true 
              };
            }
          })
        );
        setGroupsDetails(groupDetails);
      }
    } catch (error) {
      console.error('Error loading course groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAddLesson = async () => {
    if (!newLessonId || groups.length === 0) return;
    
    setAutoAdding(true);
    setAutoAddResults(null);
    
    try {
      const results = await autoAddLessonToAllCourseGroups(courseId, newLessonId);
      setAutoAddResults(results);
      
      // Уведомляем родительский компонент
      if (onAutoAdd) {
        onAutoAdd(results);
      }
      
    } catch (error) {
      console.error('Error auto adding lesson:', error);
      setAutoAddResults({
        success: false,
        message: 'Ошибка при автоматическом добавлении урока: ' + error.message
      });
    } finally {
      setAutoAdding(false);
    }
  };

  return (
    <div className="course-groups-viewer">
      <div className="viewer-header">
        <div className="course-info">
          <h4>👥 Группы курса: {courseName}</h4>
          <button 
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={loading}
          >
            {isExpanded ? '▲' : '▼'} {loading ? 'Загрузка...' : `Групп: ${groups.length}`}
          </button>
        </div>
        
        {newLessonId && groups.length > 0 && !loading && (
          <button 
            className="btn-auto-add"
            onClick={handleAutoAddLesson}
            disabled={autoAdding}
          >
            {autoAdding ? '⏳ Добавление...' : '🚀 Добавить урок во все группы'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="viewer-content">
          {loading ? (
            <div className="loading">Загрузка групп курса...</div>
          ) : groups.length === 0 ? (
            <div className="no-groups">
              <p>👥 Курс пока не изучается ни одной группой</p>
              <p className="hint">Добавьте уроки курса в расписание групп, чтобы связать их с курсом</p>
            </div>
          ) : (
            <div className="groups-list">
              <h5>Группы, изучающие курс:</h5>
              {groupsDetails.map(group => (
                <div key={group.id} className={`group-item ${group.error ? 'error' : ''}`}>
                  <div className="group-info">
                    <span className="group-name">{group.name}</span>
                    {group.description && (
                      <span className="group-description">{group.description}</span>
                    )}
                    {group.start_date && group.end_date && (
                      <span className="group-period">
                        {new Date(group.start_date).toLocaleDateString()} - {new Date(group.end_date).toLocaleDateString()}
                      </span>
                    )}
                    {group.teacher && (
                      <span className="group-teacher">
                        Преподаватель: {group.teacher.user?.first_name} {group.teacher.user?.surname}
                      </span>
                    )}
                  </div>
                  <div className="group-status">
                    {group.error ? (
                      <span className="status-error">❌ Ошибка загрузки</span>
                    ) : (
                      <span className="status-active">✅ Активна</span>
                    )}
                  </div>
                </div>
              ))}
              
              {newLessonId && (
                <div className="auto-add-info">
                  <p>💡 При нажатии кнопки "Добавить урок во все группы" новый урок будет автоматически добавлен в расписание всех {groups.length} групп согласно их настройкам расписания.</p>
                </div>
              )}
            </div>
          )}

          {autoAddResults && (
            <div className={`auto-add-results ${autoAddResults.success ? 'success' : 'error'}`}>
              <h6>📋 Результат автоматического добавления:</h6>
              <p>{autoAddResults.message}</p>
              
              {autoAddResults.results && autoAddResults.results.length > 0 && (
                <div className="detailed-results">
                  {autoAddResults.results.map((result, index) => (
                    <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                      <span className="group-id">Группа {result.groupId}:</span>
                      <span className="result-status">
                        {result.success ? '✅ Добавлено' : '❌ Ошибка'}
                      </span>
                      {result.error && (
                        <span className="error-message">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {autoAddResults.success && autoAddResults.successCount > 0 && (
                <div className="success-summary">
                  ✅ Урок успешно добавлен в <strong>{autoAddResults.successCount}</strong> из <strong>{autoAddResults.total}</strong> групп
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseGroupsViewer;
