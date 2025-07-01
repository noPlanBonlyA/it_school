// src/pages/HomeworkPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import '../styles/HomeworkPage.css';
import {
  getTeacherGroups,
  getLessonGroupsByGroup,
  getLessonStudents,
  getLessonStudentDetails,
  updateLessonStudent
} from '../services/homeworkService';
import { createNotificationForStudent } from '../services/notificationService';

export default function HomeworkPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Состояния
  const [groups, setGroups] = useState([]);
  const [lessonGroups, setLessonGroups] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedLessonGroupId, setSelectedLessonGroupId] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  
  // ===== НОВОЕ: Состояния для архива =====
  const [showArchive, setShowArchive] = useState(false);
  const [expandedArchiveStudent, setExpandedArchiveStudent] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState(null);

  // ===== НОВОЕ: Разделение студентов на активных и архивных =====
  const ungraded = students.filter(student => !student.is_graded_homework && student.is_sent_homework);
  const archived = students.filter(student => student.is_graded_homework && student.is_sent_homework);

  // Загрузка данных при монтировании
  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/login');
      return;
    }
    loadInitialData();
  }, [user, navigate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const groupsData = await getTeacherGroups();
      console.log('[Homework] Loaded groups:', groupsData);
      
      setGroups(groupsData || []);
    } catch (error) {
      console.error('[Homework] Error loading initial data:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Выбор группы
  const handleSelectGroup = async (groupId) => {
    if (selectedGroupId === groupId) return;
    
    setSelectedGroupId(groupId);
    setSelectedLessonGroupId(null);
    setExpandedSubmission(null);
    setExpandedArchiveStudent(null);
    setStudents([]);
    
    try {
      setLoadingLessons(true);
      setError(null);
      
      const lessonGroupsData = await getLessonGroupsByGroup(groupId);
      console.log('[Homework] Loaded lesson groups:', lessonGroupsData);
      
      setLessonGroups(lessonGroupsData || []);
    } catch (error) {
      console.error('[Homework] Error loading lesson groups:', error);
      setError('Ошибка загрузки уроков');
    } finally {
      setLoadingLessons(false);
    }
  };

  // Выбор урока
  const handleSelectLesson = async (lessonGroupId) => {
    try {
      setLoadingStudents(true);
      setSelectedLessonGroupId(lessonGroupId);
      setStudents([]);
      setExpandedSubmission(null);
      setExpandedArchiveStudent(null);

      console.log('[Homework] Loading students for lesson group:', lessonGroupId);
      
      const studentsData = await getLessonStudents(lessonGroupId);
      console.log('[Homework] Students data received:', studentsData);
      
      const normalizedStudents = studentsData.map(student => {
        console.log('[Homework] Processing student:', student);
        
        const studentProfileId = student.student?.id || student.student_id;
        const studentUserId = student.student?.user_id || student.student?.user?.id;
        
        console.log('[Homework] Student IDs - Profile:', studentProfileId, 'User:', studentUserId);
        
        return {
          ...student,
          student_id: studentProfileId,
          lesson_group_id: student.lesson_group_id || lessonGroupId,
          coins_for_homework: student.coins_for_homework || 0,
          grade_for_homework: 0,
          newComment: ''
        };
      });
      
      console.log('[Homework] Normalized students:', normalizedStudents);
      setStudents(normalizedStudents);
      
    } catch (error) {
      console.error('[Homework] Error loading students:', error);
      alert('Ошибка загрузки студентов');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Развернуть/свернуть детали домашки (для активных)
  const handleToggleSubmission = async (studentId) => {
    if (expandedSubmission === studentId) {
      setExpandedSubmission(null);
      return;
    }

    try {
      const studentDetails = await getLessonStudentDetails(studentId);
      console.log('[Homework] Student details:', studentDetails);
      
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, details: studentDetails }
          : student
      ));
      
      setExpandedSubmission(studentId);
    } catch (error) {
      console.error('[Homework] Error loading student details:', error);
      alert('Ошибка загрузки деталей студента');
    }
  };

  // ===== НОВОЕ: Развернуть/свернуть архивную запись =====
  const handleToggleArchiveStudent = async (studentId) => {
    if (expandedArchiveStudent === studentId) {
      setExpandedArchiveStudent(null);
      return;
    }

    try {
      const studentDetails = await getLessonStudentDetails(studentId);
      console.log('[Homework] Archive student details:', studentDetails);
      
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, details: studentDetails }
          : student
      ));
      
      setExpandedArchiveStudent(studentId);
    } catch (error) {
      console.error('[Homework] Error loading archive student details:', error);
      alert('Ошибка загрузки деталей студента из архива');
    }
  };

  // ===== НОВОЕ: Отменить оценку и вернуть в активные =====
  const handleUngradHomework = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (!window.confirm('Отменить оценку и вернуть домашку в активные? Студент потеряет полученные бесткоины.')) {
      return;
    }

    try {
      console.log('[Homework] Ungrading homework for student:', studentId);
      
      // 1. Убираем бесткоины из общего счета студента
      if (student.coins_for_homework > 0) {
        try {
          const studentProfileId = student.student?.id || student.student_id;
          
          if (studentProfileId) {
            // Получаем текущие данные студента
            const studentResponse = await api.get(`/students/${studentProfileId}`);
            const currentPoints = studentResponse.data.points || 0;
            const newPoints = Math.max(0, currentPoints - student.coins_for_homework);

            // Обновляем баланс студента
            await api.patch(`/students/${studentProfileId}`, {
              points: newPoints
            });

            console.log(`[Homework] Removed ${student.coins_for_homework} coins from student ${studentProfileId}. Total: ${newPoints}`);
          }
        } catch (pointsError) {
          console.error('[Homework] Error updating student points:', pointsError);
          alert('Ошибка обновления баланса студента');
          return;
        }
      }

      // 2. Сбрасываем оценку в базе данных
      const updateData = {
        student_id: student.student_id || student.student?.id,
        lesson_group_id: student.lesson_group_id,
        is_visited: student.is_visited || false,
        is_excused_absence: student.is_excused_absence || false,
        coins_for_visit: parseInt(student.coins_for_visit) || 0,
        grade_for_visit: parseInt(student.grade_for_visit) || 0,
        is_sent_homework: student.is_sent_homework || false,
        is_graded_homework: false, // Сбрасываем флаг оценки
        coins_for_homework: 0, // Обнуляем бесткоины
        grade_for_homework: 0
      };

      await updateLessonStudent(studentId, updateData);
      console.log(`[Homework] Ungraded homework for student ${studentId}`);

      // 3. Отправляем уведомление об отмене
      try {
        const studentProfileId = student.student?.id || student.student_id;
        const lessonGroup = lessonGroups.find(lg => lg.id === selectedLessonGroupId);
        
        if (studentProfileId && lessonGroup) {
          const notificationText = `Оценка за ДЗ "${lessonGroup.lesson?.name || 'Урок'}" была отменена преподавателем. Домашка возвращена на проверку.`;
          
          await api.post('/notifications/', 
            {
              content: notificationText
            },
            {
              params: {
                recipient_type: 'student',
                recipient_id: studentProfileId
              }
            }
          );
          
          console.log('[Homework] Sent ungrade notification to student:', studentProfileId);
        }
      } catch (notificationError) {
        console.error('[Homework] Error sending ungrade notification:', notificationError);
        // Не показываем ошибку пользователю, так как основная операция прошла успешно
      }

      // 4. Обновляем локальное состояние
      setStudents(prev => prev.map(s => 
        s.id === studentId 
          ? { 
              ...s, 
              ...updateData,
              newComment: '' 
            }
          : s
      ));

      setExpandedArchiveStudent(null);
      
      alert(`Оценка отменена! ${student.coins_for_homework > 0 ? `Убрано ${student.coins_for_homework} бесткоинов. ` : ''}Домашка возвращена в активные.`);
      
    } catch (error) {
      console.error('[Homework] Error ungrading homework:', error);
      
      let errorMessage = 'Ошибка отмены оценки';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage += ': ' + error.response.data.detail.map(e => e.msg).join(', ');
        } else {
          errorMessage += ': ' + error.response.data.detail;
        }
      }
      
      alert(errorMessage);
    }
  };

  // Обработчики изменения бесткоинов за ДЗ
  const handleHomeworkCoinsChange = (studentId, value) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, coins_for_homework: value }
        : student
    ));
  };

  const handleCommentChange = (studentId, value) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { 
            ...student, 
            newComment: value 
          }
        : student
    ));
  };

  // Сохранение бесткоинов за ДЗ и отправка уведомления
  const handleSaveHomework = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    try {
      const coinsToAdd = parseInt(student.coins_for_homework) || 0;
      
      console.log('[Homework] === SAVING HOMEWORK DEBUG ===');
      console.log('[Homework] Student object:', student);
      console.log('[Homework] Student ID (lesson_student):', studentId);
      console.log('[Homework] Student profile ID:', student.student?.id);
      console.log('[Homework] Coins to add:', coinsToAdd);
      console.log('[Homework] Comment:', student.newComment);
      
      // 1. Подготавливаем правильные данные для API
      const updateData = {
        student_id: student.student_id || student.student?.id,
        lesson_group_id: student.lesson_group_id,
        is_visited: student.is_visited || false,
        is_excused_absence: student.is_excused_absence || false,
        coins_for_visit: parseInt(student.coins_for_visit) || 0,
        grade_for_visit: parseInt(student.grade_for_visit) || 0,
        is_sent_homework: student.is_sent_homework || false,
        is_graded_homework: true,
        coins_for_homework: coinsToAdd,
        grade_for_homework: 0
      };

      console.log('[Homework] Update data prepared:', updateData);

      await updateLessonStudent(studentId, updateData);
      console.log(`[Homework] Updated lesson student ${studentId} with ${coinsToAdd} coins`);

      // 2. Прибавляем бесткоины к общему счету студента
      if (coinsToAdd > 0) {
        try {
          const studentProfileId = student.student?.id || student.student_id;
          
          if (!studentProfileId) {
            console.error('[Homework] Student profile ID not found:', student);
            throw new Error('Student profile ID not found');
          }

          // Получаем текущие данные студента
          const studentResponse = await api.get(`/students/${studentProfileId}`);
          const currentPoints = studentResponse.data.points || 0;
          const newPoints = currentPoints + coinsToAdd;

          // Обновляем баланс студента
          await api.patch(`/students/${studentProfileId}`, {
            points: newPoints
          });

          console.log(`[Homework] Added ${coinsToAdd} coins to student ${studentProfileId}. Total: ${newPoints}`);
        } catch (pointsError) {
          console.error('[Homework] Error updating student points:', pointsError);
        }
      }

      // 3. Отправляем уведомление с правильным student ID
      if (student.newComment && student.newComment.trim()) {
        const lessonGroup = lessonGroups.find(lg => lg.id === selectedLessonGroupId);
        if (lessonGroup) {
          try {
            const studentProfileId = student.student?.id || student.student_id;
            
            if (!studentProfileId) {
              console.error('[Homework] Cannot send notification - student profile ID not found:', student);
              alert('Ошибка: не удалось найти ID студента для отправки уведомления');
            } else {
              const notificationText = `ДЗ "${lessonGroup.lesson?.name || 'Урок'}" оценено! ${coinsToAdd > 0 ? `Получено ${coinsToAdd} бесткоинов. ` : ''}Комментарий: ${student.newComment.trim()}`;
              
              console.log('[Homework] === NOTIFICATION DEBUG ===');
              console.log('[Homework] Sending notification to student profile ID:', studentProfileId);
              console.log('[Homework] Notification text:', notificationText);
              
              const response = await api.post('/notifications/', 
                {
                  content: notificationText
                },
                {
                  params: {
                    recipient_type: 'student',
                    recipient_id: studentProfileId
                  }
                }
              );
              
              console.log('[Homework] Notification API response:', response.data);
              console.log('[Homework] Notification sent successfully to student profile:', studentProfileId);
            }
          } catch (notificationError) {
            console.error('[Homework] Error sending notification:', {
              error: notificationError,
              status: notificationError.response?.status,
              data: notificationError.response?.data,
              studentId: student.student?.id || student.student_id
            });
            
            const errorMsg = notificationError.response?.data?.detail || notificationError.message;
            alert(`Ошибка отправки уведомления: ${errorMsg}`);
          }
        }
      }

      // 4. Перезагружаем детали студента
      try {
        const updatedDetails = await getLessonStudentDetails(studentId);
        setStudents(prev => prev.map(s => 
          s.id === studentId 
            ? { 
                ...s, 
                ...updateData,
                details: updatedDetails,
                newComment: '' 
              }
            : s
        ));
      } catch (detailsError) {
        console.error('[Homework] Error reloading student details:', detailsError);
        setStudents(prev => prev.map(s => 
          s.id === studentId 
            ? { 
                ...s, 
                ...updateData,
                newComment: '' 
              }
            : s
        ));
      }

      setExpandedSubmission(null);
      
      // Уведомляем об успехе
      const successMessage = [
        'Домашка оценена и отправлена в архив!',
        coinsToAdd > 0 ? `Добавлено ${coinsToAdd} бесткоинов` : '',
        student.newComment?.trim() ? 'Уведомление отправлено студенту' : ''
      ].filter(Boolean).join('\n');
      
      alert(successMessage);
      
    } catch (error) {
      console.error('[Homework] Error saving homework:', error);
      
      let errorMessage = 'Ошибка сохранения данных';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage += ': ' + error.response.data.detail.map(e => e.msg).join(', ');
        } else {
          errorMessage += ': ' + error.response.data.detail;
        }
      }
      
      alert(errorMessage);
    }
  };

  // Найти выбранную группу и урок
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const selectedLessonGroup = lessonGroups.find(lg => lg.id === selectedLessonGroupId);

  // Форматирование данных
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="homework" userRole="teacher" />
        <div className="main-content">
          <Topbar 
            userName={`${user?.first_name || ''} ${user?.surname || ''}`.trim() || user?.username}
            userRole="teacher"
            onBellClick={() => {}}
            onProfileClick={() => {}}
          />
          <div className="content-area">
            <div className="loading">Загрузка...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="homework" userRole="teacher" />

      <div className="main-content">
        <Topbar
          userName={`${user?.first_name || ''} ${user?.surname || ''}`.trim() || user?.username}
          userRole="teacher"
          onBellClick={() => {}}
          onProfileClick={() => {}}
        />

        <div className="content-area homework-page">
          <h1>Проверка домашних заданий</h1>
          
          {error && <div className="error">{error}</div>}
          
          <div className="homework-grid">
            {/* Колонка 1: Список групп */}
            <div className="column groups-col">
              <h2>Группы ({groups.length})</h2>
              {groups.length === 0 ? (
                <div className="placeholder">Нет доступных групп</div>
              ) : (
                <ul className="groups-list">
                  {groups.map(group => (
                    <li
                      key={group.id}
                      className={group.id === selectedGroupId ? 'selected' : ''}
                      onClick={() => handleSelectGroup(group.id)}
                    >
                      <div className="group-info">
                        <div className="group-name">{group.name}</div>
                        <div className="group-meta">
                          {group.start_date && `${formatDate(group.start_date)} - ${formatDate(group.end_date)}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Колонка 2: Список уроков */}
            <div className="column topics-col">
              <h2>Уроки {selectedGroup && `(${lessonGroups.length})`}</h2>
              {!selectedGroup ? (
                <div className="placeholder">Выберите группу</div>
              ) : loadingLessons ? (
                <div className="loading">Загрузка уроков...</div>
              ) : lessonGroups.length === 0 ? (
                <div className="placeholder">Нет уроков для группы</div>
              ) : (
                <ul className="topics-list">
                  {lessonGroups.map(lessonGroup => (
                    <li
                      key={lessonGroup.id}
                      className={lessonGroup.id === selectedLessonGroupId ? 'selected' : ''}
                      onClick={() => handleSelectLesson(lessonGroup.id)}
                    >
                      <div className="lesson-info">
                        <div className="lesson-title">{lessonGroup.lesson?.name || 'Урок'}</div>
                        <div className="lesson-meta">
                          {lessonGroup.auditorium && `📍 ${lessonGroup.auditorium}`}
                        </div>
                        <div className="lesson-date">
                          {formatDate(lessonGroup.start_datetime)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Колонка 3: Активные домашки + Архив */}
            <div className="column submissions-col">
              {/* ===== АКТИВНЫЕ ДОМАШКИ ===== */}
              <div className="submissions-section">
                <h2>
                  На проверке {selectedLessonGroup && `(${ungraded.length})`}
                  {archived.length > 0 && (
                    <button 
                      className="archive-toggle"
                      onClick={() => setShowArchive(!showArchive)}
                    >
                      {showArchive ? '📂 Скрыть архив' : `📁 Архив (${archived.length})`}
                    </button>
                  )}
                </h2>
                
                {!selectedLessonGroup ? (
                  <div className="placeholder">Выберите урок</div>
                ) : loadingStudents ? (
                  <div className="loading">Загрузка домашних заданий...</div>
                ) : ungraded.length === 0 ? (
                  <div className="placeholder">
                    {archived.length > 0 
                      ? 'Все домашние задания оценены' 
                      : 'Нет сданных домашних заданий'
                    }
                  </div>
                ) : (
                  <div className="submissions-content">
                    {ungraded.map(student => (
                      <div key={student.id} className="submission-item">
                        <div
                          className={`submission-header ${expandedSubmission === student.id ? 'expanded' : ''}`}
                          onClick={() => handleToggleSubmission(student.id)}
                        >
                          <div className="student-info">
                            <div className="student-name">
                              {`${student.student?.user?.first_name || ''} ${student.student?.user?.surname || ''}`.trim() || 
                               student.student?.user?.username || 'Неизвестный студент'}
                            </div>
                            <div className="student-meta">
                              <span className="status-new">🆕 Требует проверки</span>
                            </div>
                          </div>
                          <div className="homework-status">
                            <span className="status-badge submitted">Сдано</span>
                            <span className={`expand-icon ${expandedSubmission === student.id ? 'rotated' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>
                        
                        {expandedSubmission === student.id && (
                          <div className="submission-details">
                            {/* Файлы домашки */}
                            {student.details?.passed_homeworks && student.details.passed_homeworks.length > 0 && (
                              <div className="homework-files">
                                <h4>Сданные файлы:</h4>
                                <div className="file-list">
                                  {student.details.passed_homeworks.map((hw, index) => (
                                    <div key={hw.id || index} className="file-item">
                                      <span className="file-icon">📎</span>
                                      <span className="file-name">{hw.homework?.name || `Файл ${index + 1}`}</span>
                                      {hw.homework?.url && (
                                        <a 
                                          href={hw.homework.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="file-link"
                                        >
                                          Скачать
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Бесткоины за ДЗ */}
                            <div className="homework-grading-section">
                              <div className="coins-field">
                                <label>Бесткоины за ДЗ:</label>
                                <div className="coins-input-group">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={student.coins_for_homework || ''}
                                    onChange={e => handleHomeworkCoinsChange(student.id, e.target.value)}
                                    placeholder="0"
                                  />
                                  <span className="coins-icon">🪙</span>
                                </div>
                                <div className="coins-hint">
                                  Максимум 10 бесткоинов за домашнее задание
                                </div>
                              </div>
                            </div>

                            {/* Комментарий для уведомления */}
                            <div className="comment-field">
                              <label>Комментарий студенту (отправится как уведомление):</label>
                              <textarea
                                placeholder={`Напишите комментарий к ДЗ "${selectedLessonGroup?.lesson?.name || 'Урок'}". Студент получит его как уведомление.`}
                                value={student.newComment || ''}
                                onChange={e => handleCommentChange(student.id, e.target.value)}
                                rows={3}
                              />
                              {student.newComment?.trim() && (
                                <div className="comment-preview">
                                  <strong>Превью уведомления:</strong>
                                  <div className="notification-preview">
                                    ДЗ "{selectedLessonGroup?.lesson?.name || 'Урок'}" оценено! {student.coins_for_homework > 0 ? `Получено ${student.coins_for_homework} бесткоинов. ` : ''}Комментарий: {student.newComment.trim()}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="details-buttons">
                              <button
                                className="btn-primary"
                                onClick={() => handleSaveHomework(student.id)}
                                disabled={!student.coins_for_homework && !student.newComment?.trim()}
                              >
                                {student.coins_for_homework > 0 && student.newComment?.trim() 
                                  ? `✅ Оценить на ${student.coins_for_homework} 🪙 и отправить уведомление`
                                  : student.coins_for_homework > 0 
                                    ? `✅ Оценить на ${student.coins_for_homework} 🪙`
                                    : student.newComment?.trim()
                                      ? '✅ Оценить и отправить уведомление'
                                      : 'Введите бесткоины или комментарий'
                                }
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() => setExpandedSubmission(null)}
                              >
                                Закрыть
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== АРХИВ ОЦЕНЕННЫХ ДОМАШЕК ===== */}
              {showArchive && archived.length > 0 && (
                <div className="archive-section">
                  <h3>📁 Архив оцененных ({archived.length})</h3>
                  <div className="archive-content">
                    {archived.map(student => (
                      <div key={`archive-${student.id}`} className="archive-item">
                        <div
                          className={`archive-header ${expandedArchiveStudent === student.id ? 'expanded' : ''}`}
                          onClick={() => handleToggleArchiveStudent(student.id)}
                        >
                          <div className="student-info">
                            <div className="student-name">
                              {`${student.student?.user?.first_name || ''} ${student.student?.user?.surname || ''}`.trim() || 
                               student.student?.user?.username || 'Неизвестный студент'}
                            </div>
                            <div className="student-meta">
                              <span className="status-graded">✅ Оценено</span>
                              {student.coins_for_homework > 0 && (
                                <span className="coins-display">🪙 {student.coins_for_homework}</span>
                              )}
                            </div>
                          </div>
                          <div className="archive-actions">
                            <button
                              className="btn-ungrade"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUngradHomework(student.id);
                              }}
                              title="Отменить оценку и вернуть в активные"
                            >
                              ↩️
                            </button>
                            <span className={`expand-icon ${expandedArchiveStudent === student.id ? 'rotated' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>
                        
                        {expandedArchiveStudent === student.id && (
                          <div className="archive-details">
                            {/* Информация об оценке */}
                            <div className="grade-info">
                              <div className="grade-summary">
                                <strong>Результат оценки:</strong>
                                <div className="grade-details">
                                  {student.coins_for_homework > 0 && (
                                    <span className="coins-earned">🪙 Получено: {student.coins_for_homework} бесткоинов</span>
                                  )}
                                  <span className="graded-date">📅 Оценено: {formatDate(student.updated_at || student.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Файлы домашки */}
                            {student.details?.passed_homeworks && student.details.passed_homeworks.length > 0 && (
                              <div className="homework-files">
                                <h4>Сданные файлы:</h4>
                                <div className="file-list">
                                  {student.details.passed_homeworks.map((hw, index) => (
                                    <div key={hw.id || index} className="file-item">
                                      <span className="file-icon">📎</span>
                                      <span className="file-name">{hw.homework?.name || `Файл ${index + 1}`}</span>
                                      {hw.homework?.url && (
                                        <a 
                                          href={hw.homework.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="file-link"
                                        >
                                          Скачать
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Кнопки для архива */}
                            <div className="archive-buttons">
                              <button
                                className="btn-warning"
                                onClick={() => handleUngradHomework(student.id)}
                              >
                                ↩️ Отменить оценку и вернуть на проверку
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() => setExpandedArchiveStudent(null)}
                              >
                                Закрыть
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
