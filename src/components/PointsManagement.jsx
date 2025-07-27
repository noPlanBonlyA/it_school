// src/components/PointsManagement.jsx

import React, { useState, useEffect } from 'react';
import { 
  POINT_REASONS, 
  REASON_LABELS,
  updateStudentPoints
} from '../services/coinHistoryService';
import { createNotificationForStudent } from '../services/notificationService';
import { listStudents } from '../services/studentService';
import '../styles/PointsManagement.css';

const PointsManagement = ({ onClose, selectedStudent = null }) => {
  const [formData, setFormData] = useState({
    student_id: selectedStudent?.id || '',
    student_name: selectedStudent ? 
      `${selectedStudent.user?.first_name} ${selectedStudent.user?.surname}`.trim() : '',
    reason: POINT_REASONS.BONUS,
    changed_points: '',
    description: ''
  });

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Загрузка списка студентов
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await listStudents({ limit: 100, offset: 0 });
        setStudents(response.objects || []);
      } catch (error) {
        console.error('Ошибка загрузки студентов:', error);
      }
    };

    if (!selectedStudent) {
      loadStudents();
    }
  }, [selectedStudent]);

  // Фильтрация студентов для поиска
  useEffect(() => {
    if (!formData.student_name || selectedStudent) {
      setFilteredStudents([]);
      return;
    }

    const filtered = students.filter(student => {
      const fullName = `${student.user?.first_name} ${student.user?.surname}`.toLowerCase();
      const email = student.user?.email?.toLowerCase() || '';
      const search = formData.student_name.toLowerCase();
      
      return fullName.includes(search) || email.includes(search);
    }).slice(0, 5); // Показываем максимум 5 результатов

    setFilteredStudents(filtered);
  }, [formData.student_name, students, selectedStudent]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очищаем ошибки при изменении полей
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Показываем/скрываем подсказки для поиска студента
    if (field === 'student_name' && !selectedStudent) {
      setShowSuggestions(value.length > 0);
    }
  };

  const selectStudent = (student) => {
    setFormData(prev => ({
      ...prev,
      student_id: student.id,
      student_name: `${student.user?.first_name} ${student.user?.surname}`.trim()
    }));
    setShowSuggestions(false);
    setFilteredStudents([]);
  };

  const handleQuickPoints = (points) => {
    setFormData(prev => ({ ...prev, changed_points: points.toString() }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.student_id) {
      newErrors.student_name = 'Выберите студента';
    }

    if (!formData.changed_points) {
      newErrors.changed_points = 'Укажите количество монет';
    } else {
      const points = parseInt(formData.changed_points);
      if (isNaN(points) || points === 0) {
        newErrors.changed_points = 'Количество монет должно быть числом не равным нулю';
      }
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Укажите описание операции';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const points = parseInt(formData.changed_points);
      
      // Используем новую функцию которая обновляет и историю, и баланс студента
      const result = await updateStudentPoints(
        formData.student_id,
        formData.reason,
        points,
        formData.description,
        formData.student_id // studentProfileId для уведомлений
      );

      console.log('[PointsManagement] Points update result:', result);

      setSuccessMessage(
        `Успешно ${points > 0 ? 'начислено' : 'списано'} ${Math.abs(points)} монет студенту ${formData.student_name}. ` +
        `Новый баланс: ${result.newBalance} монет.`
      );
      
      // Очищаем форму, если не было предварительно выбранного студента
      if (!selectedStudent) {
        setFormData({
          student_id: '',
          student_name: '',
          reason: POINT_REASONS.BONUS,
          changed_points: '',
          description: ''
        });
      } else {
        setFormData(prev => ({
          ...prev,
          changed_points: '',
          description: ''
        }));
      }

    } catch (error) {
      console.error('Ошибка при изменении поинтов:', error);
      setErrorMessage(
        error.message || 'Не удалось изменить количество монет. Попробуйте еще раз.'
      );
    } finally {
      setLoading(false);
    }
  };

  const createNotificationText = (reason, points, description) => {
    const isPositive = points > 0;
    const pointsText = Math.abs(points) === 1 ? 'монету' : 
                      (Math.abs(points) < 5 ? 'монеты' : 'монет');
    
    const action = isPositive ? 'получили' : 'потратили';
    const emoji = isPositive ? '💰' : '💸';

    let message = `${emoji} Вы ${action} ${Math.abs(points)} ${pointsText}`;
    
    if (description) {
      message += `. ${description}`;
    }

    return message;
  };

  return (
    <div className="points-management">
      <div className="points-management-header">
        <h3 className="points-management-title">
          <span>💰</span>
          Управление монетами
        </h3>
        {onClose && (
          <button 
            className="cancel-btn"
            onClick={onClose}
            style={{ padding: '8px 12px', minWidth: 'auto' }}
          >
            ✕
          </button>
        )}
      </div>

      {successMessage && (
        <div className="success-message">
          <span>✅</span>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          <span>❌</span>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="points-form">
          {/* Поиск студента */}
          <div className="form-group">
            <label htmlFor="student">Студент *</label>
            <div className="student-search">
              <input
                id="student"
                type="text"
                className={`form-control ${errors.student_name ? 'error' : ''}`}
                placeholder="Начните вводить имя или email студента"
                value={formData.student_name}
                onChange={(e) => handleInputChange('student_name', e.target.value)}
                onFocus={() => !selectedStudent && setShowSuggestions(formData.student_name.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                disabled={!!selectedStudent}
              />
              
              {showSuggestions && filteredStudents.length > 0 && (
                <div className="search-suggestions">
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      className="suggestion-item"
                      onClick={() => selectStudent(student)}
                    >
                      <div className="suggestion-name">
                        {student.user?.first_name} {student.user?.surname}
                      </div>
                      <div className="suggestion-email">
                        {student.user?.email}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.student_name && <div className="error-text">{errors.student_name}</div>}
          </div>

          {/* Причина */}
          <div className="form-group">
            <label htmlFor="reason">Причина *</label>
            <select
              id="reason"
              className="form-control"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
            >
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Количество поинтов */}
          <div className="form-group">
            <label htmlFor="points">Количество монет *</label>
            <div className="points-input-group">
              <input
                id="points"
                type="number"
                className={`form-control ${errors.changed_points ? 'error' : ''}`}
                placeholder="Введите количество (может быть отрицательным)"
                value={formData.changed_points}
                onChange={(e) => handleInputChange('changed_points', e.target.value)}
              />
              <div className="points-buttons">
                <button type="button" className="quick-btn" onClick={() => handleQuickPoints(1)}>+1</button>
                <button type="button" className="quick-btn" onClick={() => handleQuickPoints(5)}>+5</button>
                <button type="button" className="quick-btn" onClick={() => handleQuickPoints(10)}>+10</button>
                <button type="button" className="quick-btn negative" onClick={() => handleQuickPoints(-1)}>-1</button>
                <button type="button" className="quick-btn negative" onClick={() => handleQuickPoints(-5)}>-5</button>
                <button type="button" className="quick-btn negative" onClick={() => handleQuickPoints(-10)}>-10</button>
              </div>
            </div>
            {errors.changed_points && <div className="error-text">{errors.changed_points}</div>}
          </div>

          {/* Описание */}
          <div className="form-group description-full">
            <label htmlFor="description">Описание *</label>
            <textarea
              id="description"
              className={`form-control ${errors.description ? 'error' : ''}`}
              placeholder="Опишите за что начисляются/списываются монеты"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
            {errors.description && <div className="error-text">{errors.description}</div>}
          </div>
        </div>

        <div className="submit-section">
          {onClose && (
            <button type="button" className="cancel-btn" onClick={onClose}>
              Отмена
            </button>
          )}
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Применение...
              </>
            ) : (
              <>
                💰 Применить изменения
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PointsManagement;
