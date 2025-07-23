// src/components/GroupScheduleUpdater.jsx
import React, { useState, useEffect } from 'react';
import { getCoursesByGroup, refreshGroupSchedule } from '../services/groupScheduleService';
import '../styles/GroupScheduleUpdater.css';

const GroupScheduleUpdater = ({ groupId, groupName, onUpdate }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [results, setResults] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Загружаем курсы группы при монтировании
  useEffect(() => {
    if (groupId) {
      loadGroupCourses();
    }
  }, [groupId]);

  const loadGroupCourses = async () => {
    setLoading(true);
    try {
      const groupCourses = await getCoursesByGroup(groupId);
      setCourses(groupCourses);
    } catch (error) {
      console.error('Error loading group courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSchedule = async (courseId, courseName) => {
    setUpdating(true);
    setResults(null);
    
    try {
      const result = await refreshGroupSchedule(groupId, courseId);
      setResults({
        ...result,
        courseName
      });
      
      // Уведомляем родительский компонент об обновлении
      if (onUpdate) {
        onUpdate(result);
      }
      
    } catch (error) {
      console.error('Error refreshing schedule:', error);
      setResults({
        success: false,
        message: 'Ошибка при обновлении расписания: ' + error.message,
        courseName
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRefreshAllCourses = async () => {
    if (courses.length === 0) return;
    
    setUpdating(true);
    setResults(null);
    
    const allResults = [];
    
    try {
      for (const course of courses) {
        try {
          const result = await refreshGroupSchedule(groupId, course.id);
          allResults.push({
            ...result,
            courseName: course.name,
            courseId: course.id
          });
        } catch (error) {
          console.error(`Error refreshing course ${course.name}:`, error);
          allResults.push({
            success: false,
            message: 'Ошибка: ' + error.message,
            courseName: course.name,
            courseId: course.id
          });
        }
      }
      
      const totalAdded = allResults.reduce((sum, r) => sum + (r.added || 0), 0);
      const successCount = allResults.filter(r => r.success).length;
      
      setResults({
        success: true,
        message: `Обновлено курсов: ${successCount}/${courses.length}. Всего добавлено уроков: ${totalAdded}`,
        allResults,
        isMultiple: true
      });
      
      if (onUpdate) {
        onUpdate({
          success: true,
          totalAdded,
          coursesProcessed: courses.length
        });
      }
      
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="group-schedule-updater">
      <div className="updater-header">
        <div className="group-info">
          <h4>📅 Расписание группы: {groupName}</h4>
          <button 
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={loading}
          >
            {isExpanded ? '▲' : '▼'} {loading ? 'Загрузка...' : `Курсов: ${courses.length}`}
          </button>
        </div>
        
        {courses.length > 0 && !loading && (
          <button 
            className="btn-refresh-all"
            onClick={handleRefreshAllCourses}
            disabled={updating}
          >
            {updating ? '⏳ Обновление...' : '🔄 Обновить все курсы'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="updater-content">
          {loading ? (
            <div className="loading">Загрузка курсов группы...</div>
          ) : courses.length === 0 ? (
            <div className="no-courses">
              <p>📚 Группа пока не изучает ни одного курса</p>
              <p className="hint">Добавьте уроки курсов в расписание группы, чтобы они появились здесь</p>
            </div>
          ) : (
            <div className="courses-list">
              <h5>Курсы группы:</h5>
              {courses.map(course => (
                <div key={course.id} className="course-item">
                  <div className="course-info">
                    <span className="course-name">{course.name}</span>
                    <span className="course-author">Автор: {course.author_name}</span>
                  </div>
                  <button 
                    className="btn-refresh-course"
                    onClick={() => handleRefreshSchedule(course.id, course.name)}
                    disabled={updating}
                  >
                    {updating ? '⏳' : '🔄'} Обновить
                  </button>
                </div>
              ))}
            </div>
          )}

          {results && (
            <div className={`update-results ${results.success ? 'success' : 'error'}`}>
              <h6>📋 Результат обновления:</h6>
              <p>{results.message}</p>
              
              {results.isMultiple && results.allResults && (
                <div className="detailed-results">
                  {results.allResults.map((result, index) => (
                    <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                      <strong>{result.courseName}:</strong>
                      <span className="result-message">{result.message}</span>
                      {result.added > 0 && (
                        <span className="added-count">+{result.added} уроков</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {!results.isMultiple && results.added > 0 && (
                <div className="success-details">
                  ✅ Добавлено уроков: <strong>{results.added}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupScheduleUpdater;
