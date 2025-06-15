// src/pages/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }               from 'react-router-dom';
import Sidebar                        from '../components/Sidebar';
import Topbar                         from '../components/TopBar';
import axios                          from 'axios';
import '../styles/NotificationsPage.css';

const API_BASE = 'http://localhost:8080/api';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [title, setTitle]         = useState('');
  const [message, setMessage]     = useState('');
  const [recipientType, setRecipientType] = useState('all');

  const [groups, setGroups]       = useState([]);
  const [courses, setCourses]     = useState([]);
  const [users, setUsers]         = useState([]);

  const [groupSearch, setGroupSearch] = useState('');
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [showGroupSug, setShowGroupSug]     = useState(false);
  const [selectedGroup, setSelectedGroup]   = useState(null);

  const [courseSearch, setCourseSearch]     = useState('');
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [showCourseSug, setShowCourseSug]     = useState(false);
  const [selectedCourse, setSelectedCourse]   = useState(null);

  const [userSearch, setUserSearch]       = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserSug, setShowUserSug]     = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null);

  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    // Загрузка списка групп (берём res.data.objects)
    axios.get(`${API_BASE}/groups/`)
      .then(res => {
        const grpArray = Array.isArray(res.data.objects) ? res.data.objects : [];
        setGroups(grpArray);
      })
      .catch(err => {
        console.error('Не удалось загрузить группы', err);
        setGroups([]);
      });

    // Загрузка списка курсов (берём res.data.objects)
    axios.get(`${API_BASE}/courses/`)
      .then(res => {
        const crsArray = Array.isArray(res.data.objects) ? res.data.objects : [];
        setCourses(crsArray);
      })
      .catch(err => {
        console.error('Не удалось загрузить курсы', err);
        setCourses([]);
      });

    // Загрузка списка пользователей (предполагаем, что это массив)
    axios.get(`${API_BASE}/users/`)
      .then(res => {
        const usrArray = Array.isArray(res.data) ? res.data : [];
        setUsers(usrArray);
      })
      .catch(err => {
        console.error('Не удалось загрузить пользователей', err);
        setUsers([]);
      });
  }, []);

  useEffect(() => {
    setFilteredGroups(
      groups.filter(g =>
        g.name.toLowerCase().includes(groupSearch.toLowerCase())
      )
    );
  }, [groupSearch, groups]);

  useEffect(() => {
    setFilteredCourses(
      courses.filter(c =>
        c.name.toLowerCase().includes(courseSearch.toLowerCase())
      )
    );
  }, [courseSearch, courses]);

  useEffect(() => {
    setFilteredUsers(
      users.filter(u => {
        const uname = typeof u.username === 'string' ? u.username.toLowerCase() : '';
        const fullName = `${u.first_name || ''} ${u.surname || ''}`.trim().toLowerCase();
        const query = userSearch.toLowerCase();
        return uname.includes(query) || fullName.includes(query);
      })
    );
  }, [userSearch, users]);

  const resetSelections = () => {
    setSelectedGroup(null);
    setGroupSearch('');
    setSelectedCourse(null);
    setCourseSearch('');
    setSelectedUser(null);
    setUserSearch('');
  };

  const handleRecipientChange = e => {
    setRecipientType(e.target.value);
    resetSelections();
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!title.trim() || !message.trim()) {
      setError('Заполните заголовок и текст сообщения.');
      return;
    }

    let payload = { title, message, target: { type: recipientType } };

    if (recipientType === 'group') {
      if (!selectedGroup) {
        setError('Выберите группу.');
        return;
      }
      payload.target.group_id = selectedGroup.id;
    } else if (recipientType === 'course') {
      if (!selectedCourse) {
        setError('Выберите курс.');
        return;
      }
      payload.target.course_id = selectedCourse.id;
    } else if (recipientType === 'user') {
      if (!selectedUser) {
        setError('Выберите пользователя.');
        return;
      }
      payload.target.user_id = selectedUser.id;
    }

    try {
      await axios.post(`${API_BASE}/notifications/`, payload);
      setSuccess('Уведомление успешно отправлено.');
      setTitle('');
      setMessage('');
      resetSelections();
      setRecipientType('all');
    } catch (e) {
      console.error('Ошибка при отправке уведомления:', e);
      setError('Не удалось отправить уведомление.');
    }
  };

  const fullName = 'Администратор'; // заменить на контекст, если нужно

  return (
    <div className="manage-notifications app-layout">
      <Sidebar activeItem="notifications" userRole="admin" />
      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole="admin"
          notifications={0}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Создать уведомление</h1>

        <div className="block notifications-block">
          <div className="field">
            <label>Заголовок</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Введите заголовок"
            />
          </div>

          <div className="field field-full">
            <label>Текст сообщения</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Введите текст уведомления"
            />
          </div>

          <div className="field">
            <label>Кому отправить</label>
            <select
              value={recipientType}
              onChange={handleRecipientChange}
            >
              <option value="all">Всем пользователям</option>
              <option value="group">Группе</option>
              <option value="course">Курсу</option>
              <option value="user">Отдельному пользователю</option>
            </select>
          </div>

          {recipientType === 'group' && (
            <div className="field">
              <label>Выберите группу</label>
              <input
                type="text"
                value={groupSearch}
                onChange={e => {
                  setGroupSearch(e.target.value);
                  setSelectedGroup(null);
                  setError('');
                }}
                onFocus={() => setShowGroupSug(true)}
                onBlur={() => setTimeout(() => setShowGroupSug(false), 200)}
                placeholder="Поиск по названию группы"
              />
              {showGroupSug && filteredGroups.length > 0 && (
                <ul className="suggestions">
                  {filteredGroups.map(g => (
                    <li key={g.id} onClick={() => {
                      setSelectedGroup(g);
                      setGroupSearch(g.name);
                      setShowGroupSug(false);
                    }}>
                      {g.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {recipientType === 'course' && (
            <div className="field">
              <label>Выберите курс</label>
              <input
                type="text"
                value={courseSearch}
                onChange={e => {
                  setCourseSearch(e.target.value);
                  setSelectedCourse(null);
                  setError('');
                }}
                onFocus={() => setShowCourseSug(true)}
                onBlur={() => setTimeout(() => setShowCourseSug(false), 200)}
                placeholder="Поиск по названию курса"
              />
              {showCourseSug && filteredCourses.length > 0 && (
                <ul className="suggestions">
                  {filteredCourses.map(c => (
                    <li key={c.id} onClick={() => {
                      setSelectedCourse(c);
                      setCourseSearch(c.name);
                      setShowCourseSug(false);
                    }}>
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {recipientType === 'user' && (
            <div className="field">
              <label>Выберите пользователя</label>
              <input
                type="text"
                value={userSearch}
                onChange={e => {
                  setUserSearch(e.target.value);
                  setSelectedUser(null);
                  setError('');
                }}
                onFocus={() => setShowUserSug(true)}
                onBlur={() => setTimeout(() => setShowUserSug(false), 200)}
                placeholder="Поиск по username или ФИО"
              />
              {showUserSug && filteredUsers.length > 0 && (
                <ul className="suggestions">
                  {filteredUsers.map(u => (
                    <li key={u.id} onClick={() => {
                      setSelectedUser(u);
                      const displayName = typeof u.username === 'string'
                        ? u.username
                        : `${u.first_name} ${u.surname}`;
                      setUserSearch(displayName);
                      setShowUserSug(false);
                    }}>
                      {typeof u.username === 'string'
                        ? u.username
                        : `${u.first_name} ${u.surname}`} ({u.first_name} {u.surname})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}

          <div className="buttons-notif">
            <button type="button" className="btn-primary" onClick={handleSubmit}>
              Отправить уведомление
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
