// src/pages/NotificationPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';

import Sidebar   from '../components/Sidebar';
import Topbar    from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';
import api        from '../api/axiosInstance';

import '../styles/NotificationsPage.css';

export default function NotificationPage() {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  // текст уведомления
  const [content, setContent] = useState('');

  // тип и цель рассылки
  const [recipientType, setRecipientType] = useState('all'); // all, group, course, student
  const [targetId, setTargetId]           = useState('');

  // справочники
  const [groups, setGroups]   = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  // ui
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // ─── загрузка справочников ─────────────────────────
  useEffect(() => {
    // группы
    api.get('/groups/', { params:{ limit:100, offset:0 } })
      .then(r => setGroups(r.data.objects || []))
      .catch(() => {/* silent */});

    // курсы
    api.get('/courses/', { params:{ limit:100, offset:0 } })
      .then(r => setCourses(r.data.objects || []))
      .catch(() => {/* silent */});

    // студенты (пользователи с ролью student)
    api.get('/users/', {
      params:{ role:'student', limit:100, offset:0 }
    })
      .then(r => setStudents(r.data.objects || []))
      .catch(() => {/* silent */});
  }, []);

  // ─── отправка уведомления ──────────────────────────
  const handleSubmit = async () => {
    setError(''); 
    setSuccess('');

    if (!content.trim()) {
      setError('Текст уведомления не может быть пустым.');
      return;
    }

    try {
      if (recipientType === 'all') {
        // всем сразу
        await api.post('/notifications/', { content }, {
          params:{
            recipient_type: 'group',
            recipient_id:   'all',
            create_notification_use_case: 'createNotificationUseCase'
          }
        });
      }
      else if (recipientType === 'group') {
        if (!targetId) { setError('Выберите группу.'); return; }
        await api.post('/notifications/', { content }, {
          params:{
            recipient_type: 'group',
            recipient_id:   targetId,
            create_notification_use_case: 'createNotificationUseCase'
          }
        });
      }
      else if (recipientType === 'student') {
        if (!targetId) { setError('Выберите студента.'); return; }
        await api.post('/notifications/', { content }, {
          params:{
            recipient_type: 'student',
            recipient_id:   targetId,
            create_notification_use_case: 'createNotificationUseCase'
          }
        });
      }
      else if (recipientType === 'course') {
        if (!targetId) { setError('Выберите курс.'); return; }

        // 1) получить все группы
        const { data: grPage } = await api.get('/groups/', {
          params:{ limit:100, offset:0 }
        });
        const brief = grPage.objects || [];

        // 2) получить детали у каждой группы
        const details = await Promise.all(
          brief.map(g =>
            api.get(`/groups/${g.id}`)
               .then(r => r.data)
               .catch(() => null)
          )
        );

        // 3) отфильтровать группы, где есть наш курс
        const courseGroups = details.filter(g =>
          g && Array.isArray(g.courses) &&
          g.courses.some(c => c.id === targetId)
        );

        // 4) отправить одно уведомление на каждую группу
        await Promise.all(courseGroups.map(g =>
          api.post('/notifications/', { content }, {
            params:{
              recipient_type: 'group',
              recipient_id:   g.id,
              create_notification_use_case: 'createNotificationUseCase'
            }
          })
        ));
      }

      setSuccess('Уведомление(я) успешно отправлены.');
      setContent('');
      setRecipientType('all');
      setTargetId('');
    } catch (e) {
      console.error(e);
      setError('Ошибка при отправке. Проверьте консоль.');
    }
  };

  return (
    <div className="manage-notifications app-layout">
      <Sidebar activeItem="notifications" userRole={user.role}/>
      <div className="main-content">
        <Topbar userName={`${user.first_name} ${user.surname}`}
                userRole={user.role}
                onProfileClick={() => navigate('/profile')} />

        <h1>Рассылка уведомлений</h1>
        <div className="block notifications-block">

          <div className="field">
            <label>Текст уведомления</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Введите сообщение..."
            />
          </div>

          <div className="field">
            <label>Кому отправить</label>
            <select
              value={recipientType}
              onChange={e => {
                setRecipientType(e.target.value);
                setTargetId('');
                setError('');
                setSuccess('');
              }}
            >
              <option value="all">Всем пользователям</option>
              <option value="group">Конкретной группе</option>
              <option value="course">Всем студентам курса</option>
              <option value="student">Конкретному студенту</option>
            </select>
          </div>

          {recipientType === 'group' && (
            <div className="field">
              <label>Группа</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
              >
                <option value="">— выберите группу —</option>
                {groups.map(g =>
                  <option key={g.id} value={g.id}>{g.name}</option>
                )}
              </select>
            </div>
          )}

          {recipientType === 'course' && (
            <div className="field">
              <label>Курс</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
              >
                <option value="">— выберите курс —</option>
                {courses.map(c =>
                  <option key={c.id} value={c.id}>{c.name}</option>
                )}
              </select>
            </div>
          )}

          {recipientType === 'student' && (
            <div className="field">
              <label>Студент</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
              >
                <option value="">— выберите студента —</option>
                {students.map(u =>
                  <option key={u.id} value={u.id}>
                    {u.username} — {u.first_name} {u.surname}
                  </option>
                )}
              </select>
            </div>
          )}

          {error   && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}

          <div className="buttons-notif">
            <button className="btn-primary" onClick={handleSubmit}>
              Отправить уведомление
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
