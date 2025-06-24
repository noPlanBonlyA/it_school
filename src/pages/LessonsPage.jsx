import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import '../styles/LessonsPage.css';
import {
  getTeacherGroups,
  getLessonGroupsByGroup,
  getLessonStudents,
  updateLessonStudent
} from '../services/homeworkService';

export default function LessonsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Состояния
  const [groups, setGroups] = useState([]);
  const [lessonGroups, setLessonGroups] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedLessonGroupId, setSelectedLessonGroupId] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);
  
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
      
      const groupsData = await getTeacherGroups();
      console.log('[Lessons] Loaded groups:', groupsData);
      
      setGroups(groupsData || []);
    } catch (error) {
      console.error('[Lessons] Error loading initial data:', error);
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
    setExpandedStudent(null);
    setStudents([]);
    
    try {
      setLoadingLessons(true);
      setError(null);
      
      const lessonGroupsData = await getLessonGroupsByGroup(groupId);
      console.log('[Lessons] Loaded lesson groups:', lessonGroupsData);
      
      setLessonGroups(lessonGroupsData || []);
    } catch (error) {
      console.error('[Lessons] Error loading lesson groups:', error);
      setError('Ошибка загрузки уроков');
    } finally {
      setLoadingLessons(false);
    }
  };

  // Выбор урока
  const handleSelectLesson = async (lessonGroupId) => {
    if (selectedLessonGroupId === lessonGroupId) return;
    
    setSelectedLessonGroupId(lessonGroupId);
    setExpandedStudent(null);
    
    try {
      setLoadingStudents(true);
      setError(null);
      
      const studentsData = await getLessonStudents(lessonGroupId);
      console.log('[Lessons] Loaded students:', studentsData);
      
      setStudents(studentsData || []);
    } catch (error) {
      console.error('[Lessons] Error loading students:', error);
      setError('Ошибка загрузки студентов');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Развернуть/свернуть детали студента
  const handleToggleStudent = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  // Обработчики изменения данных урока
  const handleAttendanceChange = (studentId, isVisited) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, is_visited: isVisited }
        : student
    ));
  };

  const handleExcusedChange = (studentId, isExcused) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, is_excused_absence: isExcused }
        : student
    ));
  };

  const handleLessonGradeChange = (studentId, field, value) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, [field]: value }
        : student
    ));
  };

  // Сохранение данных урока
  const handleSaveLesson = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    try {
      const updateData = {
        is_visited: student.is_visited,
        is_excused_absence: student.is_excused_absence,
        coins_for_visit: parseInt(student.coins_for_visit) || 0,
        grade_for_visit: parseInt(student.grade_for_visit) || 0,
        // Сохраняем существующие данные по ДЗ
        is_sent_homework: student.is_sent_homework,
        is_graded_homework: student.is_graded_homework,
        coins_for_homework: student.coins_for_homework || 0,
        grade_for_homework: student.grade_for_homework || 0
      };

      await updateLessonStudent(studentId, updateData);

      setStudents(prev => prev.map(s => 
        s.id === studentId 
          ? { ...s, ...updateData }
          : s
      ));

      setExpandedStudent(null);
      alert('Данные урока сохранены!');
    } catch (error) {
      console.error('[Lessons] Error saving:', error);
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
        <Sidebar activeItem="lessons" userRole="teacher" />
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
      <Sidebar activeItem="lessons" userRole="teacher" />

      <div className="main-content">
        <Topbar
          userName={`${user?.first_name || ''} ${user?.surname || ''}`.trim() || user?.username}
          userRole="teacher"
          onBellClick={() => {}}
          onProfileClick={() => {}}
        />

        <div className="content-area lessons-page">
          <h1>Управление уроками</h1>
          
          {error && <div className="error">{error}</div>}
          
          <div className="lessons-grid">
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

            {/* Колонка 3: Список студентов */}
            <div className="column students-col">
              <h2>Студенты {selectedLessonGroup && `(${students.length})`}</h2>
              {!selectedLessonGroup ? (
                <div className="placeholder">Выберите урок</div>
              ) : loadingStudents ? (
                <div className="loading">Загрузка студентов...</div>
              ) : students.length === 0 ? (
                <div className="placeholder">Нет студентов на уроке</div>
              ) : (
                <div className="students-content">
                  {students.map(student => (
                    <div key={student.id} className="student-item">
                      <div
                        className={`student-header ${expandedStudent === student.id ? 'expanded' : ''}`}
                        onClick={() => handleToggleStudent(student.id)}
                      >
                        <div className="student-info">
                          <div className="student-name">
                            {`${student.student?.user?.first_name || ''} ${student.student?.user?.surname || ''}`.trim() || 
                             student.student?.user?.username || 'Неизвестный студент'}
                          </div>
                          <div className="student-meta">
                            <span>Присутствие: {student.is_visited ? '✅' : '❌'}</span>
                            {student.is_excused_absence && <span>Уважительная причина</span>}
                          </div>
                        </div>
                        <div className="lesson-status">
                          {student.grade_for_visit > 0 && (
                            <span className="grade-display">
                              Оценка: {student.grade_for_visit}
                            </span>
                          )}
                          <span className={`expand-icon ${expandedStudent === student.id ? 'rotated' : ''}`}>
                            ▼
                          </span>
                        </div>
                      </div>
                      
                      {expandedStudent === student.id && (
                        <div className="student-details">
                          {/* Посещаемость */}
                          <div className="attendance-section">
                            <div className="attendance-field">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={student.is_visited || false}
                                  onChange={e => handleAttendanceChange(student.id, e.target.checked)}
                                />
                                Присутствовал на уроке
                              </label>
                            </div>
                            <div className="attendance-field">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={student.is_excused_absence || false}
                                  onChange={e => handleExcusedChange(student.id, e.target.checked)}
                                />
                                Уважительная причина отсутствия
                              </label>
                            </div>
                          </div>

                          {/* Оценки за урок */}
                          <div className="lesson-grading-section">
                            <div className="grade-field">
                              <label>Баллы за посещение:</label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={student.coins_for_visit || ''}
                                onChange={e => handleLessonGradeChange(student.id, 'coins_for_visit', e.target.value)}
                              />
                            </div>
                            <div className="grade-field">
                              <label>Оценка за урок:</label>
                              <input
                                type="number"
                                min="0"
                                max="5"
                                value={student.grade_for_visit || ''}
                                onChange={e => handleLessonGradeChange(student.id, 'grade_for_visit', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="details-buttons">
                            <button
                              className="btn-primary"
                              onClick={() => handleSaveLesson(student.id)}
                            >
                              Сохранить
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => setExpandedStudent(null)}
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