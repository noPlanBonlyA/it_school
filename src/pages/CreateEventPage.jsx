// src/pages/CreateEventPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import SuccessModal from '../components/SuccessModal';
import { getAllUsers } from '../services/userService';
import { getAllGroups } from '../services/groupService';
import { createEvent, addEventForGroup, addEventForUsers } from '../services/eventService';
import api from '../api/axiosInstance';
import '../styles/CreateEventPage.css';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Основные данные формы
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
  
  // Состояние для модального окна успеха
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  // Проверка прав доступа
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!['admin', 'superadmin'].includes(user.role)) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    loadParticipantsData();
  }, []);

  const loadParticipantsData = async () => {
    try {
      // Загружаем пользователей
      const usersData = await getAllUsers();
      setUsers(usersData.objects || usersData.users || usersData || []);
      
      // Загружаем группы с детальной информацией
      const groupsData = await getAllGroups();
      const detailedGroups = [];
      if (groupsData.objects && Array.isArray(groupsData.objects)) {
        for (const group of groupsData.objects) {
          try {
            const detailedGroup = await api.get(`/groups/${group.id}`);
            detailedGroups.push(detailedGroup.data);
          } catch (error) {
            console.error(`Error loading details for group ${group.id}:`, error);
            detailedGroups.push({ ...group, students: [] });
          }
        }
      }
      setGroups(detailedGroups);
      
      // Загружаем курсы
      try {
        const coursesResponse = await api.get('/courses');
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
      
      // Подготавливаем данные события
      // Добавляем +3 часа к выбранному времени
      const add3Hours = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        date.setHours(date.getHours() + 3);
        return date.toISOString();
      };

      const eventData = {
        ...formData,
        start_datetime: formData.start_datetime ? add3Hours(formData.start_datetime) : null,
        end_datetime: formData.end_datetime ? add3Hours(formData.end_datetime) : null,
        name: formData.name.trim() || 'Мероприятие без названия',
        description: formData.description.trim() || 'Описание отсутствует',
        auditorium: formData.auditorium.trim() || ''
      };
      
      // Создаем мероприятие
      const event = await createEvent(eventData);
      
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

      setSuccessMessage('Мероприятие и участники успешно добавлены в систему');
      setShowSuccessModal(true);
      
      // Перенаправляем после закрытия модального окна
      setTimeout(() => {
        navigate('/manage-events');
      }, 3000);
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

  return (
    <div className="app-layout">
      <Sidebar activeItem="manage-events" userRole={user?.role} />
      <div className="main-content">
        <SmartTopBar />
        <div className="create-event-page">
          {/* Мобильный заголовок с кнопкой назад */}
          <div className="mobile-header">
            <button 
              className="back-button"
              onClick={() => navigate('/manage-events')}
            >
              <span className="back-icon">←</span>
              <span className="back-text">Назад</span>
            </button>
            <h1>Создать мероприятие</h1>
          </div>

          {/* Десктопный заголовок */}
          <div className="desktop-header">
            <div className="header-info">
              <h1>Создание мероприятия</h1>
              <p>Заполните информацию о новом мероприятии</p>
            </div>
            <button 
              className="btn-primary"
              onClick={() => navigate('/manage-events')}
            >
              ← К списку мероприятий
            </button>
          </div>

          <div className="create-event-content">
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
               
              </div>
            </div>

            {/* Выбор участников */}
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
                        onClick={() => setSelectedUsers([])}
                      >
                        Очистить выбор
                      </button>
                    )}
                    <button 
                    
                      className="btn-clear"
                      style={{width:"116px", color: 'black', borderColor: 'black' }}
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
                        onClick={() => setSelectedUsers([])}
                      >
                        Очистить выбор
                      </button>
                    )}
                    <button 
                    style={{width:"116px"}}
                      className="btn-select-all"
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
                        onClick={() => setSelectedGroups([])}
                      >
                        Очистить выбор
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
                        onClick={() => setSelectedCourses([])}
                      >
                        Очистить выбор
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

            {/* Ошибка участников */}
            {errors.participants && (
              <div className="error-message">
                <span className="error-text">{errors.participants}</span>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="create-actions">
              <button 
                className="btn-primary create-btn"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Создание мероприятия...' : 'Создать мероприятие'}
              </button>
              <button 
                className="btn-primary"
            style={{ backgroundColor: '#e40b0bff'}}
                onClick={() => navigate('/manage-events')}
                disabled={saving}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
        
        {/* Модальное окно успеха */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            navigate('/manage-events');
          }}
          title="Мероприятие создано!"
          message={successMessage}
        />
      </div>
    </div>
  );
}
