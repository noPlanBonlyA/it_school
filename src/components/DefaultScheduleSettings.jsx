import React, { useState, useEffect } from 'react';
import { 
  WEEKDAYS, 
  WEEKDAY_NAMES, 
  INTERVALS, 
  INTERVAL_NAMES,
  GroupScheduleSettings 
} from '../services/groupScheduleService';
import '../styles/DefaultScheduleSettings.css';

const DefaultScheduleSettings = () => {
  const [settings, setSettings] = useState({
    dayOfWeek: WEEKDAYS.MONDAY,
    startTime: '18:00',
    endTime: '20:00',
    interval: INTERVALS.WEEKLY
  });

  const [isOpen, setIsOpen] = useState(false);

  // Загружаем сохраненные настройки по умолчанию
  useEffect(() => {
    const saved = localStorage.getItem('default_schedule_settings');
    if (saved) {
      try {
        const savedSettings = JSON.parse(saved);
        setSettings(savedSettings);
      } catch (error) {
        console.warn('Error loading default schedule settings:', error);
      }
    }
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Сохраняем в localStorage
    localStorage.setItem('default_schedule_settings', JSON.stringify(settings));
    
    // Показываем уведомление
    alert(`Настройки по умолчанию сохранены!\n\n` +
          `День: ${WEEKDAY_NAMES[settings.dayOfWeek]}\n` +
          `Время: ${settings.startTime} - ${settings.endTime}\n` +
          `Периодичность: ${INTERVAL_NAMES[settings.interval]}`);
    
    setIsOpen(false);
  };

  const handleReset = () => {
    if (window.confirm('Сбросить настройки по умолчанию?')) {
      localStorage.removeItem('default_schedule_settings');
      setSettings({
        dayOfWeek: WEEKDAYS.MONDAY,
        startTime: '18:00',
        endTime: '20:00',
        interval: INTERVALS.WEEKLY
      });
      alert('Настройки сброшены к значениям по умолчанию');
    }
  };

  return (
    <div className="default-schedule-settings">
      <button 
        className="settings-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Настройки расписания по умолчанию"
      >
        ⚙️ Настройки расписания
      </button>

      {isOpen && (
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            <div className="settings-header">
              <h3>⚙️ Настройки расписания по умолчанию</h3>
              <button 
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="settings-body">
              <p className="settings-description">
                Эти настройки будут использоваться при создании нового автоматического расписания
              </p>

              {/* День недели */}
              <div className="setting-group">
                <label className="setting-label">
                  📅 День недели
                </label>
                <select
                  value={settings.dayOfWeek}
                  onChange={(e) => handleChange('dayOfWeek', parseInt(e.target.value))}
                  className="setting-select"
                >
                  {Object.entries(WEEKDAYS).map(([key, value]) => (
                    <option key={key} value={value}>
                      {WEEKDAY_NAMES[value]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Время начала */}
              <div className="setting-group">
                <label className="setting-label">
                  🕐 Время начала
                </label>
                <input
                  type="time"
                  value={settings.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="setting-input"
                />
              </div>

              {/* Время окончания */}
              <div className="setting-group">
                <label className="setting-label">
                  🕕 Время окончания
                </label>
                <input
                  type="time"
                  value={settings.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="setting-input"
                />
              </div>

              {/* Периодичность */}
              <div className="setting-group">
                <label className="setting-label">
                  🔄 Периодичность
                </label>
                <select
                  value={settings.interval}
                  onChange={(e) => handleChange('interval', e.target.value)}
                  className="setting-select"
                >
                  {Object.entries(INTERVALS).map(([key, value]) => (
                    <option key={key} value={value}>
                      {INTERVAL_NAMES[value]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Предварительный просмотр */}
              <div className="settings-preview">
                <h4>📋 Предварительный просмотр</h4>
                <div className="preview-content">
                  <div className="preview-item">
                    <strong>День:</strong> {WEEKDAY_NAMES[settings.dayOfWeek]}
                  </div>
                  <div className="preview-item">
                    <strong>Время:</strong> {settings.startTime} - {settings.endTime}
                  </div>
                  <div className="preview-item">
                    <strong>Периодичность:</strong> {INTERVAL_NAMES[settings.interval]}
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button 
                className="btn-secondary"
                onClick={handleReset}
              >
                🔄 Сбросить
              </button>
              <button 
                className="btn-primary"
                onClick={handleSave}
              >
                💾 Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefaultScheduleSettings;
