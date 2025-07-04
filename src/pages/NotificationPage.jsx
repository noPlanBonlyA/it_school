// src/pages/NotificationPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import { useAuth } from '../contexts/AuthContext';
import { 
  createNotificationForAllStudents, 
  createNotificationForStudent,
  createNotificationForGroup,
  debugAllStudents
} from '../services/notificationService';
import { getAllGroups } from '../services/groupService';
import api from '../api/axiosInstance';

export default function NotificationPage() {
  const navigate = useNavigate();
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

  // Отладочная функция
  const handleDebugStudents = async () => {
    try {
      const students = await debugAllStudents();
      console.log('[NotificationPage] Debug - all students:', students);
      alert(`Найдено студентов: ${students.length}. Смотрите консоль для деталей.`);
    } catch (error) {
      console.error('[NotificationPage] Debug error:', error);
      alert('Ошибка отладки: ' + error.message);
    }
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="broadcast" userRole={user.role} />
        <div className="main-content">
          <SmartTopBar pageTitle="Рассылка уведомлений" />
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div>Загрузка данных...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="broadcast" userRole={user.role} />
      <div className="main-content">
        <SmartTopBar pageTitle="Рассылка уведомлений" />

        <div style={{ padding: '24px', maxWidth: '800px' }}>
          {/* Убираем дублирующий заголовок, так как он теперь в TopBar */}

          {/* Отладочная кнопка */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleDebugStudents}
              style={{
                padding: '8px 16px',
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔍 Отладка студентов
            </button>
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            
            {/* Тип отправки */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Кому отправить:
              </label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    value="all"
                    checked={sendType === 'all'}
                    onChange={(e) => setSendType(e.target.value)}
                  />
                  Всем студентам
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    value="student"
                    checked={sendType === 'student'}
                    onChange={(e) => setSendType(e.target.value)}
                  />
                  Конкретному студенту
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    value="group"
                    checked={sendType === 'group'}
                    onChange={(e) => setSendType(e.target.value)}
                  />
                  Группе
                </label>
              </div>
            </div>

            {/* Выбор студента */}
            {sendType === 'student' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Выберите студента:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">-- Выберите студента --</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {`${student.user?.first_name || ''} ${student.user?.surname || ''}`.trim() || student.user?.username || 'Без имени'}
                      {student.user?.username && ` (${student.user.username})`}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Студенты не найдены
                  </div>
                )}
              </div>
            )}

            {/* Выбор группы */}
            {sendType === 'group' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Выберите группу:
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">-- Выберите группу --</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Группы не найдены
                  </div>
                )}
              </div>
            )}

            {/* Текст уведомления */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Текст уведомления:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Введите текст уведомления..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Символов: {message.length}
              </div>
            </div>

            {/* Кнопка отправки */}
            <button
              onClick={handleSendNotification}
              disabled={sending || !message.trim()}
              style={{
                padding: '12px 24px',
                background: sending ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: sending ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              {sending ? 'Отправка...' : 'Отправить уведомление'}
            </button>

            {/* Результат отправки */}
            {result && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                borderRadius: '4px',
                background: result.type === 'success' ? '#d4edda' : '#f8d7da',
                border: `1px solid ${result.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                color: result.type === 'success' ? '#155724' : '#721c24'
              }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{result.title}</h4>
                <p style={{ margin: '0 0 8px 0' }}>{result.details}</p>
                
                {result.data && result.data.errors && result.data.errors.length > 0 && (
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                      Ошибки отправки ({result.data.errors.length})
                    </summary>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {result.data.errors.map((error, index) => (
                        <li key={index}>
                          {error.studentName}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {result.data && result.data.notifications && result.data.notifications.length > 0 && (
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                      Успешно отправлено ({result.data.notifications.length})
                    </summary>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
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
            )}

            {/* Статистика */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Статистика:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <strong>Студентов в системе:</strong> {students.length}
                </div>
                <div>
                  <strong>Групп в системе:</strong> {groups.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
