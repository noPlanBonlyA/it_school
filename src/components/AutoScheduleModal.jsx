// src/components/AutoScheduleModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  WEEKDAYS, 
  WEEKDAY_NAMES, 
  INTERVALS, 
  INTERVAL_NAMES, 
  GroupScheduleSettings,
  validateScheduleSettings,
  saveGroupScheduleSettings,
  loadGroupScheduleSettings
} from '../services/groupScheduleService';

const AutoScheduleModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  groupId, 
  courseName,
  lessonCount 
}) => {
  const [settings, setSettings] = useState(new GroupScheduleSettings());
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем сохраненные настройки при открытии модала
  useEffect(() => {
    if (isOpen && groupId) {
      console.log('[AutoScheduleModal] Loading settings for group:', groupId);
      const savedSettings = loadGroupScheduleSettings(groupId);
      console.log('[AutoScheduleModal] Loaded settings:', savedSettings);
      setSettings(savedSettings);
      setErrors({});
    }
  }, [isOpen, groupId]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Убираем ошибку для поля при изменении
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async () => {
    // Валидация
    const validation = validateScheduleSettings(settings);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      // Сохраняем настройки
      saveGroupScheduleSettings(groupId, settings);
      
      // Вызываем callback для создания расписания
      await onConfirm(settings);
      
      onClose();
    } catch (error) {
      console.error('Error creating auto schedule:', error);
      alert('Ошибка при создании расписания: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = () => {
    if (!settings.startDate || !settings.dayOfWeek || !settings.startTime) {
      return [];
    }

    const preview = [];
    let currentDate = new Date(settings.startDate);
    
    // Находим первый нужный день недели
    while (currentDate.getDay() !== settings.dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Генерируем превью первых 3-х уроков
    for (let i = 0; i < Math.min(3, lessonCount); i++) {
      let lessonDate = new Date(currentDate);
      
      switch (settings.interval) {
        case INTERVALS.WEEKLY:
          lessonDate.setDate(lessonDate.getDate() + (i * 7));
          break;
        case INTERVALS.BIWEEKLY:
          lessonDate.setDate(lessonDate.getDate() + (i * 14));
          break;
        case INTERVALS.MONTHLY:
          lessonDate.setMonth(lessonDate.getMonth() + i);
          break;
      }

      preview.push({
        lessonNumber: i + 1,
        date: lessonDate.toLocaleDateString('ru-RU'),
        time: `${settings.startTime} - ${settings.endTime}`
      });
    }

    return preview;
  };

  if (!isOpen) return null;

  const preview = generatePreview();

  return (
    <div className="modal-overlay auto-schedule-modal">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>🗓️ Автоматическое расписание</h2>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            Курс: <strong>{courseName}</strong> ({lessonCount} уроков)
          </div>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="schedule-settings">
            
            {/* День недели */}
            <div className="form-group">
              <label htmlFor="dayOfWeek">День недели занятий</label>
              <select
                id="dayOfWeek"
                value={settings.dayOfWeek}
                onChange={(e) => handleChange('dayOfWeek', parseInt(e.target.value))}
                className={`form-control ${errors.dayOfWeek ? 'error' : ''}`}
              >
                <option value="">Выберите день недели</option>
                {Object.entries(WEEKDAY_NAMES).map(([value, name]) => (
                  <option key={value} value={value}>{name}</option>
                ))}
              </select>
              {errors.dayOfWeek && <span className="error-text">{errors.dayOfWeek}</span>}
            </div>

            {/* Время занятий */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Время начала</label>
                <input
                  type="time"
                  id="startTime"
                  value={settings.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className={`form-control ${errors.startTime ? 'error' : ''}`}
                />
                {errors.startTime && <span className="error-text">{errors.startTime}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="endTime">Время окончания</label>
                <input
                  type="time"
                  id="endTime"
                  value={settings.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className={`form-control ${errors.endTime ? 'error' : ''}`}
                />
                {errors.endTime && <span className="error-text">{errors.endTime}</span>}
              </div>
            </div>

            {/* Периодичность */}
            <div className="form-group">
              <label htmlFor="interval">Периодичность занятий</label>
              <select
                id="interval"
                value={settings.interval}
                onChange={(e) => handleChange('interval', e.target.value)}
                className={`form-control ${errors.interval ? 'error' : ''}`}
              >
                <option value="">Выберите периодичность</option>
                {Object.entries(INTERVAL_NAMES).map(([value, name]) => (
                  <option key={value} value={value}>{name}</option>
                ))}
              </select>
              {errors.interval && <span className="error-text">{errors.interval}</span>}
            </div>

            {/* Дата начала */}
            <div className="form-group">
              <label htmlFor="startDate">Дата начала занятий</label>
              <input
                type="date"
                id="startDate"
                value={settings.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className={`form-control ${errors.startDate ? 'error' : ''}`}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.startDate && <span className="error-text">{errors.startDate}</span>}
            </div>

            {/* Аудитория */}
            <div className="form-group">
              <label htmlFor="auditorium">Аудитория (необязательно)</label>
              <input
                type="text"
                id="auditorium"
                value={settings.auditorium}
                onChange={(e) => handleChange('auditorium', e.target.value)}
                placeholder="Например: 101, Актовый зал"
                className="form-control"
              />
            </div>

            {/* Превью расписания */}
            {preview.length > 0 && (
              <div className="schedule-preview">
                <h3>Превью расписания</h3>
                <div className="preview-list">
                  {preview.map((item, index) => (
                    <div key={index} className="preview-item">
                      <div className="preview-lesson">Урок {item.lessonNumber}</div>
                      <div className="preview-date">{item.date}</div>
                      <div className="preview-time">{item.time}</div>
                    </div>
                  ))}
                  {lessonCount > 3 && (
                    <div className="preview-item more">
                      <div className="preview-lesson">...</div>
                      <div className="preview-date">и еще {lessonCount - 3} уроков</div>
                      <div className="preview-time">по расписанию</div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Создание расписания...' : '✅ Создать автоматическое расписание'}
          </button>
          <button 
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            ❌ Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoScheduleModal;
