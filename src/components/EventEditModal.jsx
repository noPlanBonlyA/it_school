// src/components/EventEditModal.jsx
import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../services/userService';
import { getAllGroups } from '../services/groupService';
import { 
  addEventForGroup, 
  addEventForUsers, 
  removeUserFromEvent,
  getEventWithUsers
} from '../services/eventService';
import '../styles/EventModals.css'; // новый импорт

export default function EventEditModal({ event, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: event.name || '',
    description: event.description || '',
    start_datetime: event.start_datetime ? event.start_datetime.slice(0, 16) : '',
    end_datetime: event.end_datetime ? event.end_datetime.slice(0, 16) : '',
    auditorium: event.auditorium || '',
    is_opened: event.is_opened || false
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'participants'

  // Данные для управления участниками
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [eventUsers, setEventUsers] = useState(event.users || []);
  const [newParticipantType, setNewParticipantType] = useState('users');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [includeTeachers, setIncludeTeachers] = useState(false);
  
  // Поиск участников
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  useEffect(() => {
    loadParticipantsData();
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const loadParticipantsData = async () => {
    try {
      const [usersResponse, groupsResponse] = await Promise.all([
        getAllUsers({ limit: 1000 }),
        getAllGroups(1000, 0)
      ]);
      
      setUsers(usersResponse.objects || usersResponse);
      setGroups(groupsResponse.objects || groupsResponse);
    } catch (error) {
      console.error('Error loading participants data:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    }
    
    if (!formData.start_datetime) {
      newErrors.start_datetime = 'Дата и время начала обязательны';
    }
    
    if (!formData.end_datetime) {
      newErrors.end_datetime = 'Дата и время окончания обязательны';
    }
    
    if (formData.start_datetime && formData.end_datetime) {
      const start = new Date(formData.start_datetime);
      const end = new Date(formData.end_datetime);
      if (start >= end) {
        newErrors.end_datetime = 'Время окончания должно быть позже времени начала';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      await onSave(formData);
    } catch (error) {
      console.error('Error updating event:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddParticipants = async () => {
    try {
      setSaving(true);

      if (newParticipantType === 'groups') {
        // Добавляем выбранные группы
        for (const groupId of selectedGroups) {
          await addEventForGroup(event.id, {
            group_id: groupId,
            with_teacher: includeTeachers
          });
        }
      } else if (newParticipantType === 'users') {
        // Добавляем выбранных пользователей
        if (selectedUsers.length > 0) {
          await addEventForUsers(event.id, { user_ids: selectedUsers });
        }
      }

      // Обновляем список участников
      const updatedUsers = await getEventWithUsers(event.id);
      setEventUsers(updatedUsers.users || []);
      setSelectedUsers([]);
      setSelectedGroups([]);
      alert('Участники успешно добавлены!');
    } catch (error) {
      console.error('Error adding participants:', error);
      alert('Ошибка добавления участников');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await removeUserFromEvent(event.id, userId);
      setEventUsers(prev => prev.filter(user => user.id !== userId));
      alert('Участник удален');
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Ошибка удаления участника');
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const formatUserName = (user) => {
    const fullName = `${user.first_name || ''} ${user.surname || ''}`.trim();
    return fullName || user.username;
  };

  const getUserRoleBadge = (role) => {
    const roleMap = {
      student: { text: 'Студент', class: 'role-student' },
      teacher: { text: 'Преподаватель', class: 'role-teacher' },
      admin: { text: 'Администратор', class: 'role-admin' },
      superadmin: { text: 'Супер-админ', class: 'role-superadmin' }
    };
    const roleInfo = roleMap[role] || { text: role, class: 'role-default' };
    return <span className={`role-badge ${roleInfo.class}`}>{roleInfo.text}</span>;
  };

  // Фильтруем пользователей, которые еще не добавлены
  const availableUsers = users.filter(user => 
    !eventUsers.some(eventUser => eventUser.id === user.id)
  );

  return (
    <div className="events-modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Редактировать мероприятие</h2>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Информация
          </button>
          <button 
            className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            Участники ({eventUsers.length})
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'info' && (
            <div className="tab-content">
              <div className="form-group">
                <label>Название мероприятия *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={errors.name ? 'error' : ''}
                  placeholder="Введите название мероприятия"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Введите описание мероприятия"
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Дата и время начала *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_datetime}
                    onChange={(e) => setFormData({...formData, start_datetime: e.target.value})}
                    className={errors.start_datetime ? 'error' : ''}
                  />
                  {errors.start_datetime && <span className="error-text">{errors.start_datetime}</span>}
                </div>

                <div className="form-group">
                  <label>Дата и время окончания *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_datetime}
                    onChange={(e) => setFormData({...formData, end_datetime: e.target.value})}
                    className={errors.end_datetime ? 'error' : ''}
                  />
                  {errors.end_datetime && <span className="error-text">{errors.end_datetime}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Аудитория</label>
                <input
                  type="text"
                  value={formData.auditorium}
                  onChange={(e) => setFormData({...formData, auditorium: e.target.value})}
                  placeholder="Введите номер аудитории или место проведения"
                />
              </div>

              <div className="form-group">
                <div className="form-group-open-event">
                  <label className="checkbox-label open-event-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.is_opened}
                      onChange={(e) => setFormData({...formData, is_opened: e.target.checked})}
                    />
                    <span className="checkbox-text">Открытое мероприятие (доступно всем)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="tab-content">
              {/* Текущие участники */}
              <div className="participants-section">
                <div className="section-header">
                  <div className="header-content">
                    <h3>👥 Текущие участники</h3>
                    <p>Участников: <strong>{eventUsers.length}</strong></p>
                  </div>
                </div>
                
                {eventUsers.length === 0 ? (
                  <div className="empty-state">
                    <p>Участники не добавлены</p>
                  </div>
                ) : (
                  <div className="participants-container">
                    <div className="participants-grid modern">
                      {eventUsers.map(user => (
                        <div key={user.id} className="participant-card current">
                          <div className="card-content">
                            <div className="card-avatar">
                              {formatUserName(user).charAt(0).toUpperCase()}
                            </div>
                            <div className="card-info">
                              <h4>{formatUserName(user)}</h4>
                              <div className="user-meta">
                                {getUserRoleBadge(user.role)}
                                {user.email && <span className="user-email">{user.email}</span>}
                              </div>
                            </div>
                          </div>
                          <button 
                            className="btn-remove-participant"
                            onClick={() => handleRemoveUser(user.id)}
                            title="Удалить участника"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Добавление новых участников */}
              <div className="participants-section">
                <div className="section-header">
                  <div className="header-content">
                    <h3>➕ Добавить участников</h3>
                    <p>Выберите пользователей или группы для добавления в мероприятие</p>
                  </div>
                </div>
                
                <div className="participant-type-selector simple">
                  <div className="type-options simple">
                    <div 
                      className={`type-option simple ${newParticipantType === 'groups' ? 'selected' : ''}`}
                      onClick={() => setNewParticipantType('groups')}
                    >
                      <div className="option-icon simple">🏫</div>
                      <div className="option-content">
                        <h4>Добавить группы</h4>
                        <p>Назначить мероприятие группам</p>
                      </div>
                      <div className="option-radio">
                        <input
                          type="radio"
                          name="newParticipantType"
                          value="groups"
                          checked={newParticipantType === 'groups'}
                          onChange={(e) => setNewParticipantType(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div 
                      className={`type-option simple ${newParticipantType === 'users' ? 'selected' : ''}`}
                      onClick={() => setNewParticipantType('users')}
                    >
                      <div className="option-icon simple">👤</div>
                      <div className="option-content">
                        <h4>Добавить пользователей</h4>
                        <p>Индивидуальный выбор участников</p>
                      </div>
                      <div className="option-radio">
                        <input
                          type="radio"
                          name="newParticipantType"
                          value="users"
                          checked={newParticipantType === 'users'}
                          onChange={(e) => setNewParticipantType(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {newParticipantType === 'groups' && (
                  <div className="add-participants-container">
                    <div className="header-actions">
                      <label className="modern-checkbox">
                        <input
                          type="checkbox"
                          checked={includeTeachers}
                          onChange={(e) => setIncludeTeachers(e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <span className="checkbox-text">Включить преподавателей групп</span>
                      </label>
                      {selectedGroups.length > 0 && (
                        <button 
                          className="btn-clear"
                          onClick={() => setSelectedGroups([])}
                        >
                          Очистить выбор
                        </button>
                      )}
                    </div>
                    
                    <div className="participants-container">
                      <div className="search-box">
                        <input
                          type="text"
                          placeholder="Поиск групп..."
                          value={groupSearchTerm}
                          onChange={(e) => setGroupSearchTerm(e.target.value)}
                          className="search-input"
                        />
                      </div>
                      
                      <div className="participants-grid modern">
                        {groups
                          .filter(group => !groupSearchTerm || group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                          .map(group => (
                          <div 
                            key={group.id} 
                            className={`participant-card ${selectedGroups.includes(group.id) ? 'selected' : ''}`}
                            onClick={() => handleGroupToggle(group.id)}
                          >
                            <div className="card-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedGroups.includes(group.id)}
                                onChange={() => handleGroupToggle(group.id)}
                              />
                            </div>
                            <div className="card-content">
                              <div className="card-icon">🏫</div>
                              <div className="card-info">
                                <h4>{group.name}</h4>
                                <p>Группа • {group.students?.length || 0} студентов</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {newParticipantType === 'users' && (
                  <div className="add-participants-container">
                    <div className="header-actions">
                      {selectedUsers.length > 0 && (
                        <button 
                          className="btn-clear"
                          onClick={() => setSelectedUsers([])}
                        >
                          Очистить выбор
                        </button>
                      )}
                      <p>Выбрано: <strong>{selectedUsers.length}</strong></p>
                    </div>
                    
                    <div className="participants-container">
                      <div className="search-box">
                        <input
                          type="text"
                          placeholder="Поиск пользователей..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="search-input"
                        />
                      </div>
                      
                      <div className="participants-grid modern">
                        {availableUsers
                          .filter(user => {
                            if (!userSearchTerm) return true;
                            const searchLower = userSearchTerm.toLowerCase();
                            const fullName = formatUserName(user).toLowerCase();
                            return fullName.includes(searchLower) || user.email?.toLowerCase().includes(searchLower);
                          })
                          .map(user => (
                          <div 
                            key={user.id} 
                            className={`participant-card ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                            onClick={() => handleUserToggle(user.id)}
                          >
                            <div className="card-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => handleUserToggle(user.id)}
                              />
                            </div>
                            <div className="card-content">
                              <div className="card-avatar">
                                {formatUserName(user).charAt(0).toUpperCase()}
                              </div>
                              <div className="card-info">
                                <h4>{formatUserName(user)}</h4>
                                <div className="user-meta">
                                  {getUserRoleBadge(user.role)}
                                  {user.email && <span className="user-email">{user.email}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {((newParticipantType === 'users' && selectedUsers.length > 0) || 
                  (newParticipantType === 'groups' && selectedGroups.length > 0)) && (
                  <div className="add-button-container">
                    <button 
                      className="btn-primary add-participants"
                      onClick={handleAddParticipants}
                      disabled={saving}
                    >
                      {saving ? 'Добавление...' : 
                        `Добавить ${newParticipantType === 'users' ? 
                          `${selectedUsers.length} пользователей` : 
                          `${selectedGroups.length} групп`}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button 
            className="btn-secondary"
            style={{ backgroundColor: '#10b981', color: 'white' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
          <button 
            className="btn-primary"
            style={{ backgroundColor: '#e40b0bff'}}
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
