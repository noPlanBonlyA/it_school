/*  src/components/Schedule.jsx
    Виджет расписания с кнопками для преподавателя     */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Schedule.css';
import api from '../api/axiosInstance';
import { getUserScheduleOptimized, updateLessonGroup } from '../services/scheduleService';

export default function Schedule({ events, onSelect, selectedEvent, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conductingLesson, setConductingLesson] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentGrades, setStudentGrades] = useState({});
  const [studentComments, setStudentComments] = useState({});
  const [homeworkData, setHomeworkData] = useState({ name: '', file: null });
  const [uploadingHomework, setUploadingHomework] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  if (!events || events.length === 0) {
    return (
      <div className="schedule-empty">
        <div className="empty-icon">📅</div>
        <p>На этот день занятий нет</p>
        <span className="empty-subtitle">Отдыхайте или повторяйте материал</span>
      </div>
    );
  }

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getTimeUntil = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const lessonTime = new Date(dateString);
    const diffMs = lessonTime - now;
    
    if (diffMs < 0) return 'Прошло';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `через ${diffHours}ч ${diffMinutes}м`;
    } else if (diffMinutes > 0) {
      return `через ${diffMinutes}м`;
    } else {
      return 'сейчас';
    }
  };

  const getStatusClass = (event) => {
    if (event.is_opened) return 'opened';
    const now = new Date();
    const lessonTime = new Date(event.start_datetime || event.start);
    return now < lessonTime ? 'scheduled' : 'closed';
  };

  const getStatusText = (event) => {
    if (event.is_opened) return 'Открыт';
    const now = new Date();
    const lessonTime = new Date(event.start_datetime || event.start);
    return now < lessonTime ? 'Запланирован' : 'Закрыт';
  };

  // НОВОЕ: Функция для открытия/закрытия урока
  const handleToggleLessonAccess = async (event) => {
    try {
      setToggleLoading(true);
      
      // ДЕБАГ: Проверяем структуру event
      console.log('[Schedule] DEBUG - Full event object:', event);
      console.log('[Schedule] DEBUG - User role:', user.role);
      console.log('[Schedule] DEBUG - Event fields:', {
        id: event.id,
        lesson_id: event.lesson_id,
        group_id: event.group_id,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        is_opened: event.is_opened,
        auditorium: event.auditorium
      });
      
      // Проверяем права пользователя
      if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'superadmin') {
        alert('У вас нет прав для изменения доступа к уроку');
        return;
      }
      
      // Проверяем наличие обязательных полей
      if (!event.id || !event.lesson_id || !event.group_id) {
        console.error('[Schedule] Missing required fields:', {
          id: event.id,
          lesson_id: event.lesson_id,
          group_id: event.group_id
        });
        alert('Не хватает данных для обновления урока');
        return;
      }
      
      const newOpenedState = !event.is_opened;
      
      // Формируем payload с проверкой типов
      const updatePayload = {
        lesson_id: String(event.lesson_id),
        group_id: String(event.group_id),
        start_datetime: event.start_datetime || new Date().toISOString(),
        end_datetime: event.end_datetime || new Date().toISOString(),
        is_opened: Boolean(newOpenedState),
        auditorium: String(event.auditorium || ""),
        id: String(event.id)
      };
      
      console.log('[Schedule] DEBUG - Update payload:', updatePayload);
      console.log('[Schedule] DEBUG - API endpoint:', `/courses/lesson-group/${event.id}`);
      
      // Обновляем lesson-group через API
      const response = await api.put(`/courses/lesson-group/${event.id}`, updatePayload);
      
      console.log('[Schedule] Lesson access toggled successfully:', response.data);
      
      alert(newOpenedState ? 'Урок открыт для студентов!' : 'Урок закрыт для студентов');
      
      // Перезагружаем страницу для обновления данных
      window.location.reload();
      
    } catch (error) {
      console.error('[Schedule] Error toggling lesson access:', error);
      console.error('[Schedule] Error response:', error.response);
      console.error('[Schedule] Error data:', error.response?.data);
      
      // Детальная обработка ошибок
      if (error.response?.status === 403) {
        alert('У вас нет прав для изменения доступа к уроку. Возможные причины:\n- Вы не являетесь преподавателем этого урока\n- У вас недостаточно прав в системе');
      } else if (error.response?.status === 404) {
        alert('Урок не найден или был удален');
      } else if (error.response?.status === 422) {
        alert('Неверные данные для обновления урока. Проверьте консоль для деталей.');
        console.error('[Schedule] Validation details:', error.response?.data?.detail);
      } else {
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.message || 
                            'Ошибка изменения доступа к уроку';
        alert(`Ошибка: ${errorMessage}`);
      }
    } finally {
      setToggleLoading(false);
    }
  };

  // Функция для загрузки студентов урока
  const loadLessonStudents = async (lessonGroupId) => {
    try {
      setLoadingStudents(true);
      console.log('[Schedule] Loading students for lesson group:', lessonGroupId);
      
      const response = await api.get('/courses/lesson-student', {
        params: { lesson_group_id: lessonGroupId }
      });
      
      console.log('[Schedule] Students loaded:', response.data);
      setStudents(response.data || []);
      
      // Инициализируем состояния оценок и комментариев
      const initialGrades = {};
      const initialComments = {};
      
      response.data.forEach(student => {
        initialGrades[student.id] = {
          coins_for_visit: student.coins_for_visit || 0,
          grade_for_visit: student.grade_for_visit || 0,
          is_visited: student.is_visited || false,
          is_excused_absence: student.is_excused_absence || false
        };
        initialComments[student.id] = '';
      });
      
      setStudentGrades(initialGrades);
      setStudentComments(initialComments);
      
    } catch (error) {
      console.error('[Schedule] Error loading students:', error);
      alert('Ошибка загрузки списка студентов');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Обработчик "Провести урок"
  const handleConductLesson = async (event) => {
    console.log('[Schedule] Conducting lesson:', event);
    
    // Находим lesson_group_id из расписания
    const lessonGroupId = event.id; // ID из расписания - это lesson_group_id
    
    setConductingLesson({ ...event, lesson_group_id: lessonGroupId });
    await loadLessonStudents(lessonGroupId);
  };

  // Обработчик "Открыть урок" для навигации к уроку
  const handleOpenLessonPage = (event) => {
    console.log('[Schedule] Opening lesson page for:', event);
    
    // Навигация к уроку
    if (event.course_id && event.lesson_id) {
      if (user.role === 'teacher') {
        navigate(`/courses/${event.course_id}/teacher/lessons/${event.lesson_id}`);
      } else if (user.role === 'student') {
        navigate(`/courses/${event.course_id}/lessons/${event.lesson_id}`);
      }
    } else {
      alert('Не удалось определить курс и урок для перехода');
    }
  };

  // Сохранение оценок и комментариев
  const handleSaveGrades = async () => {
    try {
      console.log('[Schedule] Saving grades and comments...');
      
      for (const student of students) {
        const grades = studentGrades[student.id];
        const comment = studentComments[student.id];
        
        if (!grades) continue;
        
        // Обновляем данные студента урока
        const updateData = {
          student_id: student.student_id,
          lesson_group_id: student.lesson_group_id,
          is_visited: grades.is_visited,
          is_excused_absence: grades.is_excused_absence,
          coins_for_visit: parseInt(grades.coins_for_visit) || 0,
          grade_for_visit: parseInt(grades.grade_for_visit) || 0,
          is_sent_homework: student.is_sent_homework || false,
          is_graded_homework: student.is_graded_homework || false,
          coins_for_homework: student.coins_for_homework || 0,
          grade_for_homework: student.grade_for_homework || 0
        };
        
        await api.put(`/courses/lesson-student/${student.id}`, updateData);
        
        // Если есть комментарий, отправляем уведомление
        if (comment && comment.trim()) {
          try {
            const studentProfileId = student.student?.id;
            if (studentProfileId) {
              await api.post('/notifications/', 
                { content: `Комментарий к уроку "${conductingLesson.lesson_name}": ${comment.trim()}` },
                { 
                  params: { 
                    recipient_type: 'student', 
                    recipient_id: studentProfileId 
                  } 
                }
              );
            }
          } catch (notifError) {
            console.error('[Schedule] Error sending notification:', notifError);
          }
        }
      }
      
      alert('Данные урока сохранены!');
      setConductingLesson(null);
      setStudents([]);
      
    } catch (error) {
      console.error('[Schedule] Error saving grades:', error);
      alert('Ошибка сохранения данных');
    }
  };

  // Обработка изменения оценок
  const handleGradeChange = (studentId, field, value) => {
    setStudentGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // Обработка загрузки домашнего задания
  const handleHomeworkUpload = async () => {
    if (!homeworkData.name || !homeworkData.file) {
      alert('Заполните название и выберите файл');
      return;
    }
    
    try {
      setUploadingHomework(true);
      
      const formData = new FormData();
      formData.append('homework_data', JSON.stringify({
        name: homeworkData.name
      }));
      formData.append('homework_file', homeworkData.file);
      
      // Загружаем домашнее задание через API
      await api.post(
        `/courses/${conductingLesson.course_id}/lessons/${conductingLesson.lesson_id}/homework`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      alert('Домашнее задание загружено!');
      setHomeworkData({ name: '', file: null });
      
    } catch (error) {
      console.error('[Schedule] Error uploading homework:', error);
      alert('Ошибка загрузки домашнего задания');
    } finally {
      setUploadingHomework(false);
    }
  };

  // Модальное окно проведения урока
  if (conductingLesson) {
    return (
      <div className="modal-overlay">
        <div className="modal-content large">
          <div className="modal-header">
            <h2>Провести урок: {conductingLesson.lesson_name}</h2>
            <button className="close-modal" onClick={() => setConductingLesson(null)}>×</button>
          </div>
          
          <div className="modal-body">
            {loadingStudents ? (
              <div className="loading-container">
                <div className="loader"></div>
                <p>Загрузка списка студентов...</p>
              </div>
            ) : (
              <div className="conduct-lesson-content">
                {/* Секция домашнего задания */}
                <div className="homework-upload-section">
                  <h3>Загрузить домашнее задание</h3>
                  <div className="homework-form">
                    <input
                      type="text"
                      placeholder="Название домашнего задания"
                      value={homeworkData.name}
                      onChange={(e) => setHomeworkData(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      type="file"
                      onChange={(e) => setHomeworkData(prev => ({ ...prev, file: e.target.files[0] }))}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    <button 
                      onClick={handleHomeworkUpload}
                      disabled={uploadingHomework || !homeworkData.name || !homeworkData.file}
                      className="btn-secondary"
                    >
                      {uploadingHomework ? 'Загрузка...' : 'Загрузить ДЗ'}
                    </button>
                  </div>
                </div>

                {/* Список студентов */}
                <div className="students-grades-section">
                  <h3>Студенты группы ({students.length})</h3>
                  <div className="students-list">
                    {students.map(student => (
                      <div key={student.id} className="student-grade-item">
                        <div className="student-info">
                          <h4>{student.student?.user?.first_name} {student.student?.user?.surname}</h4>
                        </div>
                        
                        <div className="grade-controls">
                          <label>
                            <input
                              type="checkbox"
                              checked={studentGrades[student.id]?.is_visited || false}
                              onChange={(e) => handleGradeChange(student.id, 'is_visited', e.target.checked)}
                            />
                            Присутствует
                          </label>
                          
                          <label>
                            <input
                              type="checkbox"
                              checked={studentGrades[student.id]?.is_excused_absence || false}
                              onChange={(e) => handleGradeChange(student.id, 'is_excused_absence', e.target.checked)}
                            />
                            Уважительная причина
                          </label>
                          
                          <label>
                            Баллы за посещение:
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={studentGrades[student.id]?.coins_for_visit || 0}
                              onChange={(e) => handleGradeChange(student.id, 'coins_for_visit', e.target.value)}
                            />
                          </label>
                          
                          <label>
                            Оценка за урок:
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={studentGrades[student.id]?.grade_for_visit || 0}
                              onChange={(e) => handleGradeChange(student.id, 'grade_for_visit', e.target.value)}
                            />
                          </label>
                          
                          <label>
                            Комментарий:
                            <textarea
                              placeholder="Комментарий студенту (будет отправлен как уведомление)"
                              value={studentComments[student.id] || ''}
                              onChange={(e) => setStudentComments(prev => ({ ...prev, [student.id]: e.target.value }))}
                              rows={2}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button onClick={handleSaveGrades} className="btn-primary">
                    Сохранить результаты урока
                  </button>
                  <button onClick={() => setConductingLesson(null)} className="btn-secondary">
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      {events.map((event, index) => (
        <div 
          key={event.id || index} 
          className={`schedule-item ${getStatusClass(event)}`}
          onClick={() => onSelect && onSelect(event)}
        >
          <div className="schedule-time-block">
            <div className="schedule-date">
              {formatDate(event.start_datetime || event.start)}
            </div>
            <div className="schedule-time">
              {formatTime(event.start_datetime || event.start)}
            </div>
            <div className="schedule-countdown">
              {getTimeUntil(event.start_datetime || event.start)}
            </div>
          </div>
          
          <div className="schedule-content">
            <div className="schedule-lesson-name">
              {event.lesson_name}
            </div>
            <div className="schedule-course-name">
              {event.course_name}
            </div>
            {event.group_name && (
              <div className="schedule-group">
                👥 {event.group_name}
              </div>
            )}
            {event.teacher_name && (
              <div className="schedule-teacher">
                👩‍🏫 {event.teacher_name}
              </div>
            )}
            {event.auditorium && (
              <div className="schedule-auditorium">
                📍 {event.auditorium}
              </div>
            )}
          </div>
          
          <div className="schedule-status">
            <div className={`status-indicator ${getStatusClass(event)}`}>
              {event.is_opened ? '🟢' : new Date() < new Date(event.start_datetime || event.start) ? '🟡' : '🔴'}
            </div>
            <div className="status-text">
              {getStatusText(event)}
            </div>
          </div>
        </div>
      ))}

      {/* Виджет с подробностями выбранного события */}
      {selectedEvent && (
        <div className="event-details">
          <button className="close-btn" onClick={onClose}>×</button>
          
          <div className="event-header">
            <h2>{selectedEvent.lesson_name}</h2>
            <span className={`status-badge ${getStatusClass(selectedEvent)}`}>
              {getStatusText(selectedEvent)}
            </span>
          </div>

          <div className="event-info">
            <div className="info-item">
              <strong>Курс:</strong>
              <span>{selectedEvent.course_name}</span>
            </div>
            <div className="info-item">
              <strong>Время:</strong>
              <span>
                {formatTime(selectedEvent.start_datetime)} - {formatTime(selectedEvent.end_datetime)}
              </span>
            </div>
            <div className="info-item">
              <strong>Аудитория:</strong>
              <span>{selectedEvent.auditorium || 'Не указана'}</span>
            </div>
            {selectedEvent.group_name && (
              <div className="info-item">
                <strong>Группа:</strong>
                <span>{selectedEvent.group_name}</span>
              </div>
            )}
            {selectedEvent.teacher_name && (
              <div className="info-item">
                <strong>Преподаватель:</strong>
                <span>{selectedEvent.teacher_name}</span>
              </div>
            )}
            <div className="info-item">
              <strong>Статус доступа:</strong>
              <span style={{ color: selectedEvent.is_opened ? '#22c55e' : '#ef4444' }}>
                {selectedEvent.is_opened ? 'Открыт для студентов' : 'Закрыт для студентов'}
              </span>
            </div>
          </div>

          {/* Кнопки действий для преподавателя */}
          {user.role === 'teacher' && (
            <div className="event-actions">
              <button 
                onClick={() => handleOpenLessonPage(selectedEvent)}
                className="btn-primary"
              >
                📖 Перейти к уроку
              </button>
              <button 
                onClick={() => handleToggleLessonAccess(selectedEvent)}
                className="btn-primary"
                disabled={toggleLoading}
                style={{ 
                  backgroundColor: selectedEvent.is_opened ? '#ef4444' : '#22c55e'
                }}
              >
                {toggleLoading ? '⏳' : selectedEvent.is_opened ? '🔒 Закрыть урок' : '🔓 Открыть урок'}
              </button>
              <button 
                onClick={() => handleConductLesson(selectedEvent)}
                className="btn-primary"
              >
                🎯 Провести урок
              </button>
            </div>
          )}

          {/* Кнопка для студента - только если урок открыт */}
          {user.role === 'student' && selectedEvent.is_opened && (
            <div className="event-actions">
              <button 
                onClick={() => handleOpenLessonPage(selectedEvent)}
                className="btn-primary"
              >
                📖 Открыть урок
              </button>
            </div>
          )}

          {/* Сообщение для студента если урок закрыт */}
          {user.role === 'student' && !selectedEvent.is_opened && (
            <div className="event-actions">
              <p style={{ 
                color: '#6b7280', 
                fontStyle: 'italic', 
                textAlign: 'center',
                margin: 0
              }}>
                Урок пока закрыт преподавателем
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
