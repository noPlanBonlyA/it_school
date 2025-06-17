// src/pages/HomeworkPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import '../styles/HomeworkPage.css';
import {
  getTeacherGroups,
  getTeacherCourses,
  getCourseLessons,
  getLessonGroupsByGroup,
  getLessonStudents,
  getLessonStudentDetails,
  updateLessonStudent,
  addCommentToLessonStudent
} from '../services/homeworkService';

export default function HomeworkPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Состояния
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonGroups, setLessonGroups] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedLessonGroupId, setSelectedLessonGroupId] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState(null);

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
      
      const [groupsData, coursesData] = await Promise.all([
        getTeacherGroups(),
        getTeacherCourses()
      ]);
      
      console.log('[Homework] Loaded groups:', groupsData);
      console.log('[Homework] Loaded courses:', coursesData);
      
      setGroups(groupsData || []);
      setCourses(coursesData || []);
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
    setLessons([]);
    setStudents([]);
    
    try {
      setLoadingLessons(true);
      setError(null);
      
      // Загружаем lesson groups для выбранной группы
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
    if (selectedLessonGroupId === lessonGroupId) return;
    
    setSelectedLessonGroupId(lessonGroupId);
    setExpandedSubmission(null);
    
    try {
      setLoadingStudents(true);
      setError(null);
      
      // Загружаем студентов урока
      const studentsData = await getLessonStudents(lessonGroupId);
      console.log('[Homework] Loaded students:', studentsData);
      
      setStudents(studentsData || []);
    } catch (error) {
      console.error('[Homework] Error loading students:', error);
      setError('Ошибка загрузки студентов');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Развернуть/свернуть детали домашки
  const handleToggleSubmission = async (studentId) => {
    if (expandedSubmission === studentId) {
      setExpandedSubmission(null);
      return;
    }

    try {
      // Загружаем детальную информацию о студенте
      const studentDetails = await getLessonStudentDetails(studentId);
      console.log('[Homework] Student details:', studentDetails);
      
      // Обновляем студента в списке с деталями
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

  // Обработчики изменения оценок
  const handleGradeChange = (studentId, field, value) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, [field]: value }
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

  // Сохранение оценок и комментариев
  const handleSave = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    try {
      // Обновляем оценки студента
      const updateData = {
        is_visited: student.is_visited,
        is_excused_absence: student.is_excused_absence,
        is_sent_homework: student.is_sent_homework,
        is_graded_homework: true,
        coins_for_visit: parseInt(student.coins_for_visit) || 0,
        grade_for_visit: parseInt(student.grade_for_visit) || 0,
        coins_for_homework: parseInt(student.coins_for_homework) || 0,
        grade_for_homework: parseInt(student.grade_for_homework) || 0
      };

      await updateLessonStudent(studentId, updateData);

      // Добавляем комментарий если есть
      if (student.newComment && student.newComment.trim()) {
        const lessonGroup = lessonGroups.find(lg => lg.id === selectedLessonGroupId);
        if (lessonGroup) {
          await addCommentToLessonStudent(
            lessonGroup.lesson.course_id,
            lessonGroup.lesson.id,
            {
              text: student.newComment.trim(),
              lesson_student_id: studentId
            }
          );
        }
      }

      // Перезагружаем детали студента
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

      setExpandedSubmission(null);
      alert('Оценки и комментарий сохранены!');
    } catch (error) {
      console.error('[Homework] Error saving:', error);
      alert('Ошибка сохранения данных');
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
          <h1>Домашние задания</h1>
          
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

            {/* Колонка 3: Список студентов с домашками */}
            <div className="column submissions-col">
              <h2>Студенты {selectedLessonGroup && `(${students.length})`}</h2>
              {!selectedLessonGroup ? (
                <div className="placeholder">Выберите урок</div>
              ) : loadingStudents ? (
                <div className="loading">Загрузка студентов...</div>
              ) : students.length === 0 ? (
                <div className="placeholder">Нет студентов на уроке</div>
              ) : (
                <div className="submissions-content">
                  {students.map(student => (
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
                            <span>Присутствие: {student.is_visited ? '✅' : '❌'}</span>
                            <span>ДЗ сдано: {student.is_sent_homework ? '✅' : '❌'}</span>
                            <span>Оценено: {student.is_graded_homework ? '✅' : '❌'}</span>
                          </div>
                        </div>
                        <div className="homework-status">
                          {student.grade_for_homework > 0 && (
                            <span className="grade-display">
                              Оценка: {student.grade_for_homework}
                            </span>
                          )}
                          <span className={`status-badge ${student.is_graded_homework ? 'graded' : student.is_sent_homework ? 'submitted' : 'not-submitted'}`}>
                            {student.is_graded_homework ? 'Оценено' : student.is_sent_homework ? 'Сдано' : 'Не сдано'}
                          </span>
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

                          {/* Оценки */}
                          <div className="grading-section">
                            <div className="grade-field">
                              <label>Баллы за посещение:</label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={student.coins_for_visit || ''}
                                onChange={e => handleGradeChange(student.id, 'coins_for_visit', e.target.value)}
                              />
                            </div>
                            <div className="grade-field">
                              <label>Оценка за посещение:</label>
                              <input
                                type="number"
                                min="0"
                                max="5"
                                value={student.grade_for_visit || ''}
                                onChange={e => handleGradeChange(student.id, 'grade_for_visit', e.target.value)}
                              />
                            </div>
                            <div className="grade-field">
                              <label>Баллы за ДЗ:</label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={student.coins_for_homework || ''}
                                onChange={e => handleGradeChange(student.id, 'coins_for_homework', e.target.value)}
                              />
                            </div>
                            <div className="grade-field">
                              <label>Оценка за ДЗ:</label>
                              <input
                                type="number"
                                min="0"
                                max="5"
                                value={student.grade_for_homework || ''}
                                onChange={e => handleGradeChange(student.id, 'grade_for_homework', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Комментарий */}
                          <div className="comment-field">
                            <label>Новый комментарий:</label>
                            <textarea
                              placeholder="Введите комментарий..."
                              value={student.newComment || ''}
                              onChange={e => handleCommentChange(student.id, e.target.value)}
                            />
                          </div>

                          {/* Существующие комментарии */}
                          {student.details?.comments && student.details.comments.length > 0 && (
                            <div className="existing-comments">
                              <h4>Предыдущие комментарии:</h4>
                              {student.details.comments.map((comment, index) => (
                                <div key={comment.id || index} className="comment-item">
                                  <div className="comment-meta">
                                    {formatDate(comment.created_at)}
                                  </div>
                                  <div className="comment-text">{comment.text}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="details-buttons">
                            <button
                              className="btn-primary"
                              onClick={() => handleSave(student.id)}
                            >
                              Сохранить
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => setExpandedSubmission(null)}
                            >
                              Отменить
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
