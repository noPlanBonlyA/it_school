// src/components/EventCreateModal.jsx
import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../services/userService';
import { getAllGroups } from '../services/groupService';
import { addEventForGroup, addEventForUsers } from '../services/eventService';
import api from '../api/axiosInstance';
import '../styles/EventModals.css'; // добавлен импорт новых стилей

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

  // Добавляем отладку
  useEffect(() => {
    console.log('Current state:');
    console.log('Users:', users, 'Length:', Array.isArray(users) ? users.length : 'not array');
    console.log('Groups:', groups, 'Length:', Array.isArray(groups) ? groups.length : 'not array');
    console.log('Courses:', courses, 'Length:', Array.isArray(courses) ? courses.length : 'not array');
  }, [users, groups, courses]);

  const loadParticipantsData = async () => {
    try {
      // Загружаем пользователей
      const usersData = await getAllUsers();
      console.log('Users data:', usersData);
      setUsers(usersData.objects || usersData.users || usersData || []);
      
      // Загружаем группы с базовой информацией
      const groupsData = await getAllGroups();
      console.log('Groups data:', groupsData);
      
      // Получаем детальную информацию о каждой группе
      const detailedGroups = [];
      if (groupsData.objects && Array.isArray(groupsData.objects)) {
        for (const group of groupsData.objects) {
          try {
            const detailedGroup = await api.get(`/groups/${group.id}`);
            console.log(`Detailed group ${group.name}:`, detailedGroup.data);
            detailedGroups.push(detailedGroup.data);
          } catch (error) {
            console.error(`Error loading details for group ${group.id}:`, error);
            // Добавляем группу без детальной информации
            detailedGroups.push({ ...group, students: [] });
          }
        }
      }
      
      setGroups(detailedGroups);
      
      // Загружаем курсы
      try {
        const coursesResponse = await api.get('/courses');
        console.log('Courses response:', coursesResponse.data);
        const coursesData = coursesResponse.data?.objects || coursesResponse.data || [];
        setCourses(Array.isArray(coursesData) ? coursesData : []);
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
      
      // Подготавливаем данные события для отправки (без ID - сервер сам его сгенерирует)
      const eventDataWithId = {
        ...formData,
        // Убеждаемся, что даты в правильном формате ISO
        start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : null,
        end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
        // Убеждаемся, что строковые поля не пустые
        name: formData.name.trim() || 'Мероприятие без названия',
        description: formData.description.trim() || 'Описание отсутствует',
        auditorium: formData.auditorium.trim() || ''
      };
      
      console.log('Sending event data:', eventDataWithId);
      
      // Создаем мероприятие
      const event = await onSave(eventDataWithId);
      
      if (!event || !event.id) {
        console.error('Event creation failed: no event returned');
        alert('Ошибка создания мероприятия: сервер не вернул данные события');
        return;
      }
      
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
      const errorMessage = error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || error.message;
      alert('Ошибка создания мероприятия: ' + errorMessage);
    } finally {
      setSaving(false);
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

  const handleCourseToggle = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Фильтрация пользователей по роли
  const getFilteredUsers = (role) => {
    if (!Array.isArray(users)) return [];
    return users.filter(user => user.role === role);
  };

  // Получаем отфильтрованных пользователей на основе поискового запроса
  const getSearchFilteredUsers = (usersList) => {
    if (!Array.isArray(usersList)) return [];
    if (!searchTerm) return usersList;
    const searchLower = searchTerm.toLowerCase();
    return usersList.filter(user => {
      const fullName = formatUserName(user).toLowerCase();
      return fullName.includes(searchLower) || 
             user.email?.toLowerCase().includes(searchLower) ||
             user.username?.toLowerCase().includes(searchLower);
    });
  };

  // Получаем отфильтрованные группы
  const getSearchFilteredGroups = () => {
    if (!Array.isArray(groups)) return [];
    if (!searchTerm) return groups;
    return groups.filter(group => 
      group.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Получаем отфильтованные курсы
  const getSearchFilteredCourses = () => {
    if (!Array.isArray(courses)) return [];
    if (!searchTerm) return courses;
    return courses.filter(course => 
      course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const formatUserName = (user) => {
    if (!user) return 'Неизвестный пользователь';
    const fullName = `${user.first_name || ''} ${user.surname || ''}`.trim();
    return fullName || user.username || 'Без имени';
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

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  return (
    <div className="events-modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Создать мероприятие</h2>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Основная информация о мероприятии */}
          <div className="event-form-section">
            <h3>📅 Основная информация</h3>
            
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
                rows={3}
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
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.is_opened}
                  onChange={(e) => setFormData({...formData, is_opened: e.target.checked})}
                />
                
              </label>
            </div>
          </div>
          <div className="participant-type-selector">
            <div className="selector-header">
              <h3>👥 Выберите тип участников</h3>
              <p>Кто будет участвовать в мероприятии?</p>
            </div>
            
            <div className="type-options">
              <div 
                className={`type-option ${selectedParticipantType === 'all' ? 'selected' : ''}`}
                onClick={() => setSelectedParticipantType('all')}
              >
                <div className="option-icon">👥</div>
                <div className="option-content">
                  <h4>Все пользователи</h4>
                  <p>Мероприятие для всех пользователей системы</p>
                  <span className="user-count">{Array.isArray(users) ? users.length : 0} человек</span>
                </div>
                <div className="option-radio">
                  <input
                    type="radio"
                    name="participantType"
                    value="all"
                    checked={selectedParticipantType === 'all'}
                    onChange={(e) => setSelectedParticipantType(e.target.value)}
                  />
                </div>
              </div>
              
              <div 
                className={`type-option ${selectedParticipantType === 'students' ? 'selected' : ''}`}
                onClick={() => setSelectedParticipantType('students')}
              >
                <div className="option-icon">🎓</div>
                <div className="option-content">
                  <h4>Студенты</h4>
                  <p>Выбрать конкретных студентов</p>
                  <span className="user-count">{getFilteredUsers('student').length} студентов</span>
                </div>
                <div className="option-radio">
                  <input
                    type="radio"
                    name="participantType"
                    value="students"
                    checked={selectedParticipantType === 'students'}
                    onChange={(e) => setSelectedParticipantType(e.target.value)}
                  />
                </div>
              </div>
              
              <div 
                className={`type-option ${selectedParticipantType === 'teachers' ? 'selected' : ''}`}
                onClick={() => setSelectedParticipantType('teachers')}
              >
                <div className="option-icon">👨‍🏫</div>
                <div className="option-content">
                  <h4>Преподаватели</h4>
                  <p>Выбрать конкретных преподавателей</p>
                  <span className="user-count">{getFilteredUsers('teacher').length} преподавателей</span>
                </div>
                <div className="option-radio">
                  <input
                    type="radio"
                    name="participantType"
                    value="teachers"
                    checked={selectedParticipantType === 'teachers'}
                    onChange={(e) => setSelectedParticipantType(e.target.value)}
                  />
                </div>
              </div>
              
              <div 
                className={`type-option ${selectedParticipantType === 'groups' ? 'selected' : ''}`}
                onClick={() => setSelectedParticipantType('groups')}
              >
                <div className="option-icon">🏫</div>
                <div className="option-content">
                  <h4>Группы</h4>
                  <p>Назначить мероприятие определенным группам</p>
                  <span className="user-count">{Array.isArray(groups) ? groups.length : 0} групп доступно</span>
                </div>
                <div className="option-radio">
                  <input
                    type="radio"
                    name="participantType"
                    value="groups"
                    checked={selectedParticipantType === 'groups'}
                    onChange={(e) => setSelectedParticipantType(e.target.value)}
                  />
                </div>
              </div>
              
              <div 
                className={`type-option ${selectedParticipantType === 'courses' ? 'selected' : ''}`}
                onClick={() => setSelectedParticipantType('courses')}
              >
                <div className="option-icon">📚</div>
                <div className="option-content">
                  <h4>Курсы</h4>
                  <p>Назначить мероприятие участникам курсов</p>
                  <span className="user-count">{Array.isArray(courses) ? courses.length : 0} курсов доступно</span>
                </div>
                <div className="option-radio">
                  <input
                    type="radio"
                    name="participantType"
                    value="courses"
                    checked={selectedParticipantType === 'courses'}
                    onChange={(e) => setSelectedParticipantType(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Секция для студентов */}
          {selectedParticipantType === 'students' && (
            <div className="participants-section">
              <div className="section-header">
                <div className="header-content">
                  <h3>🎓 Выберите студентов</h3>
                  <p>Выбрано: <strong>{selectedUsers.length}</strong> из {getFilteredUsers('student').length}</p>
                </div>
                <div className="header-actions">
                  {selectedUsers.length > 0 && (
                    <button 
                      className="btn-clear"
                      style={{width:"116px"}}
                      onClick={() => setSelectedUsers([])}
                    >
                      Очистить 
                    </button>
                  )}
                  <button 
                  style={{width:"116px"}}
                    className="btn-select-all"
                    onClick={() => {
                      const students = getFilteredUsers('student');
                      if (selectedUsers.length === students.length) {
                        setSelectedUsers([]);
                      } else {
                        setSelectedUsers(students.map(u => u.id));
                      }
                    }}
                  >
                    {selectedUsers.length === getFilteredUsers('student').length ? 'Снять все' : 'Выбрать всех'}
                  </button>
                </div>
              </div>
              
              <div className="participants-container">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Поиск студентов..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <div className="participants-grid modern">
                  {getSearchFilteredUsers(getFilteredUsers('student')).map(user => (
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

          {/* Секция для преподавателей */}
          {selectedParticipantType === 'teachers' && (
            <div className="participants-section">
              <div className="section-header">
                <div className="header-content">
                  <h3>👨‍🏫 Выберите преподавателей</h3>
                  <p>Выбрано: <strong>{selectedUsers.length}</strong> из {getFilteredUsers('teacher').length}</p>
                </div>
                <div className="header-actions">
                  {selectedUsers.length > 0 && (
                    <button 
                      className="btn-clear"
                      style={{width:"116px"}}
                      onClick={() => setSelectedUsers([])}
                    >
                      Очистить
                    </button>
                  )}
                  <button 
                    className="btn-select-all"
                    style={{width:"116px"}}
                    onClick={() => {
                      const teachers = getFilteredUsers('teacher');
                      if (selectedUsers.length === teachers.length) {
                        setSelectedUsers([]);
                      } else {
                        setSelectedUsers(teachers.map(u => u.id));
                      }
                    }}
                  >
                    {selectedUsers.length === getFilteredUsers('teacher').length ? 'Снять все' : 'Выбрать всех'}
                  </button>
                </div>
              </div>
              
              <div className="participants-container">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Поиск преподавателей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <div className="participants-grid modern">
                  {getSearchFilteredUsers(getFilteredUsers('teacher')).map(user => (
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

          {/* Секция для групп */}
          {selectedParticipantType === 'groups' && (
            <div className="participants-section">
              <div className="section-header">
                <div className="header-content">
                  <h3>🏫 Выберите группы</h3>
                  <p>Выбрано групп: <strong>{selectedGroups.length}</strong></p>
                </div>
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
                      style={{width:"116px"}}
                      onClick={() => setSelectedGroups([])}
                    >
                      Очистить
                    </button>
                  )}
                </div>
              </div>
              
              <div className="participants-container">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Поиск групп..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <div className="participants-grid modern">
                  {getSearchFilteredGroups().map(group => (
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

          {/* Секция для курсов */}
          {selectedParticipantType === 'courses' && (
            <div className="participants-section">
              <div className="section-header">
                <div className="header-content">
                  <h3>📚 Выберите курсы</h3>
                  <p>Выбрано курсов: <strong>{selectedCourses.length}</strong></p>
                </div>
                <div className="header-actions">
                  {selectedCourses.length > 0 && (
                    <button 
                      className="btn-clear"
                      style={{width:"116px"}}
                      onClick={() => setSelectedCourses([])}
                    >
                      Очистить 
                    </button>
                  )}
                  <button 
                  style={{width:"116px"}}
                    className="btn-select-all"
                    onClick={() => {
                      if (selectedCourses.length === courses.length) {
                        setSelectedCourses([]);
                      } else {
                        setSelectedCourses(courses.map(c => c.id));
                      }
                    }}
                  >
                    {selectedCourses.length === courses.length ? 'Снять все' : 'Выбрать все'}
                  </button>
                </div>
              </div>
              
              <div className="participants-container">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Поиск курсов..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <div className="participants-grid modern">
                  {getSearchFilteredCourses().map(course => (
                    <div 
                      key={course.id} 
                      className={`participant-card ${selectedCourses.includes(course.id) ? 'selected' : ''}`}
                      onClick={() => handleCourseToggle(course.id)}
                    >
                      <div className="card-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => handleCourseToggle(course.id)}
                        />
                      </div>
                      <div className="card-content">
                        <div className="card-icon">📚</div>
                        <div className="card-info">
                          <h4>{course.name || course.title}</h4>
                          <p>Курс • {course.description?.substring(0, 50) || 'Описание недоступно'}...</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          {errors.participants && <span className="error-text">{errors.participants}</span>}
          <button 
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Создание мероприятия...' : 'Создать мероприятие'}
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
