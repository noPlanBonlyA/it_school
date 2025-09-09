// src/pages/NotificationPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NotificationPage.css';
import { 
  createNotificationForAllStudents, 
  createNotificationForStudent,
  createNotificationForGroup
} from '../services/notificationService';
import { getAllGroups } from '../services/groupService';
import api from '../api/axiosInstance';

export default function NotificationPage() {
  const { user } = useAuth();

  // Состояния формы
  const [message, setMessage] = useState('');
  const [sendType, setSendType] = useState('all'); // 'all', 'student', 'group'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  // Данные для выбора
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Состояния UI
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Функция для получения студентов
  const loadStudents = async (limit = 100, offset = 0) => {
    try {
      const response = await api.get('/students/', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('[NotificationPage] Error loading students:', error);
      throw error;
    }
  };

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Загружаем студентов и группы параллельно
        const [studentsResponse, groupsResponse] = await Promise.all([
          loadStudents(100, 0),
          getAllGroups(100, 0)
        ]);
        
        setStudents(studentsResponse.objects || []);
        setGroups(groupsResponse.objects || []);
        
        console.log('[NotificationPage] Data loaded:', {
          students: studentsResponse.objects?.length || 0,
          groups: groupsResponse.objects?.length || 0
        });
        
      } catch (error) {
        console.error('[NotificationPage] Error loading data:', error);
        alert('Ошибка загрузки данных: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Отправка уведомления
  const handleSendNotification = async () => {
    if (!message.trim()) {
      alert('Введите текст уведомления');
      return;
    }

    if (sendType === 'student' && !selectedStudentId) {
      alert('Выберите студента');
      return;
    }

    if (sendType === 'group' && !selectedGroupId) {
      alert('Выберите группу');
      return;
    }

    try {
      setSending(true);
      setResult(null);

      console.log('[NotificationPage] Sending notification:', {
        type: sendType,
        message: message,
        studentId: selectedStudentId,
        groupId: selectedGroupId
      });

      let response;

      switch (sendType) {
        case 'all':
          response = await createNotificationForAllStudents(message.trim());
          setResult({
            type: 'success',
            title: 'Уведомление отправлено всем студентам',
            details: `Успешно отправлено: ${response.successful}/${response.total}`,
            data: response
          });
          break;

        case 'student':
          response = await createNotificationForStudent(selectedStudentId, message.trim());
          const student = students.find(s => s.id === selectedStudentId);
          setResult({
            type: 'success',
            title: 'Уведомление отправлено студенту',
            details: `Отправлено: ${student?.user?.first_name || ''} ${student?.user?.surname || ''}`,
            data: response
          });
          break;

        case 'group':
          response = await createNotificationForGroup(selectedGroupId, message.trim());
          setResult({
            type: 'success',
            title: 'Уведомление отправлено группе',
            details: `Группа: ${response.groupName}, отправлено: ${response.successful}/${response.total}`,
            data: response
          });
          break;

        default:
          throw new Error('Неизвестный тип отправки');
      }

      // Очищаем форму после успешной отправки
      setMessage('');
      setSelectedStudentId('');
      setSelectedGroupId('');

    } catch (error) {
      console.error('[NotificationPage] Error sending notification:', error);
      setResult({
        type: 'error',
        title: 'Ошибка отправки уведомления',
        details: error.message,
        data: null
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="notification-app">
        <Sidebar activeItem="broadcast" userRole={user.role} />
        <div className="notification-main-content">
          <SmartTopBar pageTitle="Рассылка уведомлений" />
          <div className="loading-container">
            <div className="loading-text">Загрузка данных...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-app">
      <Sidebar activeItem="broadcast" userRole={user.role} />
      <div className="notification-main-content">
        <SmartTopBar pageTitle="Рассылка уведомлений" />

        <div className="notification-page-container">
          <div className="notification-content">
            <div className="notification-form-card">
              {/* Тип отправки */}
              <div className="form-section">
                <label className="form-label">
                  👥 Кому отправить:
                </label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="all"
                      checked={sendType === 'all'}
                      onChange={(e) => setSendType(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <span className="radio-label">📚 Всем студентам</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="student"
                      checked={sendType === 'student'}
                      onChange={(e) => setSendType(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <span className="radio-label">👤 Конкретному студенту</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="group"
                      checked={sendType === 'group'}
                      onChange={(e) => setSendType(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <span className="radio-label">👥 Группе</span>
                  </label>
                </div>
              </div>

              {/* Выбор студента */}
              {sendType === 'student' && (
                <div className="form-section">
                  <label className="form-label">
                    👤 Выберите студента:
                  </label>
                  <SearchableSelect
                    items={students}
                    value={selectedStudentId}
                    onChange={setSelectedStudentId}
                    placeholder="Поиск студента по имени или username..."
                    displayField="user.first_name"
                    valueField="id"
                    icon="👤"
                    noResultsText="Студенты не найдены"
                    renderItem={(student) => {
                      const fio = [student.user?.first_name, student.user?.surname].filter(Boolean).join(' ');
                      return (
                        <div className="student-item">
                          <div className="student-main">
                            {fio || student.user?.username || 'Без имени'}
                          </div>
                          {fio && student.user?.username && (
                            <div className="student-secondary">
                              @{student.user.username}
                            </div>
                          )}
                          {student.user?.email && (
                            <div className="student-email">
                              📧 {student.user.email}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  {students.length === 0 && (
                    <div className="form-help-text">
                      Студенты не найдены
                    </div>
                  )}
                </div>
              )}

              {/* Выбор группы */}
              {sendType === 'group' && (
                <div className="form-section">
                  <label className="form-label">
                    👥 Выберите группу:
                  </label>
                  <SearchableSelect
                    items={groups}
                    value={selectedGroupId}
                    onChange={setSelectedGroupId}
                    placeholder="Поиск группы по названию..."
                    displayField="name"
                    valueField="id"
                    icon="👥"
                    noResultsText="Группы не найдены"
                    renderItem={(group) => (
                      <div className="group-item">
                        <div className="group-main">
                          {group.name}
                        </div>
                        {group.description && (
                          <div className="group-secondary">
                            {group.description}
                          </div>
                        )}
                        <div className="group-meta">
                          {group.course_name && (
                            <span className="group-course">📚 {group.course_name}</span>
                          )}
                          {group.students_count !== undefined && (
                            <span className="group-students">👤 {group.students_count} студентов</span>
                          )}
                        </div>
                      </div>
                    )}
                  />
                  {groups.length === 0 && (
                    <div className="form-help-text">
                      Группы не найдены
                    </div>
                  )}
                </div>
              )}

              {/* Текст уведомления */}
              <div className="form-section">
                <label className="form-label">
                  💬 Текст уведомления:
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Введите текст уведомления..."
                  className="form-textarea"
                  rows={6}
                />
                <div className="form-help-text">
                  Символов: {message.length}
                </div>
              </div>

              {/* Кнопка отправки */}
              <button
                onClick={handleSendNotification}
                disabled={sending || !message.trim()}
                className="send-button"
              >
                {sending ? (
                  <span className="button-loading">
                    <span className="loading-spinner"></span>
                    Отправляем...
                  </span>
                ) : (
                  <span>🚀 Отправить уведомление</span>
                )}
              </button>

              {/* Результат отправки */}
              {result && (
                <div className={`result-card ${result.type === 'success' ? 'success' : 'error'}`}>
                  <div className="result-icon">
                    {result.type === 'success' ? '✅' : '❌'}
                  </div>
                  <div className="result-content">
                    <h3 className="result-title">{result.title}</h3>
                    <p className="result-message">{result.details}</p>
                    
                    {result.data && result.data.errors && result.data.errors.length > 0 && (
                      <details className="result-details">
                        <summary className="details-summary">
                          Ошибки отправки ({result.data.errors.length})
                        </summary>
                        <ul className="details-list">
                          {result.data.errors.map((error, index) => (
                            <li key={index}>
                              {error.studentName}: {error.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {result.data && result.data.notifications && result.data.notifications.length > 0 && (
                      <details className="result-details">
                        <summary className="details-summary">
                          Успешно отправлено ({result.data.notifications.length})
                        </summary>
                        <ul className="details-list">
                          {result.data.notifications.slice(0, 10).map((notification, index) => (
                            <li key={index}>
                              {notification.studentName}
                            </li>
                          ))}
                          {result.data.notifications.length > 10 && (
                            <li>... и ещё {result.data.notifications.length - 10}</li>
                          )}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Статистика */}
              <div className="stats-card">
                <h3 className="stats-title">📊 Статистика</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Студентов в системе:</span>
                    <span className="stat-value">{students.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Групп в системе:</span>
                    <span className="stat-value">{groups.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
