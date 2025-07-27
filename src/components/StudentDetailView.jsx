import React, { useState, useEffect, useCallback } from 'react';
import { studentDetailService } from '../services/studentDetailService';
import CoinHistory from './CoinHistory';
import '../styles/StudentDetailView.css';

const StudentDetailView = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [coinHistoryExpanded, setCoinHistoryExpanded] = useState(false);
  const [data, setData] = useState({
    basicInfo: null,
    performance: null,
    attendance: null,
    courses: null,
    group: null
  });

  const loadStudentData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[StudentDetailView] Loading data for student:', student);
      
      // Определяем ID студента из различных возможных структур данных
      const studentId = student?.id || student?.student?.id || student?.user?.id || student?.student_id;
      
      console.log('[StudentDetailView] Using student ID:', studentId);
      
      // Используем новый метод getStudentFullInfo для лучшей обработки ошибок
      const fullInfo = await studentDetailService.getStudentFullInfo(studentId);
      
      setData(fullInfo);
      console.log('[StudentDetailView] Student data loaded successfully:', fullInfo);
    } catch (error) {
      console.error('[StudentDetailView] Error loading student data:', error);
      
      // Устанавливаем пустые данные в случае ошибки
      setData({
        basicInfo: null,
        performance: {
          averageGrade: 0,
          completedTasks: 0,
          totalTasks: 0,
          attendanceRate: 0,
          recentGrades: [],
          subjects: []
        },
        attendance: {
          totalClasses: 0,
          attendedClasses: 0,
          missedClasses: 0,
          attendanceRate: 0,
          recentClasses: []
        },
        courses: [],
        group: null
      });
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (student && student.user) {
      loadStudentData();
    }
  }, [student, loadStudentData]);

  const tabs = [
    { id: 'overview', label: 'Обзор' },
    { id: 'courses', label: 'Курсы' },
    { id: 'attendance', label: 'Посещаемость' },
    { id: 'group', label: 'Группа' }
  ];

  const renderOverview = () => {
    // Используем данные из API или fallback к переданным данным
    const basicInfo = data.basicInfo || {};
    const studentInfo = basicInfo.user || student?.user || {};
    const studentData = basicInfo.student || student?.student || {};
    
    return (
      <div className="student-overview">
        <div className="overview-section">
          <h4>Общая информация</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>ФИО:</label>
              <span>{[studentInfo.first_name, studentInfo.surname, studentInfo.patronymic].filter(Boolean).join(' ') || 'Не указано'}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{studentInfo.email || 'Не указан'}</span>
            </div>
            <div className="info-item">
              <label>Телефон:</label>
              <span>{studentInfo.phone_number || 'Не указан'}</span>
            </div>
            <div className="info-item">
              <label>Дата рождения:</label>
              <span>{studentInfo.birth_date || 'Не указана'}</span>
            </div>
            <div className="info-item">
              <label>Очки (BestCoin):</label>
              <span className="points-badge">{studentData.points || 0}</span>
            </div>
            <div className="info-item">
              <label>ID студента:</label>
              <span>{basicInfo.id || studentData.id || 'Не определен'}</span>
            </div>
          </div>
        </div>

        {data.performance && (
          <div className="overview-section">
            <h4>Успеваемость</h4>
            <div className="performance-summary">
              <div className="perf-item">
                <span className="perf-label">Средний балл:</span>
                <span className="perf-value">{data.performance.averageGrade.toFixed(1)}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Выполнено заданий:</span>
                <span className="perf-value">{data.performance.completedTasks}/{data.performance.totalTasks}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Процент посещаемости:</span>
                <span className="perf-value">{data.performance.attendanceRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCourses = () => (
    <div className="student-courses">
      {loading ? (
        <div className="loading">Загрузка курсов...</div>
      ) : data.courses && data.courses.length > 0 ? (
        <div className="courses-list">
          {data.courses.map(course => (
            <div key={course.id} className="course-card">
              <div className="course-header">
                <h4>{course.title}</h4>
                <span className={`status ${course.status}`}>{course.statusText}</span>
              </div>
              <div className="course-details">
                <div className="detail-item">
                  <span>Прогресс:</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                  <span>{course.progress}%</span>
                </div>
                <div className="detail-item">
                  <span>Последний урок:</span>
                  <span>{course.lastLesson || 'Не посещал'}</span>
                </div>
                <div className="detail-item">
                  <span>Оценки:</span>
                  <span>{course.grades.join(', ') || 'Нет оценок'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-data">Студент не записан на курсы</div>
      )}
    </div>
  );

  const renderAttendance = () => (
    <div className="student-attendance">
      {loading ? (
        <div className="loading">Загрузка данных о посещаемости...</div>
      ) : data.attendance ? (
        <div className="attendance-stats">
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value">{data.attendance.totalClasses}</span>
              <span className="stat-label">Всего занятий</span>
            </div>
            <div className="stat-item">
              <span className="stat-value attended">{data.attendance.attendedClasses}</span>
              <span className="stat-label">Посещено</span>
            </div>
            <div className="stat-item">
              <span className="stat-value missed">{data.attendance.missedClasses}</span>
              <span className="stat-label">Пропущено</span>
            </div>
            <div className="stat-item">
              <span className="stat-value rate">{data.attendance.attendanceRate}%</span>
              <span className="stat-label">Процент посещаемости</span>
            </div>
          </div>
          
          <div className="recent-attendance">
            <h4>Последние занятия</h4>
            {data.attendance.recentClasses.map((cls, index) => (
              <div key={index} className="attendance-item">
                <span className="date">{cls.date}</span>
                <span className="course">{cls.course}</span>
                <span className={`status ${cls.attended ? 'attended' : 'missed'}`}>
                  {cls.attended ? 'Присутствовал' : 'Отсутствовал'}
                </span>
              </div>
            ))}
          </div>

          {/* Виджет истории монет */}
          <div className="coin-history-widget">
            <div 
              className="coin-history-header" 
              onClick={() => setCoinHistoryExpanded(!coinHistoryExpanded)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #e0e0e0', marginTop: '20px' }}
            >
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💰</span>
                История монет
              </h4>
              <span style={{ transform: coinHistoryExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </div>
            
            {coinHistoryExpanded && (
              <div className="coin-history-content" style={{ marginTop: '12px' }}>
                <CoinHistory 
                  studentId={student?.id || student?.student?.id || student?.user?.id || student?.student_id} 
                  compact={true} 
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-data">Нет данных о посещаемости</div>
      )}
    </div>
  );

  const renderGroup = () => (
    <div className="student-group">
      {loading ? (
        <div className="loading">Загрузка информации о группе...</div>
      ) : data.group ? (
        <div className="group-info">
          <div className="group-header">
            <h4>{data.group.name}</h4>
            <span className="group-level">{data.group.level}</span>
          </div>
          <div className="group-details">
            <div className="detail-row">
              <span>Преподаватель:</span>
              <span>{data.group.teacher}</span>
            </div>
            <div className="detail-row">
              <span>Расписание:</span>
              <span>{data.group.schedule}</span>
            </div>
            <div className="detail-row">
              <span>Студентов в группе:</span>
              <span>{data.group.studentsCount}</span>
            </div>
            <div className="detail-row">
              <span>Начало обучения:</span>
              <span>{data.group.startDate}</span>
            </div>
          </div>

          <div className="group-students">
            <h5>Другие студенты группы</h5>
            <div className="students-list">
              {data.group.students.map(student => (
                <div key={student.id} className="student-item">
                  <span className="student-name">{student.name}</span>
                  <span className="student-status">{student.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">Студент не состоит в группе</div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'courses':
        return renderCourses();
      case 'attendance':
        return renderAttendance();
      case 'group':
        return renderGroup();
      default:
        return renderOverview();
    }
  };

  if (!student || !student.user) return null;

  return (
    <div className="student-detail-modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Детальная информация о студенте</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="student-detail-content">
          <div className="tabs-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailView;
