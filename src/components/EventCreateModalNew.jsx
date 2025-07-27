// src/components/EventCreateModalNew.jsx
import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../services/userService';
import { getAllGroups } from '../services/groupService';
import { createEvent, addEventForGroup, addEventForUsers } from '../services/eventService';
import api from '../api/axiosInstance';

export default function EventCreateModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    auditorium: '',
    is_opened: false
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Данные для выбора участников
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedParticipantType, setSelectedParticipantType] = useState('students');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [includeTeachers, setIncludeTeachers] = useState(false);
  
  // Поиск участников
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadParticipantsData();
  }, []);

  const loadParticipantsData = async () => {
    try {
      const [usersData, groupsData] = await Promise.all([
        getAllUsers(),
        getAllGroups()
      ]);
      
      setUsers(usersData.users || []);
      setGroups(groupsData.data || []);
      
      // Загружаем курсы
      try {
        const coursesResponse = await api.get('/courses');
        setCourses(coursesResponse.data || []);
      } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
        setCourses([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных участников:', error);
      setUsers([]);
      setGroups([]);
      setCourses([]);
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

    // Проверяем выбор участников
    if (selectedParticipantType === 'students' && selectedUsers.length === 0) {
      newErrors.participants = 'Выберите хотя бы одного студента';
    } else if (selectedParticipantType === 'teachers' && selectedUsers.length === 0) {
      newErrors.participants = 'Выберите хотя бы одного преподавателя';
    } else if (selectedParticipantType === 'groups' && selectedGroups.length === 0) {
      newErrors.participants = 'Выберите хотя бы одну группу';
    } else if (selectedParticipantType === 'courses' && selectedCourses.length === 0) {
      newErrors.participants = 'Выберите хотя бы один курс';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      
      // Создаем мероприятие
      const event = await onSave(formData);
      
      // Добавляем участников
      if (selectedParticipantType === 'all') {
        const allUserIds = users.map(user => user.id);
        if (allUserIds.length > 0) {
          await addEventForUsers(event.id, { user_ids: allUserIds });
        }
      } else if (selectedParticipantType === 'students') {
        if (selectedUsers.length > 0) {
          await addEventForUsers(event.id, { user_ids: selectedUsers });
        }
      } else if (selectedParticipantType === 'teachers') {
        if (selectedUsers.length > 0) {
          await addEventForUsers(event.id, { user_ids: selectedUsers });
        }
      } else if (selectedParticipantType === 'groups') {
        for (const groupId of selectedGroups) {
          await addEventForGroup(event.id, {
            group_id: groupId,
            with_teacher: includeTeachers
          });
        }
      } else if (selectedParticipantType === 'courses') {
        console.log('Course participants feature needs backend implementation');
        alert('Функция добавления участников курсов будет реализована в следующем обновлении');
      }

      alert('Мероприятие и участники успешно добавлены!');
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Ошибка создания мероприятия');
    } finally {
      setSaving(false);
    }
  };

  // Вспомогательные функции для фильтрации
  const getFilteredUsers = (role) => {
    if (role === 'student') {
      return users.filter(user => user.role === 'Студент');
    } else if (role === 'teacher') {
      return users.filter(user => user.role === 'Преподаватель');
    }
    return users;
  };

  const getSearchFilteredUsers = (usersList) => {
    if (!searchTerm) return usersList;
    const searchLower = searchTerm.toLowerCase();
    return usersList.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
      return fullName.includes(searchLower) || 
             (user.username && user.username.toLowerCase().includes(searchLower));
    });
  };

  const getSearchFilteredGroups = () => {
    if (!searchTerm) return groups;
    return groups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getSearchFilteredCourses = () => {
    if (!searchTerm) return courses;
    return courses.filter(course => 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const getUserDisplayName = (user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.username;
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      'Студент': { text: 'Студент', class: 'role-student' },
      'Преподаватель': { text: 'Преподаватель', class: 'role-teacher' },
      'admin': { text: 'Администратор', class: 'role-admin' },
      'superadmin': { text: 'Супер Админ', class: 'role-superadmin' }
    };
    const roleInfo = roleMap[role] || { text: role, class: 'role-default' };
    return <span className={`role-badge ${roleInfo.class}`}>{roleInfo.text}</span>;
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

  const handleCourseToggle = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Создать мероприятие</h2>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="event-form">
            {/* Основная информация о мероприятии */}
            <div className="form-section">
              <h3>Информация о мероприятии</h3>
              
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
                  placeholder="Введите номер аудитории"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_opened}
                    onChange={(e) => setFormData({...formData, is_opened: e.target.checked})}
                  />
                  <span className="checkbox-text">Открытое мероприятие</span>
                </label>
              </div>
            </div>

            {/* Выбор участников */}
            <div className="form-section">
              <h3>Участники мероприятия</h3>
              
              <div className="participant-type-selector">
                <div className="type-options">
                  <label className="type-option">
                    <input
                      type="radio"
                      name="participantType"
                      value="all"
                      checked={selectedParticipantType === 'all'}
                      onChange={(e) => setSelectedParticipantType(e.target.value)}
                    />
                    <span>👥 Все пользователи ({users.length} человек)</span>
                  </label>
                  
                  <label className="type-option">
                    <input
                      type="radio"
                      name="participantType"
                      value="students"
                      checked={selectedParticipantType === 'students'}
                      onChange={(e) => setSelectedParticipantType(e.target.value)}
                    />
                    <span>🎓 Студенты ({getFilteredUsers('student').length} человек)</span>
                  </label>
                  
                  <label className="type-option">
                    <input
                      type="radio"
                      name="participantType"
                      value="teachers"
                      checked={selectedParticipantType === 'teachers'}
                      onChange={(e) => setSelectedParticipantType(e.target.value)}
                    />
                    <span>👨‍🏫 Преподаватели ({getFilteredUsers('teacher').length} человек)</span>
                  </label>
                  
                  <label className="type-option">
                    <input
                      type="radio"
                      name="participantType"
                      value="groups"
                      checked={selectedParticipantType === 'groups'}
                      onChange={(e) => setSelectedParticipantType(e.target.value)}
                    />
                    <span>👥 Группы ({groups.length} групп)</span>
                  </label>
                  
                  <label className="type-option">
                    <input
                      type="radio"
                      name="participantType"
                      value="courses"
                      checked={selectedParticipantType === 'courses'}
                      onChange={(e) => setSelectedParticipantType(e.target.value)}
                    />
                    <span>📚 Курсы ({courses.length} курсов)</span>
                  </label>
                </div>
                
                {errors.participants && <span className="error-text">{errors.participants}</span>}
              </div>

              {/* Выбор конкретных участников */}
              {(selectedParticipantType === 'students' || selectedParticipantType === 'teachers') && (
                <div className="participant-selection">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Поиск пользователей..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <div className="participants-list">
                    <div className="list-header">
                      <button
                        type="button"
                        className="btn-secondary small"
                        onClick={() => {
                          const filteredUsers = getSearchFilteredUsers(getFilteredUsers(
                            selectedParticipantType === 'students' ? 'student' : 'teacher'
                          ));
                          setSelectedUsers(filteredUsers.map(user => user.id));
                        }}
                      >
                        Выбрать всех
                      </button>
                      <button
                        type="button"
                        className="btn-secondary small"
                        onClick={() => setSelectedUsers([])}
                      >
                        Очистить выбор
                      </button>
                    </div>
                    
                    <div className="users-grid">
                      {getSearchFilteredUsers(getFilteredUsers(
                        selectedParticipantType === 'students' ? 'student' : 'teacher'
                      )).map(user => (
                        <div
                          key={user.id}
                          className={`user-card ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                          onClick={() => handleUserToggle(user.id)}
                        >
                          <div className="user-info">
                            <div className="user-name">{getUserDisplayName(user)}</div>
                            <div className="user-details">
                              {getRoleBadge(user.role)} • {user.username}
                            </div>
                          </div>
                          <div className="user-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleUserToggle(user.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedParticipantType === 'groups' && (
                <div className="participant-selection">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Поиск групп..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={includeTeachers}
                        onChange={(e) => setIncludeTeachers(e.target.checked)}
                      />
                      <span className="checkbox-text">Включить преподавателей групп</span>
                    </label>
                  </div>
                  
                  <div className="participants-list">
                    <div className="list-header">
                      <button
                        type="button"
                        className="btn-secondary small"
                        onClick={() => {
                          const filteredGroups = getSearchFilteredGroups();
                          setSelectedGroups(filteredGroups.map(group => group.id));
                        }}
                      >
                        Выбрать все
                      </button>
                      <button
                        type="button"
                        className="btn-secondary small"
                        onClick={() => setSelectedGroups([])}
                      >
                        Очистить выбор
                      </button>
                    </div>
                    
                    <div className="groups-grid">
                      {getSearchFilteredGroups().map(group => (
                        <div
                          key={group.id}
                          className={`group-card ${selectedGroups.includes(group.id) ? 'selected' : ''}`}
                          onClick={() => handleGroupToggle(group.id)}
                        >
                          <div className="group-info">
                            <div className="group-name">{group.name}</div>
                            <div className="group-details">
                              Участников: {group.students_count || 0}
                            </div>
                          </div>
                          <div className="group-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group.id)}
                              onChange={() => handleGroupToggle(group.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedParticipantType === 'courses' && (
                <div className="participant-selection">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Поиск курсов..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <div className="participants-list">
                    <div className="list-header">
                      <button
                        type="button"
                        className="btn-secondary small"
                        onClick={() => {
                          const filteredCourses = getSearchFilteredCourses();
                          setSelectedCourses(filteredCourses.map(course => course.id));
                        }}
                      >
                        Выбрать все
                      </button>
                      <button
                        type="button"
                        className="btn-secondary small"
                        onClick={() => setSelectedCourses([])}
                      >
                        Очистить выбор
                      </button>
                    </div>
                    
                    <div className="courses-grid">
                      {getSearchFilteredCourses().map(course => (
                        <div
                          key={course.id}
                          className={`course-card ${selectedCourses.includes(course.id) ? 'selected' : ''}`}
                          onClick={() => handleCourseToggle(course.id)}
                        >
                          <div className="course-info">
                            <div className="course-name">{course.name}</div>
                            <div className="course-details">
                              {course.description}
                            </div>
                          </div>
                          <div className="course-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedCourses.includes(course.id)}
                              onChange={() => handleCourseToggle(course.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Создание...' : 'Создать мероприятие'}
          </button>
        </div>
      </div>
    </div>
  );
}
