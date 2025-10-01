// src/components/ScheduleFilterModal.jsx

import React, { useState, useEffect } from 'react';
import '../styles/ScheduleFilterModal.css';
import api from '../api/axiosInstance';

export default function ScheduleFilterModal({ 
  isOpen, 
  onClose, 
  onFilterApply,
  currentFilters = {} 
}) {
  const [filters, setFilters] = useState({
    group_id: '',
    course_id: '',
    student_id: '',
    teacher_id: '',
    ...currentFilters
  });

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    groups: [],
    courses: [],
    students: [],
    teachers: []
  });

  // Загрузка опций для фильтров
  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      setLoading(true);
      try {
        const [groupsRes, coursesRes, studentsRes, teachersRes] = await Promise.all([
          api.get('/groups/?limit=100'),
          api.get('/courses/?limit=100'),
          api.get('/students/?limit=100'),
          api.get('/teachers/?limit=100')
        ]);

        setOptions({
          groups: groupsRes.data?.objects || [],
          courses: coursesRes.data?.objects || [],
          students: studentsRes.data?.objects || [],
          teachers: teachersRes.data?.objects || []
        });
        
        console.log('[ScheduleFilterModal] Loaded options:', {
          groups: groupsRes.data?.objects?.length || 0,
          courses: coursesRes.data?.objects?.length || 0,
          students: studentsRes.data?.objects?.length || 0,
          teachers: teachersRes.data?.objects?.length || 0
        });
      } catch (error) {
        console.error('[ScheduleFilterModal] Error loading options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [isOpen]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    // Удаляем пустые фильтры
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    
    console.log('[ScheduleFilterModal] Applying filters:', activeFilters);
    console.log('[ScheduleFilterModal] Available options:', options);
    
    onFilterApply(activeFilters);
    onClose();
  };

  const handleClear = () => {
    setFilters({
      group_id: '',
      course_id: '',
      student_id: '',
      teacher_id: ''
    });
  };

  const getFilterLabel = (type, id) => {
    if (!id) return '';
    
    const item = options[type]?.find(item => item.id === id);
    if (!item) return id;

    switch (type) {
      case 'groups':
        return item.name;
      case 'courses':
        return item.name;
      case 'students':
        return `${item.user?.first_name || ''} ${item.user?.surname || ''}`.trim() || item.user?.username;
      case 'teachers':
        return `${item.user?.first_name || ''} ${item.user?.surname || ''}`.trim() || item.user?.username;
      default:
        return id;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="schedule-filter-modal-overlay" onClick={onClose}>
      {/* Крестик вне модального окна - сразу в правильной позиции */}
      <button 
        className="close-btn" 
        onClick={onClose}
        style={{
          background: 'rgba(220, 38, 38, 0.9)',
          border: 'none',
          fontSize: '26px',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          fontWeight: 'bold',
          lineHeight: '1',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: '30000',
          fontFamily: 'monospace',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
      >×</button>
      
      <div className="schedule-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Фильтрация расписания</h3>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Загрузка параметров фильтрации...</p>
            </div>
          ) : (
            <div className="filter-form">
              {/* Фильтр по группе */}
              <div className="filter-group">
                <label>👥 Группа:</label>
                <select 
                  value={filters.group_id} 
                  onChange={(e) => handleFilterChange('group_id', e.target.value)}
                >
                  <option value="">-- Все группы --</option>
                  {options.groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {filters.group_id && (
                  <div className="filter-preview">
                    Выбрана группа: <strong>{getFilterLabel('groups', filters.group_id)}</strong>
                  </div>
                )}
              </div>

              {/* Фильтр по курсу */}
              <div className="filter-group">
                <label>📚 Курс:</label>
                <select 
                  value={filters.course_id} 
                  onChange={(e) => handleFilterChange('course_id', e.target.value)}
                >
                  <option value="">-- Все курсы --</option>
                  {options.courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
                {filters.course_id && (
                  <div className="filter-preview">
                    Выбран курс: <strong>{getFilterLabel('courses', filters.course_id)}</strong>
                  </div>
                )}
              </div>

              {/* Фильтр по студенту */}
              <div className="filter-group">
                <label>🎓 Студент:</label>
                <select 
                  value={filters.student_id} 
                  onChange={(e) => handleFilterChange('student_id', e.target.value)}
                >
                  <option value="">-- Все студенты --</option>
                  {options.students.map(student => (
                    <option key={student.id} value={student.id}>
                      {`${student.user?.first_name || ''} ${student.user?.surname || ''}`.trim() || student.user?.username || `Студент ${student.id}`}
                    </option>
                  ))}
                </select>
                {filters.student_id && (
                  <div className="filter-preview">
                    Выбран студент: <strong>{getFilterLabel('students', filters.student_id)}</strong>
                  </div>
                )}
              </div>

              {/* Фильтр по преподавателю */}
              <div className="filter-group">
                <label>👨‍🏫 Преподаватель:</label>
                <select 
                  value={filters.teacher_id} 
                  onChange={(e) => handleFilterChange('teacher_id', e.target.value)}
                >
                  <option value="">-- Все преподаватели --</option>
                  {options.teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {`${teacher.user?.first_name || ''} ${teacher.user?.surname || ''}`.trim() || teacher.user?.username || `Преподаватель ${teacher.id}`}
                    </option>
                  ))}
                </select>
                {filters.teacher_id && (
                  <div className="filter-preview">
                    Выбран преподаватель: <strong>{getFilterLabel('teachers', filters.teacher_id)}</strong>
                  </div>
                )}
              </div>

              {/* Информация об активных фильтрах */}
              {Object.values(filters).some(value => value !== '') && (
                <div className="active-filters-info">
                  <h4> Активные фильтры:</h4>
                  <ul>
                    {filters.group_id && <li>Группа: {getFilterLabel('groups', filters.group_id)}</li>}
                    {filters.course_id && <li>Курс: {getFilterLabel('courses', filters.course_id)}</li>}
                    {filters.student_id && <li>Студент: {getFilterLabel('students', filters.student_id)}</li>}
                    {filters.teacher_id && <li>Преподаватель: {getFilterLabel('teachers', filters.teacher_id)}</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClear}>
            ❌ Очистить фильтры
          </button>
          
          <button className="btn btn-primary" onClick={handleApply} disabled={loading}>
            ✅ Применить фильтры
          </button>
        </div>
      </div>
    </div>
  );
}
