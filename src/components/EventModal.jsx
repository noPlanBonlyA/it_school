import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { createLessonCoinsHistory } from '../services/coinHistoryService';
import '../styles/EventModal.css';

export default function EventModal({ event, onClose, userRole }) {
  const navigate = useNavigate();
  
  // Состояния для проведения урока
  const [conductingLesson, setConductingLesson] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentGrades, setStudentGrades] = useState({});
  const [studentComments, setStudentComments] = useState({});
  const [homeworkData, setHomeworkData] = useState({ 
    name: '', 
    file: null, 
    textContent: '' 
  });
  const [uploadingHomework, setUploadingHomework] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  
  if (!event) return null;

  // Функция для загрузки студентов урока
  const loadLessonStudents = async (lessonGroupId) => {
    try {
      setLoadingStudents(true);
      console.log('[EventModal] Loading students for lesson group:', lessonGroupId);
      
      const response = await api.get('/courses/lesson-student', {
        params: { lesson_group_id: lessonGroupId }
      });
      
      console.log('[EventModal] Students loaded:', response.data);
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
      console.error('[EventModal] Error loading students:', error);
      alert('Ошибка загрузки списка студентов');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Обработчик "Провести урок"
  const handleConductLesson = async (event) => {
    console.log('[EventModal] Conducting lesson:', event);
    
    // Получаем course_id если его нет
    let courseId = event.course_id;
    
    if (!courseId && event.lesson_id) {
      try {
        console.log('[EventModal] Course ID missing, trying to get from full schedule...');
        const scheduleResponse = await api.get('/schedule/');
        const scheduleData = scheduleResponse.data;
        
        const matchingEvent = scheduleData.find(item => 
          item.id === event.id || 
          (item.lesson_id === event.lesson_id && item.group_id === event.group_id)
        );
        
        if (matchingEvent && matchingEvent.course_id) {
          courseId = matchingEvent.course_id;
          console.log('[EventModal] Retrieved course_id from full schedule:', courseId);
        }
      } catch (scheduleError) {
        console.error('[EventModal] Error getting course_id from schedule:', scheduleError);
      }
    }
    
    // Проверяем наличие обязательных полей
    if (!courseId || !event.lesson_id) {
      console.error('[EventModal] Missing course_id or lesson_id:', {
        course_id: courseId,
        lesson_id: event.lesson_id,
        originalEvent: event
      });
      alert('Ошибка: не удалось определить курс или урок. Обратитесь к администратору.');
      return;
    }
    
    // Находим lesson_group_id из расписания
    const lessonGroupId = event.id; // ID из расписания - это lesson_group_id
    
    // Обновляем событие с правильным course_id
    const updatedEvent = { ...event, course_id: courseId };
    
    setConductingLesson({ ...updatedEvent, lesson_group_id: lessonGroupId });
    await loadLessonStudents(lessonGroupId);
  };

  // Функция для открытия/закрытия урока
  const handleToggleLessonAccess = async () => {
    try {
      setToggleLoading(true);
      
      // Проверяем права пользователя
      if (userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'superadmin') {
        alert('У вас нет прав для изменения доступа к уроку');
        return;
      }
      
      // Проверяем наличие обязательных полей
      if (!event.id || !event.lesson_id || !event.group_id) {
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
      
      // Обновляем lesson-group через API
      const response = await api.put(`/courses/lesson-group/${event.id}`, updatePayload);
      
      alert(newOpenedState ? 'Урок открыт для студентов!' : 'Урок закрыт для студентов');
      
      // Перезагружаем страницу для обновления данных
      window.location.reload();
      
    } catch (error) {
      console.error('Error toggling lesson access:', error);
      
      if (error.response?.status === 403) {
        alert('У вас нет прав для изменения доступа к уроку');
      } else if (error.response?.status === 404) {
        alert('Урок не найден или был удален');
      } else if (error.response?.status === 422) {
        alert('Неверные данные для обновления урока');
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

  // Сохранение оценок и комментариев
  const handleSaveGrades = async () => {
    try {
      console.log('[EventModal] Saving grades and comments...');
      
      for (const student of students) {
        const grades = studentGrades[student.id];
        const comment = studentComments[student.id];
        
        if (!grades) continue;
        
        // Обновляем данные студента урока
        const updateData = {
          student_id: student.student_id,
          lesson_group_id: student.lesson_group_id,
          is_visited: Boolean(grades.is_visited),
          is_excused_absence: Boolean(grades.is_excused_absence),
          is_compensated_skip: Boolean(student.is_compensated_skip || false),
          coins_for_visit: Number(grades.coins_for_visit) || 0,
          grade_for_visit: Number(grades.grade_for_visit) || 0,
          is_sent_homework: Boolean(student.is_sent_homework),
          is_graded_homework: Boolean(student.is_graded_homework),
          coins_for_homework: Number(student.coins_for_homework) || 0,
          grade_for_homework: Number(student.grade_for_homework) || 0,
          id: student.id
        };
        
        console.log('[EventModal] Updating lesson student with data:', updateData);
        
        const response = await api.put(`/courses/lesson-student/${student.id}`, updateData);
        console.log('[EventModal] Lesson student updated successfully:', response.data);
        
        // Создаем записи в истории поинтов, если начислены монеты
        if ((updateData.coins_for_visit > 0 || updateData.coins_for_homework > 0) && student.student?.user_id) {
          try {
            await createLessonCoinsHistory(
              student.student.user_id,
              {
                coins_for_visit: updateData.coins_for_visit,
                coins_for_homework: updateData.coins_for_homework
              },
              {
                lesson_name: conductingLesson?.lesson_name || 'Урок',
                course_name: conductingLesson?.course_name
              },
              student.student?.id
            );
            console.log('[EventModal] Coins history records created for student:', student.student.user_id);
          } catch (historyError) {
            console.warn('[EventModal] Failed to create coins history:', historyError);
          }
        }
        
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
            console.error('[EventModal] Error sending notification:', notifError);
          }
        }
      }
      
      alert('Данные урока сохранены!');
      setConductingLesson(null);
      setStudents([]);
      
    } catch (error) {
      console.error('[EventModal] Error saving grades:', error);
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
    if (!homeworkData.name || (!homeworkData.file && !homeworkData.textContent)) {
      alert('Заполните название и выберите файл или введите текстовое задание');
      return;
    }
    
    // Проверяем наличие обязательных данных урока
    if (!conductingLesson.course_id || !conductingLesson.lesson_id) {
      console.error('[EventModal] Missing lesson data for homework upload:', {
        course_id: conductingLesson.course_id,
        lesson_id: conductingLesson.lesson_id,
        conductingLesson
      });
      alert('Ошибка: не удалось определить курс или урок. Попробуйте заново открыть урок.');
      return;
    }
    
    try {
      setUploadingHomework(true);
      console.log('[EventModal] Uploading homework with:', {
        course_id: conductingLesson.course_id,
        lesson_id: conductingLesson.lesson_id,
        name: homeworkData.name,
        hasText: !!homeworkData.textContent,
        hasFile: !!homeworkData.file
      });
      
      // Загружаем в правильном порядке: сначала текст, потом файл
      const hasText = homeworkData.textContent?.trim();
      const hasFile = homeworkData.file;

      try {
        // 1. Если есть текст - всегда загружаем его первым как основное ДЗ
        if (hasText) {
          const textEndpoint = `/courses/${conductingLesson.course_id}/lessons/${conductingLesson.lesson_id}/homework-material-text`;
          console.log('[EventModal] Text homework endpoint:', textEndpoint);
          
          const textPayload = {
            name: homeworkData.name,
            html_text: hasText
          };
          
          console.log('[EventModal] Uploading text homework:', textPayload);
          
          await api.post(textEndpoint, textPayload);
          console.log('[EventModal] Text homework uploaded successfully');
        }
        
        // 2. Если есть файл - загружаем его отдельно
        if (hasFile) {
          const fileEndpoint = `/courses/${conductingLesson.course_id}/lessons/${conductingLesson.lesson_id}/homework-material`;
          console.log('[EventModal] File homework endpoint:', fileEndpoint);
          
          const formData = new FormData();
          formData.append('homework_material_name', homeworkData.name);
          formData.append('homework_material_file', homeworkData.file);
          
          console.log('[EventModal] Uploading file homework');
          
          await api.post(fileEndpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          console.log('[EventModal] File homework uploaded successfully');
        }
        
        // Показываем результат
        if (hasText && hasFile) {
          alert('Домашнее задание загружено: текст + файл для скачивания!');
        } else if (hasText) {
          alert('Текстовое домашнее задание загружено!');
        } else if (hasFile) {
          alert('Файловое домашнее задание загружено!');
        }
        
        // Очищаем форму после успешной загрузки
        setHomeworkData({ name: '', file: null, textContent: '' });
        
      } catch (error) {
        console.error('[EventModal] Error uploading homework:', error);
        console.error('[EventModal] Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        alert('Ошибка загрузки домашнего задания. Проверьте консоль для деталей.');
      }
    } catch (error) {
      console.error('[EventModal] Error uploading homework:', error);
      alert('Общая ошибка загрузки домашнего задания');
    } finally {
      setUploadingHomework(false);
    }
  };

  const handleGoToLesson = () => {
    if (event.lesson_id && event.course_id) {
      navigate(`/courses/${event.course_id}/lessons/${event.lesson_id}`);
      onClose();
    } else {
      alert('Информация об уроке недоступна');
    }
  };

  // Модальное окно проведения урока
  if (conductingLesson) {
    return (
      <div className="modal-overlay conduct-lesson-modal">
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
                    
                    <div className="homework-content-section">
                      <h4>Текстовое задание (опционально):</h4>
                      <textarea
                        placeholder="Введите текст домашнего задания..."
                        value={homeworkData.textContent}
                        onChange={(e) => setHomeworkData(prev => ({ ...prev, textContent: e.target.value }))}
                        rows={4}
                        style={{ width: '100%', marginBottom: '10px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.9em' }}>
                        Отображается в отдельном окне для чтения
                      </small>
                    </div>
                    
                    <div className="homework-file-section">
                      <h4>Файл задания (опционально):</h4>
                      <input
                        type="file"
                        onChange={(e) => setHomeworkData(prev => ({ ...prev, file: e.target.files[0] }))}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      />
                      <small style={{ color: '#666', fontSize: '0.9em', display: 'block', marginTop: '5px' }}>
                        Будет доступен кнопкой для скачивания
                      </small>
                    </div>
                    
                    <button 
                      onClick={handleHomeworkUpload}
                      disabled={uploadingHomework || !homeworkData.name || (!homeworkData.file && !homeworkData.textContent)}
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
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>
        
        <div className="event-modal-content">
          <div className="event-modal-header">
            <h2 className="event-modal-title">
              {event.lesson_name || event.name || event.event_name || 'Без названия'}
            </h2>
            <div className={`event-modal-status ${event.is_opened ? 'opened' : 'closed'}`}>
              {event.lesson_id && !event.event_id ? 
                (event.is_opened ? '🟢 Открыт' : '🔴 Закрыт') : 
                '🎉 Мероприятие'
              }
            </div>
          </div>

          <div className="event-modal-info">
            <div className="info-grid">
              {event.course_name && (
                <div className="info-item">
                  <div className="info-label">📚 Курс</div>
                  <div className="info-value">{event.course_name}</div>
                </div>
              )}
              
              {event.group_name && (
                <div className="info-item">
                  <div className="info-label">👥 Группа</div>
                  <div className="info-value">{event.group_name}</div>
                </div>
              )}
              
              {event.teacher_name && (
                <div className="info-item">
                  <div className="info-label">👩‍🏫 Преподаватель</div>
                  <div className="info-value">{event.teacher_name}</div>
                </div>
              )}
              
              {event.auditorium && (
                <div className="info-item">
                  <div className="info-label">📍 Аудитория</div>
                  <div className="info-value">{event.auditorium}</div>
                </div>
              )}
              
              <div className="info-item">
                <div className="info-label">🕐 Время</div>
                <div className="info-value">
                  {new Date(event.start_datetime || event.start).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                  {' - '}
                  {new Date(event.end_datetime || event.end).toLocaleTimeString('ru-RU', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
              
              <div className="info-item">
                <div className="info-label">⏱️ Длительность</div>
                <div className="info-value">
                  {(() => {
                    const start = new Date(event.start_datetime || event.start);
                    const end = new Date(event.end_datetime || event.end);
                    const diffMinutes = Math.round((end - start) / (1000 * 60));
                    return `${diffMinutes} минут`;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {event.description && (
            <div className="event-modal-description">
              <h3>📋 Описание</h3>
              <p>{event.description}</p>
            </div>
          )}

          {/* Кнопки для преподавателей и администраторов - только для уроков */}
          {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && event.lesson_id && !event.event_id && (
            <div className="event-modal-actions">
              <button 
                className="event-btn-primary"
                onClick={handleGoToLesson}
              >
                📖 Перейти к уроку
              </button>
              
              <button 
                className="event-btn-secondary"
                onClick={handleToggleLessonAccess}
                disabled={toggleLoading}
                style={{ 
                  backgroundColor: event.is_opened ? '#ef4444' : '#22c55e'
                }}
              >
                {toggleLoading ? '⏳' : event.is_opened ? '🔒 Закрыть урок' : '🔓 Открыть урок'}
              </button>
              
              <button 
                className="event-btn-primary"
                onClick={() => handleConductLesson(event)}
              >
                🎯 Провести урок
              </button>
            </div>
          )}

          {/* Кнопки для студентов - только для уроков */}
          {event.is_opened && userRole === 'student' && event.lesson_id && !event.event_id && (
            <div className="event-modal-actions">
              <button 
                className="event-btn-primary"
                onClick={handleGoToLesson}
              >
                🚀 Перейти к уроку
              </button>
            </div>
          )}

          {/* Сообщение для студента если урок закрыт - только для уроков */}
          {!event.is_opened && userRole === 'student' && event.lesson_id && !event.event_id && (
            <div className="event-modal-actions">
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

          {/* Информация для мероприятий */}
          {(!event.lesson_id || event.event_id) && (
            <div className="event-modal-actions">
              <p style={{ 
                color: '#8b5cf6', 
                fontStyle: 'italic', 
                textAlign: 'center',
                margin: 0,
                fontWeight: '500'
              }}>
                🎉 Это мероприятие - никаких дополнительных действий не требуется
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
